import { Router } from "express";
import { OpenAPIV3 } from "openapi-types";
import { Parameter, Wildcard } from "path-to-regexp";

export type GetComponentObject<T, U extends keyof T> = Exclude<
  T[U] extends undefined ? never : T[U],
  undefined
>;

export interface RouterInfo {
  name: string;
  path: string;
  stackSize: number;
}

export interface PathInfo {
  attemptedPath: string;
  routerName: string;
}

export interface Keys extends Omit<Parameter, "type">, Omit<Wildcard, "type"> {
  type: Parameter["type"] | Wildcard["type"];
  required: boolean;
}

export type Layer = Router["stack"][number];

export type OpenAPIGeneratorOpts = {
  shouldWarnNotThrow?: boolean;

  baseDoc: OpenAPIV3.Document;
};

export interface OpenAPIOptions {
  baseDoc: OpenAPIV3.Document;
  // docPrefix?: string
}

// Add type augmentation for middleware
declare global {
  namespace Express {
    interface Request {
      app: {
        router: Router;
      };
    }
  }
}
