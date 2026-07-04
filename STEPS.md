# RideFlow — Step-by-Step Build Guide

> **Project Summary:**
> RideFlow is a minimal full-stack ride-sharing application inspired by Uber/Lyft. Passengers request trips with pickup/destination coordinates; the backend finds the nearest available drivers using MongoDB 2dsphere geospatial queries, dispatches offers to the top 3 drivers via Redis pub/sub with a 30-second timeout, and assigns the first accepting driver. Trips follow a strict state machine (`requested → accepted → driver_arriving → in_progress → completed → cancelled`). Fares are calculated via Google Maps Distance Matrix API with surge pricing. Payments use Stripe PaymentIntents with webhook confirmation. Real-time updates flow through Socket.io (driver location, trip status, ETA). After completion, both parties rate each other; driver average ratings use a rolling average. Security layers include JWT auth, role-based guards (passenger/driver), rate limiting, helmet, CORS, NoSQL injection sanitization (Express 5 compatible), input validation, and mass-assignment protection. Stack: React 19 + Vite, Node/Express 5, MongoDB/Mongoose 9, Redis, Socket.io, Stripe, Google Maps Distance Matrix API, JWT, TailwindCSS v4, React Router v7, Axios.

> Each step below is a self-contained prompt. Execute them in order.
> Stack: React 19 + Vite, Node/Express 5, MongoDB/Mongoose 9, Redis, Socket.io, Stripe, Google Maps Distance Matrix API, JWT, TailwindCSS v4, React Router v7, Axios.
> **Total steps: 48**

---

## STEP 1 — Monorepo Folder Structure & Root .gitignore

Create the full monorepo directory tree before installing any packages:

```
rideflow/
├── .gitignore
├── README.md                  (placeholder — completed in STEP 46)
├── STEPS.md
├── server/
│   ├── package.json
│   ├── index.js
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   ├── validators/
│   └── scripts/
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── public/
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/
        ├── contexts/
        ├── hooks/
        ├── components/
        ├── layouts/
        ├── pages/
        └── utils/
```

Create empty placeholder files where needed: `server/index.js`, `client/src/main.jsx`, `client/index.html`.

### Root `.gitignore`

Include: `node_modules/`, `.env`, `.env.local`, `.env.*.local`, `dist/`, `build/`, `uploads/`, `logs/`, `*.log`, `.DS_Store`, `coverage/`, `.vscode/` (optional).

**SECURITY:** Never commit `.env`, Stripe keys, Google Maps API keys, or JWT secrets. Audit `.gitignore` before first `npm install`.

---

## STEP 2 — Server package.json, Dependencies & npm Scripts

Initialize `server/package.json` with `"type": "commonjs"` and `"main": "index.js"`.

### Production dependencies

| Package | Purpose |
|---------|---------|
| `express` (^5.x) | HTTP server |
| `mongoose` (^9.x) | MongoDB ODM |
| `redis` (^4.x) | Redis client (pub/sub + caching) |
| `socket.io` | Real-time events |
| `jsonwebtoken` | JWT auth |
| `bcryptjs` | Password hashing |
| `dotenv` | Environment variables |
| `cors` | CORS |
| `helmet` | Security headers |
| `express-rate-limit` | Rate limiting |
| `express-mongo-sanitize` | NoSQL injection (sanitize function only) |
| `express-validator` | Input validation |
| `stripe` | Payment processing |
| `@googlemaps/google-maps-services-js` | Distance Matrix API |
| `morgan` | HTTP logging (dev only) |

### DevDependencies

`nodemon`

### npm scripts

| Script | Command |
|--------|---------|
| `dev` | `nodemon index.js` |
| `start` | `node index.js` |
| `seed` | `node scripts/seed.js` |

Run `npm install` inside `server/`.

**SECURITY:** Do NOT install `hpp` — incompatible with Express 5 (`req.query` is read-only).

---

## STEP 3 — Client package.json, Dependencies & npm Scripts

Initialize `client/package.json`.

### Production dependencies

| Package | Purpose |
|---------|---------|
| `react` (^19.x) | UI |
| `react-dom` | DOM rendering |
| `react-router-dom` (^7.x) | Routing |
| `axios` | HTTP client |
| `socket.io-client` | Real-time |
| `@stripe/react-stripe-js` | Stripe Elements |
| `@stripe/stripe-js` | Stripe loader |
| `react-hot-toast` | Toast notifications |
| `lucide-react` | Icons |

### DevDependencies

`vite`, `@vitejs/plugin-react`, `tailwindcss` (^4.x), `@tailwindcss/vite`

### npm scripts

| Script | Command |
|--------|---------|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |

Run `npm install` inside `client/`.

---

## STEP 4 — Environment Variables (env.js) & server/.env.example

### `server/config/env.js`

Load `dotenv` and validate all variables at startup. Export a frozen `env` object.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `3000` | Server port |
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `REDIS_URL` | Yes | — | Redis Cloud connection string |
| `JWT_SECRET` | Yes | — | Min 32 chars; **throw in production if shorter** |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry |
| `CLIENT_URL` | Yes | `http://localhost:5173` | CORS origin (strict in production) |
| `STRIPE_SECRET_KEY` | Yes | — | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | — | From `stripe listen` or Stripe Dashboard |
| `GOOGLE_MAPS_API_KEY` | Yes | — | Distance Matrix API enabled |
| `BASE_FARE` | No | `2.50` | Base fare in USD |
| `PER_KM_RATE` | No | `1.20` | Per kilometer rate |
| `PER_MINUTE_RATE` | No | `0.25` | Per minute rate |
| `SURGE_MULTIPLIER` | No | `1.5` | Rush hour multiplier |
| `RUSH_HOUR_START` | No | `7` | Hour (0-23) |
| `RUSH_HOUR_END` | No | `9` | Hour (0-23) |
| `DRIVER_SEARCH_RADIUS_METERS` | No | `5000` | Geospatial search radius |
| `DRIVER_OFFER_COUNT` | No | `3` | Drivers notified per request |
| `TRIP_REQUEST_TIMEOUT_MS` | No | `30000` | 30-second offer timeout |
| `LOCATION_UPDATE_INTERVAL_MS` | No | `5000` | Driver location push interval |

Production check: if `NODE_ENV === 'production'` and `JWT_SECRET.length < 32`, throw `"JWT_SECRET must be at least 32 characters in production"`.

### `server/.env.example`

Include every variable above with placeholder values and inline comments. No real secrets.

**SECURITY:** Production JWT secret length enforced at startup. Never expose secrets in example files.

---

## STEP 5 — MongoDB Connection (db.js)

### `server/config/db.js`

| Export | Behavior |
|--------|----------|
| `connectDB()` | Async function. `mongoose.connect(env.MONGODB_URI)`. Log `"MongoDB connected"`. On failure: log error and `process.exit(1)`. |

Use Mongoose 9 connection options. No deprecated options.

**SECURITY:** Connection string only from env — never hardcoded.

---

## STEP 6 — Redis Connection (redis.js)

### `server/config/redis.js`

| Export | Behavior |
|--------|----------|
| `redisClient` | Primary Redis connection from `env.REDIS_URL` |
| `redisSubscriber` | **Separate** subscriber connection (subscriber mode cannot run other commands) |
| `connectRedis()` | Async initializer — connect both clients, log success/failure |

Handle events on both clients: `connect`, `error`, `reconnecting`.

On connection failure: log error and `process.exit(1)`.

