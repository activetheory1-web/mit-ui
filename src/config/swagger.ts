import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MarketIQ (MIP) API',
      version: '1.0.0',
      description:
        'Multi-tenant advertising analytics dashboard API with AI-powered dashboard generation via Grok (xAI).\n\n' +
        '## Authentication\n' +
        'Most endpoints require a JWT Bearer token. Obtain one via `POST /auth/login`, then click **Authorize** above and paste it.\n\n' +
        '## Rate Limits\n' +
        '- **Global**: 100 requests/min per IP\n' +
        '- **Auth**: 5 requests/min per IP (login/register)\n' +
        '- **AI**: 10 requests/min per user',
      contact: {
        name: 'Active Theory Solutions',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from /auth/login',
        },
      },
      schemas: {
        // --- Auth ---
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'pm@agency.com' },
            password: { type: 'string', minLength: 6, example: 'securePass123' },
            name: { type: 'string', example: 'Praveen Kumar' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'pm@agency.com' },
            password: { type: 'string', example: 'securePass123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'clx1abc2d0001' },
                email: { type: 'string', example: 'pm@agency.com' },
                name: { type: 'string', example: 'Praveen Kumar' },
              },
            },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // --- Campaign ---
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Summer Sale — Lookalike' },
            clientId: { type: 'string' },
            channel: { type: 'string', enum: ['Meta', 'Google', 'LinkedIn', 'TikTok'] },
            spend: { type: 'number', example: 12500 },
            budget: { type: 'number', example: 25000 },
            roas: { type: 'number', example: 4.2 },
            ctr: { type: 'number', example: 2.8 },
            cpc: { type: 'number', example: 1.45 },
            conv: { type: 'integer', example: 340 },
            status: { type: 'string', enum: ['healthy', 'warning', 'critical'] },
            change: { type: 'number', example: 12.5 },
            impressions: { type: 'integer', example: 450000 },
            clicks: { type: 'integer', example: 12600 },
            frequency: { type: 'number', example: 2.1 },
            active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CampaignCreate: {
          type: 'object',
          required: ['name', 'clientId', 'channel', 'budget'],
          properties: {
            name: { type: 'string', example: 'Holiday Push — Retargeting' },
            clientId: { type: 'string' },
            channel: { type: 'string', enum: ['Meta', 'Google', 'LinkedIn', 'TikTok'] },
            budget: { type: 'number', example: 15000 },
            spend: { type: 'number', example: 0 },
            roas: { type: 'number', example: 0 },
            ctr: { type: 'number', example: 0 },
            cpc: { type: 'number', example: 0 },
            conv: { type: 'integer', example: 0 },
            status: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical'],
              default: 'healthy',
            },
            active: { type: 'boolean', default: true },
          },
        },

        // --- Meta Integrations ---
        MetaConnectRequest: {
          type: 'object',
          required: ['appId', 'appSecret', 'accessToken', 'adAccountId'],
          properties: {
            appId: { type: 'string', example: '1234567890' },
            appSecret: { type: 'string', example: 'abc123def456...' },
            accessToken: { type: 'string', example: 'EAABw...' },
            adAccountId: { type: 'string', example: 'act_12345678' },
          },
        },
        MetaConnection: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            accountName: { type: 'string', example: 'Active Theory Meta Ads' },
            adAccountId: { type: 'string', example: 'act_12345678' },
            status: { type: 'string', enum: ['active', 'syncing', 'error'] },
            lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
            syncError: { type: 'string', nullable: true },
            campaignCount: { type: 'integer', example: 12 },
          },
        },

        // --- Dashboard ---
        Dashboard: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Meta Performance Overview' },
            description: {
              type: 'string',
              example: 'Weekly performance metrics for Meta campaigns',
            },
            clientId: { type: 'string' },
            widgets: { type: 'integer', example: 6 },
            updated: { type: 'string', format: 'date-time' },
            schedule: { type: 'string', nullable: true, example: 'Weekly' },
            recipients: { type: 'integer', example: 3 },
            favorite: { type: 'boolean', example: false },
            color: { type: 'string', example: 'from-blue-500 to-indigo-600' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DashboardCreate: {
          type: 'object',
          required: ['name', 'description', 'clientId'],
          properties: {
            name: { type: 'string', example: 'New Dashboard' },
            description: { type: 'string', example: 'Campaign overview dashboard' },
            clientId: { type: 'string' },
            widgets: { type: 'integer', example: 4 },
            updated: { type: 'string', format: 'date-time' },
            schedule: { type: 'string', nullable: true },
            recipients: { type: 'integer', example: 1 },
            favorite: { type: 'boolean', default: false },
            color: { type: 'string', example: 'from-violet-500 to-purple-600' },
          },
        },

        // --- AI ---
        AIGenerateRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', example: 'Show me top 5 campaigns by spend' },
            clientId: {
              type: 'string',
              description: 'Optional — scope results to a specific client',
            },
          },
        },
        AIGenerateResponse: {
          type: 'object',
          properties: {
            widgets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['bar_chart', 'kpi_card', 'table'] },
                  title: { type: 'string', example: 'Top campaigns by spend' },
                  metric: { type: 'string', example: 'spend' },
                  data: { type: 'array', items: { type: 'object' } },
                },
              },
            },
            fromCache: { type: 'boolean', example: false },
          },
        },

        // --- Errors ---
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Resource not found' },
            message: { type: 'string', example: 'Please try again.' },
          },
        },
        RateLimitError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Too many requests' },
            message: { type: 'string', example: 'Please try again in a minute.' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
