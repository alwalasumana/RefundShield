import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import Customer from './models/Customer.js';
import { seedDatabase } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/refundshield';

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'RefundShield Backend API', timestamp: new Date() });
});

async function startServer() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected!');

    // Auto-seed if database has 0 customers
    const count = await Customer.countDocuments();
    if (count === 0) {
      console.log('Database empty! Running automatic synthetic data seeder...');
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` RefundShield Express Server Running on Port ${PORT}`);
      console.log(` API Base URL: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