**SECURITY:** Redis URL only from env. No credentials in source code.

---

## STEP 7 — Express App Bootstrap, Security Middleware & Health Check

### `server/index.js` (partial — completed in STEP 31)

Create Express app and HTTP server. Apply middleware in this exact order:

1. `dotenv.config()` at top of file
2. Import `env.js` (validation runs on import)
3. `app.disable('x-powered-by')`
4. `helmet()`
5. `cors({ origin: env.CLIENT_URL, credentials: true })` — never `*` in production
6. Mount Stripe webhook routes **before** JSON parser (STEP 26)
7. `express.json({ limit: '10kb' })`
8. `express.urlencoded({ extended: true, limit: '10kb' })`
9. Custom mongo-sanitize middleware (Express 5 compatible):

```js
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});
```

10. `morgan('dev')` only when `env.NODE_ENV === 'development'`

### Health check route

`GET /api/health` → `{ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } }`

**SECURITY:**
- CORS locked to `CLIENT_URL`
- Body size limits 10kb
- `x-powered-by` disabled
- Do NOT use `app.use(mongoSanitize())` — crashes Express 5
- Do NOT assign to `req.query` anywhere

---

## STEP 8 — Rate Limiters, Error Handler & Validate Middleware

### `server/middleware/rateLimiters.js`

| Limiter | `windowMs` | `max` | Applied to |
|---------|------------|-------|------------|
| `globalLimiter` | 15 min | 200 | All `/api/*` routes |
| `authLimiter` | 15 min | 10 | `/api/auth/login`, `/api/auth/register` |
| `tripLimiter` | 1 min | 5 | `/api/trips/request` |
| `webhookLimiter` | 1 min | 100 | `/api/webhooks/stripe` |

Apply `globalLimiter` to `/api` in `index.js`.

### `server/middleware/errorHandler.js`

| Export | Behavior |
|--------|----------|
| `notFound` | 404 — `{ success: false, message: 'Route not found' }` |
| `errorHandler` | Global handler. Production: no stack traces, no internal paths. Format: `{ success: false, message }`. Handle `ValidationError`, `CastError`, `JsonWebTokenError`, duplicate key (11000) with generic messages |

### `server/middleware/validate.js`

`validate(req, res, next)` — read `express-validator` results. If errors: return 400 `{ success: false, message: 'Validation failed', errors: [{ field, message }] }`.

Mount `notFound` and `errorHandler` at end of middleware chain in `index.js`.

**SECURITY:** Separate rate limiters per sensitivity. Production error responses must not leak internals.

---

## STEP 9 — Server Constants & JWT Token Utility

### `server/utils/constants.js`

| Constant | Value |
|----------|-------|
| `TRIP_STATUSES` | `['requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled']` |
| `TRIP_STATUS_TRANSITIONS` | Map — see STEP 20 for full transition table |
| `ROLES` | `['passenger', 'driver']` |
| `REDIS_CHANNELS` | `{ TRIP_OFFERS: 'trip:offers', TRIP_CANCEL: 'trip:cancel' }` |
| `PAYMENT_STATUSES` | `['pending', 'processing', 'succeeded', 'failed']` |
| `CANCELLED_BY` | `['passenger', 'driver', 'system']` |

### `server/utils/generateToken.js`

- Sign JWT with `env.JWT_SECRET`, expiry `env.JWT_EXPIRES_IN`
- Payload: `{ id: user._id, role: user.role }`
- Return token string

### `server/utils/apiResponse.js` (optional helper)

| Function | Returns |
|----------|---------|
| `success(res, data, statusCode = 200)` | `{ success: true, data }` |
| `fail(res, message, statusCode = 400)` | `{ success: false, message }` |

**SECURITY:** JWT payload contains only `id` and `role` — no email or sensitive fields.

---

## STEP 10 — User Model & Password Hashing (Mongoose 9)

### `server/models/User.js`

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `name` | String | Yes | — | trim, min 2, max 50 |
| `email` | String | Yes | — | trim, lowercase, unique, valid email |
| `password` | String | Yes | — | min 8 chars, `select: false` |
| `phone` | String | Yes | — | trim, regex `/^\+?[1-9]\d{7,14}$/` |
| `role` | String | Yes | `passenger` | enum: `passenger`, `driver` — **NOT settable via register** |
| `avatar` | String | No | `null` | URL string |
| `averageRating` | Number | No | `0` | min 0, max 5 |
| `totalRatings` | Number | No | `0` | min 0 |
| `isActive` | Boolean | No | `true` | — |
| `stripeCustomerId` | String | No | `null` | Stripe customer ID |
| `createdAt` | Date | auto | — | timestamps |
| `updatedAt` | Date | auto | — | timestamps |

**Index:** `email` (unique)

**Pre-save hook (Mongoose 9 — async, NO `next` parameter):**

```js
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
```

**Instance method:** `comparePassword(candidatePassword)` → `bcrypt.compare`

**SECURITY:** `role` defaults to `passenger`. `select: false` on password. Never return password in any response.

---

## STEP 11 — Auth Middleware (protect, Role Guards)

### `server/middleware/auth.js`

| Middleware | Behavior |
|------------|----------|
| `protect` | Read `Authorization: Bearer <token>`. Verify JWT. Find user by `id` (exclude password). Attach `req.user`. 401 if missing/invalid/inactive. |
| `optionalAuth` | Same but continues without `req.user` if no token |
| `driverOnly` | After `protect` — `req.user.role` must be `driver` → 403 otherwise |
| `passengerOnly` | After `protect` — `req.user.role` must be `passenger` → 403 otherwise |

Use `generateToken` payload shape consistently with verification.

**SECURITY:** Token from `Authorization: Bearer` header only. Reject expired/invalid tokens with generic 401 message.

---

## STEP 12 — Auth Validators (express-validator)

### `server/validators/authValidators.js`

Export validator arrays per route:

| Route | Field Rules |
|-------|-------------|
| Register | `name`: trim, escape, isLength 2-50; `email`: isEmail, normalizeEmail; `password`: isLength min 8; `phone`: matches `/^\+?[1-9]\d{7,14}$/` |
| Login | `email`: isEmail, normalizeEmail; `password`: notEmpty |
| Update profile | `name`: optional, trim, escape, isLength 2-50; `phone`: optional, matches phone regex |
| Change password | `currentPassword`: notEmpty; `newPassword`: isLength min 8 |
| Delete account | `password`: notEmpty |
| Become driver | `vehicle.make`: trim, escape, notEmpty, max 30; `vehicle.model`: same; `vehicle.year`: isInt 1990 to currentYear+1; `vehicle.color`: trim, escape, max 20; `vehicle.plateNumber`: trim, escape, uppercase, max 10 |

**SECURITY:** `escape()` on all text fields. No `role` field in any validator.

---

## STEP 13 — Auth Controller (register, login, getMe, updateProfile)

### `server/controllers/authController.js` (part 1)

| Function | Behavior |
|----------|----------|
| `register` | Destructure only `name, email, password, phone` from `req.body`. Force `role: 'passenger'`. Create user. Return `{ token, user }` (no password). Duplicate email (11000) → `"Registration failed. Email may already be in use."` |
| `login` | Find by email with `.select('+password')`. Wrong email OR wrong password → identical `"Invalid email or password"` |
| `getMe` | Return `req.user` |
| `updateProfile` | Whitelist `name, phone` only. Return updated user |

**SECURITY:** Mass assignment protection — never spread `req.body`. User enumeration prevented on login.

---

