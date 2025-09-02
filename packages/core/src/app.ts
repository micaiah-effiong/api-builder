import { env } from "./env";
import {
  Application,
  Router,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import type { ServeStaticOptions } from "serve-static";
import http from "http";
import express from "express";
import { openapi } from "./config/docs.config";
import type { SwaggerUIOptions } from "swagger-ui";
import helmet, { HelmetOptions } from "helmet";
import cors from "cors";
import os from "os";
import cluster from "cluster";
import { errorFromJson, errorToJson } from "./utils";
import { logger } from "./logger";
import morgan from "morgan";
import fs from "fs";

type ClusterSize = number | "MAX";

type Props = {
  docsPath?: string;
  docConfig?: SwaggerUIOptions | null;
  clusterSize?: ClusterSize;
  env: NodeJS.ProcessEnv;
  config?: {
    cors?: cors.CorsOptions;
    helmet?: HelmetOptions;
  };
};

type WorkerEventType =
  | "WORKER::INITIALIZER_ERROR"
  | "WORKER::INITIALIZER_SUCCESS";

type WorkerEventData = {
  msg: any;
  type: WorkerEventType;
};

export class CreateApplicationService<T extends keyof Express.Locals> {
  private apiRouter?: Router;
  private app: Application;
  private errorRequestHandler?: ErrorRequestHandler;
  private middlewares: (NextFunction | RequestHandler)[] = [];
  private notFoundRouteHandler?: RequestHandler;
  private oapi = openapi;

  // TODO: get port from env

  private opt?: Props;

  shutdownHandler?: Function;
  initializer?: Function;
  envValidator?: Function;

  private staticDirs: Map<string, {}> = new Map();
  private isPredefinedApp: boolean = false;

  constructor(props: Omit<Props, "env">);
  constructor(props: Omit<Props, "env">, app: Application);
  constructor(props: Omit<Props, "env"> = {}, app?: Application) {
    if (app) {
      this.app = app;
      this.isPredefinedApp = true;
    } else {
      this.app = express();
    }

    this.opt = Object.assign({}, { env: { PORT: "3000" } }, props, { env });
  }

  getOpt() {
    return this.opt;
  }

  private setUpApp() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.disable("x-powered-by");
    this.app.use(helmet(this.opt?.config?.helmet));
    this.app.use(cors(this.opt?.config?.cors));
    this.app.use(morgan("combined"));
    // TODO: file upload
    // TODO: rate limiting
    // TODO: express websocket
    this.app.use(this.oapi.handler);
    this.setUpMiddlewares();
  }

  /**
   * validator should throw error if it fails
   */
  addEnvValidator(validator: (env: Required<NodeJS.ProcessEnv>) => void) {
    this.envValidator = validator;
    return this;
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

  private setUpApi() {
    if (!this.apiRouter && !this.isPredefinedApp) {
      throw new Error("Api router not created");
    }

    if (this.opt?.docConfig) {
      this.enableDocumentation();
    }

    if (this.apiRouter) {
      this.app.use(...this.oapi.use("/api", this.apiRouter));
    }
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

  addStaticDir(folderPath: string, options?: ServeStaticOptions) {
    const stats = fs.lstatSync(folderPath);

    if (!stats.isDirectory()) {
      throw new Error("Static path is not a directory");
    }

    this.staticDirs.set(folderPath, options ?? {});
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

  /**
   * function that must run when server closes
   **/
  setShutdown(fn: () => void) {
    this.shutdownHandler = fn;
    return this;
  }

  /**
   * function that must run before server starts
   **/
  setInitializer(fn: () => void) {
    this.initializer = fn;
    return this;
  }

  build() {
    this.envValidator?.(env);
    this.setUpApp();
    this.setUpMiddlewares();
    this.setUpApi();

    this.staticDirs.forEach((options, folderPath) => {
      this.app.use(express.static(folderPath, options));
    });

    this.setUpFinalHandlers();
    return new CreateApplication(
      http.createServer(this.app),
      this.app,
      this.opt?.clusterSize || 1,
      this,
    );
  }
}

class CreateApplication {
  private logger = logger;
  constructor(
    private server: http.Server,
    private app: Application,
    private clusterSize: ClusterSize,
    private appService: CreateApplicationService<any>,
  ) {}

  getContext() {
    return { app: this.app, server: this.server };
  }

  private createCluster() {
    let size;

    if (this.clusterSize === "MAX") {
      size = os.availableParallelism();
    } else if (this.clusterSize <= 0) {
      size = 1;
    } else {
      size = this.clusterSize;
    }

    const errorListener = (error: Error) => {
      this.logger.error("ERROR", error);
    };

    for (let i = 0; i < size; i++) {
      cluster.fork().on("error", errorListener);
    }

    cluster.on("exit", (worker, code, _signal) => {
      if (code !== 0 && !worker.exitedAfterDisconnect) {
        // did not exist properly
        // something went wrong
        cluster.fork().on("error", errorListener);
      }
    });
  }

  async start() {
    const port = this.appService.getOpt()?.env.PORT;

    if (!port) {
      throw new Error("Port not specified");
    }

    if (cluster.isWorker) {
      try {
        await this.appService.initializer?.();
        // TODO: add port to createApplicationService
        this.server.listen(port, () => {
          cluster.worker?.send(<WorkerEventData>{
            type: "WORKER::INITIALIZER_SUCCESS",
            msg: "Done",
          });
        });

        process.on("SIGTERM", this.shutdown.bind(this));
        process.on("SIGINT", this.shutdown.bind(this));
        process.on("exit", this.shutdown.bind(this));
        return;
      } catch (error) {
        cluster.worker?.send(<WorkerEventData>{
          type: "WORKER::INITIALIZER_ERROR",
          msg: errorToJson(<Error>error),
        });
      }
    }

    if (cluster.isPrimary && Number.isInteger(this.clusterSize)) {
      this.createCluster();
      cluster.on("message", (_w, data) => {
        const { msg, type } = <WorkerEventData>data;
        this.logger.log("Message received", { type });

        if (type === "WORKER::INITIALIZER_ERROR") {
          const err = errorFromJson(msg);

          this.logger.error(err.message, err);
          Object.values(cluster.workers ?? {}).forEach((w) => w?.kill());
          process.exit(1);
        }
      });

      this.logger.log(
        `Server running on port ${port}. \nProcess ID: ${process.pid}`,
      );

      console.table(
        Object.values(cluster.workers ?? {}).map((e) => {
          return {
            "Child process": e?.id,
            id: e?.process.pid,
          };
        }),
      );
    }
  }

  private shutdown() {
    this.server.close(async () => {
      await this.appService.shutdownHandler?.();
      process.exit(0);
    });
  }
}
