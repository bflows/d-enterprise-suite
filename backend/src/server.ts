import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import customerRoutes from './routes/customer.routes';
import serviceRoutes from './routes/service.routes';
import technicianAvailabilityRoutes from './routes/availability.routes';
import jobRoutes from './routes/job.routes';
import mapsRoutes from './routes/maps.routes';
import timeCardRoutes from './routes/timeCard.routes';
import jobActivityRoutes from './routes/jobActivity.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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

const startServer = async () => {
  try {
    await prisma.$connect();

    const server = app.listen(PORT, () => {
      console.log("Server is running on PORT:", PORT);
    });

    const shutdownServer = async (signal: any) => {
      console.log(`Received ${signal}, shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdownServer);
    process.on('SIGTERM', shutdownServer);
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();