## STEP 14 — Auth Controller (becomeDriver, changePassword, deleteAccount) & Auth Routes

### `server/controllers/authController.js` (part 2)

| Function | Behavior |
|----------|----------|
| `becomeDriver` | `passengerOnly`. Require vehicle fields from body. Set `user.role = 'driver'`. Create `Driver` document linked to user (STEP 16). Return `{ user, driver }` |
| `changePassword` | Verify `currentPassword` via `comparePassword`. Set `newPassword`. Save user |
| `deleteAccount` | Require `password` confirmation. Cancel any active trips. Delete driver profile if exists. Delete user |

### `server/routes/authRoutes.js`

| Method | Path | Middleware | Controller |
|--------|------|------------|------------|
| POST | `/api/auth/register` | `authLimiter`, registerValidators, `validate` | `register` |
| POST | `/api/auth/login` | `authLimiter`, loginValidators, `validate` | `login` |
| GET | `/api/auth/me` | `protect` | `getMe` |
| PATCH | `/api/auth/profile` | `protect`, profileValidators, `validate` | `updateProfile` |
| PATCH | `/api/auth/password` | `protect`, passwordValidators, `validate` | `changePassword` |
| POST | `/api/auth/become-driver` | `protect`, `passengerOnly`, becomeDriverValidators, `validate` | `becomeDriver` |
| DELETE | `/api/auth/account` | `protect`, deleteValidators, `validate` | `deleteAccount` |

Mount at `/api/auth` in `index.js`.

**SECURITY:** `role` never accepted from client on register. `becomeDriver` is the only passenger→driver path.

---

## STEP 15 — Seed Script & Test Users/Drivers

### `server/scripts/seed.js`

Clear existing data (dev only). Create seed users:

| Name | Role | Email | Password |
|------|------|-------|----------|
| Alice Passenger | passenger | `passenger@test.com` | `Password123!` |
| Bob Driver | driver | `driver@test.com` | `Password123!` |
| Carol Driver | driver | `driver2@test.com` | `Password123!` |
| Dan Driver | driver | `driver3@test.com` | `Password123!` |

For each driver user, create a `Driver` document:
- `isAvailable: true`, `isOnTrip: false`
- Vehicle: realistic make/model/year/color/plate
- Locations spread within 3km of center point (San Francisco: lng `-122.4194`, lat `37.7749`)
- Use varied coordinates so geospatial tests return sorted results

Log created credentials to console. Disconnect DB on completion.

**SECURITY:** Seed only runs in development. Never use `Password123!` in production.

---

## STEP 16 — Driver Model, Vehicle Subdocument & 2dsphere Index

### `server/models/Driver.js`

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `user` | ObjectId (ref: User) | Yes | — | unique |
| `vehicle.make` | String | Yes | — | trim, max 30 |
| `vehicle.model` | String | Yes | — | trim, max 30 |
| `vehicle.year` | Number | Yes | — | min 1990, max current year + 1 |
| `vehicle.color` | String | Yes | — | trim, max 20 |
| `vehicle.plateNumber` | String | Yes | — | trim, uppercase, max 10 |
| `location` | GeoJSON Point | Yes | — | `{ type: 'Point', coordinates: [lng, lat] }` |
| `heading` | Number | No | `0` | 0-360 |
| `isAvailable` | Boolean | No | `false` | — |
| `isOnTrip` | Boolean | No | `false` | — |
| `averageRating` | Number | No | `0` | min 0, max 5 |
| `totalRatings` | Number | No | `0` | min 0 |
| `totalTrips` | Number | No | `0` | min 0 |
| `lastLocationUpdate` | Date | No | `null` | — |

**CRITICAL INDEX:** `driverSchema.index({ location: '2dsphere' })` — geospatial queries fail without this.

**Additional indexes:** `user` (unique), `{ isAvailable: 1, isOnTrip: 1 }`

Default location for new drivers: coordinates `[0, 0]` until first update, or seed location on `becomeDriver`.

**SECURITY:** `user` field unique — one driver profile per user.

---

## STEP 17 — Driver Service (Geospatial Queries & Availability)

### `server/services/driverService.js`

| Function | Signature & Behavior |
|----------|---------------------|
| `findNearbyDrivers` | `(lng, lat, maxDistance = env.DRIVER_SEARCH_RADIUS_METERS)` — `Driver.find({ isAvailable: true, isOnTrip: false, location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: maxDistance } } }).populate('user', 'name phone averageRating').limit(env.DRIVER_OFFER_COUNT)` |
| `updateDriverLocation` | `(driverId, lng, lat, heading)` — validate coords, update `location`, `heading`, `lastLocationUpdate` |
| `setDriverAvailability` | `(driverId, isAvailable)` — reject if `isOnTrip === true`. Update `isAvailable` |
| `getDriverByUserId` | `(userId)` — find driver where `user === userId` |
| `releaseDriver` | `(driverId)` — set `isOnTrip: false`, optionally `isAvailable: true` after trip ends |

**SECURITY:** Coordinates validated before DB write. `$maxDistance` from env, not client input.

---

## STEP 18 — Driver Validators, Controller & Routes

### `server/validators/driverValidators.js`

| Route | Rules |
|-------|-------|
| Update location | `lng`: isFloat -180 to 180; `lat`: isFloat -90 to 90; `heading`: optional isFloat 0-360 |
| Update availability | `isAvailable`: isBoolean |

### `server/controllers/driverController.js`

| Function | Behavior |
|----------|----------|
| `getMyDriverProfile` | Find driver by `req.user._id`. 404 if not found |
| `updateLocation` | `driverOnly`. Call `updateDriverLocation`. Emit socket event (STEP 29) |
| `toggleAvailability` | `driverOnly`. Call `setDriverAvailability` |

### `server/routes/driverRoutes.js`

| Method | Path | Middleware | Controller |
|--------|------|------------|------------|
| GET | `/api/drivers/me` | `protect`, `driverOnly` | `getMyDriverProfile` |
| PATCH | `/api/drivers/location` | `protect`, `driverOnly`, locationValidators, `validate` | `updateLocation` |
| PATCH | `/api/drivers/availability` | `protect`, `driverOnly`, availabilityValidators, `validate` | `toggleAvailability` |

Mount at `/api/drivers`.

**SECURITY:** Only drivers update location/availability. Ownership via `req.user._id`.

---

## STEP 19 — Trip Model, Indexes & Status History Hook

### Trip State Machine (reference)

```
requested → accepted → driver_arriving → in_progress → completed
    ↓           ↓            ↓               ↓
cancelled   cancelled    cancelled       cancelled
```

