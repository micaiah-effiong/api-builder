import { Router, Request, Response, NextFunction } from 'express'
import { OpenAPIV3 } from 'openapi-types'
import { SwaggerUIOptions } from 'swagger-ui'

import { OpenAPIGenerator } from './generator'
import { GetComponentObject, OpenAPIGeneratorOpts } from './types'
import { serveSwaggerUI } from './ui'

const defaultRoutePrefix = '/api/docs/openapi'

export type ExpressOpenAPIProps = OpenAPIGeneratorOpts
export function ExpressOpenAPI(props: ExpressOpenAPIProps) {
  const generator = new OpenAPIGenerator(props)
  const router = Router()

  let document = generator.getDocument()

  let isFirstRequest = true
  const handle = (req: Request, res: Response, next: NextFunction) => {
    if (isFirstRequest) {
      document = generator.initializeDoc(req.app.router)
      isFirstRequest = false
    }
    return router(req, res, next)
  }

  const middleware = <any>{}

  // Publicly accessible properties

  // Register a router with the OpenAPI generator
  const use = function (path: string, router: Router) {
    generator.registerRouter(router, path)
    return [path, router] as const
  }
  // Register a schema with the OpenAPI generator
  const path = function (schema: OpenAPIV3.OperationObject) {
    function schemaMiddleware(_req: Request, _res: Response, next: NextFunction) {
      next()
    }
    generator.addSchema(schemaMiddleware, schema)
    return schemaMiddleware
  }

  /** more */
  // Expose ui middleware

  // OpenAPI document as json

  const swaggerui = (options: SwaggerUIOptions = {}, _docPath?: string) => {
    const routePrefix = _docPath ?? defaultRoutePrefix
    const docPath = `${routePrefix}.json`

    router.get(docPath, (_req, res) => {
      document = generator.getDocument()
      res.json(document)
    })
    return serveSwaggerUI(docPath, options)
  }

  function component<T extends keyof OpenAPIV3.ComponentsObject>(
    type: T,
    name: string,
    description: GetComponentObject<OpenAPIV3.ComponentsObject, T>[string],
  ) {
    if (!type) {
      throw new TypeError('Component type is required')
    }

    // Return whole component type
    if (!name && !description) {
      return document.components && document.components[type]
    }

    // Return ref to type
    if (name && !description) {
      if (!document.components || !document.components[type] || !document.components[type][name]) {
        throw new Error(`Unknown ${type} ref: ${name}`)
      }
      return { $ref: `#/components/${type}/${name}` }
    }

    // @TODO create id
    // Is this necessary?  The point of this was to provide canonical component ref urls
    // But now I think that might not be necessary.
    // if (!description || !description['$id']) {
    //   const server = middleware.document.servers && middleware.document.servers[0] && middleware.document.servers[0].url
    //   console.log(`${server || '/'}{routePrefix}/components/${type}/${name}.json`)
    //   description['$id'] = `${middleware.document.servers[0].url}/${routePrefix}/components/${type}/${name}.json`
    // }

    // Set name on parameter if not passed
    if (type === 'parameters') {
      const val = <OpenAPIV3.ParameterObject>description
      val.name = val.name || name
      description = <typeof description>val
    }

    // Define a new component
    document.components = document.components || {}
    document.components[type] = document.components[type] || {}
    document.components[type][name] = description

    return middleware
  }

  const schemas = component.bind(null, 'schemas')
  const response = component.bind(null, 'responses')
  const parameters = component.bind(null, 'parameters')
  const examples = component.bind(null, 'examples')
  const requestBodies = component.bind(null, 'requestBodies')
  const headers = component.bind(null, 'headers')
  const securitySchemes = component.bind(null, 'securitySchemes')
  const links = component.bind(null, 'links')
  const callbacks = component.bind(null, 'callbacks')

  // OpenAPI document as yaml
  // router.get([`${routePrefix}.yaml`, `${routePrefix}.yml`], (req, res) => {
  //   const jsonSpec = generateDocument(
  //     middleware.document,
  //     req.app._router || req.app.router,
  //     opts.basePath,
  //   )
  //   const yamlSpec = YAML.stringify(jsonSpec)
  //
  //   res.type('yaml')
  //   res.send(yamlSpec)
  // })

  /** more end */
  return {
    schemas,
    response,
    parameters,
    examples,
    requestBodies,
    headers,
    securitySchemes,
    links,
    callbacks,
    handle,

    //
    document,
    use,
    path,
    swaggerui,
  }
}
