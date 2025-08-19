import { Router } from 'express'
import { OpenAPIV3_1 as OpenAPIV3 } from 'openapi-types'
import { Token, TokenData } from 'path-to-regexp'
import { Keys } from './types'

export function isRouter(handle: any): handle is Router {
  return handle && typeof handle === 'function' && 'stack' in handle && Array.isArray(handle.stack)
}

export function isParameterObject(schema: any): schema is OpenAPIV3.ParameterObject {
  return schema && typeof schema === 'object' && 'name' in schema
}

export function isHTTPMethod(method: string): method is OpenAPIV3.HttpMethods {
  return ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method)
}

function processTokens(tokens: Token[], isInsideGroup: boolean, parameters: Keys[]): Keys[] {
  tokens.forEach(token => {
    if (token.type === 'param' || token.type === 'wildcard') {
      parameters.push({
        name: token.name,
        type: token.type,
        required: !isInsideGroup,
      })
    } else if (token.type === 'group' && token.tokens) {
      return processTokens(token.tokens, true, parameters)
    }
    return parameters
  })
  return parameters
}

export function parseKeys(data: TokenData): Keys[] {
  return processTokens(data.tokens, false, [])
}
