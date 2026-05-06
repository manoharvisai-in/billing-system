/**
 * Standalone Seed Script
 * Run from inside the server folder: node seed-standalone.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://admin:mananbills2007@mananbills.yogbaan.mongodb.net/billing_system?appName=mananbills';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'billing', 'delivery'] },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

const productSchema = new mongoose.Schema({
  name: String, price: Number, category: String,
  stock: Number, barcode: String, createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  billId: String, tokenNumber: Number, tokenDate: String,
  items: Array, subtotal: Number, tax: Number, discount: Number,
  total: Number, status: String, billedBy: mongoose.Schema.Types.ObjectId,
  deliveredBy: mongoose.Schema.Types.ObjectId, deliveredAt: Date, paymentMethod: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

const users = [
  { name: 'Admin User',   email: 'admin@billing.com',    password: 'admin123',    role: 'admin' },
  { name: 'Priya Sharma', email: 'billing@billing.com',  password: 'billing123',  role: 'billing' },
  { name: 'Ravi Kumar',   email: 'delivery@billing.com', password: 'delivery123', role: 'delivery' },
];

const products = [
  { name: 'Coca Cola 500ml',      price: 40, category: 'Beverages',     stock: 150, barcode: 'BEV001' },
  { name: 'Mineral Water 1L',     price: 20, category: 'Beverages',     stock: 200, barcode: 'BEV002' },
  { name: 'Orange Juice 250ml',   price: 35, category: 'Beverages',     stock: 80,  barcode: 'BEV003' },
  { name: 'Lassi 300ml',          price: 45, category: 'Beverages',     stock: 60,  barcode: 'BEV004' },
  { name: 'Lays Classic 30g',     price: 20, category: 'Snacks',        stock: 200, barcode: 'SNK001' },
  { name: 'Kurkure Masala 40g',   price: 20, category: 'Snacks',        stock: 180, barcode: 'SNK002' },
  { name: 'Biscuit Parle-G',      price: 10, category: 'Snacks',        stock: 300, barcode: 'SNK003' },
  { name: 'Namkeen Mix 200g',     price: 60, category: 'Snacks',        stock: 100, barcode: 'SNK004' },
  { name: 'Vada Pav',             price: 25, category: 'Food',          stock: 50,  barcode: 'FD001'  },
  { name: 'Samosa (2 pcs)',       price: 20, category: 'Food',          stock: 80,  barcode: 'FD002'  },
  { name: 'Dosa Plain',           price: 60, category: 'Food',          stock: 40,  barcode: 'FD003'  },
  { name: 'Idli (3 pcs)',         price: 50, category: 'Food',          stock: 60,  barcode: 'FD004'  },
  { name: 'Amul Milk 500ml',      price: 30, category: 'Dairy',         stock: 120, barcode: 'DRY001' },
  { name: 'Curd 400g',            price: 45, category: 'Dairy',         stock: 90,  barcode: 'DRY002' },
  { name: 'Paneer 200g',          price: 80, category: 'Dairy',         stock: 50,  barcode: 'DRY003' },
  { name: 'Hand Sanitizer 100ml', price: 55, category: 'Personal Care', stock: 70,  barcode: 'PC001'  },
  { name: 'Soap Lux 100g',        price: 35, category: 'Personal Care', stock: 100, barcode: 'PC002'  },
  { name: 'Toothbrush',           price: 40, category: 'Personal Care', stock: 80,  barcode: 'PC003'  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);
    console.log('🗑️  Cleared existing data');

    const createdUsers = await Promise.all(users.map(u => new User(u).save()));
    console.log(`👥 Created ${createdUsers.length} users`);

    const admin = createdUsers.find(u => u.role === 'admin');
    const createdProducts = await Product.insertMany(products.map(p => ({ ...p, createdBy: admin._id })));
    console.log(`📦 Created ${createdProducts.length} products`);

    console.log('\n✅ Seed completed!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin:    admin@billing.com / admin123');
    console.log('  Billing:  billing@billing.com / billing123');
    console.log('  Delivery: delivery@billing.com / delivery123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
