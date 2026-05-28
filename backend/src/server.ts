import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { prisma, disconnectPrisma } from './lib/prisma';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import customerRoutes from './routes/customer.routes';
import serviceRoutes from './routes/service.routes';
import technicianAvailabilityRoutes from './routes/availability.routes';
import jobRoutes from './routes/job.routes';
import mapsRoutes from './routes/maps.routes';
import timeCardRoutes from './routes/timeCard.routes';
import jobActivityRoutes from './routes/jobActivity.routes';
import invoiceRoutes from './routes/invoice.routes';
import inboxRoutes from './routes/inbox.routes';
import { handleStripeWebhook } from './controllers/stripe.webhook.controllers';
import {
  handleTwilioInboundSms,
  handleTwilioStatusCallback,
} from './controllers/twilio.webhook.controllers';
import { startJob24hReminderCron, stopJob24hReminderCron } from './services/job24hReminderCron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Twilio webhook signature URLs behind ngrok / load balancers.
app.set('trust proxy', 1);

const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// Middleware
app.use(cors({
  origin: frontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Stripe webhooks require the raw body for signature verification (must run before express.json()).
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response, next) => {
    void Promise.resolve(handleStripeWebhook(req, res)).catch(next);
  }
);

// Twilio webhooks use application/x-www-form-urlencoded (must run before express.json()).
app.post(
  '/api/twilio/webhook/sms',
  express.urlencoded({ extended: false }),
  (req: Request, res: Response, next) => {
    void Promise.resolve(handleTwilioInboundSms(req, res)).catch(next);
  }
);
app.post(
  '/api/twilio/webhook/status',
  express.urlencoded({ extended: false }),
  (req: Request, res: Response, next) => {
    void Promise.resolve(handleTwilioStatusCallback(req, res)).catch(next);
  }
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/availability', technicianAvailabilityRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/time-cards', timeCardRoutes);
app.use('/api/job-activity', jobActivityRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/inbox', inboxRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

let isShuttingDown = false;

const startServer = async () => {
  try {
    await prisma.$connect();

    const server = app.listen(Number(PORT), '0.0.0.0', () => {
      console.log("Server is running on PORT:", PORT);
      startJob24hReminderCron();
    });

    const shutdownServer = async (signal: string) => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;
      console.log(`Received ${signal}, shutting down...`);
      stopJob24hReminderCron();
      server.close(async () => {
        await disconnectPrisma();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdownServer);
    process.on('SIGTERM', shutdownServer);
  } catch (error) {
    console.error("Failed to start server:", error);
    await disconnectPrisma();
    process.exit(1);
  }
};

startServer();