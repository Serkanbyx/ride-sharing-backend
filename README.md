# RideFlow — Ride Sharing Backend

A real-time ride-matching system inspired by Uber/Lyft. The core of the project is the **dispatch pipeline**: when a passenger requests a trip, the backend runs a geospatial query to find the nearest available drivers, fans the offer out to the top candidates over Redis pub/sub, races them against a 30-second timeout, and awards the trip to the first driver to accept — using an atomic database operation so two drivers can never win the same ride.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-2dsphere-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-pub%2Fsub-DC382D?logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-real--time-010101?logo=socket.io&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)

## Core engineering

The parts of this project worth reading the source for:

| Capability | How it works |
|------------|--------------|
| **Geospatial matching** | MongoDB `$near` queries over a `2dsphere` index on `Driver.location`, filtered to available, off-trip drivers within a configurable radius |
| **Offer dispatch** | Trip offers published to Redis channels and bridged into Socket.io driver rooms, so dispatch survives horizontal scaling |
| **Race-safe accept** | `findOneAndUpdate` with a `driver: null` guard — the first accept wins, losers get `offer_cancelled` instead of a corrupted trip |
| **Timeout handling** | Unaccepted trips auto-cancel after 30s with `cancelledBy: 'system'` and notify the passenger over their private socket room |
| **Authoritative state machine** | Every status change flows through `tripStateService`; invalid transitions are rejected and terminal states are immutable |
| **Live trip telemetry** | Driver location, status changes, and recalculated ETAs stream to a per-trip Socket.io room joined only by verified participants |
| **Resilient fare pricing** | Google Maps Distance Matrix with Redis caching, falling back to a haversine estimate so the system keeps working without a Maps key |

## Additional features

- JWT authentication with passenger and driver roles, plus a passenger-to-driver upgrade path
- Two-way ratings after completion, with rolling averages on driver and user records
- Stripe PaymentIntents with webhook-confirmed settlement for completed trips
- Rate limiting, Helmet, CORS, NoSQL sanitization, and input validation across every route
- Responsive React frontend with role-based dashboards and live trip tracking

## Dispatch flow

```
passenger requests trip
        │
        ▼
  estimate fare  ──────►  Distance Matrix (or haversine fallback)
        │
        ▼
  $near query  ─────────►  top N available drivers within radius
        │
        ▼
  Redis publish  ───────►  socket bridge  ───────►  driver:{id} rooms
        │                                                  │
        │                                    ┌─────────────┴─────────────┐
        ▼                                    ▼                           ▼
  30s timeout                          driver accepts               others notified
        │                                    │                     (offer_cancelled)
        ▼                                    ▼
 auto-cancel (system)              atomic assign → trip room opens
```

## Trip State Machine

```
requested → accepted → driver_arriving → in_progress → completed
    ↓           ↓            ↓               ↓
cancelled   cancelled    cancelled       cancelled
```

| From | Allowed To |
|------|------------|
| `requested` | `accepted`, `cancelled` |
| `accepted` | `driver_arriving`, `cancelled` |
| `driver_arriving` | `in_progress`, `cancelled` |
| `in_progress` | `completed`, `cancelled` |
| `completed` | — (terminal) |
| `cancelled` | — (terminal) |

## Roles & Permissions

