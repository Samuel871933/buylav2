import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { sequelize } from '@buyla/db';
import authRoutes from './routes/auth.routes';
import trackingRoutes from './routes/tracking.routes';
import linksRoutes from './routes/links.routes';
import ambassadorRoutes from './routes/ambassador.routes';
import webhooksRoutes from './routes/webhooks.routes';
import adminRoutes from './routes/admin.routes';
import adminStatsRoutes from './routes/admin-stats.routes';
import adminCrudRoutes from './routes/admin-crud.routes';
import notificationRoutes from './routes/notification.routes';
import cashbackRoutes from './routes/cashback.routes';
import adminOperationsRoutes from './routes/admin-operations.routes';
import payoutRoutes from './routes/payout.routes';
import adminPayoutsRoutes from './routes/admin-payouts.routes';
import { checkMaintenance } from './middleware/maintenance.middleware';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ──
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Global rate limit (100 req / min per IP)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
}));

// Maintenance mode check
app.use(checkMaintenance);

// ── Routes ──
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/ambassador', ambassadorRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminCrudRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cashback', cashbackRoutes);
app.use('/api/admin', adminOperationsRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/admin', adminPayoutsRoutes);

// ── Global error handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne' } });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
