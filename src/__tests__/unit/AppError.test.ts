import { AppError } from '../../utils/AppError';

describe('AppError', () => {
  it('should create an error with a message and statusCode', () => {
    const error = new AppError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
  });

  it('should set isOperational to true', () => {
    const error = new AppError('Forbidden', 403);
    expect(error.isOperational).toBe(true);
  });

  it('should be an instance of Error', () => {
    const error = new AppError('Server Error', 500);
    expect(error).toBeInstanceOf(Error);
  });
});
