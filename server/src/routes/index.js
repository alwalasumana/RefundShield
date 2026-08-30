import express from 'express';
import { login, register, getMe } from '../controllers/authController.js';
import { getCustomers, getCustomerById } from '../controllers/customerController.js';
import { getOrders, getOrderById } from '../controllers/orderController.js';
import { getRefunds, getRefundById } from '../controllers/refundController.js';
import { getCases, getCaseById, getSuspiciousCases, reviewCase } from '../controllers/caseController.js';
import { getRelationshipGraph } from '../controllers/graphController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { investigateWithAI } from '../controllers/aiController.js';
import { simulateCheckout } from '../controllers/sandboxController.js';
import { getProducts } from '../controllers/productController.js';
import { getGuardrails, updateGuardrails, compileGuardrails } from '../controllers/guardrailController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/me', authenticateToken, getMe);

// Customers
router.get('/customers', authenticateToken, getCustomers);
router.get('/customers/:id', authenticateToken, getCustomerById);

// Orders
router.get('/orders', authenticateToken, getOrders);
router.get('/orders/:id', authenticateToken, getOrderById);

// Refunds
router.get('/refunds', authenticateToken, getRefunds);
router.get('/refunds/:id', authenticateToken, getRefundById);

// Cases
router.get('/cases/suspicious', authenticateToken, getSuspiciousCases);
router.get('/cases', authenticateToken, getCases);
router.get('/cases/:id', authenticateToken, getCaseById);
router.patch('/cases/:id/review', authenticateToken, reviewCase);

// Graph
router.get('/graph/:customerId', authenticateToken, getRelationshipGraph);

// AI Investigation
router.post('/ai/investigate', authenticateToken, investigateWithAI);

// Sandbox Checkout
router.post('/sandbox/checkout', authenticateToken, simulateCheckout);

// Products List
router.get('/products', authenticateToken, getProducts);

// Guardrails Settings
router.get('/guardrails', authenticateToken, getGuardrails);
router.post('/guardrails', authenticateToken, updateGuardrails);
router.post('/guardrails/compile', authenticateToken, compileGuardrails);

// Dashboard Stats
router.get('/dashboard/stats', authenticateToken, getDashboardStats);

export default router;
