import winston from "winston";
import { env } from "./env";
// import debug from "debug";

type Props = {
  prodOnlyTransports?: winston.transport[];
};

export class LoggerService {
  private readonly levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  };

  logger: winston.Logger;
  private env: Record<string, string> = env;

  constructor(private opt?: Props) {
    this.logger = {} as any;
    this.createLogger();
  }

  private createLogger() {
    const transports: winston.transport[] = [];
    const formatters: winston.Logform.Format[] = [
      winston.format.timestamp({ format: "YYYY-MM-DD, HH:mm:ss:ms" }),
      winston.format.json(),
      winston.format.splat(),
      winston.format.metadata({
        fillExcept: ["message", "level", "timestamp", "label", "pid"],
      }),
      winston.format.errors({ stack: true }),
      winston.format.simple(),
      // winston.format.printf((info) => {
      //   const pid = process.pid;
      //   const time = info.timestamp;
      //   const level = info.level;
      //
      //   if (
      //     typeof info.metadata === "object" &&
      //     this.env.NODE_ENV !== "production"
      //   ) {
      //     info.message = `
      //       ${info.message}
      //       ${JSON.stringify(info.metadata, null, 3)}`
      //       .trim()
      //       .split("\n")
      //       .map((e) => e.trim())
      //       .join("\n");
      //   }
      //
      //   const msg = info.message;
      //
      //   return `[CORE] ${pid} - ${time} ${level} ${msg}`;
      // }),
    ];

    // this.config.getOrThrow<ENVIRONMENT_VARIABLE["NODE_ENV"]>("NODE_ENV");

    if (this.env.NODE_ENV === "production") {
      if (this.opt?.prodOnlyTransports) {
        transports.push(...this.opt?.prodOnlyTransports);
      }
      // transports.push(
      //   new LoggingWinston({
      //     credentials: WinstonLoggingServiceAccount,
      //     projectId: WinstonLoggingServiceAccount.project_id,
      //   }),
      // );
    } else {
      // transports.push(new winston.transports.Console());
      // formatters.unshift(winston.format.colorize({ all: true }));
      formatters.unshift(winston.format.cli({ all: true }));
    }

    winston.addColors({
      error: "red",
      info: ["green", "blue"],
      http: "magenta",
      debug: "white",
    });

    const formatter = winston.format.combine(...formatters);

    const logger = winston.createLogger({
      level: "info",
      levels: this.levels,
      format: formatter,
      transports,
    });

    this.logger = logger;
  }

  log(message: string, ...meta: any[]) {
    this.logger.log("info", message, ...meta);
  }

  error(message: string, ...meta: any[]) {
    this.logger.error(message, ...meta);
  }

  warn(message: string, ...meta: any[]) {
    this.logger.warn(message, ...meta);
  }

  debug(_ctx: string, message: string, ...meta: any[]) {
    // const l = debug(ctx);
    // l(message);
    this.logger.debug(message, ...meta);
  }

  info(message: string, ...meta: any[]) {
    this.logger.info(message, ...meta);
  }

  add(transport: winston.transport) {
    this.logger.add(transport);
  }

  get() {
    return this.logger;
  }
}

export const logger = new LoggerService();
