import exp from 'express';
import { connect } from 'mongoose';
import { config } from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { adminApp } from './APIs/AdminAPI.js';
import { commonApp } from './APIs/CommonAPI.js';
import { menuApp } from './APIs/MenuAPI.js';
import { skipMealApp } from './APIs/SkipMealAPI.js';
import { kitchenApp } from './APIs/KitchenAPI.js';
import { orderApp } from './APIs/OrderAPI.js';

import { UserModel } from './models/UserModel.js';

config();

// Express app
const app = exp();

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://dabba-service-lilac.vercel.app'
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use(cookieParser());
app.use(exp.json());

// Routes
app.use('/admin-api', adminApp);
app.use('/auth', commonApp);
app.use('/menu', menuApp);
app.use('/skip-meal', skipMealApp);
app.use('/kitchen', kitchenApp);
app.use('/orders', orderApp);

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
  });
});

// Port
const port = process.env.PORT || 4000;

let isConnected = false;

// Database connection
const connectDB = async () => {
  if (isConnected) return;

  try {
    await connect(process.env.DB_URL);

    isConnected = true;

    await UserModel.syncIndexes();

    console.log('DB connected');
  } catch (err) {
    console.error('DB connection error:', err.message);
    console.error(
      'Continuing without DB connection (development mode). Some features will be unavailable.'
    );
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer();

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});