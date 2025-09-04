import { Router } from "express";
import { openapi } from "./config/docs.config";
import z from "zod";
import { zodToJsonSchema } from "./utils";

export const healthcheckRouter = Router();

const schema = zodToJsonSchema(
  z.object({
    message: z.string().default("OK"),
    timestamp: z
      .date()
      .transform((val) => val.getTime())
      .pipe(z.number().default(Date.now())),
    uptime: z
      .number()
      .default(process.uptime())
      .describe(
        "Number of seconds the current server process has been running.",
      ),
  }),
);

healthcheckRouter.get(
  "/",
  openapi.path({
    responses: {
      200: {
        description: "",
        content: {
          "application/json": {
            schema,
          },
        },
      },
    },
  }),
  async (_req, res, _next) => {
    const healthcheck = {
      message: "OK",
      timestamp: Date.now(),
      uptime: process.uptime(),
    };

    res.send(healthcheck);
  },
);
// export router with all routes included
