import {
  Application,
  Router,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import http from "http";
import express from "express";
import { openapi } from "./config/docs.config";
import assert from "assert";
import type { SwaggerUIOptions } from "swagger-ui";
import helmet, { HelmetOptions } from "helmet";
import cors, { CorsRequest } from "cors";

type Props = {
  docsPath?: string;
  docConfig?: SwaggerUIOptions | null;
};

export class CreateApplicationService<T extends keyof Express.Locals> {
  private apiRouter?: Router;
  private app: Application;
  private errorRequestHandler?: ErrorRequestHandler;
  private middlewares: (NextFunction | RequestHandler)[] = [];
  private notFoundRouteHandler?: RequestHandler;
  private oapi = openapi;
  private opt?: Props;

  constructor(props: Props = {}) {
    this.app = express();
    this.opt = props;
    // this.apiRouter = Router();
    // this.oapi = oapi()
  }

  private setUpApp() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    // todo: file upload
    // todo: serve file
    // todo: cors
    // todo: rate limiting
    //
    this.app.use(this.oapi.handle);
    this.setUpMiddlewares();
  }

  private enableDocumentation() {
    if (!this.apiRouter) {
      throw new Error("Api router not created");
    }

    const docsRouter = Router();
    const docConfig = this.opt?.docConfig ?? {};
    docsRouter.use(
      this.oapi.swaggerui(
        Object.assign(
          {
            deepLinking: true,
            displayRequestDuration: true,
            tryItOutEnabled: true,
            displayOperationId: true,
            persistAuthorization: true,
            syntaxHighlight: { activate: true, theme: "arta" },
            docExpansion: "list",
          },
          docConfig,
        ),
        this.opt?.docsPath,
      ),
    );

    this.apiRouter.use(...this.oapi.use("/docs", docsRouter));
  }

  enableHelmet(options?: HelmetOptions) {
    this.app.use(helmet(options));
  }
  enableCors(options?: cors.CorsOptions) {
    this.app.use(cors(options));
  }

  private setUpApi() {
    if (!this.apiRouter) {
      throw new Error("Api router not created");
    }

    if (this.opt?.docConfig) {
      this.enableDocumentation();
    }

    this.app.use(...this.oapi.use("/api", this.apiRouter));
  }

  private setUpMiddlewares() {
    if (this.middlewares.length) {
      this.app.use(...this.middlewares);
    }
  }

  private setUpFinalHandlers() {
    if (this.errorRequestHandler) {
      this.app.use(this.errorRequestHandler);
    }

    if (this.notFoundRouteHandler) {
      this.app.use(this.notFoundRouteHandler);
    }
  }

  addService<U extends T>(
    name: U,
    service: Express.Locals[T],
  ): Exclude<T, U> extends never
    ? Omit<CreateApplicationService<T>, "addService">
    : CreateApplicationService<Exclude<T, U>> {
    this.app.locals[name as T] = service;
    return this;
  }

  addApi(router: Router): Omit<CreateApplicationService<T>, "addApi"> {
    if (this.apiRouter) {
      throw new Error("Already added api router");
    }

    this.apiRouter = router;
    return this;
  }

  addMiddleware(middleware: NextFunction) {
    this.middlewares.push(middleware);
    return this;
  }

  addErrorRequestHandler(errorHandler: ErrorRequestHandler) {
    if (this.errorRequestHandler) {
      throw new Error("Error request handler already added");
    }
    this.errorRequestHandler = errorHandler;
    return this;
  }

  addNotFoundHandler(notFoundHandler: RequestHandler) {
    if (this.notFoundRouteHandler) {
      throw new Error("Not found handler already added");
    }
    this.notFoundRouteHandler = notFoundHandler;
    return this;
  }

  build() {
    this.setUpApp();
    this.setUpMiddlewares();
    this.setUpApi();

    assert(this.apiRouter, "App API router should already be registered");
    // this.app.use(this.oapi);

    this.setUpFinalHandlers();
    return http.createServer(this.app);
  }
}

// const app = new CreateApplicationService({} as any);
// app //
//   .addService("otp", {} as any)
//   .addMiddleware({} as any)
//   .addApi({} as any)
//   .build();
// .addApi(Router());
