import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type * as express from 'express';
import { ErrorCodes } from '@pdfcleaner/shared';

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
}

interface PrismaException {
  code: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<express.Response>();
    const request = ctx.getRequest<express.Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let errorCode: string = ErrorCodes.UNKNOWN_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        | string
        | ExceptionResponseObject;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        // Handle validation errors or custom HTTP exceptions
        if (Array.isArray(exceptionResponse.message)) {
          message = exceptionResponse.message.join(', ');
        } else {
          message =
            exceptionResponse.message || exceptionResponse.error || message;
        }
      }

      // Map HTTP Statuses to shared error codes
      if (status === HttpStatus.BAD_REQUEST) {
        errorCode = ErrorCodes.VALIDATION_ERROR;
      } else if (status === HttpStatus.UNAUTHORIZED) {
        errorCode = ErrorCodes.UNAUTHORIZED;
      } else if (status === HttpStatus.FORBIDDEN) {
        errorCode = ErrorCodes.FORBIDDEN;
      } else if (status === HttpStatus.NOT_FOUND) {
        errorCode = ErrorCodes.NOT_FOUND;
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as PrismaException).code === 'P2002'
    ) {
      // Prisma unique constraint violation
      status = HttpStatus.BAD_REQUEST;
      errorCode = ErrorCodes.VALIDATION_ERROR;
      message = 'Entity already exists';
    }

    console.error(`[Error] ${request.method} ${request.url}`, exception);

    response.status(status).json({
      success: false,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
