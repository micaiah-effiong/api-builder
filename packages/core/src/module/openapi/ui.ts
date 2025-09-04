import { NextFunction, Request, Response } from "express";
import * as path from "path";
import serve from "serve-static";
import { SwaggerUIOptions } from "swagger-ui";

export function serveSwaggerUI(documentUrl: string, opts: SwaggerUIOptions) {
  const { plugins, presets, ...options } = opts;

  return [
    serve(path.resolve(require.resolve("swagger-ui-dist"), ".."), {
      index: false,
    }),
    function returnUiInit(req: Request, res: Response, next: NextFunction) {
      if (req.path.endsWith("/swagger-ui-init.js")) {
        res.type(".js");
        res.send(`window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: '${documentUrl}',
    dom_id: '#swagger-ui',
    ${plugins?.length ? `plugins: [${plugins}],` : ""}
    ${presets?.length ? `presets: [${presets}],` : ""}
    ...${JSON.stringify(options)}
  })
}`);
      } else {
        next();
      }
    },
    function renderSwaggerHtml(req: Request, res: Response) {
      res.type("html").send(
        renderHtmlPage(
          "Swagger UI",
          `
      <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >
      <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
      <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />
    `,
          `
      <div id="swagger-ui"></div>
      <script src="./swagger-ui-bundle.js"></script>
      <script src="./swagger-ui-standalone-preset.js"></script>
      <script src="./swagger-ui-init.js"></script>
    `,
        ),
      );
    },
  ];
}

function renderHtmlPage(title: string, head: string, body: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html {
          box-sizing: border-box;
          overflow: -moz-scrollbars-vertical;
          overflow-y: scroll;
      }
      *,
      *:before,
      *:after {
          box-sizing: inherit;
      }
      body {
        margin: 0;
        padding: 0;
        background: #fafafa;
      }
    </style>
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html>
  `;
}
