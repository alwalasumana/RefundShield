import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/Customer.js';
import Device from './models/Device.js';
import Address from './models/Address.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Refund from './models/Refund.js';
import InvestigationCase from './models/InvestigationCase.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/refundshield';

const NUM_CUSTOMERS = parseInt(process.env.SEED_CUSTOMERS || '5000', 10);
const NUM_ORDERS = parseInt(process.env.SEED_ORDERS || '10000', 10);
const NUM_REFUNDS = parseInt(process.env.SEED_REFUNDS || '3000', 10);
const NUM_DEVICES = parseInt(process.env.SEED_DEVICES || '1000', 10);
const NUM_ADDRESSES = parseInt(process.env.SEED_ADDRESSES || '3000', 10);

const REAL_PRODUCTS = [
  { productId: 'prod_00001', title: 'Apple iPhone 15 Pro Max 256GB (Natural Titanium)', category: 'Electronics', price: 159900, sku: 'SKU-APL-IPH15PM', isHighRisk: true },
  { productId: 'prod_00002', title: 'Sony WH-1000XM5 Wireless Headphones (Black)', category: 'Electronics', price: 29990, sku: 'SKU-SNY-WH1005', isHighRisk: true },
  { productId: 'prod_00003', title: 'Apple MacBook Pro 16-inch M3 Max (36GB Unified Memory)', category: 'Electronics', price: 349900, sku: 'SKU-APL-MBP16M3', isHighRisk: true },
  { productId: 'prod_00004', title: 'Samsung Galaxy S24 Ultra 512GB (Titanium Gray)', category: 'Electronics', price: 139999, sku: 'SKU-SAM-S24ULT', isHighRisk: true },
  { productId: 'prod_00005', title: 'PlayStation 5 Console (Disc Edition)', category: 'Electronics', price: 54990, sku: 'SKU-SONY-PS5DISC', isHighRisk: true },
  { productId: 'prod_00006', title: 'Dyson V15 Detect Cordless Vacuum Cleaner', category: 'Home & Kitchen', price: 65900, sku: 'SKU-DYS-V15DET', isHighRisk: true },
  { productId: 'prod_00007', title: 'Bose QuietComfort Ultra Earbuds', category: 'Electronics', price: 25900, sku: 'SKU-BOS-QCULTRA', isHighRisk: true },
  { productId: 'prod_00008', title: 'Nike Air Jordan 1 Retro High OG Sneakers', category: 'Fashion', price: 16995, sku: 'SKU-NKE-AJ1HIGH', isHighRisk: false },
  { productId: 'prod_00009', title: 'iPad Pro 12.9-inch M2 Chip 128GB Wi-Fi', category: 'Electronics', price: 112900, sku: 'SKU-APL-IPADPRO', isHighRisk: true },
  { productId: 'prod_00010', title: 'Dell XPS 15 9530 Intel i9 32GB RAM', category: 'Electronics', price: 245000, sku: 'SKU-DEL-XPS1595', isHighRisk: true }
];

const REAL_FIRST_NAMES = ['Vikramaditya', 'Ananya', 'Rohan', 'Siddharth', 'Meera', 'Karan', 'Tanya', 'Kabir', 'Ishita', 'Devansh', 'Priyamvada', 'Aditya', 'Rhea', 'Tarun', 'Harshvardhan', 'Radhika', 'Nikhil', 'Simran', 'Gaurav', 'Sneha'];
const REAL_LAST_NAMES = ['Roy', 'Deshmukh', 'Kulkarni', 'Sengupta', 'Iyer', 'Singhania', 'Kapur', 'Malhotra', 'Chatterjee', 'Singhal', 'Bhatnagar', 'Mukherjee', 'Chawla', 'Nambiar', 'Pillai', 'Rathore', 'Bhalla', 'Saxena'];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];

