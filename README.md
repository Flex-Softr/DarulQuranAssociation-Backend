# DarulQuran Backend API

Production-ready TypeScript REST API backend built with Express, MongoDB, and JWT authentication.

## Features

- ✅ **TypeScript** - Full type safety
- ✅ **Express.js** - Fast and minimal web framework
- ✅ **MongoDB + Mongoose** - Database with ODM
- ✅ **JWT Authentication** - Access + Refresh token pattern with rotation
- ✅ **Role-Based Access Control (RBAC)** - Superadmin, Admin, Donors roles
- ✅ **Zod Validation** - Request validation with type inference
- ✅ **Multer File Uploads** - Image upload with local storage (S3-ready)
- ✅ **Centralized Error Handling** - Structured error responses
- ✅ **Security Middleware** - Helmet, CORS, rate limiting, NoSQL injection protection
- ✅ **Environment-Driven Config** - Zod-validated configuration
- ✅ **Cookie-Based Refresh Tokens** - Secure httpOnly cookies (with SPA fallback)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/darunquran
JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-in-production
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
CORS_ORIGIN=http://localhost:3000
UPLOAD_DIR=./uploads
SALT_ROUNDS=12
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_IS_LIVE=false
MEMBER_PAYMENT_SESSION_TTL_HOURS=24
MEMBER_PAYMENT_DOC_MAX_SIZE=5242880
MEMBER_PAYMENT_DOC_ALLOWED_TYPES=pdf,jpg,jpeg,png
```

### 3. Seed Database

Seed the database with default superadmin user:

```bash
npm run seed
```

This will create:
- Default superadmin user: `superadmin@darunquran.com` / `SuperAdmin@123`
- Sample users (if enabled via `SEED_SAMPLE_USERS=true`)

**Note:** In production, change the default superadmin password immediately!

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### 5. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user (requires auth)

### Users

- `GET /api/users/me` - Get current user profile (requires auth)
- `PATCH /api/users/me` - Update current user profile (requires auth)
- `POST /api/users/me/change-password` - Change password (requires auth)
- `GET /api/users` - Get all users (requires admin role)

### Uploads

- `POST /api/uploads/avatar` - Upload avatar image (requires auth)
- `POST /api/uploads/image` - Upload general image (requires auth)
- `GET /api/uploads/:filename` - Serve uploaded file

### Member Applications

- `POST /api/v1/members/initiate-payment` - Create SSLCommerz session and receive `gatewayUrl`
- `POST /api/v1/members/complete-payment` - Finalize online payment and persist application data
- `POST /api/v1/members/apply` - Submit bank transfer/deposit application with payment slip upload
- `GET /api/v1/members` *(admin)* - List applications with pagination, filters, and search
- `GET /api/v1/members/:id` *(admin)* - Retrieve a single application
- `PATCH /api/v1/members/:id/status` *(admin)* - Update application status (pending_approval/approved/rejected)
- `DELETE /api/v1/members/:id` *(admin)* - Delete non-approved applications (cleans payment documents)

## Authentication Flow

1. **Register/Login**: User receives `accessToken` in JSON response and `refreshToken` in httpOnly cookie
2. **Access Protected Routes**: Include `Authorization: Bearer <accessToken>` header
3. **Refresh Token**: Call `/api/auth/refresh` to get new `accessToken` (refresh token automatically rotated)
4. **Logout**: Call `/api/auth/logout` to invalidate refresh token

### For Single Page Applications (SPA)

If httpOnly cookies don't work with your frontend, you can:

1. Store refresh token in localStorage and send in `Authorization` header to `/api/auth/refresh`
2. Update `auth.controller.ts` refresh endpoint to handle both cookie and header tokens (already implemented)

## Project Structure

```
src/
├── server.ts              # Application entry point
├── app.ts                 # Express app setup + middlewares
├── routes.ts              # Combine all module routes
├── config/
│   └── index.ts          # Environment config (Zod-validated)
├── db/
│   └── index.ts          # MongoDB connection
├── constants.ts           # App-wide constants
├── types/
│   └── express.d.ts       # Augment Express Request with user
└── modules/
    ├── auth/             # Authentication module
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.routes.ts
    │   ├── auth.schema.ts
    │   └── auth.types.ts
    ├── users/            # User management module
    │   ├── user.model.ts
    │   ├── user.controller.ts
    │   ├── user.service.ts
    │   ├── user.routes.ts
    │   └── user.schema.ts
    ├── uploads/          # File upload module
    │   ├── upload.middleware.ts
    │   └── upload.routes.ts
    └── common/           # Shared utilities
        ├── middleware/
        │   ├── auth.middleware.ts
        │   ├── role.middleware.ts
        │   ├── validate.middleware.ts
        │   ├── error.middleware.ts
        │   ├── async.handler.ts
        │   └── cors.middleware.ts
        └── utils/
            ├── jwt.ts
            ├── hash.ts
            └── logger.ts
