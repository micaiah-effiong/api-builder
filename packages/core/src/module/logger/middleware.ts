import morgan from "morgan";
import { logger } from "./logger";

export const loggerMiddleware = morgan(
  (tokens, req, res) => {
    return JSON.stringify({
      remoteAddr: tokens["remote-addr"]?.(req, res),
      user: tokens["remote-user"]?.(req, res),
      date: tokens.date?.(req, res, "clf"),
      method: tokens.method?.(req, res),
      url: tokens.url?.(req, res),
      protocol: tokens["http-version"]?.(req, res),
      status: Number(tokens.status?.(req, res)),
      statusText: res.statusMessage,
      contentLength: tokens.res?.(req, res, "content-length") || 0,
      referrer: tokens.referrer?.(req, res),
      userAgent: tokens["user-agent"]?.(req, res),
      // extra
      responseTime: tokens["response-time"]?.(req, res, "digits"),
      totalTime: tokens["total-time"]?.(req, res, "digits"),
    });
  },
  {
    stream: {
      write: (message) => {
        const data = JSON.parse(message);
        return logger.log({
          level: "http",
          message: `${data.method} ${data.url} - ${data.status} ${data.statusText} ${data.totalTime}ms`,
          ...data,
        });
      },
    },
  },
);
