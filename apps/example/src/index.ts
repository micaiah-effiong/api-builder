import { CreateApplicationService } from "@repo/core";
import { apiRouter } from "./router";

// index.ts
const createApp = new CreateApplicationService({
  docConfig: {},
});

const app = createApp
  .addApi(apiRouter)
  .addNotFoundHandler((_, res) => {
    res.status(404).json({ status: false, message: "Route Not Found" });
  })
  .addErrorRequestHandler((err, _, res, _next) => {
    console.error(err);
    res
      .status(500)
      .json({ status: false, message: err.message || "Internal server error" });
  })
  .build();

app.listen(3000, () => {
  console.log("RUNNING");
});