### `server/models/Trip.js`

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `passenger` | ObjectId (ref: User) | Yes | — | — |
| `driver` | ObjectId (ref: Driver) | No | `null` | set on accept |
| `pickup` | GeoJSON Point | Yes | — | `[lng, lat]` |
| `pickupAddress` | String | Yes | — | trim, max 200 |
| `destination` | GeoJSON Point | Yes | — | `[lng, lat]` |
| `destinationAddress` | String | Yes | — | trim, max 200 |
| `status` | String | Yes | `requested` | enum: TRIP_STATUSES |
| `distanceMeters` | Number | No | `null` | min 0 |
| `durationSeconds` | Number | No | `null` | min 0 |
| `estimatedFare` | Number | No | `null` | min 0 |
| `finalFare` | Number | No | `null` | min 0 |
| `surgeMultiplier` | Number | No | `1` | min 1, max 5 |
| `paymentInfo.stripePaymentIntentId` | String | No | `null` | — |
| `paymentInfo.clientSecret` | String | No | `null` | — |
| `paymentInfo.status` | String | No | `pending` | enum: PAYMENT_STATUSES |
| `paymentInfo.paidAt` | Date | No | `null` | — |
| `offeredDrivers` | [ObjectId] | No | `[]` | — |
| `cancelledBy` | String | No | `null` | enum: CANCELLED_BY |
| `cancellationReason` | String | No | `null` | max 200 |
| `passengerRating` | Object | No | `null` | `{ score, comment, createdAt }` |
| `driverRating` | Object | No | `null` | `{ score, comment, createdAt }` |
| `eta` | Number | No | `null` | seconds |
| `statusHistory` | Array | No | `[]` | `{ status, timestamp, note }` |
| `requestedAt` | Date | No | `Date.now` | — |
| `acceptedAt` | Date | No | `null` | — |
| `startedAt` | Date | No | `null` | — |
| `completedAt` | Date | No | `null` | — |
| `cancelledAt` | Date | No | `null` | — |

**Indexes:** `{ passenger: 1, status: 1 }`, `{ driver: 1, status: 1 }`, `{ status: 1, createdAt: -1 }`, `{ pickup: '2dsphere' }`

**Pre-save hook (Mongoose 9):** When `status` is modified, push `{ status, timestamp: new Date(), note: '' }` to `statusHistory`.

**SECURITY:** `status` not settable from API body directly — service layer only.

---

## STEP 20 — Trip State Machine Service & Transition Rules

### `server/services/tripStateService.js`

### `TRIP_STATUS_TRANSITIONS` (in constants.js)

| From | Allowed To |
|------|------------|
| `requested` | `accepted`, `cancelled` |
| `accepted` | `driver_arriving`, `cancelled` |
| `driver_arriving` | `in_progress`, `cancelled` |
| `in_progress` | `completed`, `cancelled` |
| `completed` | — (terminal) |
| `cancelled` | — (terminal) |

| Function | Description |
|----------|-------------|
| `canTransition(currentStatus, newStatus)` | Return boolean from transitions map |
| `isTerminal(status)` | `completed` or `cancelled` |
| `transitionTrip(tripId, newStatus, metadata = {})` | 1) Load trip. 2) Reject if terminal. 3) Validate transition. 4) Update status + timestamp fields (`acceptedAt`, `startedAt`, `completedAt`, `cancelledAt`). 5) Save. 6) Emit `trip_status_change` socket event (STEP 29). Return updated trip |

Timestamp mapping:
- `accepted` → `acceptedAt`
- `in_progress` → `startedAt`
- `completed` → `completedAt`, set `finalFare = estimatedFare` if not set
- `cancelled` → `cancelledAt`

**SECURITY:** All status changes go through this service. Terminal states immutable.

---

## STEP 21 — Fare Calculation Service (Google Maps Distance Matrix)

### `server/services/fareService.js`

| Function | Description |
|----------|-------------|
| `getDistanceAndDuration(originLng, originLat, destLng, destLat)` | Google Maps Distance Matrix API. Return `{ distanceMeters, durationSeconds }`. Throw descriptive error on API failure |
| `isRushHour()` | `currentHour >= RUSH_HOUR_START && currentHour < RUSH_HOUR_END` |
| `calculateFare(distanceMeters, durationSeconds)` | Apply formula below. Return `{ estimatedFare, surgeMultiplier, distanceMeters, durationSeconds }` |
| `estimateTripFare(pickupLng, pickupLat, destLng, destLat)` | Combine distance lookup + fare calc |

**Formula:**

```
km = distanceMeters / 1000
minutes = durationSeconds / 60
fare = BASE_FARE + (km × PER_KM_RATE) + (minutes × PER_MINUTE_RATE)
if rushHour: fare × SURGE_MULTIPLIER
estimatedFare = Math.round(fare * 100) / 100
```

Optional: cache in Redis 5 minutes keyed by `fare:{lng1},{lat1}:{lng2},{lat2}`.

**SECURITY:** API key server-side only. Validate coordinates before external call.

---

## STEP 22 — Driver Matching Service & Redis Pub/Sub

### `server/services/matchingService.js`

In-memory `offerTimeouts = new Map()` for trip timeout IDs.

| Function | Description |
|----------|-------------|
| `dispatchTripOffers(trip)` | Find nearby drivers. If none: cancel trip (`cancelledBy: 'system'`, reason: `'No drivers available'`). Save `offeredDrivers`. Publish to each driver on `REDIS_CHANNELS.TRIP_OFFERS`. Start 30s timeout |
| `handleDriverAccept(driverId, tripId)` | Atomic `findOneAndUpdate({ _id: tripId, status: 'requested', offeredDrivers: driverId })`. Assign driver. Transition to `accepted`. Set driver `isOnTrip: true, isAvailable: false`. Publish `TRIP_CANCEL` to other drivers. Clear timeout |
| `handleOfferTimeout(tripId)` | If still `requested`: cancel with `cancelledBy: 'system'`, reason: `'No driver accepted within timeout'`. Emit `trip_timeout` socket event |
| `clearOfferTimeout(tripId)` | `clearTimeout` and delete from Map |

### Redis message formats

**TRIP_OFFERS:**

```json
{
  "type": "trip_offer",
  "driverId": "...",
  "tripId": "...",
  "pickup": { "lng": -122.4, "lat": 37.77 },
  "pickupAddress": "123 Main St",
  "destination": { "lng": -122.5, "lat": 37.78 },
  "destinationAddress": "456 Oak Ave",
  "estimatedFare": 12.50,
  "passenger": { "name": "Alice", "rating": 4.8 }
}
```

**TRIP_CANCEL:**

```json
{
  "type": "offer_cancelled",
  "driverId": "...",
  "tripId": "...",
  "reason": "assigned_to_another_driver"
}
```

**SECURITY:** Only offered drivers can accept. Atomic update prevents double-assign. No passwords in Redis messages.

---

## STEP 23 — Trip Validators & Trip Controller (request, accept, cancel)

### `server/validators/tripValidators.js`

| Route | Rules |
|-------|-------|
| Request trip | `pickupLng, pickupLat, destLng, destLat`: isFloat in range; `pickupAddress, destinationAddress`: trim, escape, notEmpty, max 200 |
| Accept trip | `tripId` param: isMongoId |
| Update status | `status`: isIn TRIP_STATUSES; `reason`: optional trim, escape, max 200 |
| Cancel trip | `reason`: optional trim, escape, max 200 |
| Rate trip | `score`: isInt 1-5; `comment`: optional trim, escape, max 300 |
| Create payment | `tripId`: isMongoId |

### `server/controllers/tripController.js` (part 1)

| Function | Behavior |
|----------|----------|
| `requestTrip` | `passengerOnly`. Reject if passenger has active non-terminal trip. Call `fareService.estimateTripFare`. Create trip `status: 'requested'`. Call `dispatchTripOffers`. Return trip |
| `acceptTrip` | `driverOnly`. Call `handleDriverAccept(req.user driverId, tripId)`. 409 if already assigned |
| `cancelTrip` | Verify participant. Set `cancelledBy` from role. `transitionTrip('cancelled')`. `releaseDriver` if assigned |

**SECURITY:** No `req.body` spread into Trip. Passenger single active trip enforced.

---

## STEP 24 — Trip Controller (status, queries) & Trip Routes

### `server/controllers/tripController.js` (part 2)

