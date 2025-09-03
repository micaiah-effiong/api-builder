import winston from "winston";
import { env } from "../../env";

type LoggerProps = {
  prodOnlyTransports?: winston.transport[];
  formatters?: Array<winston.Logform.Format>;
};

export class LoggerService {
  private readonly levels = winston.config.npm.levels;

  private _logger: winston.Logger;
  private env: Required<NodeJS.ProcessEnv> = env;

  constructor(private opt?: LoggerProps) {
    this._logger = {} as any;
    this.createLogger();
  }

  private createLogger() {
    const transports: winston.transport[] = [];
    const formatters: winston.Logform.Format[] = [];

    if (this.opt?.formatters?.length) {
      formatters.push(...this.opt.formatters);
    } else {
      const formats = [
        winston.format.metadata({
          fillExcept: [
            "message",
            "level",
            "timestamp",
            "label",
            "pid",
            "stack",
          ],
        }),
        winston.format.timestamp({ format: "YYYY-MM-DD, HH:mm:ss:ms" }),
        winston.format.splat(),
        winston.format.json(),
        winston.format.errors({ stack: true }),
      ];
      formatters.push(...formats);
    }

    if (this.env.NODE_ENV === "production" && this.opt?.prodOnlyTransports) {
      transports.push(...this.opt?.prodOnlyTransports);
    } else {
      transports.push(
        new winston.transports.Console({
          format: winston.format.cli({ all: true, levels: this.levels }),
          level: "silly",
        }),
      );
    }

    winston.addColors({
      error: "red",
      info: ["green", "blue"],
      http: "magenta",
      debug: "white",
    });

    const format = winston.format.combine(...formatters);

    const logger = winston.createLogger({
      format,
      level: "http",
      levels: this.levels,
      transports,
      defaultMeta: { pid: process.pid },
    });

    this._logger = logger;
  }

  log(entry: winston.LogEntry): void;
  log(level: string, message: any): void;
  log(level: string, message: string, ...meta: any[]): void;
  log(entry: string | winston.LogEntry, message?: string, ...meta: any[]) {
    if (typeof entry === "string") {
      this._logger.log(entry, message || "", ...meta);
    } else {
      this._logger.log(entry);
    }
  }

  error(message: string, ...meta: any[]) {
    this._logger.error(message, ...meta);
  }

  warn(message: string, ...meta: any[]) {
    this._logger.warn(message, ...meta);
  }

  debug(message: string, ...meta: any[]) {
    this._logger.debug(message, ...meta);
  }

  info(message: string, ...meta: any[]) {
    this._logger.info(message, ...meta);
  }

  add(transport: winston.transport) {
    this._logger.add(transport);
  }

  get logger() {
    return this._logger;
  }

  set logger(logger: winston.Logger) {
    this._logger = logger;
  }
}

export const logger = new LoggerService();
