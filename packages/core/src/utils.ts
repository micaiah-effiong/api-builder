import assert from "assert";

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