| Function | Behavior |
|----------|----------|
| `updateTripStatus` | Role-based: Driver → `driver_arriving`, `in_progress`, `completed`. Passenger → cancel only before `in_progress`. Call `transitionTrip` |
| `getTrip` | Verify user is passenger or assigned driver's user. Populate `driver.user`, `passenger` |
| `getMyTrips` | Query trips where user is passenger OR driver. Pagination: `page` (default 1, min 1), `limit` (default 10, max 50). Return `{ items, page, totalPages, total }` |
| `getActiveTrip` | Find non-terminal trip for user. Return trip or `null` |

### `server/routes/tripRoutes.js`

| Method | Path | Middleware | Controller |
|--------|------|------------|------------|
| POST | `/api/trips/request` | `protect`, `passengerOnly`, `tripLimiter`, validators, `validate` | `requestTrip` |
| POST | `/api/trips/:tripId/accept` | `protect`, `driverOnly`, validators, `validate` | `acceptTrip` |
| PATCH | `/api/trips/:tripId/status` | `protect`, validators, `validate` | `updateTripStatus` |
| POST | `/api/trips/:tripId/cancel` | `protect`, validators, `validate` | `cancelTrip` |
| GET | `/api/trips/active` | `protect` | `getActiveTrip` |
| GET | `/api/trips/my` | `protect` | `getMyTrips` |
| GET | `/api/trips/:tripId` | `protect` | `getTrip` |

Mount at `/api/trips`.

**SECURITY:** Ownership on all trip endpoints. Pagination clamped. Rate limit on request.

---

## STEP 25 — Stripe Payment Service, Controller & Routes

### `server/services/paymentService.js`

| Function | Description |
|----------|-------------|
| `createOrGetStripeCustomer(user)` | Create Stripe Customer if no `stripeCustomerId`. Save on user |
| `createPaymentIntent(trip, user)` | Amount = `trip.finalFare || trip.estimatedFare` in cents. Currency `usd`. Metadata `{ tripId: trip._id }`. Save `paymentInfo` on trip. Return `clientSecret` |
| `handlePaymentSucceeded(paymentIntent)` | Find trip by metadata.tripId. Set `paymentInfo.status: 'succeeded'`, `paidAt: new Date()` |

### `server/controllers/paymentController.js`

| Function | Behavior |
|----------|----------|
| `createPayment` | `passengerOnly`. Body: `tripId`. Trip must be `completed`, user must be passenger. Return `{ clientSecret, amount }` |

### `server/routes/paymentRoutes.js`

| Method | Path | Middleware | Controller |
|--------|------|------------|------------|
| POST | `/api/payments/create` | `protect`, `passengerOnly`, paymentValidators, `validate` | `createPayment` |

Mount at `/api/payments`.

**SECURITY:** Amount from server trip record only. `clientSecret` only to trip passenger. Stripe secret key server-side only.

---

## STEP 26 — Stripe Webhook Route & Raw Body Parser Setup

### `server/controllers/webhookController.js`

| Function | Behavior |
|----------|----------|
| `handleStripeWebhook` | Use `express.raw({ type: 'application/json' })` on this route only. Verify with `stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET)`. On `payment_intent.succeeded`: call `handlePaymentSucceeded`. Return 200 `{ received: true }`. 400 on signature failure |

### `server/routes/webhookRoutes.js`

| Method | Path | Middleware | Controller |
|--------|------|------------|------------|
| POST | `/api/webhooks/stripe` | `webhookLimiter`, `express.raw({ type: 'application/json' })` | `handleStripeWebhook` |

**CRITICAL:** Mount `/api/webhooks` BEFORE `express.json()` in `index.js`. JSON parser corrupts webhook signature verification.

### Payment flow

1. Trip → `completed` → `finalFare` set
2. Passenger → `POST /api/payments/create`
3. Server → `clientSecret`
4. Frontend → Stripe Elements confirm (STEP 43)
5. Webhook → `payment_intent.succeeded` → mark paid

**SECURITY:** Webhook signature mandatory. Reject unsigned payloads.

---

## STEP 27 — Rating Service, Controller & Routes

### `server/services/ratingService.js`

| Function | Description |
|----------|-------------|
| `updateRollingAverage(currentAvg, currentTotal, newScore)` | `(currentAvg * currentTotal + newScore) / (currentTotal + 1)` |
| `rateTrip(tripId, raterId, raterRole, score, comment)` | Trip must be `completed`. Passenger rates driver; driver rates passenger. Reject duplicate ratings. Save on trip. Update rated party on User + Driver models |
| `applyRating(trip, raterRole, score, comment)` | Set `passengerRating` or `driverRating`. Increment `totalRatings`, recalculate `averageRating` |

### `server/controllers/ratingController.js`

| Function | Behavior |
|----------|----------|
| `rateTrip` | Verify participant. Call `ratingService.rateTrip`. Return updated trip |

### `server/routes/ratingRoutes.js`

| Method | Path | Middleware | Controller |
|--------|------|------------|------------|
| POST | `/api/trips/:tripId/rate` | `protect`, rateValidators, `validate` | `rateTrip` |

Mount rating route under `/api/trips` or as separate mount.

**SECURITY:** One rating per role per trip. Score 1-5 enforced. Comment escaped.

---

## STEP 28 — Socket.io Server Initialization & JWT Socket Auth

### `server/sockets/index.js` (part 1)

- Initialize Socket.io on HTTP server: `new Server(httpServer, { cors: { origin: env.CLIENT_URL, credentials: true } })`
- Export `io` instance and `initSockets(httpServer)` function

### Socket authentication middleware

```js
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  // verify JWT, attach socket.user = { id, role }
});
```

On connection:
- Join room `user:{userId}`
- If driver: join `driver:{driverId}` (lookup Driver by user id)
- Log connect/disconnect (dev only)

**SECURITY:** Reject unauthenticated connections. No sensitive data in handshake.

---

## STEP 29 — Socket Room Strategy, Events & Handlers

### Room strategy

| Room | Members | Purpose |
|------|---------|---------|
| `user:{userId}` | All users | Personal notifications |
| `trip:{tripId}` | Passenger + assigned driver | Trip updates |
| `driver:{driverId}` | Driver | Trip offers |

### Server → client events

| Event | Payload | Trigger |
|-------|---------|---------|
| `trip_offer` | `{ tripId, pickup, destination, addresses, estimatedFare, passenger }` | Matching dispatch |
| `offer_cancelled` | `{ tripId, reason }` | Another driver accepted |
| `trip_status_change` | `{ tripId, status, timestamp, eta? }` | State transition |
| `driver_location_update` | `{ tripId, driverId, lng, lat, heading }` | Driver location |
| `eta_update` | `{ tripId, etaSeconds }` | ETA recalculated |
| `trip_timeout` | `{ tripId, message }` | 30s expired |

### Client → server events

| Event | Payload | Handler |
|-------|---------|---------|
| `driver_location_update` | `{ lng, lat, heading }` | Driver only. Update DB. Broadcast to `trip:{tripId}` |
| `join_trip` | `{ tripId }` | Verify participant. Join room |
| `leave_trip` | `{ tripId }` | Leave room |

Export `emitToTrip(tripId, event, data)` helper for use in services.

**SECURITY:** Room joins verified against trip participants. Location updates driver-only.

---

## STEP 30 — Redis-to-Socket Bridge & ETA Service

### Redis → Socket.io bridge (`server/sockets/redisBridge.js`)

