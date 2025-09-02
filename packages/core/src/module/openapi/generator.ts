import { OpenAPIV3 } from 'openapi-types'
import { Handler, Router } from 'express'
import * as PathToRegexp from 'path-to-regexp'

import { RouterRegistrationError, WildcardPathError } from './errors'
import { parseKeys, isRouter, isParameterObject, isHTTPMethod } from './utils'

import { Layer, OpenAPIGeneratorOpts } from './types'

export class OpenAPIGenerator {
  private doc: OpenAPIV3.Document
  private basePath: string
  private opt: OpenAPIGeneratorOpts = {
    baseDoc: {
      openapi: '3.0.0',
      info: {
        title: '',
        version: '0.0.0',
      },
      paths: {},
    },
  }
  private schemaMap: Map<Handler, OpenAPIV3.OperationObject>
  private routerMap: Map<Router, string>

  constructor(props: OpenAPIGeneratorOpts) {
    const minDoc = this.opt.baseDoc

    this.doc = Object.assign(minDoc, props.baseDoc)
    this.basePath = minDoc?.servers?.[0]?.url ?? '/'
    this.schemaMap = new Map()
    this.routerMap = new Map()
    this.opt = Object.assign({}, this.opt, props)
  }

  private getParams(path: string, layer: Layer): void {
    // if (this.basePath && path.startsWith(this.basePath)) {
    //   path = path.replace(this.basePath, '')
    // }

    const schema = this.schemaMap.get(layer.handle)
    if (!schema) return

    const method = layer.method.toLowerCase()
    if (!isHTTPMethod(method)) return

    const operation = Object.assign({}, schema)

    // Add route params obtained from parsed route paths
    const tokenData = PathToRegexp.parse(path)
    const keys = parseKeys(tokenData)

    // As of version 3.0.0 OpenAPI does not support wildcard paths
    if (keys.find(k => k.type === 'wildcard')) {
      throw new WildcardPathError(path, layer.name)
    }

    const params = keys.map(k => {
      const param =
        schema.parameters &&
        schema.parameters.find(p => {
          if (!isParameterObject(p)) return false
          if (p.name !== k.name) return false
          if (p.in !== 'path') return false
          return true
        })

      return Object.assign(
        {
          name: k.name,
          in: 'path',
          required: k.required,
          schema: { type: 'string' },
        } satisfies OpenAPIV3.ParameterObject,
        param || {},
      )
    })

    operation.parameters = params

    // Replace express-style route params with OpenAPI-style route params
    path = path.replace(/\{:(\w+)\}/g, ':$1')
    path = path.replace(/:(\w+)/g, '{$1}')

    const pathObj = this.doc.paths[path] ?? {}
    pathObj[method] = operation
    this.doc.paths[path] = pathObj
    this.schemaMap.set(layer.handle, operation)
  }

  private recurseStack(path: string, layer: Layer): void {
    const route = layer.route

    this.getParams(path, layer)
    if (layer.name === 'router' && isRouter(layer.handle)) {
      const router = layer.handle
      const routerPath = this.routerMap.get(layer.handle)

      if (!routerPath) {
        const error = new RouterRegistrationError(layer, path)
        if (this.opt?.shouldWarnNotThrow) {
          throw error
        }

        console.warn(`[MISSING_ROUTER_DOCS]: ${error.message}`)
        return void 0
      }

      router.stack.forEach(routeLayer => {
        this.recurseStack(path + routerPath, routeLayer)
      })
    }

    if (!route) {
      return void 0
    }

    if (Array.isArray(route.path)) {
      const schemaLayer = route.stack.find(l => this.schemaMap.get(l.handle))
      if (!schemaLayer) return
      route.path.forEach(p => this.recurseStack(path + p, schemaLayer))
      return void 0
    }

    route.stack.forEach(l => this.recurseStack(path + route.path, l))
  }

  public initializeDoc(router?: Router): OpenAPIV3.Document {
    if (router) {
      for (const layer of router.stack) {
        this.recurseStack('', layer)
      }
    }
    return this.doc
  }

  public addSchema(handler: Handler, schema: OpenAPIV3.OperationObject): void {
    this.schemaMap.set(handler, schema)
  }

  public registerRouter(router: Router, path: string): void {
    this.routerMap.set(router, path)
  }

  public getDocument(): OpenAPIV3.Document {
    return this.doc
  }
}
