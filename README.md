# ⚡ SwiftBill — Production-Ready Billing System

A complete, full-stack billing system with real-time updates, role-based access control, and mobile-first design.

---

## 🚀 Features

| Feature | Details |
|---|---|
| 👥 Roles | Admin · Billing Staff · Delivery Staff |
| 📊 Dashboard | Real-time charts, daily/weekly/monthly sales stats |
| 🧾 Billing | 3-click bill generation, barcode scanning, offline support |
| 🔢 Tokens | Auto-incremented daily, resets at midnight |
| 🛵 Delivery | Live order feed, one-tap mark-delivered |
| 🔌 Real-time | WebSocket updates via Socket.io |
| 📥 Export | CSV reports with date/status filters |
| 🌗 Themes | Dark / Light mode |
| 🔒 Security | JWT, bcrypt, rate-limiting, Joi validation, audit logs |
| 🐳 Docker | Full containerised deploy with nginx |

---

## 📁 Project Structure

```
billing-system/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Navbar, Toasts, Guards
│   │   │   └── billing/     # BillReceipt (printable)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── BillingPage.jsx
│   │   │   └── DeliveryPage.jsx
│   │   ├── services/
│   │   │   ├── api.js       # Axios + auth interceptor
│   │   │   └── socket.js    # Socket.io client
│   │   └── store/
│   │       └── slices/      # Redux Toolkit slices
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/                  # Node.js + Express backend
│   ├── config/database.js
│   ├── middleware/
│   │   ├── auth.js          # JWT verify + role guard
│   │   └── validate.js      # Joi schemas
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js         # Includes TokenCounter
│   │   └── Log.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── admin.js
│   ├── utils/
│   │   ├── logger.js        # Audit log helper
│   │   └── seed.js          # Sample data seeder
│   └── Dockerfile
│
├── .github/workflows/ci-cd.yml
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/billing_system
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Client (`client/.env`)

```env
VITE_API_URL=/api
```

---

## 🏃 Local Development Setup

### Prerequisites
- Node.js v20+
- MongoDB v7+ (local or Atlas)
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/yourname/swiftbill.git
cd swiftbill

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure Environment

```bash
# Server
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Client (optional — defaults work with Vite proxy)
cd ../client
echo "VITE_API_URL=/api" > .env
```

### 3. Seed the Database

```bash
cd server
npm run seed
```

This creates:
- 3 users (admin, billing, delivery)
- 18 sample products across 5 categories
- 7 days of historical orders

### 4. Run Development Servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open: **http://localhost:5173**

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@billing.com | admin123 |
| Billing | billing@billing.com | billing123 |
| Delivery | delivery@billing.com | delivery123 |

---

## 🐳 Docker Deployment

### Quick Start

```bash
# Build and run everything
docker compose up -d

# Seed database (first time only)
docker compose exec server node utils/seed.js

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access at: **http://localhost**

### Production Deploy

1. Set secrets in `.env` or Docker secrets
2. Update `CLIENT_URL` to your domain
3. Use a reverse proxy (nginx/Caddy) with SSL
4. Point MongoDB to a managed service (Atlas)

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, get JWT |
| GET | `/api/auth/me` | All | Current user profile |
| POST | `/api/auth/logout` | All | Logout (audit logged) |

### Products
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | All | List + search + filter |
| GET | `/api/products/:id` | All | Single product |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Soft-delete |

### Orders
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/orders` | All | List orders (role-filtered) |
| GET | `/api/orders/:id` | All | Single order |
| POST | `/api/orders` | Admin, Billing | Create bill |
| PATCH | `/api/orders/:id/deliver` | Admin, Delivery | Mark delivered |
| PATCH | `/api/orders/:id/cancel` | Admin | Cancel order |

### Admin
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | Stats + charts |
| GET | `/api/admin/users` | Admin | All users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/:id` | Admin | Update user |
| DELETE | `/api/admin/users/:id` | Admin | Deactivate user |
| GET | `/api/admin/logs` | Admin | Audit logs |
| GET | `/api/admin/export/orders` | Admin | CSV export |

---

## 🔌 WebSocket Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join_room` | Client→Server | `role` string | Join role-based room |
| `new_order` | Server→Client | Order object | New bill created |
| `order_updated` | Server→Client | Order object | Status changed |
| `product_updated` | Server→Client | Product object | Product changed |

---

## 🛡️ Security

- **Passwords**: bcrypt (cost factor 12)
- **Auth**: JWT HS256, 7-day expiry, Bearer token
- **Rate limiting**: 500 req/15min general, 20 req/15min auth
- **Validation**: Joi on all mutation endpoints
- **Role guards**: Middleware on every protected route
- **Soft deletes**: No hard deletes (data integrity)
- **Audit log**: Every create/update/delete/login action

---

## 📊 Database Schema

### Users
```
{ name, email, password (hashed), role, isActive, lastLogin }
```

### Products
```
{ name, price, category, stock, barcode, description, isActive, createdBy }
```

### Orders
```
{ billId, tokenNumber, tokenDate, items[], subtotal, tax, discount, total,
  status, customerName, paymentMethod, billedBy, deliveredBy, deliveredAt }
```

### Logs
```
{ user, action, resource, resourceId, details, ipAddress, userAgent }
```

---

## 🚀 CI/CD (GitHub Actions)

The pipeline runs on every push to `main`:

1. **Server test** — starts MongoDB, runs health check
2. **Client build** — `npm run build`, uploads artifact
3. **Docker push** — builds + pushes both images to Docker Hub
4. **Deploy** — SSH into VPS, pulls + restarts containers

Required GitHub Secrets:
```
DOCKER_USERNAME
DOCKER_TOKEN
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
```

---

## 📱 Mobile PWA

The app includes:
- Responsive mobile-first layout
- Large tap targets (48px min) for fast billing
- Offline cart persistence (localStorage)
- Offline bill queueing (syncs when reconnected)
- Barcode scanner keyboard input support
- Haptic feedback via `navigator.vibrate()`

---

## 🧑‍💻 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| State | Redux Toolkit |
| Routing | React Router v6 |
| Charts | Recharts |
| Print | react-to-print |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Validation | Joi |
| Real-time | Socket.io |
| Container | Docker, Docker Compose |
| Web server | nginx |
| CI/CD | GitHub Actions |

---

## 📄 License

MIT — free to use, modify, and deploy commercially.