| Action | Guest | Passenger | Driver |
|--------|:-----:|:---------:|:------:|
| Register / Login | Yes | Yes | Yes |
| Request a trip | No | Yes | No |
| Become a driver | No | Yes | No |
| Toggle availability | No | No | Yes |
| Update driver location | No | No | Yes |
| Accept trip offers | No | No | Yes |
| Update trip status (driver flow) | No | No | Yes |
| Cancel trip (before `in_progress`) | No | Yes | Yes |
| View own trips | No | Yes | Yes |
| Create payment | No | Yes | No |
| Rate trip participant | No | Yes | Yes |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register passenger account |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | JWT | Get current user profile |
| PATCH | `/api/auth/profile` | JWT | Update name or phone |
| PATCH | `/api/auth/password` | JWT | Change password |
| POST | `/api/auth/become-driver` | JWT (passenger) | Upgrade to driver role |
| DELETE | `/api/auth/account` | JWT | Delete account |
| GET | `/api/drivers/me` | JWT (driver) | Get driver profile |
| PATCH | `/api/drivers/location` | JWT (driver) | Update driver coordinates |
| PATCH | `/api/drivers/availability` | JWT (driver) | Go online / offline |
| POST | `/api/trips/request` | JWT (passenger) | Request a new trip |
| GET | `/api/trips/active` | JWT | Get current active trip |
| GET | `/api/trips/my` | JWT | List trip history (paginated) |
| GET | `/api/trips/:tripId` | JWT | Get trip details |
| POST | `/api/trips/:tripId/accept` | JWT (driver) | Accept a trip offer |
| PATCH | `/api/trips/:tripId/status` | JWT | Update trip status |
| POST | `/api/trips/:tripId/cancel` | JWT | Cancel a trip |
| POST | `/api/trips/:tripId/rate` | JWT | Rate the other participant |
| POST | `/api/payments/create` | JWT (passenger) | Create Stripe PaymentIntent |
| POST | `/api/webhooks/stripe` | Stripe signature | Handle payment webhooks |

## Socket Events

### Server → Client

| Event | Payload | Trigger |
|-------|---------|---------|
| `trip_offer` | `{ tripId, pickup, destination, addresses, estimatedFare, passenger }` | Trip dispatched to driver |
| `offer_cancelled` | `{ tripId, reason }` | Another driver accepted |
| `trip_status_change` | `{ tripId, status, timestamp, eta? }` | Trip state transition |
| `driver_location_update` | `{ tripId, driverId, lng, lat, heading }` | Driver location broadcast |
| `eta_update` | `{ tripId, etaSeconds }` | ETA recalculated |
| `trip_timeout` | `{ tripId, message }` | No driver accepted in 30s |

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_trip` | `{ tripId }` | Join trip room (participant verified) |
| `leave_trip` | `{ tripId }` | Leave trip room |
| `driver_location_update` | `{ lng, lat, heading }` | Driver-only location update |

### Socket Rooms

| Room | Members | Purpose |
|------|---------|---------|
| `user:{userId}` | Authenticated user | Personal notifications |
| `trip:{tripId}` | Passenger + assigned driver | Trip updates |
| `driver:{driverId}` | Driver | Incoming ride offers |

## Folder Structure

```
RideFlow/
├── client/
│   ├── public/
│   └── src/
│       ├── api/              # Axios services
│       ├── components/       # Shared UI + route guards
│       ├── contexts/         # Auth & Socket providers
│       ├── hooks/            # Custom React hooks
│       ├── layouts/          # Main & dashboard layouts
│       ├── pages/            # Route pages
│       └── utils/            # Constants & helpers
├── server/
│   ├── config/               # DB, Redis, env
│   ├── controllers/          # Route handlers
│   ├── middleware/           # Auth, validation, rate limits
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Express routers
│   ├── scripts/              # Seed script
│   ├── services/             # Business logic
│   ├── sockets/              # Socket.io + Redis bridge
│   ├── utils/                # Shared utilities
│   └── validators/           # express-validator rules
├── README.md
└── STEPS.md                  # Full build guide (50 steps)
```

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
| `PORT` | No | HTTP port (default: `3000`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars in production) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `CLIENT_URL` | No | Frontend origin for CORS (default: `http://localhost:5173`) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `GOOGLE_MAPS_API_KEY` | No | Distance Matrix API key; falls back to haversine estimation when unset |
| `FALLBACK_AVERAGE_SPEED_KMH` | No | Average speed for fallback duration estimates (default: `30`) |
| `BASE_FARE` | No | Base fare in USD (default: `2.50`) |
| `PER_KM_RATE` | No | Rate per km (default: `1.20`) |
| `PER_MINUTE_RATE` | No | Rate per minute (default: `0.25`) |
| `SURGE_MULTIPLIER` | No | Rush hour multiplier (default: `1.5`) |
| `RUSH_HOUR_START` | No | Rush hour start hour (default: `7`) |
| `RUSH_HOUR_END` | No | Rush hour end hour (default: `9`) |
| `DRIVER_SEARCH_RADIUS_METERS` | No | Driver search radius (default: `5000`) |
| `DRIVER_OFFER_COUNT` | No | Drivers offered per trip (default: `3`) |
| `TRIP_REQUEST_TIMEOUT_MS` | No | Offer timeout in ms (default: `30000`) |
| `LOCATION_UPDATE_INTERVAL_MS` | No | Location update interval (default: `5000`) |

