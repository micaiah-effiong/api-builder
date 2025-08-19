import express from 'express'
import supertest from 'supertest'
import { Router, Request, Response } from 'express'
import { OpenAPIV3 } from 'openapi-types'

import { ExpressOpenAPI, ExpressOpenAPIProps } from '../src/middleware'
import { OpenAPIOptions } from '../src/types'
import { OpenAPIGenerator } from '../src/generator'

describe('ExpressOpenAPI Middleware', () => {
  let app: express.Application
  let baseDoc: OpenAPIV3.Document
  let options: ExpressOpenAPIProps

  beforeEach(() => {
    app = express()
    options = {
      shouldWarnNotThrow: true,
      baseDoc: {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      },
    }
  })

  describe('initialization', () => {
    it('should create middleware with initial document', () => {
      const openAPI = ExpressOpenAPI(options)
      expect(openAPI.document).toBeDefined()
      expect(openAPI.document.info.title).toBe('Test API')
    })

    it('should be a valid express middleware', () => {
      const openAPI = ExpressOpenAPI(options)
      expect(openAPI).toBeInstanceOf(Function)
    })
  })

  describe('middleware behavior', () => {
    it('should initialize document on first request', async () => {
      const openAPI = ExpressOpenAPI(options)
      app.use(openAPI)

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      const schemaMiddleware = openAPI.path(schema)
      app.get('/test', schemaMiddleware, (_req: Request, res: Response) => {
        res.json({ message: 'success' })
      })

      await new Promise<void>(resolve => {
        const req = { app } as Request
        const res = {} as Response
        const next = () => {
          expect(openAPI.document.paths).toBeDefined()
          resolve()
        }
        openAPI(req, res, next)
      })
    })

    it('should only initialize document once', async () => {
      const openAPI = ExpressOpenAPI(options)
      const initSpy = jest.spyOn(OpenAPIGenerator.prototype, 'initializeDoc')

      app.use(openAPI)

      const mockRequest = () => {
        return new Promise<void>(resolve => {
          const req = { app } as Request
          const res = {} as Response
          const next = () => resolve()
          openAPI(req, res, next)
        })
      }

      await mockRequest()
      await mockRequest()

      expect(initSpy).toHaveBeenCalledTimes(1)
      initSpy.mockRestore()
    })
  })

  describe('asRouterArgs method', () => {
    it('should register router and return path and router tuple', () => {
      const openAPI = ExpressOpenAPI(options)
      const router = Router()

      const [path, returnedRouter] = openAPI.use('/api', router)

      expect(path).toBe('/api')
      expect(returnedRouter).toBe(router)
    })

    it('should work with app.use()', async () => {
      const openAPI = ExpressOpenAPI(options)
      const router = Router()

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }
      router.get('/test', openAPI.path(schema), (_req, res) => {
        res.json({ message: 'success' })
      })

      app.use(openAPI)
      app.use(...openAPI.use('/api', router))

      await supertest(app).get('/api/test').expect(200)

      expect(openAPI.document.paths['/api/test']).toBeDefined()
    })
  })

  describe('path method', () => {
    it('should create middleware that passes through', async () => {
      const openAPI = ExpressOpenAPI(options)
      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      const middleware = openAPI.path(schema)

      await new Promise<void>(resolve => {
        const req = {} as Request
        const res = {} as Response
        const next = () => resolve()

        middleware(req, res, next)
      })
    })

    it('should register schema with generator', async () => {
      const openAPI = ExpressOpenAPI(options)
      const router = Router()

      const schema: OpenAPIV3.OperationObject = {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      router.get('/test', openAPI.path(schema), (_req, res) => {
        res.json({ message: 'success' })
      })

      app.use(openAPI)
      app.use(...openAPI.use('/api', router))

      await supertest(app).get('/api/test').expect(200)

      expect(openAPI.document.paths['/api/test']?.get?.summary).toBe('Test endpoint')
    })
  })

  describe('complex routing scenarios', () => {
    it('should handle nested routers with multiple middleware', async () => {
      const openAPI = ExpressOpenAPI(options)
      const mainRouter = Router()
      const userRouter = Router()

      const listSchema: OpenAPIV3.OperationObject = {
        summary: 'List users',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      const createSchema: OpenAPIV3.OperationObject = {
        summary: 'Create user',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      }

      userRouter.get('/', openAPI.path(listSchema), (_req, res) => {
        res.json([])
      })
      userRouter.post('/', openAPI.path(createSchema), (_req, res) => {
        res.json({ id: 1 })
      })

      mainRouter.use(...openAPI.use('/users', userRouter))

      app.use(openAPI)
      app.use(...openAPI.use('/api', mainRouter))

      await supertest(app).get('/api/users').expect(200)

      expect(openAPI.document.paths['/api/users/']?.get?.summary).toBe('List users')
      expect(openAPI.document.paths['/api/users/']?.post?.summary).toBe('Create user')
    })
  })
})