- `redisSubscriber.subscribe(REDIS_CHANNELS.TRIP_OFFERS, REDIS_CHANNELS.TRIP_CANCEL)`
- On `TRIP_OFFERS` message: `io.to('driver:' + driverId).emit('trip_offer', payload)`
- On `TRIP_CANCEL` message: `io.to('driver:' + driverId).emit('offer_cancelled', payload)`
- Call `initRedisBridge(io)` from `initSockets`

### `server/services/etaService.js`

| Function | Description |
|----------|-------------|
| `calculateEta(driverLng, driverLat, pickupLng, pickupLat)` | Google Maps Distance Matrix (driver → pickup). Return `etaSeconds`. Cache 30s in Redis |
| `updateTripEta(tripId)` | If trip status is `accepted` or `driver_arriving`, compute ETA, save on trip, emit `eta_update` |

Trigger ETA update on: driver location update, status → `accepted` or `driver_arriving`.

**SECURITY:** ETA calculations server-side only. Redis bridge validates JSON before emit.

---

## STEP 31 — Server Route Aggregation & Startup

### Complete `server/index.js`

Wire everything:

1. Create `express()` + `http.createServer(app)`
2. Security middleware (STEP 7)
3. `connectDB()` + `connectRedis()`
4. Mount `webhookRoutes` **before** JSON parser (STEP 26)
5. JSON + urlencoded + sanitize + morgan
6. `globalLimiter` on `/api`
7. Mount routes: `authRoutes`, `driverRoutes`, `tripRoutes`, `paymentRoutes`
8. Health check
9. `notFound` + `errorHandler`
10. `initSockets(httpServer)` + `initRedisBridge(io)`
11. `httpServer.listen(env.PORT)`

Export app for testing (optional).

Verify server starts without errors. Test `GET /api/health`.

**SECURITY:** Startup fails fast if env validation fails. All routes behind appropriate middleware.

---

## STEP 32 — Backend Validation Review & Security Audit

### Validator files — complete inventory

| File | Endpoints covered |
|------|-------------------|
| `authValidators.js` | register, login, profile, password, becomeDriver, deleteAccount |
| `driverValidators.js` | location, availability |
| `tripValidators.js` | request, accept, status, cancel, rate |
| `paymentValidators.js` | create payment |

### Comprehensive Security Audit Checklist

- [ ] Mass assignment: every controller destructures only allowed fields
- [ ] Role protection: `role` not settable via register or profile update
- [ ] User enumeration: identical login error for wrong email vs wrong password
- [ ] Password: hashed (bcrypt 12), `select: false`, never returned, change requires current
- [ ] JWT secret: min 32 chars enforced at startup in production
- [ ] Rate limiters: separate instances for global, auth, trip request, webhook
- [ ] Helmet: security headers enabled
- [ ] CORS: strict specific origin (`CLIENT_URL`), not wildcard in production
- [ ] Body size limits: `express.json` and `urlencoded` set to 10kb
- [ ] mongo-sanitize: strips `$` and `.` from `req.body` and `req.params` via custom middleware
- [ ] Express 5: no `req.query` assignment; `hpp` NOT installed
- [ ] XSS: `escape()` on all text inputs via express-validator
- [ ] Trip status: service-layer transitions only
- [ ] Ownership checks: trip view/update verified against passenger or driver
- [ ] Pagination clamp: limit ≤ 50, page positive integer
- [ ] Stripe: webhook signature verified, amount from server-side record
- [ ] Google Maps API key: server-side only
- [ ] Redis: no sensitive data in pub/sub messages
- [ ] Socket.io: JWT auth on connection, room access verified
- [ ] 2dsphere indexes: on Driver.location and Trip.pickup
- [ ] Race condition: atomic `findOneAndUpdate` on trip accept
- [ ] Error handler: no stack traces in production
- [ ] `.env.example` synced with all required variables
- [ ] No `console.log` with sensitive data
- [ ] Mongoose 9: all pre/post hooks use `async function()` without `next`
- [ ] Terminal trip states cannot be modified
- [ ] Rating: one per role per trip, score 1-5 enforced

---

## STEP 33 — Vite Config, TailwindCSS v4 & Global Styles

### `client/vite.config.js`

- `@vitejs/plugin-react`
- `@tailwindcss/vite` plugin
- Dev server proxy: `/api` → `http://localhost:3000`
- Port: 5173

### `client/index.html`

- Title: `RideFlow`
- Meta viewport
- Mount `#root`
- Script: `/src/main.jsx`

### `client/src/index.css`