```

## Security Features

- **Helmet** - Sets secure HTTP headers
- **CORS** - Configurable origin whitelist
- **Rate Limiting** - Prevents brute force attacks
- **NoSQL Injection Protection** - Sanitizes user input
- **JWT Token Rotation** - Refresh tokens rotated on each use
- **Bcrypt Password Hashing** - Configurable salt rounds
- **Zod Validation** - Type-safe request validation
- **Express Async Errors** - Catches async route errors automatically

## Production Considerations

### Token Management

Current implementation stores refresh token hash in MongoDB. For production:

- **Use Redis** for token blacklisting and session management
- Store refresh tokens in Redis with TTL matching expiration
- Implement token family tracking to prevent token reuse

### File Uploads

Current implementation uses local file storage. For production:

- **Switch to AWS S3** or similar object storage
- Update `upload.middleware.ts` to use S3 SDK
- Update `getFileUrl()` to return S3/CDN URLs
- Implement image optimization/compression

### Database

- **Connection Pooling** - Already configured (maxPoolSize: 10)
- **Indexes** - Add indexes for frequently queried fields
- **Read Replicas** - Use for read-heavy operations
- **MongoDB Atlas** - Consider managed MongoDB for production

### Scaling

- **Stateless JWT** - Access tokens are stateless, perfect for horizontal scaling
- **Load Balancing** - Use nginx/HAProxy to distribute traffic
- **Redis Session Store** - Share session state across servers
- **Request Logging** - Integrate Winston or Pino for structured logging
- **Monitoring** - Use PM2, New Relic, or DataDog for production monitoring

### Email Service

Password reset endpoints are stubbed. To implement:

1. Integrate email service (SendGrid, AWS SES, Nodemailer)
2. Generate secure reset tokens
3. Store token hash with expiration in database/Redis
4. Send reset email with link
5. Verify token and update password

### Database Seeding

The application includes a seeding system to populate the database with initial data.

#### Seed Configuration

Configure seeding via environment variables:

```env
SEED_SUPERADMIN=true
SEED_SUPERADMIN_NAME=Super Admin
SEED_SUPERADMIN_EMAIL=superadmin@darunquran.com
SEED_SUPERADMIN_PASSWORD=SuperAdmin@123
SEED_SAMPLE_USERS=false
```

#### Running Seeders

**Normal seeding** (skips existing records):
```bash
npm run seed
```

**Reset and seed** (⚠️ WARNING: Deletes all data):
```bash
npm run seed:reset
```

#### Default Seeded Data

- **Superadmin User**: `superadmin@darunquran.com` / `SuperAdmin@123` (role: superadmin)
- **Sample Users** (optional, development only):
  - `admin@example.com` / `Admin@123` (role: admin)
  - `donor@example.com` / `Donor@123` (role: donors)

**⚠️ IMPORTANT:** Always change default passwords in production!

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run seed` - Seed database with default superadmin user and sample data
- `npm run seed:reset` - **WARNING:** Drop all collections and re-seed database
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Testing

Test endpoints using Postman, curl, or your frontend application.

### Example: Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Example: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }' \
  -c cookies.txt
```

### Example: Get Current User (with access token)

```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

## License

ISC

#   D a r u l Q u r a n F o u n d a t i o n - B a c k e n d 
 
 #   D a r u l Q u r a n F o u n d a t i o n - B a c k e n d 
 
 #   D a r u l Q u r a n A s s o c i a t i o n - B a c k e n d  
 