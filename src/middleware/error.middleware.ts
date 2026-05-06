import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

export const errorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error(error.message || 'Unknown error', {
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = null;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = error.issues.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate field value entered';
    } else if (error.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      statusCode = 400;
      message = `Database Error: ${error.message}`;
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export default errorMiddleware;
