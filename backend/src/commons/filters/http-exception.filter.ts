import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLogger } from '../logger/structured-logger.service';

const logger = new StructuredLogger();

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        logger.error('[HttpExceptionFilter] Error 5xx:', {
          name: (exception as any).name,
          message: (exception as any).message,
          stack: (exception as any).stack,
        });
      }
    } else {
      // No normalizar nunca: se loguea el detalle y se devuelve un 500 genérico
      // al cliente (sin internals) — ISO 27001 A.12.4 / A.14.2.5.
      logger.error('[HttpExceptionFilter] Unhandled:', {
        name: (exception as any)?.name,
        message: (exception as any)?.message,
        stack: (exception as any)?.stack,
      });
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Error interno del servidor';

    response.status(status).json({
      statusCode: status,
      path: request.url,
      correlationId: (request as any).correlationId,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}