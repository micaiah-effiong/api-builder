import { Router } from 'express'

import { Layer, RouterInfo, PathInfo } from './types'

abstract class RouterError extends Error {
  protected constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class RouterRegistrationError extends RouterError {
  public readonly code = 'ROUTER_NOT_REGISTERED'
  private readonly router: RouterInfo

  constructor(layer: Layer, path: string, message?: string) {
    const example = `Replace nested router with \`app.use(...openapi.use("${path}", router))\``
    const suggestion = layer.name === 'router' ? `- Suggestion: "${example}"` : undefined

    const details = [
      message || 'Router must be registered before mounting',
      `- Router name: "${layer.name}"`,
      `- Current path: "${path}"`,
      suggestion,
      `- Stack size: ${(layer.handle as Router).stack?.length ?? 0}`,
    ]
      .filter(Boolean)
      .join('\n')

    super(details)

    this.router = {
      name: layer.name,
      path,
      stackSize: (layer.handle as Router).stack?.length ?? 0,
    }
  }

  public getRouterInfo(): RouterInfo {
    return this.router
  }
}

export class WildcardPathError extends RouterError {
  public readonly code = 'INVALID_WILDCARD_PATH'
  private readonly pathInfo: PathInfo

  constructor(path: string, routeName: string) {
    const details = [
      'Wildcard paths are not allowed in router registration',
      `- Attempted path: "${path}"`,
      `- Router name: "${routeName}"`,
      '- Valid path example: "/api/users"',
      '- Invalid path example: "/api/*" or "/api/:param"',
    ].join('\n')

    super(details)

    this.pathInfo = {
      attemptedPath: path,
      routerName: routeName,
    }
  }

  public getPathInfo(): PathInfo {
    return this.pathInfo
  }
}
