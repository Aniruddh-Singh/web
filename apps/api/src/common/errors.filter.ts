import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from "@nestjs/common";
import { randomUUID } from "node:crypto";

/**
 * Expected errors (4xx) pass through with their friendly message. Anything unexpected is logged
 * in full with a reference id, and the customer sees only a generic message plus that id.
 */
@Catch()
export class ErrorsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Errors");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ headersSent?: boolean; status: (c: number) => { json: (b: unknown) => void } }>();
    const req = ctx.getRequest<{ method?: string; url?: string }>();
    if (res.headersSent) return;

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const body = exception.getResponse();
      res.status(exception.getStatus()).json(typeof body === "string" ? { message: body } : body);
      return;
    }
    const ref = randomUUID().slice(0, 8);
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    this.logger.error(`[${ref}] ${req.method} ${req.url} -> ${status}`, exception instanceof Error ? exception.stack : String(exception));
    const message = exception instanceof HttpException && status !== 500 ? (exception.getResponse() as { message?: string }).message : undefined;
    res.status(status).json({ message: message ?? `Something went wrong on our side. If it keeps happening, quote reference ${ref}.`, ref });
  }
}
