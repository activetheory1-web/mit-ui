# MIP Backend

Backend API for the MarketIQ Platform - a multi-tenant advertising analytics dashboard.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL installed and running
- npm or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mip_db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CLAUDE_API_KEY="your-claude-api-key"
FRONTEND_URL="http://localhost:5173"
```

3. Set up the database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database (optional)
npx ts-node prisma/seed.ts
```

### Running the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Campaigns

All campaign endpoints require authentication.

- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get single campaign
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Dashboards

All dashboard endpoints require authentication.

- `GET /api/dashboard` - Get all dashboards
- `GET /api/dashboard/:id` - Get single dashboard
- `POST /api/dashboard` - Create new dashboard
- `PUT /api/dashboard/:id` - Update dashboard
- `DELETE /api/dashboard/:id` - Delete dashboard

## Database Schema

### User
- `id` - Unique identifier
- `email` - User email (unique)
- `password` - Hashed password
- `name` - User name
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Tenant
- `id` - Unique identifier
- `name` - Tenant name
- `userId` - Associated user
- `clients` - Related clients

### Client
- `id` - Unique identifier
- `name` - Client name
- `industry` - Client industry
- `tenantId` - Associated tenant
- `platforms` - Advertising platforms used
- `campaigns` - Related campaigns

### Campaign
- `id` - Unique identifier
- `name` - Campaign name
- `clientId` - Associated client
- `channel` - Advertising channel
- `spend` - Amount spent
- `budget` - Campaign budget
- `roas` - Return on ad spend
- `ctr` - Click-through rate
- `cpc` - Cost per click
- `conv` - Conversions
- `status` - Campaign status
- `change` - Performance change
- `impressions` - Number of impressions
- `clicks` - Number of clicks
- `frequency` - Ad frequency
- `active` - Active status

### Dashboard
- `id` - Unique identifier
- `name` - Dashboard name
- `description` - Dashboard description
- `clientId` - Associated client
- `widgets` - Number of widgets
- `updated` - Last update timestamp
- `schedule` - Report schedule
- `recipients` - Number of recipients
- `favorite` - Favorite status
- `color` - Dashboard color theme

## Development

### Prisma Studio

View and edit your database:
```bash
npm run prisma:studio
```

### Running Migrations

Create a new migration:
```bash
npm run prisma:migrate
```

### Generating Prisma Client

After schema changes:
```bash
npm run prisma:generate
```

## Testing

Test the API using Postman, curl, or any HTTP client.

### Example: Register a user
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Example: Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Example: Get campaigns (with auth)
```bash
curl -X GET http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts       # Prisma client setup
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── campaign.controller.ts
│   │   └── dashboard.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── campaign.routes.ts
│   │   └── dashboard.routes.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── response.util.ts
│   └── index.ts               # Server entry point
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts               # Seed data
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Next Steps

This is the basic backend foundation. Future enhancements include:

- [ ] AI Engine integration with Claude API
- [ ] Real data integration with Meta/Google Ads APIs
- [ ] OAuth connector flows
- [ ] Redis caching
- [ ] Microsoft Fabric integration
- [ ] Multi-tenant data isolation
- [ ] Rate limiting
- [ ] Input validation with Zod
- [ ] Comprehensive error handling
- [ ] API documentation with Swagger
- [ ] Unit and integration tests

## License

ISC