import { CreateApplicationService, logger } from "@repo/core";
logger.add(new winston.transports.Console());

import { apiRouter } from "./router";
import { Request, Response, NextFunction } from "express";
import winston from "winston";

//
function errorHandler(
  err: Error,
  _: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);
  res
    .status(500)
    .json({ status: false, message: err.message || "Internal server error" });
}

function notFoundHandler(_: Request, res: Response) {
  res.status(404).json({ status: false, message: "Route Not Found" });
}

function shutdown() {
  console.log("SHUTDOWN");
}

function initializer() {
  // throw new Error("Not connecting to DB");
  console.log("Connect DB", process.pid);
}
// index.ts
const createApp = new CreateApplicationService({
  docConfig: {},
  clusterSize: 2,
});

createApp
  .addApi(apiRouter)
  .addNotFoundHandler(notFoundHandler)
  .addErrorRequestHandler(errorHandler)
  .setShutdown(shutdown)
  .setInitializer(initializer)
  .build()
  .start();
