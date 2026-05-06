import { Response } from 'express';

export const successResponse = (res: Response, data: any, message?: string) => {
  return res.json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (res: Response, error: string, statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    error,
  });
};

export const createdResponse = (res: Response, data: any, message?: string) => {
  return res.status(201).json({
    success: true,
    data,
    message,
  });
};

export const noContentResponse = (res: Response) => {
  return res.status(204).send();
};

export const notFoundResponse = (res: Response, message: string = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    error: message,
  });
};

export const unauthorizedResponse = (res: Response, message: string = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    error: message,
  });
};

export const badRequestResponse = (res: Response, message: string = 'Bad request') => {
  return res.status(400).json({
    success: false,
    error: message,
  });
};
