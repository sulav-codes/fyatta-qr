# Fyatta QR - Restaurant Management System

A modern, full-stack QR-based restaurant management system that streamlines ordering, payment processing, and table management for restaurants and food vendors.

## Project Status (Latest)

The project has recently evolved in these key areas:

- Multi-tenancy: implemented with vendor-scoped data access across backend and frontend
- RBAC: implemented for `vendor`, `staff`, and `admin` roles
- Google OAuth: implemented (backend flow + frontend callback integration)
- Token security hardening: short-lived access tokens + rotating refresh tokens with reuse detection
- Prisma migration: backend now uses Prisma client with PostgreSQL datasource configuration
- Dashboard/staff access fixes: recent vendor/staff authorization and dashboard query fixes applied

## Features

- QR Code Integration: table-based QR codes for contactless ordering
- Real-time Updates: Socket.IO integration for live order and table status updates
- Multi-Role Support: customer, waiter, vendor, staff, and admin-facing flows
- Menu Management: dynamic menu with categories, pricing, and image uploads
- Order Tracking: real-time order status tracking from placement to completion
- Payment Processing: eSewa and cash payment modes
- Dashboard Analytics: vendor dashboard stats, sales reports, popular items, and recent orders
- Notification System: real-time notifications and room-based socket channels
- Responsive Design: mobile-first UI with Next.js + Tailwind

## Architecture Highlights

### Multi-tenancy model

- Primary tenant key is `vendorId`
- Staff users are linked to a parent vendor via `vendorId`
- Tenant access is enforced in backend middleware and controller-level checks
- Effective vendor resolution is used in both backend and frontend:
  - Backend: role-aware effective vendor ID logic and tenant guards
  - Frontend: `getEffectiveVendorId()` used for vendor-scoped APIs/pages

### RBAC model

- Roles: `vendor`, `staff`, `admin`
- Vendors can manage their own restaurant resources
- Staff can access their parent vendor data based on permissions
- Admin can access cross-tenant data (where allowed)
- Frontend includes role-aware page access and navigation filtering

### Authentication

- JWT-based auth with access + refresh token model:
  - Short-lived access token is returned in login/refresh responses
  - Refresh token is stored in an HTTP-only cookie (`/auth` path)
  - Refresh token rotation on each `/auth/refresh`
  - Reuse/replay detection revokes active token family and forces re-login
- Google OAuth flow:
  - Start endpoint
  - Callback endpoint
  - User upsert by Google identity/email
  - Frontend success/failure redirects

## Tech Stack

### Frontend

- Framework: Next.js 16 (React 19)
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: Radix UI, Lucide Icons
- State Management: React Context API
- Real-time: Socket.IO Client
- Charts: Recharts
- QR Generation: qrcode.react

### Backend

- Runtime: Node.js
- Framework: Express.js
- ORM/DB Access: Prisma Client
- Database Provider: PostgreSQL (configured via Prisma datasource)
- Authentication: JWT + bcryptjs
- OAuth: Google OAuth 2.0
- Real-time: Socket.IO
- File Upload: Multer

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- PostgreSQL (recommended: Supabase Postgres or local Postgres)
- npm package manager

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/sulav-codes/fyatta-qr.git
cd fyatta_qr
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend`:

```env
PORT=8000
CLIENT_URL=http://localhost:3000

# JWT
JWT_SECRET_KEY=your_jwt_secret_key_here
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
REFRESH_TOKEN_COOKIE_NAME=refreshToken
COOKIE_SAME_SITE=lax
MAX_MENU_ITEMS_PER_REQUEST=50

# Prisma PostgreSQL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
GOOGLE_FRONTEND_SUCCESS_URL=http://localhost:3000/oauth/callback
GOOGLE_FRONTEND_FAILURE_URL=http://localhost:3000/login
```

Run Prisma setup/migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create `.env.local` in `frontend`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Running the application

### Development mode

Backend:

```bash
cd backend
npm run dev
```

Server runs on `http://localhost:8000`

Frontend:

```bash
cd frontend
npm run dev
```

Application runs on `http://localhost:3000`

### Docker Compose (Frontend + Backend)

From the project root:

```bash
docker compose up --build
```

Before first run, review and update these files with your real values:

- `backend/.env.docker`
- `frontend/.env.docker`

Container URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

Common commands:

```bash
# Stop and remove containers
docker compose down

# Rebuild after Dockerfile or dependency changes
docker compose up --build
```

Notes:

- Compose stack keeps Supabase as external PostgreSQL (no local Postgres service by default).
- Backend runs Prisma deploy migrations on startup.
- Backend uploads persist via a named Docker volume.

### Production mode

Backend:

```bash
cd backend
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm start
```

## API Endpoints (Core)

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns access token + sets refresh cookie)
- `POST /auth/refresh` - Rotate refresh token and issue new access token
- `POST /auth/logout` - Revoke current refresh token and clear cookie
- `GET /auth/google/start` - Start Google OAuth
- `GET /auth/google/callback` - Google OAuth callback

### Vendor-scoped resources

- `GET /api/vendors/:vendorId/dashboard`
- `GET /api/vendors/:vendorId/sales-report`
- `GET /api/vendors/:vendorId/popular-items`
- `GET /api/vendors/:vendorId/recent-orders`
- Plus vendor-scoped menu/table/order/staff operations

### Public and transactional resources

- Public menu/table access routes
- Order creation and status update routes
- Payment process/verification routes

## Project Structure

```text
fyatta_qr/
├── backend/
│   ├── config/              # Prisma config and app config
│   ├── controllers/         # Route handlers (Prisma-backed)
│   ├── middleware/          # Auth, RBAC, tenant guards, uploads
│   ├── models/              # Legacy Sequelize models (migration reference)
│   ├── prisma/              # Prisma schema + migrations
│   ├── routes/              # API routes
│   ├── server.js            # Express + Socket.IO entry
│   └── uploads/             # Uploaded assets
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth/cart and shared providers
│   │   ├── hooks/           # RBAC/permission hooks
│   │   └── lib/             # API helpers and utilities
│   └── public/              # Static assets
└── README.md
```

## Migration Notes

- Prisma + PostgreSQL is now the active backend data layer
- Some legacy Sequelize artifacts still exist in the repository for transition/reference
- If adding new backend data features, prefer Prisma schema + migration workflow

## Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m "Add some AmazingFeature"`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, create an issue in the repository.
