import assert from "assert";
import { OpenAPIV3 } from "openapi-types";
import { ZodSchema } from "zod";
import zt from "zod-to-json-schema";

export function errorFromJson(json: any) {
  assert("message" in json, "Error should have message");
  assert("name" in json, "Error should have name");
  assert("stack" in json, "Error should have stack");

  const err = new Error(json.message);
  err.name = json.name;
  err.stack = json.stack;
  err.cause = json.cause;

  return err;
}

export function errorToJson(e: Error) {
  return {
    name: e.name,
    message: e.message,
    stack: e.stack,
    cause: e.cause,
  };
}

export function zodToJsonSchema(dto: ZodSchema<any>) {
  return zt(dto, { name: "dto", target: "openApi3" })?.definitions?.[
    "dto"
  ] as OpenAPIV3.SchemaObject;
}