const REFUND_REASONS = [
  'Claimed empty package delivered upon unboxing',
  'Returned counterfeit/wrong item inside sealed box',
  'Package lost in transit / stolen from doorstep',
  'Item defective / Power button non-functional (Claimed within 12h)',
  'Seal tampered upon arrival - missing accessories',
  'Wrong size delivered (Merchant discrepancy claim)'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysBackMin, daysBackMax) {
  const daysBack = getRandomInt(daysBackMin, daysBackMax);
  const baseTime = Date.now() - daysBack * 86400000;
  const randomHours = getRandomInt(0, 23) * 3600000;
  const randomMinutes = getRandomInt(0, 59) * 60000;
  const randomSeconds = getRandomInt(0, 59) * 1000;
  return new Date(baseTime - randomHours - randomMinutes - randomSeconds);
}

export async function seedDatabase() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully!');

  console.log('Clearing existing database collections...');
  await Promise.all([
    Customer.deleteMany({}),
    Device.deleteMany({}),
    Address.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Refund.deleteMany({}),
    InvestigationCase.deleteMany({}),
    User.deleteMany({})
  ]);

  console.log('Creating admin investigator user...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    email: 'admin@refundshield.io',
    passwordHash,
    role: 'Lead Investigator'
  });

  // 1. Products
  console.log(`Generating products...`);
  const products = [...REAL_PRODUCTS];
  for (let i = 11; i <= 500; i++) {
    const cat = getRandomItem(['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports']);
    const title = `${getRandomItem(['Premium', 'Pro', 'Ultra', 'Deluxe'])} ${cat} Accessory Model-V${i}`;
    const price = getRandomInt(499, 14999);
    products.push({
      productId: `prod_${String(i).padStart(5, '0')}`,
      title,
      category: cat,
      price,
      sku: `SKU-${cat.substring(0, 3).toUpperCase()}-${i}`,
      isHighRisk: false
    });
  }
  await Product.insertMany(products);

  // 2. Base Devices & Addresses (Razorpay format IDs)
  const devices = [];
  for (let i = 1; i <= NUM_DEVICES; i++) {
    devices.push({
      deviceId: `dev_${String(i).padStart(6, '0')}`,
      fingerprint: `FP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      deviceType: getRandomItem(['Mobile', 'Desktop', 'Tablet']),
      os: getRandomItem(['Android 14', 'iOS 17', 'Windows 11', 'macOS Sonoma']),
      browser: getRandomItem(['Chrome 125', 'Safari 17', 'Firefox 126', 'Edge 125']),
      ipAddress: `103.${getRandomInt(10, 220)}.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}`,
      associatedCustomerIds: []
    });
  }

  const addresses = [];
  for (let i = 1; i <= NUM_ADDRESSES; i++) {
    const city = getRandomItem(CITIES);
    addresses.push({
      addressId: `addr_${String(i).padStart(6, '0')}`,
      street: `Flat ${getRandomInt(101, 904)}, ${getRandomItem(['Royal Residency', 'Green Glen Layout', 'Maker Chambers', 'Prestige Enclave', 'Jubilee Heights'])}`,
      city,
      state: `${city} Metro`,
      zip: `${getRandomInt(110001, 700099)}`,
      country: 'IN',
      isCommercial: Math.random() < 0.05,
      associatedCustomerIds: []
    });
  }

  const customers = [];

  // Network 1: Shared Device Electronics Ring (5 customers)
  const net1Device = {
    deviceId: 'dev_NET1_100',
    fingerprint: 'FP-BENGALURU-RESIST-001',
    deviceType: 'Mobile (Android Rooted)',
    os: 'Android 14 (Custom ROM)',
    browser: 'Chrome 125',
    ipAddress: '49.207.18.102',
    associatedCustomerIds: []
  };
  devices.push(net1Device);

  const net1Names = ['Vikramaditya Roy', 'Rohan Kulkarni', 'Siddharth Sengupta', 'Karan Singhania', 'Devansh Singhal'];
  for (let i = 1; i <= 5; i++) {
    const custId = `cust_NET1_00${i}`;
    net1Device.associatedCustomerIds.push(custId);
    customers.push({
      customerId: custId,
      name: net1Names[i - 1],
      email: `${net1Names[i - 1].toLowerCase().replace(/\s+/g, '.')}@technetwork.io`,
      phone: `987650000${i}`,
      status: 'UNDER_REVIEW',
      riskScore: 92,
      riskLevel: 'CRITICAL',
      isPlantedFraud: true,
      fraudNetworkId: 'NET-01-SHARED-DEVICE'
    });
  }

  // Network 2: Shared Address Sybil Ring (6 customers)
  const net2Addr = {
    addressId: 'addr_NET2_200',
    street: 'Flat 402, Royal Palms Residency, 4th Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    zip: '560034',
    country: 'IN',
    isCommercial: false,
    associatedCustomerIds: []
  };
  addresses.push(net2Addr);

  const net2Names = ['Ananya Deshmukh', 'Meera Iyer', 'Tanya Kapur', 'Ishita Chatterjee', 'Rhea Nambiar', 'Simran Bhalla'];
  for (let i = 1; i <= 6; i++) {
    const custId = `cust_NET2_00${i}`;
    net2Addr.associatedCustomerIds.push(custId);
    customers.push({
      customerId: custId,
      name: net2Names[i - 1],
      email: `${net2Names[i - 1].toLowerCase().replace(/\s+/g, '.')}@sybilmail.com`,
      phone: `987660000${i}`,
      status: 'UNDER_REVIEW',
      riskScore: 88,
      riskLevel: 'HIGH',
      isPlantedFraud: true,
      fraudNetworkId: 'NET-02-SHARED-ADDRESS'
    });
  }

  // Network 3: Serial High-Value SKU Claim Ring (4 customers)
  const net3Device = {
    deviceId: 'dev_NET3_300',
    fingerprint: 'FP-DELHI-M3MAX-003',
    deviceType: 'Desktop',
    os: 'Windows 11 Pro',
    browser: 'Firefox 126',
    ipAddress: '103.14.22.11',
    associatedCustomerIds: []
  };
  devices.push(net3Device);

  const net3Names = ['Kabir Malhotra', 'Tarun Rathore', 'Harshvardhan Saxena', 'Priyamvada Bhatnagar'];
  for (let i = 1; i <= 4; i++) {
    const custId = `cust_NET3_00${i}`;
    net3Device.associatedCustomerIds.push(custId);
    customers.push({
      customerId: custId,
      name: net3Names[i - 1],
      email: `${net3Names[i - 1].toLowerCase().replace(/\s+/g, '.')}@highsku.org`,
      phone: `987670000${i}`,
      status: 'UNDER_REVIEW',
      riskScore: 85,
      riskLevel: 'HIGH',
      isPlantedFraud: true,
      fraudNetworkId: 'NET-03-SERIAL-PRODUCT'
    });
  }

  // Network 4: High Velocity Flash Claim Ring (3 customers)
  const net4Device = {
    deviceId: 'dev_NET4_400',
    fingerprint: 'FP-MUMBAI-FLASH-004',
    deviceType: 'Mobile',
    os: 'iOS 17.5',
    browser: 'Safari 17',
    ipAddress: '49.205.12.88',
    associatedCustomerIds: []
  };
  devices.push(net4Device);

  const net4Names = ['Aditya Chawla', 'Gaurav Pillai', 'Nikhil Mukherjee'];
  for (let i = 1; i <= 3; i++) {
    const custId = `cust_NET4_00${i}`;
    net4Device.associatedCustomerIds.push(custId);
    customers.push({
      customerId: custId,
      name: net4Names[i - 1],
      email: `${net4Names[i - 1].toLowerCase().replace(/\s+/g, '.')}@flashclaims.net`,
      phone: `987680000${i}`,
      status: 'UNDER_REVIEW',
      riskScore: 82,
      riskLevel: 'HIGH',
      isPlantedFraud: true,
      fraudNetworkId: 'NET-04-VELOCITY'
    });
  }

  // Network 5: Multi-Hop Transitive Ring (3 customers)
  const net5Device = {
    deviceId: 'dev_NET5_500',
    fingerprint: 'FP-HYD-MULTIHOP-005',
    deviceType: 'Desktop',
    os: 'macOS Sonoma',
    browser: 'Chrome 125',
    ipAddress: '103.22.44.12',
    associatedCustomerIds: []
  };
  devices.push(net5Device);

  const net5Names = ['Sneha Rathore', 'Radhika Singhania', 'Kabir Kulkarni'];
  for (let i = 1; i <= 3; i++) {
    const custId = `cust_NET5_00${i}`;
    net5Device.associatedCustomerIds.push(custId);
    customers.push({
      customerId: custId,
      name: net5Names[i - 1],
      email: `${net5Names[i - 1].toLowerCase().replace(/\s+/g, '.')}@multihub.in`,
      phone: `987690000${i}`,
      status: 'UNDER_REVIEW',
      riskScore: 78,
      riskLevel: 'HIGH',
      isPlantedFraud: true,
      fraudNetworkId: 'NET-05-MULTIHOP'
    });
  }

  // Legitimate Family (2 customers - 0 refunds)
  const legDevice = {
    deviceId: 'dev_LEGIT_FAMILY',
    fingerprint: 'FP-LEGIT-HOME-PC',
    deviceType: 'Desktop',
    os: 'Windows 11 Home',
    browser: 'Chrome 125',
    ipAddress: '122.170.10.45',
    associatedCustomerIds: ['cust_LEGIT_FAM1', 'cust_LEGIT_FAM2']
  };
  const legAddr = {
    addressId: 'addr_LEGIT_FAMILY',
    street: '14/B Sunshine Apartments, Vasant Kunj',
    city: 'Delhi',
    state: 'Delhi NCR',
    zip: '110070',
    country: 'IN',
    isCommercial: false,
    associatedCustomerIds: ['cust_LEGIT_FAM1', 'cust_LEGIT_FAM2']
  };
  devices.push(legDevice);
  addresses.push(legAddr);

  customers.push({
    customerId: 'cust_LEGIT_FAM1',
    name: 'Ramesh Sharma (Legitimate Parent)',
    email: 'ramesh.sharma@gmail.com',
    phone: '9811122334',
    status: 'ACTIVE',
    riskScore: 10,
    riskLevel: 'LOW',
    isPlantedFraud: false
  });
  customers.push({
    customerId: 'cust_LEGIT_FAM2',
    name: 'Pooja Sharma (Legitimate Daughter)',
    email: 'pooja.sharma@gmail.com',
    phone: '9811122335',
    status: 'ACTIVE',
    riskScore: 10,
    riskLevel: 'LOW',
    isPlantedFraud: false
  });

  // Generate Normal Customers
  const startNormalIdx = customers.length + 1;
  const normalCount = NUM_CUSTOMERS - customers.length;
  console.log(`Generating ${normalCount} normal customers...`);

  for (let i = startNormalIdx; i <= NUM_CUSTOMERS; i++) {
    const fn = getRandomItem(REAL_FIRST_NAMES);
    const ln = getRandomItem(REAL_LAST_NAMES);
    const custId = `cust_${String(i).padStart(6, '0')}`;
    customers.push({
      customerId: custId,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@gmail.com`,
      phone: `98${getRandomInt(10000000, 99999999)}`,
      status: 'ACTIVE',
      riskScore: getRandomInt(0, 30),
      riskLevel: 'LOW',
      isPlantedFraud: false
    });
  }

  // Insert Base Collections
  for (let i = 0; i < devices.length; i += 1000) {
    await Device.insertMany(devices.slice(i, i + 1000), { ordered: false });
  }
  console.log('Devices seeded!');

  for (let i = 0; i < addresses.length; i += 1000) {
    await Address.insertMany(addresses.slice(i, i + 1000), { ordered: false });
  }
  console.log('Addresses seeded!');

  for (let i = 0; i < customers.length; i += 1000) {
    await Customer.insertMany(customers.slice(i, i + 1000), { ordered: false });
  }
  console.log('Customers seeded!');

  // Generate Orders & Refunds
  const orders = [];
  const refunds = [];
  let refundCounter = 1;

  // Network 1
  for (let i = 1; i <= 5; i++) {
    const custId = `cust_NET1_00${i}`;
    for (let o = 1; o <= 4; o++) {
      const orderId = `order_NET1_${i}_${o}`;
      const prod = products[o % 3];
      const createdAt = getRandomDate(1, 15);
      orders.push({
        orderId,
        customerId: custId,
        deviceId: 'dev_NET1_100',
        addressId: addresses[o % addresses.length].addressId,
        items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
        totalAmount: prod.price,
        status: 'REFUNDED',
        hasRefund: true,
        createdAt
      });

      refunds.push({
        refundId: `rfnd_NET1_${refundCounter++}`,
        orderId,
        customerId: custId,
        productId: prod.productId,
        amount: prod.price,
        reason: 'Claimed empty package delivered / seal broken upon unboxing',
        status: 'APPROVED',
        daysAfterOrder: 1,
        createdAt: new Date(createdAt.getTime() + getRandomInt(6, 24) * 3600000)
      });
    }
  }

  // Network 2
  for (let i = 1; i <= 6; i++) {
    const custId = `cust_NET2_00${i}`;
    for (let o = 1; o <= 3; o++) {
      const orderId = `order_NET2_${i}_${o}`;
      const prod = products[3];
      const createdAt = getRandomDate(2, 20);
      orders.push({
        orderId,
        customerId: custId,
        deviceId: devices[i % devices.length].deviceId,
        addressId: 'addr_NET2_200',
        items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
        totalAmount: prod.price,
        status: 'REFUNDED',
        hasRefund: true,
        createdAt
      });

      refunds.push({
        refundId: `rfnd_NET2_${refundCounter++}`,
        orderId,
        customerId: custId,
        productId: prod.productId,
        amount: prod.price,
        reason: 'Package lost in transit / stolen from doorstep',
        status: 'APPROVED',
        daysAfterOrder: 1,
        createdAt: new Date(createdAt.getTime() + getRandomInt(6, 36) * 3600000)
      });
    }
  }

  // Network 3
  for (let i = 1; i <= 4; i++) {
    const custId = `cust_NET3_00${i}`;
    for (let o = 1; o <= 3; o++) {
      const orderId = `order_NET3_${i}_${o}`;
      const prod = products[2];
      const createdAt = getRandomDate(1, 10);
      orders.push({
        orderId,
        customerId: custId,
        deviceId: 'dev_NET3_300',
        addressId: addresses[o % addresses.length].addressId,
        items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
        totalAmount: prod.price,
        status: 'REFUNDED',
        hasRefund: true,
        createdAt
      });

      refunds.push({
        refundId: `rfnd_NET3_${refundCounter++}`,
        orderId,
        customerId: custId,
        productId: prod.productId,
        amount: prod.price,
        reason: 'Returned counterfeit/wrong item inside sealed box',
        status: 'APPROVED',
        daysAfterOrder: 1,
        createdAt: new Date(createdAt.getTime() + getRandomInt(6, 24) * 3600000)
      });
    }
  }

  // Network 4
  for (let i = 1; i <= 3; i++) {
    const custId = `cust_NET4_00${i}`;
    for (let o = 1; o <= 3; o++) {
      const orderId = `order_NET4_${i}_${o}`;
      const prod = products[4];
      const createdAt = getRandomDate(1, 5);
      orders.push({
        orderId,
        customerId: custId,
        deviceId: 'dev_NET4_400',
        addressId: addresses[o % addresses.length].addressId,
        items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
        totalAmount: prod.price,
        status: 'REFUNDED',
        hasRefund: true,
        createdAt
      });

      refunds.push({
        refundId: `rfnd_NET4_${refundCounter++}`,
        orderId,
        customerId: custId,
        productId: prod.productId,
        amount: prod.price,
        reason: 'Item defective / Power button non-functional (Claimed within 12h)',
        status: 'APPROVED',
        daysAfterOrder: 0,
        createdAt: new Date(createdAt.getTime() + getRandomInt(1, 6) * 3600000)
      });
    }
  }

  // Network 5
  for (let i = 1; i <= 3; i++) {
    const custId = `cust_NET5_00${i}`;
    for (let o = 1; o <= 3; o++) {
      const orderId = `order_NET5_${i}_${o}`;
      const prod = products[5];
      const createdAt = getRandomDate(1, 8);
      orders.push({
        orderId,
        customerId: custId,
        deviceId: 'dev_NET5_500',
        addressId: addresses[o % addresses.length].addressId,
        items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
        totalAmount: prod.price,
        status: 'REFUNDED',
        hasRefund: true,
        createdAt
      });

      refunds.push({
        refundId: `rfnd_NET5_${refundCounter++}`,
        orderId,
        customerId: custId,
        productId: prod.productId,
        amount: prod.price,
        reason: 'Seal tampered upon arrival - missing accessories',
        status: 'APPROVED',
        daysAfterOrder: 1,
        createdAt: new Date(createdAt.getTime() + getRandomInt(6, 24) * 3600000)
      });
    }
  }

  // Legitimate Family Orders (0 refunds)
  for (let o = 1; o <= 5; o++) {
    const prod = getRandomItem(products);
    orders.push({
      orderId: `order_LEGIT_FAM1_${o}`,
      customerId: 'cust_LEGIT_FAM1',
      deviceId: 'dev_LEGIT_FAMILY',
      addressId: 'addr_LEGIT_FAMILY',
      items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
      totalAmount: prod.price,
      status: 'DELIVERED',
      hasRefund: false,
      createdAt: getRandomDate(10, 60)
    });
  }

  // Fill remaining normal orders
  const remOrders = NUM_ORDERS - orders.length;
  console.log(`Generating ${remOrders} normal orders...`);

  for (let i = 1; i <= remOrders; i++) {
    const cust = getRandomItem(customers);
    const dev = getRandomItem(devices);
    const addr = getRandomItem(addresses);
    const prod = getRandomItem(products);
    const orderId = `order_NORM_${String(i).padStart(6, '0')}`;
    const createdAt = getRandomDate(1, 90);
    const isRefunded = refunds.length < NUM_REFUNDS && Math.random() < 0.25;

    orders.push({
      orderId,
      customerId: cust.customerId,
      deviceId: dev.deviceId,
      addressId: addr.addressId,
      items: [{ productId: prod.productId, productTitle: prod.title, quantity: 1, price: prod.price }],
      totalAmount: prod.price,
      status: isRefunded ? 'REFUNDED' : 'DELIVERED',
      hasRefund: isRefunded,
      createdAt
    });

    if (isRefunded) {
      refunds.push({
        refundId: `rfnd_NORM_${String(refundCounter++).padStart(6, '0')}`,
        orderId,
        customerId: cust.customerId,
        productId: prod.productId,
        amount: prod.price,
        reason: getRandomItem(REFUND_REASONS),
        status: 'APPROVED',
        daysAfterOrder: getRandomInt(2, 10),
        createdAt: new Date(createdAt.getTime() + getRandomInt(2, 10) * 86400000 + getRandomInt(1, 23) * 3600000 + getRandomInt(1, 59) * 60000)
      });
    }
  }

  console.log('Inserting orders...');
  for (let i = 0; i < orders.length; i += 2000) {
    await Order.insertMany(orders.slice(i, i + 2000), { ordered: false });
  }
  console.log('Orders inserted!');

  console.log('Inserting refunds...');
  for (let i = 0; i < refunds.length; i += 2000) {
    await Refund.insertMany(refunds.slice(i, i + 2000), { ordered: false });
  }
  console.log('Refunds inserted!');

  // Initial Real World Cases for ALL 5 Networks
  const initialCases = [
    {
      caseId: 'CASE-NET1-001',
      title: 'Coordinated Device-Sharing Electronics Ring — Bengaluru Cluster (5 Accounts)',
      primaryCustomerId: 'cust_NET1_001',
      customerIds: ['cust_NET1_001', 'cust_NET1_002', 'cust_NET1_003', 'cust_NET1_004', 'cust_NET1_005'],
      deviceIds: ['dev_NET1_100'],
      addressIds: [],
      riskScore: 92,
      riskLevel: 'CRITICAL',
      signals: [
        { type: 'SHARED_DEVICE', description: '5 distinct customer accounts sharing device dev_NET1_100 (FP-BENGALURU-RESIST-001)', scoreContribution: 30, sourceIds: ['dev_NET1_100'] },
        { type: 'HIGH_REFUND_FREQUENCY', description: '100% refund rate across all 20 high-value electronics orders', scoreContribution: 30, sourceIds: ['cust_NET1_001'] }
      ],
      evidence: [
        { type: 'SHARED_DEVICE', description: 'Hardware Fingerprint FP-BENGALURU-RESIST-001 shared by 5 accounts', sourceIds: ['dev_NET1_100'] }
      ],
      timeline: [
        { timestamp: new Date(), event: 'Order Placed', details: 'Order order_NET1_1_1 placed on dev_NET1_100 for Apple iPhone 15 Pro Max', type: 'ORDER' },
        { timestamp: new Date(), event: 'Refund Requested', details: 'Immediate claim for empty box delivered', type: 'REFUND' }
      ],
      reasoning: [
        'Detected 5 customer accounts (Vikramaditya Roy, Rohan Kulkarni, etc.) operating from identical hardware fingerprint FP-BENGALURU-RESIST-001.',
        'Cluster exhibits 100% refund rate targeting high-value electronics SKUs totaling > ₹1.5L.'
      ],
      summary: 'High confidence coordinated refund ring operating on shared hardware fingerprint FP-BENGALURU-RESIST-001. 5 connected accounts claiming 100% item defects on premium electronics.',
      recommendedAction: 'BLOCK',
      confidence: 0.96,
      humanReviewRequired: true,
      status: 'PENDING'
    },
    {
      caseId: 'CASE-NET2-001',
      title: 'Coordinated Sybil Address Ring — Koramangala Drop Location (6 Accounts)',
      primaryCustomerId: 'cust_NET2_001',
      customerIds: ['cust_NET2_001', 'cust_NET2_002', 'cust_NET2_003', 'cust_NET2_004', 'cust_NET2_005', 'cust_NET2_006'],
      deviceIds: [],
      addressIds: ['addr_NET2_200'],
      riskScore: 88,
      riskLevel: 'HIGH',
      signals: [
        { type: 'SHARED_ADDRESS', description: '6 distinct customer accounts sharing delivery location Flat 402 Royal Palms', scoreContribution: 25, sourceIds: ['addr_NET2_200'] },
        { type: 'HIGH_REFUND_FREQUENCY', description: '18 consecutive lost-in-transit claims claimed across location', scoreContribution: 30, sourceIds: ['addr_NET2_200'] }
      ],
      evidence: [
        { type: 'SHARED_ADDRESS', description: 'Flat 402 Koramangala shared by 6 sybil accounts', sourceIds: ['addr_NET2_200'] }
      ],
      timeline: [
        { timestamp: new Date(), event: 'Address Cluster Alert', details: '18 non-delivery claims from single drop location', type: 'ALERT' }
      ],
      reasoning: [
        'Physical address addr_NET2_200 receives orders from 6 separate accounts.',
        'High density of non-delivery refund claims originating from single destination.'
      ],
      summary: 'Sybil address cluster detected at Koramangala drop location with 18 consecutive lost-in-transit claims.',
      recommendedAction: 'REVIEW',
      confidence: 0.91,
      humanReviewRequired: true,
      status: 'PENDING'
    },
    {
      caseId: 'CASE-NET3-001',
      title: 'Serial High-Value SKU Claim Ring — iPhone 15 & MacBook Pro (4 Accounts)',
      primaryCustomerId: 'cust_NET3_001',
      customerIds: ['cust_NET3_001', 'cust_NET3_002', 'cust_NET3_003', 'cust_NET3_004'],
      deviceIds: ['dev_NET3_300'],
      addressIds: [],
      riskScore: 85,
      riskLevel: 'HIGH',
      signals: [
        { type: 'SHARED_DEVICE', description: '4 customer accounts sharing device dev_NET3_300', scoreContribution: 25, sourceIds: ['dev_NET3_300'] },
        { type: 'REPEATED_PRODUCT_REFUNDS', description: 'Repeated counterfeit/wrong item claims on MacBook Pro M3', scoreContribution: 30, sourceIds: ['prod_00003'] }
      ],
      evidence: [
        { type: 'REPEATED_PRODUCT_REFUNDS', description: 'Serial claims on Apple MacBook Pro 16-inch M3 Max', sourceIds: ['prod_00003'] }
      ],
      timeline: [
        { timestamp: new Date(), event: 'High Value Claim Alert', details: 'Serial empty box claim on MacBook Pro', type: 'ALERT' }
      ],
      reasoning: [
        'Detected 4 accounts claiming counterfeit items on identical MacBook Pro SKU.',
        'Shared hardware fingerprint FP-DELHI-M3MAX-003.'
      ],
      summary: 'Serial high-value SKU refund ring targeting premium MacBook Pro units across connected accounts.',
      recommendedAction: 'BLOCK',
      confidence: 0.94,
      humanReviewRequired: true,
      status: 'PENDING'
    },
    {
      caseId: 'CASE-NET4-001',
      title: 'High-Velocity Rapid Cancellation Cluster — Flash Sale Abuse (3 Accounts)',
      primaryCustomerId: 'cust_NET4_001',
      customerIds: ['cust_NET4_001', 'cust_NET4_002', 'cust_NET4_003'],
      deviceIds: ['dev_NET4_400'],
      addressIds: [],
      riskScore: 82,
      riskLevel: 'HIGH',
      signals: [
        { type: 'SUSPICIOUS_TIMING', description: 'Immediate <24h refund claims after order placement', scoreContribution: 25, sourceIds: ['dev_NET4_400'] }
      ],
      evidence: [
        { type: 'SUSPICIOUS_TIMING', description: 'Rapid cancellation velocity pattern on PS5 console orders', sourceIds: ['dev_NET4_400'] }
      ],
      timeline: [
        { timestamp: new Date(), event: 'Velocity Alert', details: 'Rapid refund requested 1 hour after order', type: 'ALERT' }
      ],
      reasoning: [
        'Velocity pattern detected across 3 accounts ordering and cancelling PS5 consoles.'
      ],
      summary: 'High-velocity refund cluster exhibiting rapid 0-day claim intervals.',
      recommendedAction: 'REVIEW',
      confidence: 0.89,
      humanReviewRequired: true,
      status: 'PENDING'
    },
    {
      caseId: 'CASE-NET5-001',
      title: 'Multi-Hop Cross-Device Sybil Ring — Mumbai Tech Hub (3 Accounts)',
      primaryCustomerId: 'cust_NET5_001',
      customerIds: ['cust_NET5_001', 'cust_NET5_002', 'cust_NET5_003'],
      deviceIds: ['dev_NET5_500'],
      addressIds: [],
      riskScore: 78,
      riskLevel: 'HIGH',
      signals: [
        { type: 'CONNECTED_SUSPICIOUS_CUSTOMERS', description: 'Transitive multi-hop links across hardware and physical addresses', scoreContribution: 25, sourceIds: ['dev_NET5_500'] }
      ],
      evidence: [
        { type: 'CONNECTED_SUSPICIOUS_CUSTOMERS', description: 'Multi-hop network connection between 3 active refunder accounts', sourceIds: ['dev_NET5_500'] }
      ],
      timeline: [
        { timestamp: new Date(), event: 'Graph Link Alert', details: 'Transitive customer connection detected', type: 'ALERT' }
      ],
      reasoning: [
        'Discovered multi-hop relationship chain linking 3 customer accounts.'
      ],
      summary: 'Multi-hop customer network linked through shared device FP-HYD-MULTIHOP-005.',
      recommendedAction: 'REVIEW',
      confidence: 0.87,
      humanReviewRequired: true,
      status: 'PENDING'
    }
  ];

  await InvestigationCase.insertMany(initialCases);
  console.log('Seeding completed with initial cases for ALL 5 fraud networks!');

  console.log(`Total Customers: ${await Customer.countDocuments()}`);
  console.log(`Total Orders: ${await Order.countDocuments()}`);
  console.log(`Total Refunds: ${await Refund.countDocuments()}`);
  console.log(`Total Devices: ${await Device.countDocuments()}`);
  console.log(`Total Addresses: ${await Address.countDocuments()}`);
  console.log(`Total Investigation Cases: ${await InvestigationCase.countDocuments()}`);

  await mongoose.disconnect();
}

if (process.argv[1].includes('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
