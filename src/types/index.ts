// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUser {
  email: string;
  password: string;
  name: string;
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Client types
export interface Client {
  id: string;
  name: string;
  industry: string;
  tenantId: string;
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClient {
  name: string;
  industry: string;
  tenantId: string;
  platforms: string[];
}

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  clientId: string;
  channel: string;
  spend: number;
  budget: number;
  roas: number;
  ctr: number;
  cpc: number;
  conv: number;
  status: string;
  change: number;
  impressions: number;
  clicks: number;
  frequency: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaign {
  name: string;
  clientId: string;
  channel: string;
  spend: number;
  budget: number;
  roas: number;
  ctr: number;
  cpc: number;
  conv: number;
  status: string;
  change: number;
  impressions: number;
  clicks: number;
  frequency: number;
  active: boolean;
}

// Dashboard types
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  clientId: string;
  widgets: number;
  updated: Date;
  schedule: string | null;
  recipients: number;
  favorite: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboard {
  name: string;
  description: string;
  clientId: string;
  widgets: number;
  updated: Date;
  schedule: string | null;
  recipients: number;
  favorite: boolean;
  color: string;
}

// Auth types
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
