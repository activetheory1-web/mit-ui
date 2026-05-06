import { registerSchema, loginSchema } from '../../validators/auth.validator';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    const valid = {
      body: { email: 'test@example.com', password: 'password123', name: 'Test User' },
    };

    it('should pass for valid registration data', () => {
      expect(() => registerSchema.parse(valid)).not.toThrow();
    });

    it('should fail for invalid email', () => {
      expect(() =>
        registerSchema.parse({ body: { ...valid.body, email: 'not-an-email' } })
      ).toThrow();
    });

    it('should fail for password shorter than 6 characters', () => {
      expect(() => registerSchema.parse({ body: { ...valid.body, password: '123' } })).toThrow();
    });

    it('should fail for name shorter than 2 characters', () => {
      expect(() => registerSchema.parse({ body: { ...valid.body, name: 'A' } })).toThrow();
    });

    it('should fail when email is missing', () => {
      const { email, ...rest } = valid.body;
      expect(() => registerSchema.parse({ body: rest })).toThrow();
    });
  });

  describe('loginSchema', () => {
    const valid = { body: { email: 'test@example.com', password: 'password123' } };

    it('should pass for valid login data', () => {
      expect(() => loginSchema.parse(valid)).not.toThrow();
    });

    it('should fail for invalid email', () => {
      expect(() => loginSchema.parse({ body: { ...valid.body, email: 'bad' } })).toThrow();
    });

    it('should fail for empty password', () => {
      expect(() => loginSchema.parse({ body: { ...valid.body, password: '' } })).toThrow();
    });
  });
});
