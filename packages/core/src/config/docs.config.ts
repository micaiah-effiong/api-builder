import { ExpressOpenAPI } from "../module/openapi";

const description = "";
const version = 1;
const title = "";

export const openapi = ExpressOpenAPI({
  shouldWarnNotThrow: true,
  baseDoc: {
    openapi: "3.0.3",
    info: {
      title,
      description,
      version: "1.0.0",
    },
    paths: {},
  },
});
