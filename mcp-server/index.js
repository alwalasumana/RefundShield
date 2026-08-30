import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/refundshield';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.error('MCP Server connected to MongoDB'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Lightweight Mongoose schemas for tools queries
const CustomerSchema = new mongoose.Schema({}, { strict: false });
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema, 'customers');

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema, 'orders');

const RefundSchema = new mongoose.Schema({}, { strict: false });
const Refund = mongoose.models.Refund || mongoose.model('Refund', RefundSchema, 'refunds');

const CaseSchema = new mongoose.Schema({}, { strict: false });
const InvestigationCase = mongoose.models.InvestigationCase || mongoose.model('InvestigationCase', CaseSchema, 'investigationcases');

// Create the MCP Server
const server = new Server(
  {
    name: 'refundshield-risk-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_risk_overview',
        description: 'Retrieve general stats on active fraud rings, values under investigation, and open case files.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'inspect_customer_network',
        description: 'Retrieve the detailed network connections (shared devices, shared addresses, and refund counts) for a suspect customer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The customer ID to inspect (e.g. cust_NET3_003).',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'enforce_risk_decision',
        description: 'Suspend customer accounts and block active refunds in MongoDB for a fraud ring.',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: {
              type: 'string',
              description: 'The Case ID to update (e.g. CASE-NET1-001).',
            },
            decision: {
              type: 'string',
              enum: ['BLOCK', 'VERIFY'],
              description: 'The decision verdict (BLOCK to suspend accounts, VERIFY to clear them).',
            },
            notes: {
              type: 'string',
              description: 'Auditor notes explaining the action.',
            },
          },
          required: ['caseId', 'decision'],
        },
      },
    ],
  };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_risk_overview') {
      const activeCases = await InvestigationCase.countDocuments({ status: 'PENDING' });
      const completedReviews = await InvestigationCase.countDocuments({ status: { $in: ['VERIFIED', 'CONFIRMED_ABUSE', 'RESOLVED'] } });
      const refunds = await Refund.find({});
      const totalRefundValue = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              activeCasesInQueue: activeCases,
              completedReviewsCount: completedReviews,
              totalRefundValueTracked: `₹${totalRefundValue.toLocaleString()}`,
              description: 'RefundShield platform is monitoring 5,000+ customer records.'
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'inspect_customer_network') {
      const { customerId } = args;
      const customer = await Customer.findOne({ customerId });
      if (!customer) {
        return {
          content: [{ type: 'text', text: `Error: Customer ${customerId} not found.` }],
        };
      }

      // Fetch orders and refunds
      const orders = await Order.find({ customerId });
      const deviceIds = [...new Set(orders.map(o => o.deviceId))];
      const addressIds = [...new Set(orders.map(o => o.addressId))];

      // Find other customers sharing this device or address
      const sharingCustomers = await Order.find({
        $or: [
          { deviceId: { $in: deviceIds } },
          { addressId: { $in: addressIds } }
        ],
        customerId: { $ne: customerId }
      }).distinct('customerId');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              target: {
                customerId: customer.customerId,
                name: customer.name,
                riskScore: customer.riskScore,
                riskLevel: customer.riskLevel,
                status: customer.status
              },
              associatedDevices: deviceIds,
              associatedAddresses: addressIds,
              connectedAccountsCount: sharingCustomers.length,
              connectedCustomerIds: sharingCustomers,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'enforce_risk_decision') {
      const { caseId, decision, notes } = args;
      
      const cleanCaseId = caseId.startsWith('CASE-') ? caseId : `CASE-${caseId}`;
      const caseItem = await InvestigationCase.findOne({ caseId: cleanCaseId });
      if (!caseItem) {
        return {
          content: [{ type: 'text', text: `Error: Case File ${cleanCaseId} not found.` }],
        };
      }

      const statusMap = decision === 'BLOCK' ? 'CONFIRMED_ABUSE' : 'VERIFIED';
      caseItem.status = statusMap;
      caseItem.reviewerNotes = notes || 'Executed via Risk MCP Server';
      caseItem.reviewedAt = new Date();
      caseItem.reviewedBy = 'AI MCP Agent';
      
      if (decision === 'BLOCK') {
        caseItem.recommendedAction = 'BLOCK';
        // Suspend customers
        await Customer.updateMany(
          { customerId: { $in: caseItem.customerIds?.length ? caseItem.customerIds : [caseItem.primaryCustomerId] } },
          { $set: { status: 'SUSPENDED', riskLevel: 'CRITICAL', riskScore: 95 } }
        );
      } else {
        caseItem.recommendedAction = 'VERIFY';
      }

      await caseItem.save();

      return {
        content: [
          {
            type: 'text',
            text: `Success: Case ${cleanCaseId} status updated to ${statusMap}. Customer profiles suspended: ${decision === 'BLOCK'}.`,
          },
        ],
      };
    }

    return {
      content: [{ type: 'text', text: `Error: Tool ${name} not found.` }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error running tool: ${err.message}` }],
    };
  }
});

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('RefundShield Risk MCP Server running on stdio');
