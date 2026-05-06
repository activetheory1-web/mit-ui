import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import campaignRoutes from './routes/campaign.routes';
import aiRoutes from './routes/ai.routes';
import metaRoutes from './routes/meta.routes';
import googleRoutes from './routes/google.routes';
import oauthRoutes from './routes/oauth.routes';
import analyticsRoutes from './routes/analytics.routes';
import clientRoutes from './routes/client.routes';
import fabricRoutes from './routes/fabric.routes';
import azureRoutes from './routes/azure.routes';

// import errorMiddleware from './middleware/error.middleware';

import { globalLimiter } from './middleware/rateLimit.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import syncJob from './jobs/sync.job';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: true, // Allow all origins for local testing
    credentials: true,
  })
);
app.use(express.json());
app.use(globalLimiter);
app.use(requestLogger);

// Routes
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/fabric', fabricRoutes);
app.use('/api/azure', azureRoutes);



// API Documentation
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'MarketIQ API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Error handling
// app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

  // Start background jobs
  syncJob.start();
});