```css
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-danger: #dc2626;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

- Dark mode: `class` strategy on `<html>`
- Base styles: body font, heading sizes, form focus rings
- Utility classes for card, btn-primary, btn-secondary, input-field

### `client/.env.example`

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Production API base URL |
| `VITE_SOCKET_URL` | Production Socket.io URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

**SECURITY (client):** Only publishable Stripe key in client env.

---

## STEP 34 — Axios Instance & API Service Layer

### `client/src/api/axios.js`

| Setting | Value |
|---------|-------|
| `baseURL` | `import.meta.env.VITE_API_URL \|\| '/api'` |
| `timeout` | 15000 |
| Request interceptor | `Authorization: Bearer ${localStorage.getItem('token')}` |
| Response interceptor | 401 → clear token, `window.location.href = '/login'` |

### API service files

| File | Functions |
|------|-----------|
| `api/authService.js` | `register(data)`, `login(data)`, `getMe()`, `updateProfile(data)`, `changePassword(data)`, `becomeDriver(vehicle)`, `deleteAccount(password)` |
| `api/tripService.js` | `requestTrip(data)`, `acceptTrip(tripId)`, `updateTripStatus(tripId, status)`, `cancelTrip(tripId, reason)`, `getActiveTrip()`, `getMyTrips(params)`, `getTrip(tripId)` |
| `api/driverService.js` | `getMyDriverProfile()`, `updateLocation(data)`, `toggleAvailability(isAvailable)` |
| `api/paymentService.js` | `createPayment(tripId)` |
| `api/ratingService.js` | `rateTrip(tripId, data)` |

Each function: try/catch, return `response.data` or throw normalized error.

**SECURITY (client):** Token from localStorage only. Never store passwords. 401 auto-logout.

---

## STEP 35 — AuthContext Provider

### `client/src/contexts/AuthContext.jsx`

**State:** `user`, `token`, `loading`

**Derived:** `isAuthenticated`, `isDriver`, `isPassenger`

**Functions:**

| Function | Behavior |
|----------|----------|
| `login(email, password)` | Call API, save token to localStorage, set user |
| `register(data)` | Call API, save token, set user |
| `logout()` | Clear token + user, disconnect socket (if connected) |
| `updateUser(data)` | PATCH profile, update state |
| `becomeDriver(vehicle)` | POST become-driver, update user role |

**On mount:** If token exists → `getMe()`. On failure → `logout()`.

Wrap app in `AuthProvider` in `main.jsx`.

**SECURITY (client):** No password in context state after submit. Loading guard prevents route flash.

---

## STEP 36 — SocketContext Provider & Custom Hooks

### `client/src/contexts/SocketContext.jsx`

- Connect when `token` exists: `io(VITE_SOCKET_URL, { auth: { token } })`
- State: `socket`, `isConnected`
- Reconnect on token change. Disconnect on logout
- Expose `joinTrip(tripId)`, `leaveTrip(tripId)` helpers

### `client/src/hooks/useLocalStorage.js`

`useLocalStorage(key, initialValue)` — sync state with localStorage.

### `client/src/hooks/useDriverLocation.js`

- Active when `isDriver && isAvailable`
- `navigator.geolocation.watchPosition` every `LOCATION_UPDATE_INTERVAL_MS` (5000)
- Emit `driver_location_update` on socket
- REST fallback: `driverService.updateLocation`
- Cleanup on unmount

### `client/src/utils/constants.js`

| Export | Content |
|--------|---------|
| `TRIP_STATUS_LABELS` | Human-readable labels per status |
| `TRIP_STATUS_COLORS` | Tailwind color classes per status |
| `DEFAULT_MAP_CENTER` | `{ lat: 37.7749, lng: -122.4194 }` for form defaults |

Wrap app in `SocketProvider` inside `AuthProvider` in `main.jsx`.

**SECURITY (client):** Socket auth token only — no passwords via socket.

---

## STEP 37 — Layouts, Navbar & Footer

### `client/src/layouts/MainLayout.jsx`

- `Navbar` + `<main><Outlet /></main>` + `Footer`
- Full-width responsive container

### `client/src/layouts/DashboardLayout.jsx`

- Sidebar (desktop, `md+`): nav links based on role
- Bottom nav (mobile): icons for Dashboard, Request Ride / Driver, Profile
- Content area with `<Outlet />`

### `client/src/components/Navbar.jsx`

- Logo "RideFlow" → `/`
- Links: Home, Dashboard (auth), Request Ride (passenger), Driver Panel (driver)
- Guest: Login, Register buttons
- Auth: user name dropdown — Dashboard, Become Driver (passenger), Logout
- `RoleBadge` component inline
- Mobile hamburger with slide-down menu

### `client/src/components/Footer.jsx`

- Copyright year, "RideFlow — Ride Sharing Demo"
- Placeholder GitHub link

Responsive: mobile-first, breakpoint `md` (768px).

---

## STEP 38 — Route Guards & App.jsx Routing

### Guard components (`client/src/components/guards/`)

| Component | Behavior |
|-----------|----------|
| `ProtectedRoute` | If `loading` → `Spinner`. If !auth → `/login` |
| `DriverRoute` | Protected + `isDriver` → else `/dashboard` |
| `PassengerRoute` | Protected + `isPassenger` → else `/dashboard` |
| `GuestOnlyRoute` | If auth → `/dashboard` |

### `client/src/App.jsx`

| Path | Component | Layout | Guard |
|------|-----------|--------|-------|
| `/` | `HomePage` | MainLayout | — |
| `/login` | `LoginPage` | MainLayout | GuestOnlyRoute |
| `/register` | `RegisterPage` | MainLayout | GuestOnlyRoute |
| `/dashboard` | `DashboardPage` | DashboardLayout | ProtectedRoute |
| `/request-ride` | `RequestRidePage` | DashboardLayout | PassengerRoute |
| `/trip/:tripId` | `TripDetailPage` | DashboardLayout | ProtectedRoute |
| `/driver` | `DriverDashboardPage` | DashboardLayout | DriverRoute |
| `/become-driver` | `BecomeDriverPage` | MainLayout | PassengerRoute |
| `/payment/:tripId` | `PaymentPage` | DashboardLayout | PassengerRoute |
| `/rate/:tripId` | `RateTripPage` | DashboardLayout | ProtectedRoute |
| `*` | `NotFoundPage` | MainLayout | — |

Setup `BrowserRouter`, `Toaster` from react-hot-toast, context providers in `main.jsx`.

---

## STEP 39 — LoginPage & RegisterPage

### `client/src/pages/LoginPage.jsx`

- Centered card layout
- Fields: `email`, `password`
- Submit → `login()` → navigate `/dashboard`
- Link to `/register`
- Display server validation errors
- Button disabled + spinner while loading
- Generic error message for failed login

### `client/src/pages/RegisterPage.jsx`

- Fields: `name`, `email`, `phone`, `password`, `confirmPassword`
- Client validation: passwords match, min 8 chars, phone format
- Submit → `register()` → navigate `/dashboard`
- Link to `/login`

**SECURITY (client):** Generic auth errors. No `dangerouslySetInnerHTML`. Clear password field on error.

---

## STEP 40 — BecomeDriverPage

### `client/src/pages/BecomeDriverPage.jsx`

- Info section: driver responsibilities, requirements
- Vehicle form: `make`, `model`, `year` (select), `color`, `plateNumber`
- Submit → `becomeDriver(vehicle)` → toast success → navigate `/driver`
- Validation messages inline per field
- Only accessible to passengers (route guard)

**SECURITY (client):** Vehicle fields trimmed before submit.

---

## STEP 41 — HomePage & DashboardPage

### `client/src/pages/HomePage.jsx`

- Hero: headline "Get a ride in minutes", subtext, CTA button
- CTA: authenticated passenger → `/request-ride`; guest → `/login`
- "How it works" — 3 steps with icons: Request → Match → Ride
- Features grid: Real-time tracking, Secure payments, Driver ratings
- Responsive grid layout

### `client/src/pages/DashboardPage.jsx`

- **Passenger view:**
  - Active trip card via `getActiveTrip()` — or `EmptyState` with "Request a Ride" CTA
  - Recent trips list via `getMyTrips({ limit: 5 })` using `TripCard` component
- **Driver view:**
  - Quick link to `/driver`
  - Active trip card
  - `AvailabilityToggle` shortcut
  - Recent trips list
- Loading skeletons while fetching

**SECURITY (client):** Role-based UI only — server enforces permissions.

---

## STEP 42 — RequestRidePage

### `client/src/pages/RequestRidePage.jsx`

- Form card with sections: Pickup, Destination
- Fields:
  - `pickupAddress` (text)
  - `pickupLat`, `pickupLng` (number, defaults from `DEFAULT_MAP_CENTER`)
  - `destinationAddress` (text)
  - `destLat`, `destLng` (number, offset ~0.01 from pickup for demo)
- Helper text: "For demo, enter coordinates manually. Production would use Google Places Autocomplete."
- Submit → `requestTrip()` → toast with estimated fare → navigate `/trip/:tripId`
- Disable submit while loading
- Client-side: all fields required, lat/lng in valid ranges

**SECURITY (client):** Coordinates validated before API call.

---

## STEP 43 — TripDetailPage (Real-Time Socket Tracking)

### `client/src/pages/TripDetailPage.jsx`

- Load trip via `getTrip(tripId)` on mount
- `joinTrip(tripId)` via SocketContext
- Socket listeners: `trip_status_change`, `driver_location_update`, `eta_update`
- Cleanup: `leaveTrip` on unmount

**UI by status:**

| Status | Display |
|--------|---------|
| `requested` | Spinner + "Searching for drivers..." |
| `accepted` | Driver name, vehicle info |
| `driver_arriving` | "Driver is on the way" + ETA badge |
| `in_progress` | "Trip in progress" |
| `completed` | "Trip completed!" + Pay Now → `/payment/:id` + Rate → `/rate/:id` |
| `cancelled` | Reason + who cancelled |

- Show: `StatusBadge`, addresses, `estimatedFare`, `surgeMultiplier` if > 1
- Cancel button (passenger, before `in_progress`) with `ConfirmModal`

**SECURITY (client):** Show 403/404 message if trip not accessible.

---

## STEP 44 — DriverDashboardPage, TripOfferCard & AvailabilityToggle

### `client/src/pages/DriverDashboardPage.jsx`

- Top bar: `AvailabilityToggle`
- Active trip section with status-specific action buttons:
  - `accepted` → "I'm on my way" (`driver_arriving`)
  - `driver_arriving` → "Start trip" (`in_progress`)
  - `in_progress` → "Complete trip" (`completed`)
- Incoming offers section: state array of offers from `trip_offer` socket
- On `offer_cancelled` → remove offer + toast
- On `trip_timeout` → remove offer + toast
- Auto-start `useDriverLocation` when available and no blocking permission

### `client/src/components/TripOfferCard.jsx`

- Props: `offer`, `onAccept`, `onDismiss`
- Display: pickup/destination addresses, `estimatedFare`, passenger name + rating
- Accept button → `acceptTrip(offer.tripId)` — disabled after click
- Countdown timer 30s (visual only)

### `client/src/components/AvailabilityToggle.jsx`

- Props: `isAvailable`, `onChange`, `disabled`
- Toggle switch: "Go Online" / "Go Offline"
- Disabled when `isOnTrip`

**SECURITY (client):** Location tracking only when driver + available. Prevent double-accept.

---

## STEP 45 — PaymentPage & PaymentForm (Stripe Elements)

### `client/src/pages/PaymentPage.jsx`

- Load trip for fare summary display
- `loadStripe(VITE_STRIPE_PUBLISHABLE_KEY)`
- On mount: `createPayment(tripId)` → `clientSecret`
- Wrap in `<Elements stripe={stripePromise} options={{ clientSecret }}>`
- Render `PaymentForm`
- Fare breakdown: base, distance km, duration min, surge line if applicable
- Loading state while fetching clientSecret

### `client/src/components/PaymentForm.jsx`

- Props: `clientSecret`, `amount`, `tripId`
- `<PaymentElement />` + "Pay ${amount}" button
- `stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.origin + '/rate/' + tripId } })`
- Error toast on failure. Success handled by return_url or on-page confirmation

**SECURITY (client):** Stripe Elements only — never raw card data. Amount from server trip.

---

## STEP 46 — RateTripPage & StarRating Component

### `client/src/pages/RateTripPage.jsx`

- Load trip. Determine rated party (if passenger → rate driver, if driver → rate passenger)
- `StarRating` input (1-5)
- Comment textarea, max 300 chars with character counter
- Submit → `rateTrip(tripId, { score, comment })` → toast → `/dashboard`
- If already rated: show read-only stars + comment, hide form

### `client/src/components/StarRating.jsx`

- Props: `value`, `onChange`, `readOnly`, `size`
- 5 clickable stars with hover preview
- Keyboard: arrow keys to change
- `aria-label` per star

**SECURITY (client):** Comment max 300 chars client-side.

---

## STEP 47 — Shared UI Components (Spinner, Badges, Modals, Cards)

### `client/src/components/`

| Component | Props & Behavior |
|-----------|------------------|
| `Spinner.jsx` | `size` (sm/md/lg). Animated SVG |
| `StatusBadge.jsx` | `status` → colored pill using TRIP_STATUS_COLORS |
| `RoleBadge.jsx` | `role` → "Passenger" or "Driver" |
| `ConfirmModal.jsx` | `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `loading` |
| `EmptyState.jsx` | `icon`, `title`, `message`, `actionLabel`, `onAction` |
| `TripCard.jsx` | `trip` → addresses, date, fare, StatusBadge, link to detail |
| `ErrorBoundary.jsx` | Class component. Catch errors, show fallback UI |

