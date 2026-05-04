/**
 * Seed script - Populates database with sample data
 * Run with: node utils/seed.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system';

const users = [
  { name: 'Admin User', email: 'admin@billing.com', password: 'admin123', role: 'admin' },
  { name: 'Priya Sharma', email: 'billing@billing.com', password: 'billing123', role: 'billing' },
  { name: 'Ravi Kumar', email: 'delivery@billing.com', password: 'delivery123', role: 'delivery' },
];

const products = [
  // Beverages
  { name: 'Coca Cola 500ml', price: 40, category: 'Beverages', stock: 150, barcode: 'BEV001' },
  { name: 'Mineral Water 1L', price: 20, category: 'Beverages', stock: 200, barcode: 'BEV002' },
  { name: 'Orange Juice 250ml', price: 35, category: 'Beverages', stock: 80, barcode: 'BEV003' },
  { name: 'Lassi 300ml', price: 45, category: 'Beverages', stock: 60, barcode: 'BEV004' },

  // Snacks
  { name: 'Lays Classic 30g', price: 20, category: 'Snacks', stock: 200, barcode: 'SNK001' },
  { name: 'Kurkure Masala 40g', price: 20, category: 'Snacks', stock: 180, barcode: 'SNK002' },
  { name: 'Biscuit Parle-G', price: 10, category: 'Snacks', stock: 300, barcode: 'SNK003' },
  { name: 'Namkeen Mix 200g', price: 60, category: 'Snacks', stock: 100, barcode: 'SNK004' },

  // Food
  { name: 'Vada Pav', price: 25, category: 'Food', stock: 50, barcode: 'FD001' },
  { name: 'Samosa (2 pcs)', price: 20, category: 'Food', stock: 80, barcode: 'FD002' },
  { name: 'Dosa Plain', price: 60, category: 'Food', stock: 40, barcode: 'FD003' },
  { name: 'Idli (3 pcs)', price: 50, category: 'Food', stock: 60, barcode: 'FD004' },

  // Dairy
  { name: 'Amul Milk 500ml', price: 30, category: 'Dairy', stock: 120, barcode: 'DRY001' },
  { name: 'Curd 400g', price: 45, category: 'Dairy', stock: 90, barcode: 'DRY002' },
  { name: 'Paneer 200g', price: 80, category: 'Dairy', stock: 50, barcode: 'DRY003' },

  // Personal Care
  { name: 'Hand Sanitizer 100ml', price: 55, category: 'Personal Care', stock: 70, barcode: 'PC001' },
  { name: 'Soap Lux 100g', price: 35, category: 'Personal Care', stock: 100, barcode: 'PC002' },
  { name: 'Toothbrush', price: 40, category: 'Personal Care', stock: 80, barcode: 'PC003' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`👥 Created ${createdUsers.length} users`);

    const admin = createdUsers.find((u) => u.role === 'admin');

    // Create products
    const createdProducts = await Product.create(
      products.map((p) => ({ ...p, createdBy: admin._id }))
    );
    console.log(`📦 Created ${createdProducts.length} products`);

    // Create some sample orders for the last 7 days
    const billingStaff = createdUsers.find((u) => u.role === 'billing');
    const deliveryStaff = createdUsers.find((u) => u.role === 'delivery');

    const sampleOrders = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const numOrders = Math.floor(Math.random() * 8) + 3;
      for (let j = 1; j <= numOrders; j++) {
        const item1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
        const item2 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
        const qty1 = Math.floor(Math.random() * 3) + 1;
        const qty2 = Math.floor(Math.random() * 2) + 1;
        const subtotal = item1.price * qty1 + item2.price * qty2;
        const total = subtotal;

        const isDelivered = i > 0 || j <= numOrders - 2;

        sampleOrders.push({
          billId: `BILL-SEED-${dateStr}-${j}`,
          tokenNumber: j,
          tokenDate: dateStr,
          items: [
            { product: item1._id, productName: item1.name, productPrice: item1.price, quantity: qty1, subtotal: item1.price * qty1 },
            { product: item2._id, productName: item2.name, productPrice: item2.price, quantity: qty2, subtotal: item2.price * qty2 },
          ],
          subtotal,
          tax: 0,
          discount: 0,
          total,
          status: isDelivered ? 'delivered' : 'pending',
          billedBy: billingStaff._id,
          deliveredBy: isDelivered ? deliveryStaff._id : undefined,
          deliveredAt: isDelivered ? new Date(date.getTime() + 60 * 60 * 1000) : undefined,
          paymentMethod: ['cash', 'upi', 'card'][Math.floor(Math.random() * 3)],
          createdAt: date,
          updatedAt: date,
        });
      }
    }

    await Order.insertMany(sampleOrders);
    console.log(`🧾 Created ${sampleOrders.length} sample orders`);

    console.log('\n✅ Seed completed!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin:    admin@billing.com / admin123');
    console.log('  Billing:  billing@billing.com / billing123');
    console.log('  Delivery: delivery@billing.com / delivery123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
