import { openapi } from "@micaiah_effiong/core";
import { Router } from "express";

// router.ts
const emailRouter = Router();
emailRouter.post(
  "/send",
  openapi.path({ responses: { "200": {} as any } }),
  (_, res) => {
    res.json({ status: true, message: "email sent" });
  },
);

openapi.schemas("RegisterResponse", {
  type: "object",
  additionalProperties: false,
  required: ["message", "data"],
  properties: {
    message: { type: "string", example: "Success" },
    data: {
      allOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["token"],
          properties: {
            token: {
              type: "string",
              format: "jwt",
              pattern: "^[\\w-]+.[\\w-]+.[\\w-]+$",
            },
          },
        },
      ],
    },
  },
});

//
export const apiRouter = Router();
apiRouter.get(
  "/test",
  openapi.path({
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RegisterResponse",
            },
          },
        },
      },
    },
  }),
  (_req, res) => res.json({ status: true }),
);

const tstdoc = openapi.path({
  responses: {
    "200": {
      description: "Error",
      content: {
        "application/json": {
          example: {
            status: true,
            data: [],
          },
        },
      },
    },
  },
});

apiRouter.get("/error", tstdoc, (_, _res) => {
  throw new Error("Test error");
});

// apiRouter.use("/email", emailRouter);
apiRouter.use(...openapi.use("/email", emailRouter));
