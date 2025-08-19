import express from 'express'
import supertest from 'supertest'
import { Router, Request, Response, NextFunction } from 'express'
import { OpenAPIV3 } from 'openapi-types'

import { OpenAPIGenerator } from '../src/generator'
import { RouterRegistrationError, WildcardPathError } from '../src/errors'
import { isParameterObject } from '../src/utils'

describe('OpenAPIGenerator', () => {
  let app: express.Application
  let generator: OpenAPIGenerator
  let baseDoc: OpenAPIV3.Document

  beforeEach(() => {
    app = express()
    baseDoc = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {},
      servers: [{ url: '/api/v1' }],
    }
    generator = new OpenAPIGenerator({ baseDoc, shouldWarnNotThrow: true })
  })

  afterEach(() => {
    app.removeAllListeners()
  })

  describe('initialization', () => {
    it('should initialize with minimal OpenAPI document', () => {
      const minimalDoc = {
        openapi: '3.0.0',
        info: {
          title: 'Minimal API',
          version: '1.0.0',
        },
        paths: {},
      }
      const gen = new OpenAPIGenerator({
        baseDoc: minimalDoc satisfies Omit<OpenAPIV3.Document, 'paths'>,
        shouldWarnNotThrow: true,
      })
      const doc = gen.getDocument()

      expect(doc.openapi).toBe(minimalDoc.openapi)
      expect(doc.info.version).toBe(minimalDoc.info.version)
    })

    it('should use default base path when no servers provided', () => {
      const docWithoutServers = { ...baseDoc }
      delete docWithoutServers.servers
      const gen = new OpenAPIGenerator({ shouldWarnNotThrow: true, baseDoc: docWithoutServers })
      expect(gen.getDocument().paths).toEqual({})
    })
  })

  describe('schema management', () => {
    it('should add schema to handler', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      generator.addSchema(handler, schema)
      router.get('/test', handler)

      generator.initializeDoc(router)
      const doc = generator.getDocument()
      expect(doc.paths['/test']?.get?.summary).toBe('Test endpoint')
    })
  })

  describe('router registration', () => {
    it('should register router with path', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      router.get('/profile', handler)
      generator.registerRouter(router, '/users')
      expect(() => generator.initializeDoc(router)).not.toThrow()
    })

    it('should throw RouterRegistrationError for unregistered router', () => {
      const parentRouter = Router()
      const childRouter = Router()

      parentRouter.use('/users', childRouter)

      expect(() => generator.initializeDoc(parentRouter)).toThrow(RouterRegistrationError)
    })
  })

  describe('path parameters', () => {
    it('should parse path parameters correctly', () => {
      const router = Router()
      const handler = (req: Request, res: Response) => {
        res.json({ id: req.params.id })
      }

      const schema: OpenAPIV3.OperationObject = {
        responses: {
          '200': {
            description: 'Success',
          },
        },
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
      }

      generator.addSchema(handler, schema)
      router.get('/users/:id', handler)

      generator.initializeDoc(router)

      const doc = generator.getDocument()
      const params = doc.paths['/users/{id}']?.get?.parameters

      if (!isParameterObject(params?.[0])) throw Error

      expect(params?.[0].name).toBe('id')
      expect(params?.[0].in).toBe('path')
      expect(params?.[0].required).toBe(true)
    })

    it('should throw WildcardPathError for wildcard paths', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }
      generator.addSchema(handler, schema)
      router.get('/files/*file', handler)

      expect(() => generator.initializeDoc(router)).toThrow(WildcardPathError)
    })
  })

  describe('nested routers', () => {
    it('should handle nested routers correctly', async () => {
      const handler = (req: Request, res: Response) => {
        res.json({ id: req.params.id })
      }

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Nested endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      const nestedRouter = Router()
      const parentRouter = Router()

      generator.addSchema(handler, schema)

      nestedRouter.get('/:id', handler)
      parentRouter.use('/posts', nestedRouter)

      generator.registerRouter(parentRouter, '/api')
      generator.registerRouter(nestedRouter, '/api/posts')
      generator.initializeDoc(parentRouter)

      app.use('/api', parentRouter)

      await supertest(app).get('/api/posts/test').expect(200)

      const doc = generator.getDocument()
      expect(doc.paths['/api/posts/{id}']?.get?.summary).toBe('Nested endpoint')
    })
  })
  describe('middleware handling', () => {
    it('should handle routes with multiple middleware correctly', async () => {
      const router = Router()

      const middleware = (_req: Request, _res: Response, next: NextFunction) => {
        next()
      }

      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'protected resource' })
      }

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      router.get('/test', middleware, handler)

      generator.addSchema(handler, schema)
      generator.initializeDoc(router)

      app.use(router)

      await supertest(app).get('/test').expect(200)

      const doc = generator.getDocument()

      expect(doc.paths['/test']?.get?.summary).toBe('Test endpoint')
    })
  })

  describe('base path handling', () => {
    it('should handle base path from servers correctly', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          200: {
            description: 'Success',
          },
        },
      }

      generator.addSchema(handler, schema)
      router.get('/test', handler)

      generator.initializeDoc(router)
      const doc = generator.getDocument()
      // Should strip base path from the final paths object
      expect(doc.paths['/test']).toBeDefined()
      expect(doc.paths['/api/v1/test']).toBeUndefined()
    })
  })

  describe('HTTP methods', () => {
    it('should handle different HTTP methods correctly', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      generator.addSchema(handler, schema)
      router.post('/resource', handler)
      router.put('/resource', handler)
      router.delete('/resource', handler)

      generator.initializeDoc(router)
      const doc = generator.getDocument()
      expect(doc.paths['/resource']?.post).toBeDefined()
      expect(doc.paths['/resource']?.put).toBeDefined()
      expect(doc.paths['/resource']?.delete).toBeDefined()
    })
  })

  describe('Path construction', () => {
    it('should convert basic Express path params to OpenAPI format', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        responses: {
          '200': { description: 'Success' },
        },
      }

      generator.addSchema(handler, schema)
      router.get('/users/:userId/posts/:postId', handler)

      generator.initializeDoc(router)
      const doc = generator.getDocument()

      // Should convert :userId and :postId to {userId} and {postId}
      expect(doc.paths['/users/{userId}/posts/{postId}']).toBeDefined()
      expect(doc.paths['/users/:userId/posts/:postId']).toBeUndefined()
    })

    it('should handle array-based route paths correctly', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        responses: {
          '200': { description: 'Success' },
        },
      }

      generator.addSchema(handler, schema)
      // Express 5.0.1 array-based path routing
      router.get(['/discussion/:slug', '/page/:slug'], handler)

      generator.initializeDoc(router)
      const doc = generator.getDocument()

      // Both paths should be defined with OpenAPI parameter syntax
      expect(doc.paths['/discussion/{slug}']).toBeDefined()
      expect(doc.paths['/page/{slug}']).toBeDefined()
    })

    it('should handle multiple HTTP methods for the same path', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        responses: {
          '200': { description: 'Success' },
        },
      }

      generator.addSchema(handler, schema)
      router.get('/users/:userId', handler)
      router.post('/users/:userId', handler)

      generator.initializeDoc(router)
      const doc = generator.getDocument()

      // Both GET and POST operations should be under the same path
      const path = doc.paths['/users/{userId}']
      expect(path?.get).toBeDefined()
      expect(path?.post).toBeDefined()
    })

    it('should throw an error for wildcard paths', () => {
      const router = Router()
      const handler = (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      }

      const schema: OpenAPIV3.OperationObject = {
        responses: {
          '200': { description: 'Success' },
        },
      }

      generator.addSchema(handler, schema)
      router.get('/files/*path', handler)

      expect(() => generator.initializeDoc(router)).toThrow(WildcardPathError)
    })
  })
})
