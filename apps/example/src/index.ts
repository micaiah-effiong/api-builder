import {
  CreateApplicationService,
  logger,
  LoggerService,
} from "@micaiah_effiong/api-builder";
import express from "express";
logger.add(new winston.transports.Console());

import { apiRouter } from "./router";
import { Request, Response, NextFunction } from "express";
import winston from "winston";
import path from "path";

//
function errorHandler(
  err: Error,
  _: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error(err.message, err);
  res
    .status(500)
    .json({ status: false, message: err.message || "Internal server error" });
}

function notFoundHandler(_: Request, res: Response) {
  res.status(404).json({ status: false, message: "Route Not Found" });
}

function shutdown() {
  logger.info("SHUTDOWN");
}

function initializer() {
  // throw new Error("Not connecting to DB");
  logger.info(`Connect DB, process pid: ${process.pid}`);
}

function envValidation(env: any) {
  if (!("PORT" in env)) {
    throw new Error("");
  }
}

const app = express();

// index.ts
const createApp = new CreateApplicationService(
  {
    docConfig: {},
    clusterSize: 2,
    config: {
      cors: {},
      helmet: {},
    },
    serviceName: "example-app",
    logger: new LoggerService({
      // formatters: [winston.format.json()],
    }),
    // docsPath: "", // WARN: empty string throws error
  },
  app,
);

createApp
  .setShutdown(shutdown)
  .setInitializer(initializer)
  .addEnvValidator(envValidation)
  .addStaticDir(path.join(process.cwd(), "src", "public"))
  .addApi(apiRouter)
  .addNotFoundHandler(notFoundHandler)
  .addErrorRequestHandler(errorHandler)
  .build()
  .start();