Copy `server/.env.example` to `server/.env` and fill in your values.

### Client (`client/.env`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VITE_API_URL` | No | API base URL (dev uses Vite proxy to `/api`) |
| `VITE_SOCKET_URL` | No | Socket.io server URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (never use secret keys) |

Copy `client/.env.example` to `client/.env` and fill in your values.

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas (or local MongoDB)
- Redis Cloud (or local Redis)
- Stripe test keys
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook forwarding)

Optional:

- Google Maps API key with Distance Matrix enabled. Without it, fares and ETAs are estimated from haversine distance and `FALLBACK_AVERAGE_SPEED_KMH`, so the full trip lifecycle still works end to end.

### Installation

```bash
# 1. Install server dependencies and seed test data
cd server
npm install
npm run seed

# 2. Install client dependencies
cd ../client
npm install
```

### Development

Run these in separate terminals:

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev

# Terminal 3 — Stripe webhooks (local)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

Copy the webhook signing secret from the Stripe CLI output into `STRIPE_WEBHOOK_SECRET` in `server/.env`.

## Test Accounts

Seed data is created by `npm run seed` (development only).

| Role | Email | Password |
|------|-------|----------|
| Passenger | `passenger@test.com` | `Password123!` |
| Driver | `driver@test.com` | `Password123!` |
| Driver | `driver2@test.com` | `Password123!` |
| Driver | `driver3@test.com` | `Password123!` |

Seed drivers are placed near San Francisco (`37.7749, -122.4194`) and start as available.

## Security

- **Authentication:** JWT with bcrypt password hashing; passwords never returned in API responses
- **Authorization:** Role-based guards (`passengerOnly`, `driverOnly`) and trip ownership checks
- **Mass assignment:** Controllers destructure only whitelisted fields; `role` is never client-settable
- **Rate limiting:** Separate limiters for global, auth, trip request, and webhook routes
- **HTTP hardening:** Helmet headers, strict CORS, 10kb body limits
- **Injection protection:** Custom mongo-sanitize middleware; express-validator `escape()` on text inputs
- **Payments:** Stripe webhook signature verification; amounts from server-side trip records
- **Sockets:** JWT required on connection; trip room joins verified against participants
- **State machine:** All trip status changes go through `tripStateService`; terminal states are immutable
- **Production:** JWT secret length enforced; no stack traces in error responses

## Deployment

See **STEP 50** in [STEPS.md](./STEPS.md) for the full pre-deploy checklist and production setup.

| Component | Platform | Notes |
|-----------|----------|-------|
| Backend | **Render** | Web Service, root: `server/`, start: `npm start` |
| Frontend | Netlify | Base: `client/`, publish: `dist` |
| Database | MongoDB Atlas | `MONGODB_URI` on Render |
| Cache | Redis Cloud | `REDIS_URL` on Render |
| Webhooks | Stripe | `https://<your-app>.onrender.com/api/webhooks/stripe` |

### Backend on Render (summary)

1. Create a **Web Service** and connect your GitHub repo.
2. Set **Root Directory** to `server`.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Add all server env vars from `server/.env.example` (Atlas, Redis Cloud, Stripe, Maps, JWT, `CLIENT_URL` = Netlify URL).
6. Optional: use the repo-root [`render.yaml`](./render.yaml) for Blueprint deploy.
7. Verify `GET https://<your-app>.onrender.com/api/health`.

**Socket.io note:** Render supports WebSockets. On the free tier, inactive services spin down and the first request may be slow; real-time features work best with a paid plan or always-on instance.

### Frontend env (production)

Point the client at your Render backend:

```env
VITE_API_URL=https://<your-app>.onrender.com/api
VITE_SOCKET_URL=https://<your-app>.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
```

## License

MIT
