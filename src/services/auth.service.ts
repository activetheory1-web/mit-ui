import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    const { email, password, name } = data;

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    } catch (prismaError) {
      console.warn('Prisma check user exists failed, falling back to Supabase REST API');
      const { supabase } = require('../config/supabase');
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (error) throw error;
      existingUser = data;
    }

    if (existingUser) {
      throw new Error('User already exists');
    }


    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    try {
      // Create user in Prisma
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });
    } catch (prismaError) {
      console.warn('Prisma registration failed, falling back to Supabase REST API');
      const { supabase } = require('../config/supabase');
      const { data: inserted, error: insertError } = await supabase
        .from('User')
        .insert([{
          email,
          password: hashedPassword,
          name,
          createdAt: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      user = inserted;
    }

    // Generate token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }


  async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch (prismaError) {
      console.warn('Prisma login failed, falling back to Supabase REST API');
      const { supabase } = require('../config/supabase');
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (error) throw error;
      user = data;
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }


    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
  }

  verifyToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export default new AuthService();
