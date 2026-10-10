import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { ErrorsFilter } from "./common/errors.filter.js";
import { env } from "./config/env.js";

export async function createApp() {
  const config = env();
  // rawBody: Razorpay webhooks are verified against the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: config.NODE_ENV === "test" ? false : undefined });
  app.use(helmet());
  app.useGlobalFilters(new ErrorsFilter());
  // Behind the host's load balancer: trust its X-Forwarded-For so rate limits see real client IPs.
  app.getHttpAdapter().getInstance().set?.("trust proxy", 1);
  app.enableCors({ origin: config.CORS_ORIGINS, credentials: true });
  app.enableShutdownHooks();

  if (config.NODE_ENV !== "production") {
    const doc = new DocumentBuilder().setTitle("The Coffee Cat API").setVersion("0.1.0").addBearerAuth().build();
    SwaggerModule.setup("docs", app, () => SwaggerModule.createDocument(app, doc));
  }
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = await createApp();
  await app.listen(env().PORT);
  console.log(`API listening on port ${env().PORT}${env().NODE_ENV === "production" ? "" : " (docs: /docs)"}`);
}
