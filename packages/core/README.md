# API Builder

This package provides the core application setup for building scalable, robust Node.js APIs with Express. It encapsulates best practices for server initialization, middleware configuration, clustering, error handling, documentation, and static file serving.

## Features

- **Express Application Bootstrapping**  
  Easily set up an Express app with configurable middleware, static directories, error handlers, and API routers.

- **Clustering**  
  Scale your server across multiple CPU cores using Node.js clustering for improved performance and reliability.

- **OpenAPI Documentation**  
  Integrate Swagger UI for interactive API documentation and testing.

- **Customizable Middleware**  
  Add custom middleware, environment validators, and lifecycle hooks (initialization and shutdown).

- **Static File Serving**  
  Serve static assets from configurable directories.

- **Security and Logging**  
  Integrates `helmet` for HTTP header security and `morgan` for access logging.

## Getting Started

### Installation

Install via npm:

```bash
npm install @micaiah_effiong/api-builder
```

### Usage

```typescript
import { CreateApplicationService } from "@micaiah_effiong/api-builder";
import express from "express";

// Create your API router
const apiRouter = express.Router();
// ... define your routes

// Initialize the application service
const appService = new CreateApplicationService({
  docsPath: "/docs",
  clusterSize: "MAX", // Use all cores
  config: {
    cors: { origin: "*" },
    helmet: {},
  },
  docConfig: {
    /* Swagger UI options */
  },
})
  .addApi(apiRouter)
  .addStaticDir("public")
  .addEnvValidator((env) => {
    if (!env.PORT) throw new Error("PORT not defined");
  })
  .setInitializer(() => {
    // Custom startup logic
  })
  .setShutdown(() => {
    // Custom cleanup logic
  });

// Build and start the server
const appInstance = appService.build();
appInstance.start();
```

### Options

- `docsPath`: Path to serve API documentation.
- `docConfig`: Swagger UI configuration options.
- `clusterSize`: Number of worker processes (`number` or `"MAX"` for all cores).
- `config.cors`: CORS options for Express.
- `config.helmet`: Helmet configuration for security headers.

## API Reference

### `CreateApplicationService<T>`

#### Methods

- `.addApi(router: Router)`
- `.addStaticDir(folderPath: string, options?: ServeStaticOptions)`
- `.addMiddleware(middleware: NextFunction)`
- `.addErrorRequestHandler(errorHandler: ErrorRequestHandler)`
- `.addNotFoundHandler(notFoundHandler: RequestHandler)`
- `.addEnvValidator(validator: (env: Required<NodeJS.ProcessEnv>) => void)`
- `.setInitializer(fn: () => void)`
- `.setShutdown(fn: () => void)`
- `.build()` &rarr; Returns an instance of `CreateApplication`

### `CreateApplication`

#### Methods

- `.start()` &rarr; Starts the server (clustered if configured)
- `.getContext()` &rarr; Returns `{ app, server }` for advanced usage

## Environment Variables

- `PORT`: Port number to run the server on (default: `3000`)

## Documentation

API documentation is auto-generated via OpenAPI and served at the path specified by `docsPath` (default: `/docs`).

## Contributing

Contributions are welcome! Please open issues or submit pull requests to improve functionality, fix bugs, or update documentation.

## License

MIT