Consistent Tailwind styling across all components. Dark mode compatible.

---

## STEP 48 — UX Polish, NotFoundPage & Toast Integration

### UX patterns

- `react-hot-toast` on all API success/error (configured in `main.jsx`: position top-right, duration 4s)
- Loading skeletons on `DashboardPage` trip list (3 placeholder cards)
- Scroll to top on route change (`useEffect` on `pathname`)
- Disable all submit buttons during API calls
- Responsive review: 320px mobile → 1280px desktop

### Empty states

| Context | Message | CTA |
|---------|---------|-----|
| No active trip (passenger) | "Ready for your next ride?" | Request a Ride |
| No trip history | "No trips yet" | — |
| No offers (driver) | "Waiting for ride requests..." | — |

### `client/src/pages/NotFoundPage.jsx`

- 404 illustration or large "404"
- "Page not found" message
- Link back to Home

**SECURITY (client):** Error toasts show server `message` only — never raw error objects.

---

## STEP 49 — README & Documentation

### `README.md` (project root)

1. Title: **RideFlow — Ride Sharing Backend**
2. Description (2-3 sentences)
3. Tech stack badges
4. Features bullet list
5. Trip state machine ASCII diagram (from STEP 19)
6. Roles & Permissions table
7. Full API endpoints table (all routes from Steps 14, 18, 24, 25, 27)
8. Socket events table (from STEP 29)
9. Folder structure tree
10. Environment variables section
11. Getting Started:
    - Prerequisites: Node 20+, MongoDB Atlas, Redis Cloud, Stripe test keys, Google Maps API key, Stripe CLI
    - `cd server && npm install && npm run seed`
    - `cd client && npm install`
    - `cd server && npm run dev` + `cd client && npm run dev`
    - `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
12. Test accounts table (from seed)
13. Security section summary
14. Deployment → reference STEP 50
15. License: MIT

Sync `server/.env.example` and `client/.env.example` with all variables.

---

## STEP 50 — Code Cleanup, Pre-Deploy Review & Deployment

### Code cleanup

- Remove all `console.log` (keep `morgan` in dev, seed script logs OK)
- Remove unused imports
- Verify `.gitignore` covers `.env`, `node_modules`, `dist`
- Verify no secrets in source
- Verify `2dsphere` indexes in models
- Express 5 + Mongoose 9 compatibility final check

### Manual test checklist

- [ ] Register passenger
- [ ] Become driver (or use seed driver)
- [ ] Driver goes online
- [ ] Passenger requests trip
- [ ] Driver receives offer via socket
- [ ] Driver accepts → others get cancel
- [ ] Full status lifecycle to completed
- [ ] Payment with test card `4242 4242 4242 4242`
- [ ] Webhook marks payment succeeded
- [ ] Both parties rate
- [ ] 30s timeout cancels unaccepted trip
- [ ] Geospatial returns nearest drivers

### MongoDB Atlas

- Free tier cluster, strong DB user password
- Network: `0.0.0.0/0` or Railway IPs
- `MONGODB_URI` on Railway

### Redis Cloud

- Free database → `REDIS_URL` on Railway

### Backend — Railway

- Root: `server/`
- Env: all server variables, `JWT_SECRET` min 32 chars, `NODE_ENV=production`, `CLIENT_URL` = Netlify URL
- Start: `npm start`
- Verify `GET /api/health`

### Frontend — Netlify

- Base: `client/`
- Build: `npm run build`, publish: `dist`
- Env: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`
- SPA redirect: `/* /index.html 200`

### Stripe Webhook (production)

- Endpoint: `https://<railway-app>.up.railway.app/api/webhooks/stripe`
- Event: `payment_intent.succeeded`
- Signing secret → `STRIPE_WEBHOOK_SECRET`

### Post-deploy verification

**Functional:** register, login, driver online, trip request, socket updates, payment, ratings

**Security:** rate limiting, CORS, helmet headers, NoSQL injection blocked, role escalation blocked, socket auth required

---

*End of RideFlow build guide — 50 steps. Execute sequentially. Each step is a self-contained prompt.*
