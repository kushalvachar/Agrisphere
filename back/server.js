// server.js — entry point
// Loads env vars, connects to MongoDB, mounts routes, starts the HTTP server.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { connectHistoricalDB } from './src/config/historicalDb.js'; // Feature: Historical Market Data (MONGO_URI2) — separate connection
import { errorHandler } from './src/middleware/errorHandler.js';

import marketRoutes from './src/routes/markets.js';
import buyerRoutes from './src/routes/buyers.js';
import storageRoutes from './src/routes/storage.js';
import logisticsRoutes from './src/routes/logistics.js';
import recommendationRoutes from './src/routes/recommendation.js';
import qualityRoutes from './src/routes/quality.js';
import lotRoutes from './src/routes/lots.js';
import transactionRoutes from './src/routes/transactions.js';
import disputeRoutes from './src/routes/disputes.js';
import aiRoutes from './src/routes/ai.js';
import authRoutes from './src/routes/auth.js';                       // Phase 5
import farmerRoutes from './src/routes/farmers.js';
import arrivalRoutes from './src/routes/arrivals.js';               // Feature 1
import demandForecastRoutes from './src/routes/demandForecast.js';  // Feature 2
import offerRoutes from './src/routes/offers.js';                   // Feature 3
import channelRoutes from './src/routes/channels.js';               // Feature 5
import shipmentRoutes from './src/routes/shipments.js';              // Phase 8
import analyticsRoutes from './src/routes/analytics.js';             // Phase 11
import translateRoutes from './src/routes/translate.js';             // Enhancement 3: bulk UI-string translation
import { startHistoryScheduler } from './src/services/historyScheduler.js'; // Phase 2

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10mb to allow base64 crop images

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'AgriSphere AI backend' }));

app.use('/api/auth', authRoutes);                       // Phase 5: Buyer + FPO + Farmer Authentication
app.use('/api/farmers', farmerRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/recommendation', recommendationRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/arrivals', arrivalRoutes);               // Feature 1: Arrival Volume Intelligence
app.use('/api/demand-forecast', demandForecastRoutes);  // Feature 2: Buyer Demand Forecasting
app.use('/api/offers', offerRoutes);                    // Feature 3: Digital Offer & Negotiation System
app.use('/api/channels', channelRoutes);                // Feature 5
app.use('/api/shipments', shipmentRoutes);              // Phase 8
app.use('/api/analytics', analyticsRoutes);             // Phase 11: Multi-Channel Market Comparison
app.use('/api/translate', translateRoutes);             // Enhancement 3: bulk UI-string translation (JigsawStack)
// Feature 4 (Institutional Buyer Integration) extends the existing
// /api/buyers route above with buyerType/channel query filters — see
// controllers/buyerController.js.

// 404 fallback
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().finally(() => {
  // Historical dataset (MONGO_URI2) is a fully independent connection —
  // its own finally() so a slow/unreachable secondary DB never delays
  // the primary DB connection or server startup either.
  connectHistoricalDB().finally(() => {
    // Even if MongoDB fails to connect, we still start the server so the
    // frontend demo does not completely die — routes that need DB will
    // return a clear fallback error instead of crashing the process.
    app.listen(PORT, () => {
      console.log(`AgriSphere AI backend running on http://localhost:${PORT}`);
      startHistoryScheduler(); // Phase 2: keep growing real 30-day price history in the background
    });
  });
});