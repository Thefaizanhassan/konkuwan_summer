# Konkuwan Herbs – Full-Stack Modernization

A modern, scalable B2B platform for medicinal herb supply, built with React, Node.js, Express, and PostgreSQL.  
This repository contains the public-facing website and a full-featured admin dashboard.

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Business Workflow & Pricing](#business-workflow--pricing)  
3. [Technology Stack](#technology-stack)  
4. [Project Structure](#project-structure)  
5. [Setup Instructions](#setup-instructions)  
   - [Prerequisites](#prerequisites)  
   - [Installation](#installation)  
   - [Environment Variables](#environment-variables)  
   - [Database Setup](#database-setup)  
   - [Running the Application](#running-the-application)  
6. [Architecture](#architecture)  
   - [Frontend Architecture](#frontend-architecture)  
   - [Backend Architecture](#backend-architecture)  
   - [Database Design](#database-design)  
   - [API Structure](#api-structure)  
7. [Developer Guide](#developer-guide)  
   - [Folder Structure Explained](#folder-structure-explained)  
   - [Coding Conventions](#coding-conventions)  
   - [Adding New Features](#adding-new-features)  
   - [Testing](#testing)  
8. [Deployment Guide](#deployment-guide)  
   - [Production Build](#production-build)  
   - [Server Configuration](#server-configuration)  
   - [Database Deployment](#database-deployment)  
   - [Docker (Optional)](#docker-optional)  
9. [Maintenance Guide](#maintenance-guide)  
   - [Backup Procedures](#backup-procedures)  
   - [Common Issues & Solutions](#common-issues--solutions)  
10. [License](#license)

---

## Project Overview

Konkuwan Herbs Pvt. Ltd. sources medicinal herbs, spices, and superfoods directly from 2,500+ farming families across 7 Indian states. This project replaces a static HTML website with a full‑stack application that:

- Showcases products with dynamic price ranges to B2B buyers.
- Provides an **admin portal** for managing products, orders, customers, users, and viewing analytics.
- Enables **role‑based access control** (super_admin, product_manager, order_manager, viewer).
- Supports **negotiated pricing** – admins set the final price during order confirmation, and every change is recorded for reporting.
- Generates invoices and audit logs for every critical action.

**Live demo** (optional): `https://your-domain.com` / admin at `https://your-domain.com/admin`

---

## Business Workflow & Pricing

1. **Buyer** visits the public site → browses products with a price range (e.g., ₹120 – ₹180/kg).
2. **Admin** receives the inquiry, creates a customer profile and an order in the dashboard.
3. During order confirmation, the admin enters the **final negotiated price** for each line item.
4. The system stores the negotiated price in `order_items.final_price`, updates the order total, and records the event in `pricing_history` for analytics.
5. The order moves through statuses: `draft → confirmed → dispatched → delivered` (or cancelled).
6. An invoice (JSON / PDF) can be generated at any stage.

---

## Technology Stack

| Layer          | Technology                                               |
|----------------|----------------------------------------------------------|
| **Frontend**   | React 18, Vite, Tailwind CSS, React Router 6, React Query (TanStack Query), Recharts |
| **Backend**    | Node.js, Express.js, Sequelize ORM, JWT (access + refresh tokens), Multer, Winston |
| **Database**   | PostgreSQL (≥15)                                         |
| **Auth**       | bcrypt, JWT, role‑based middleware                       |
| **Testing**    | Jest, Supertest (backend), Vitest + React Testing Library (frontend) |
| **DevOps**     | Docker, npm scripts, environment‑based configuration     |

---

## Project Structure

```
konkuwan-herbs/
├── client/                     # React SPA (Vite)
│   ├── public/
│   │   └── assets/             # Static logos, placeholder images
│   ├── src/
│   │   ├── assets/             # Imported assets (images, fonts)
│   │   ├── components/         # Reusable UI and layout components
│   │   │   ├── admin/          # Sidebar, KPICard, etc.
│   │   │   ├── layout/         # Navbar, Footer, AdminLayout
│   │   │   └── ui/             # Button, Modal, DataTable, ProductCard
│   │   ├── contexts/           # AuthContext (JWT & user state)
│   │   ├── hooks/              # useProducts, useCategories, useScrollReveal
│   │   ├── pages/              # Public pages & admin pages
│   │   │   ├── admin/          # Login, Dashboard, ProductManagement, ...
│   │   │   └── ...             # Home, Products, Supply, Impact, ...
│   │   ├── services/           # Axios instance & API functions
│   │   │   ├── api.js
│   │   │   └── auth.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Express API
│   ├── src/
│   │   ├── config/             # DB config, env loader
│   │   ├── controllers/        # Route handlers (auth, product, order, ...)
│   │   ├── middlewares/        # auth (JWT + RBAC), errorHandler, upload (Multer), cache
│   │   ├── models/             # Sequelize models (User, Product, Order, ...)
│   │   ├── routes/             # Public & admin route files
│   │   ├── services/           # Auth helpers, audit utility
│   │   ├── utils/              # AppError, logger (Winston)
│   │   ├── validations/        # Joi schemas
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Entry point (start server)
│   ├── uploads/                # Local file storage (gitignored)
│   ├── logs/                   # Winston log files (gitignored)
│   ├── .env.example
│   └── package.json
│
├── database/
│   └── schema.sql              # Complete PostgreSQL schema & seed data
│
├── docker-compose.yml          # (Optional) Full stack with Postgres, API, nginx
└── README.md
```

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 15 (or use Docker)
- (Optional) **Docker** & **Docker Compose**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/konkuwan-herbs.git
   cd konkuwan-herbs
   ```

2. **Backend setup**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   ```

3. **Frontend setup**
   ```bash
   cd client
   npm install
   cp .env.example .env
   # Edit .env if your backend URL differs (default http://localhost:5500/api)
   ```

### Environment Variables

#### Server (`server/.env`)

| Variable                | Description                                | Example                  |
|-------------------------|--------------------------------------------|--------------------------|
| `NODE_ENV`              | `development` / `production` / `test`      | development              |
| `PORT`                  | API server port                            | 5500                     |
| `DB_HOST`               | PostgreSQL host                            | localhost                |
| `DB_PORT`               | PostgreSQL port                            | 5432                     |
| `DB_NAME`               | Database name                              | konkuwan_herbs           |
| `DB_USER`               | Database user                              | postgres                 |
| `DB_PASSWORD`           | Database password                          | your_password            |
| `JWT_SECRET`            | Secret key for access tokens               | a_very_secret_string     |
| `JWT_EXPIRE_IN`         | Access token lifespan                      | 24h                      |
| `JWT_REFRESH_SECRET`    | Secret key for refresh tokens              | another_secret           |
| `JWT_REFRESH_EXPIRE_IN` | Refresh token lifespan                     | 7d                       |
| `UPLOAD_DIR`            | Directory for uploaded product images      | uploads                  |
| `MAX_FILE_SIZE`         | Max upload file size (bytes)               | 5242880                  |
| `CORS_ORIGIN`           | Allowed frontend origin                    | http://localhost:5173    |

#### Client (`client/.env`)

| Variable        | Description              | Example                          |
|-----------------|--------------------------|----------------------------------|
| `VITE_API_URL`  | Backend API base URL     | http://localhost:5500/api        |

### Database Setup

1. Create a PostgreSQL database (e.g., `konkuwan_herbs`).
2. Run the provided schema to create tables, indexes, and seed data:
   ```bash
   psql -U your_user -d konkuwan_herbs -f database/schema.sql
   ```
3. (Alternative) Use Sequelize migrations (if you set them up):
   ```bash
   cd server
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

The seed data creates:
- Four roles: `super_admin`, `product_manager`, `order_manager`, `viewer`
- A default **super admin** user: `admin@konkuwanherbs.com` / `Admin@123` (change immediately after first login).

### Running the Application

**Development mode** (both servers concurrently):

```bash
# Terminal 1 – Backend
cd server
npm run dev        # starts on http://localhost:5500

# Terminal 2 – Frontend
cd client
npm run dev        # starts on http://localhost:5173
```

Visit `http://localhost:5173` for the public site, and `http://localhost:5173/admin/login` for the admin portal.

---

## Architecture

### Frontend Architecture

- **Public site**: React pages (`Home`, `Products`, `Supply`, `Impact`, `Partners`, `About`, `Contact`) use components like `ProductCard`, `ScrollReveal`, and `Counter`. Data is fetched via custom hooks (`useProducts`, `useCategories`) that leverage **React Query** for caching and pagination.
- **Admin dashboard**: Protected behind `AuthContext`. Only authenticated users with valid JWT tokens can access `/admin/*`. The sidebar dynamically shows menu items based on user roles. Lazy loading (`React.lazy`) is used for code splitting.
- **State management**: `React Query` handles server state (products, orders, analytics). `AuthContext` handles authentication state and token lifecycle.
- **Styling**: Tailwind CSS with a custom theme that replicates the original design system (colors `forest`, `sage`, `cream`, etc.). Responsive utilities are used throughout.

### Backend Architecture

- **Layered structure**: `Routes → Controllers → Services (optional) → Models (Sequelize)`.  
- **Authentication**:  
  - Login returns a **short-lived access token** (JWT) in the response body and a **long-lived refresh token** in an `httpOnly` cookie.  
  - All admin routes are protected by `authenticate` middleware.  
  - The `authorize(...roles)` middleware ensures granular role-based access.  
  - Axios interceptors on the frontend automatically refresh the access token when a 401 is encountered.
- **File uploads**: Product images are stored locally in `server/uploads/products/` (for production, swap to AWS S3 via `multer-s3`).
- **Error handling**: All errors are thrown as `AppError` instances (with HTTP status codes) and caught by a global error handler that returns a consistent JSON response.
- **Logging**: Winston writes structured logs (JSON) to `logs/combined.log` and `logs/error.log`. In development, logs are also printed to the console.
- **Audit logging**: A utility function is called after critical mutations (product creation, order status change, etc.) to record the action in the `audit_logs` table.

### Database Design

The PostgreSQL schema is fully normalized and includes the following tables:

| Table              | Description                                   | Key Relationships                          |
|--------------------|-----------------------------------------------|--------------------------------------------|
| `users`            | Admin users                                   | `user_roles` (M:N with `roles`)            |
| `roles`            | Role definitions (super_admin, etc.)          | `user_roles`                               |
| `user_roles`       | Join table for users ↔ roles                  |                                            |
| `categories`       | Product categories (with self‑referencing)    | `product_category`                         |
| `products`         | Products with price range (`price_min`/`max`) | `product_images`, `product_category`, `pricing_history` |
| `product_images`   | Multiple images per product                   | `products`                                 |
| `product_category` | Join table for products ↔ categories          |                                            |
| `inventory`        | Lot‑level stock (optional)                    | `products`                                 |
| `customers`        | Buyer companies                               | `orders`                                   |
| `orders`           | Customer orders with status flow              | `order_items`, `customers`                 |
| `order_items`      | Individual line items, including `final_price`| `orders`, `products`                       |
| `pricing_history`  | Archive of price changes & negotiated deals   | `products`, `users` (changed_by)           |
| `audit_logs`       | Immutable audit trail for all admin actions   | `users`                                    |
| `settings`         | Key‑value system configuration                |                                            |

**Important design decisions**:
- Products display a **price range** (`price_min` – `price_max`). If both are `NULL`, the product is listed as “Available on inquiry”.
- The final negotiated price is stored in `order_items.final_price`. If set, it overrides the `line_total` (quantity × unit_price) in invoice calculations.
- `pricing_history` records every product price range update and every negotiated final price, enabling future dynamic pricing strategies.

### API Structure

All endpoints are prefixed with `/api`. Admin endpoints live under `/api/admin`.

| Endpoint                           | Auth       | Description                              |
|------------------------------------|------------|------------------------------------------|
| **Authentication**                 |            |                                          |
| `POST /api/auth/login`             | Public     | Login (returns access + refresh token)   |
| `POST /api/auth/refresh`           | Cookie     | Get new access token                     |
| `GET /api/auth/me`                 | Required   | Current user profile                     |
| **Public**                         |            |                                          |
| `GET /api/products`                | None       | List products (with filters, pagination) |
| `GET /api/products/:slug`          | None       | Single product by slug                   |
| `GET /api/categories`              | None       | List categories                          |
| **Admin Products**                 |            |                                          |
| `POST /api/admin/products`         | `product_manager+` | Create product                  |
| `PUT /api/admin/products/:id`      | `product_manager+` | Update product                  |
| `DELETE /api/admin/products/:id`   | `product_manager+` | Archive product                 |
| `POST /api/admin/products/:id/images` | `product_manager+` | Upload images               |
| `PUT …/images/:imageId/primary`    | `product_manager+` | Set primary image              |
| `DELETE …/images/:imageId`         | `product_manager+` | Delete image                   |
| **Admin Categories**               |            |                                          |
| `GET /api/admin/categories`        | `product_manager+` | List all categories           |
| `POST /api/admin/categories`       | `product_manager+` | Create category               |
| `PUT /api/admin/categories/:id`    | `product_manager+` | Update category               |
| `DELETE /api/admin/categories/:id` | `product_manager+` | Delete category               |
| **Admin Orders**                   |            |                                          |
| `GET /api/admin/orders`            | `order_manager+` | List orders (filters, pagination) |
| `POST /api/admin/orders`           | `order_manager+` | Create order with items         |
| `PUT …/orders/:id/status`          | `order_manager+` | Update order status             |
| `PUT …/orders/:id/items/:itemId/final-price` | `order_manager+` | Set final negotiated price |
| `GET /api/admin/orders/:id/invoice`| `order_manager+` | Generate invoice (JSON)         |
| **Admin Customers**                |            |                                          |
| `GET /api/admin/customers`         | `order_manager+` | List customers (search, page)  |
| `POST /api/admin/customers`        | `order_manager+` | Create customer               |
| `PUT …/customers/:id`              | `order_manager+` | Update customer               |
| `DELETE …/customers/:id`           | `order_manager+` | Delete customer (if no orders) |
| **Admin Users**                    |            |                                          |
| `GET /api/admin/users`             | `super_admin`  | List admin users             |
| `POST /api/admin/users`            | `super_admin`  | Create user (with roles)     |
| `PUT …/users/:id`                  | `super_admin`  | Update user / change password|
| `PATCH …/users/:id/deactivate`     | `super_admin`  | Deactivate user              |
| **Analytics**                      |            |                                          |
| `GET /api/admin/analytics/dashboard` | `order_manager+` | Dashboard KPIs, chart        |
| `GET /api/admin/analytics/revenue`   | `order_manager+` | Revenue report (time series) |
| `GET /api/admin/analytics/sales`     | `order_manager+` | Sales summary                |
| `GET /api/admin/analytics/products`  | `order_manager+` | Product performance          |
| `GET /api/admin/analytics/customers` | `order_manager+` | Customer insights            |
| `GET /api/admin/analytics/inventory` | `order_manager+` | Inventory snapshot           |
| `GET /api/admin/analytics/order-trends` | `order_manager+` | Order volume trends        |
| `GET /api/admin/analytics/pricing-history` | `order_manager+` | Full pricing change log |
| **Other**                          |            |                                          |
| `GET /api/admin/audit-logs`        | `order_manager+` | View audit log (filters)    |
| `GET /api/admin/settings`          | `super_admin`  | Get system settings        |
| `PUT /api/admin/settings`          | `super_admin`  | Update settings            |

A complete OpenAPI / Swagger specification can be generated and placed in `docs/api.yaml`.

---

## Developer Guide

### Folder Structure Explained

- **client/src/components/layout/**: Shell components that wrap every page. `PublicLayout` includes `Navbar` and `Footer`; `AdminLayout` includes `Sidebar`.
- **client/src/pages/**: One directory per major view. Public pages (e.g., `Products.jsx`) are simple components that fetch data and render. Admin pages (e.g., `ProductManagement.jsx`) contain tables, modals, and mutation logic.
- **client/src/services/api.js**: Pre‑configured Axios instance with interceptors. All API calls go through here.
- **server/src/models/**: Sequelize model definitions. Associations are set in `models/index.js`.
- **server/src/routes/**: Each feature has separate public and admin route files. Admin routes apply `authenticate` and `authorize` middlewares.
- **server/src/controllers/**: Request handlers. They validate input, call the service layer (if needed), and send responses.
- **server/src/middlewares/auth.js**: Contains `authenticate` (JWT verification) and `authorize` (role check).
- **server/src/middlewares/upload.js**: Multer configuration for local file storage. Swap to S3 in production.

### Coding Conventions

- **JavaScript ES6+** – use `const`/`let`, arrow functions, async/await.
- **React**: functional components with hooks. Prop‑types are optional (we rely on Joi/validation on the backend).
- **Backend**: controllers use try/catch and forward errors to `next()`. All errors thrown via `new AppError(message, statusCode)`.
- **File naming**: kebab‑case for files and folders (e.g., `product-card.jsx`), PascalCase for components and models.
- **Commit messages**: follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.).

### Adding New Features

1. **New API endpoint**  
   - Create a route file under `server/src/routes/`.  
   - Add controller method(s) in the appropriate controller file.  
   - Write a Joi validation schema if the endpoint accepts input.  
   - Import and mount the route in `app.js`.
2. **New admin page**  
   - Add a page component inside `client/src/pages/admin/`.  
   - Define a route in `App.jsx` inside the `ProtectedRoute` block.  
   - Optionally add an entry in the sidebar array (`Sidebar.jsx`) if the user’s role should see it.
3. **Database migration**  
   - Use Sequelize CLI or directly write a migration file.  
   - Run `npx sequelize-cli db:migrate` to apply.

### Testing

**Backend** (unit + integration):
```bash
cd server
npm test           # runs Jest
npm run test:watch # watch mode
```
Example test files are in `server/__tests__/`.

**Frontend** (component tests):
```bash
cd client
npx vitest          # run once
npx vitest --watch  # watch mode
```
Tests use React Testing Library and are located next to the components (e.g., `ProductCard.test.jsx`).

---

## Deployment Guide

### Production Build

**Frontend**:
```bash
cd client
npm run build
```
The output is in `client/dist/`. Serve these static files with any web server (nginx, Vercel, Netlify).

**Backend**:
```bash
cd server
NODE_ENV=production npm start
```
It’s recommended to use a process manager like **PM2**:
```bash
pm2 start src/server.js --name konkuwan-api
```

### Server Configuration

A typical production setup uses **nginx** as a reverse proxy:

```
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        alias /path/to/server/uploads/;
    }
}
```

Enable HTTPS with Let’s Encrypt and adjust `CORS_ORIGIN` accordingly.

### Database Deployment

- Use a managed PostgreSQL service (AWS RDS, DigitalOcean, etc.) and set the connection details in the server’s `.env`.
- Run the `schema.sql` script against the production database **before** starting the API.
- Enable automated backups (e.g., pg_dump cron job) and point‑in‑time recovery if available.

### Docker (Optional)

The repository includes a `docker-compose.yml` that spins up PostgreSQL, the backend API, and an Nginx frontend in three containers.  
To use it, update the environment variables in the `docker-compose.yml` and run:

```bash
docker-compose up -d
```

---

## Maintenance Guide

### Backup Procedures

- **Database**:  
  ```bash
  pg_dump -U user -h host -d konkuwan_herbs > backup_$(date +%F).sql
  ```
  Automate this with a daily cron job.

- **Uploaded files**: sync the `server/uploads/` directory to an off‑site location (S3 bucket, Rsync, etc.).

### Common Issues & Solutions

| Issue                         | Solution                                                                          |
|-------------------------------|-----------------------------------------------------------------------------------|
| **Login fails**                | Check DB connection, bcrypt hash, and JWT secrets. Ensure the user is `is_active`. |
| **CORS errors**                | Verify `CORS_ORIGIN` in the server `.env` matches the frontend domain.            |
| **File upload not working**    | Ensure `uploads/products` directory exists and is writable. In production, switch to S3. |
| **401 on admin routes**        | Refresh token may have expired – log out and log in again.                         |
| **High memory usage**          | Reduce Sequelize pool `max` connections or add more backend instances (scale horizontally). |
| **Slow analytics**             | Add a caching layer (Redis) or use database read replicas.                         |

---

## License

This project is proprietary and confidential. Unauthorized distribution or use is prohibited.  
© 2025 Konkuwan Herbs Pvt. Ltd. All rights reserved.
```