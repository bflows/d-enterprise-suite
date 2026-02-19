import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);

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