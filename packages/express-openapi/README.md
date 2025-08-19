### Usage

```typescript
import express, { Router } from 'express'

import { ExpressOpenAPI } from 'express-openapi'

const baseDoc = {
  openapi: '3.0.0',
  info: {
    title: 'API',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
  paths: {},
}

const openApi = ExpressOpenAPI({ baseDoc })
const router = Router()
const app = express()

// For nested routers
app.use(...openApi.use('/router', router))

// For routes
app.post(
  '',
  openApi.path({
    responses: {
      204: {
        description: 'Test',
      },
    },
  }),
  async (_req: Request, res: Response) => {
    res.status(200).send()
  },
)

// Generate OpenAPI documentation
app.use(openApi.handle)

// Serve documentation
app.get('/docs.json', (_req: Request, res: Response) => {
  res.json(openApi.document)
})
```
