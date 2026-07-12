# TransitOps — Implementation Plan
### Smart Transport Operations Platform | 8-Hour Hackathon

---

## 0. TL;DR — Strategy

This problem statement is intentionally larger than 8 hours of raw dev time. Winning teams don't build everything — they build a **rock-solid core** (Auth → Vehicles → Drivers → Trips → Maintenance → Fuel/Expense → Dashboard) with **zero broken business rules**, then layer bonus features only if time allows. Judges are explicitly scoring *coding standard, modularity, security, database design* — not feature count. A demo where dispatch validation, status transitions, and RBAC work flawlessly will beat a feature-bloated app with bugs every time.

**Core decisions locked in upfront (don't relitigate mid-hackathon):**
- **Stack:** FastAPI (Python) + PostgreSQL (local, native install — **no Docker**, see Sec 1 note) + SQLAlchemy + Alembic | React (Vite + TypeScript) + Tailwind + shadcn/ui + Recharts
- **Auth:** JWT (access + refresh) with RBAC middleware, bcrypt password hashing
- **No 3rd-party APIs** beyond what's unavoidable (no maps SDK, no SMS/email service — mock these locally)
- **No LLM/AI features** — problem statement doesn't call for it, guidelines say "trendy tech only if it adds real value." Adding an AI chatbot here is a distraction, not a differentiator.
- **Local-first:** Postgres running locally (native install, not containerized), app must work with zero internet after `npm install`/`pip install` are done.
- **Git:** trunk-based with short-lived feature branches, every member commits directly (not one person pushing everyone's code)

> **Revision note:** this plan was updated after reviewing the official Excalidraw mockups (login, dashboard, fleet registry, drivers, trip dispatcher, maintenance, fuel & expenses, analytics, settings). Section 18 at the end summarizes every change the mockups triggered — read that section alongside the rest since a few details below (role names, trip schema, feature list) were revised in place.

> **Team note:** three people (Mayank, Kanishk, Anurag), one laptop actually running the build (via an AI coding agent), with a hackathon requirement that all three push code at least every hour. Section 19 covers the exact logistics for this — module ownership, an hour-by-hour push schedule, how code physically gets from one laptop to the other two, and human-sounding commit message guidance. Read it before you start.

> **No emojis, anywhere.** Not in code, not in comments, not in commit messages, not in UI text or icons (use `lucide-react` icon components instead of unicode emoji for things like the Activity Timeline feed). This applies to every section below, including places that might otherwise show a stray emoji for visual flavor.

### 0.1 Review of External Feedback — What Changed and Why

You got a review back on the first version of this plan (very much on-point, 9.8/10 from them). Here's what's adopted as-is, what's modified, and what's pushed back on, with reasoning:

| Feedback item | Verdict | Reasoning |
|---|---|---|
| Remove AI entirely, rename any smart logic "Rule-Based Smart Dispatch Engine" | **Adopted** | Already had zero AI in this plan; added the Smart Dispatch Engine as a cheap, deterministic bonus feature (Sec 9, Nice to Have) — genuinely good judge-facing framing and costs almost nothing since it's just a scored `ORDER BY` query over already-available data |
| DB triggers for cascading status updates (`AFTER INSERT Trip → update Vehicle/Driver`) | **Rejected, with reasoning** | Putting the same business rule in two places (a DB trigger *and* the service layer) is a maintainability trap, not a strength — if they ever disagree, debugging which one "wins" wastes hackathon time you don't have. Keep all status transitions in the service layer inside a single DB transaction (already the plan, Sec 4/5). Triggers are a legitimate pattern in a real production system with multiple writers, but this app has exactly one writer (your API), so they add risk without adding a real guarantee. |
| Audit log table | **Adopted** | Cheap, high signal for "attention to detail." Added to schema (Sec 3.2) and moved from a Section 12 stretch item into the mandatory-adjacent "Should Build" tier (Sec 9) |
| Deeper folder structure (`repositories/`, `validators/` layers) | **Modified** | Full repository-pattern abstraction on top of SQLAlchemy is extra indirection you don't need for ~8 tables in 8 hours — it mainly pays off when you swap ORMs/databases, which won't happen here. Kept `services/` doing both query logic and business rules (already close to a repository pattern in practice), noted the fuller structure as an optional stretch layer in Sec 14 for if you finish early |
| Concrete design tokens (colors, radius, spacing) | **Adopted** | Added Sec 7.4 with real values pulled from the mockup's actual dark theme + amber accent, not generic placeholders |
| Reorder priority so Dashboard comes earlier (motivation via visible data) | **Adopted** | Rebuilt the timeline (Sec 11) around this — Dashboard gets a working shell as soon as Vehicle+Driver data exists, well before Trips are done |
| Split into 5 separate markdown files | **Rejected, with reasoning** | You're handing this whole document to one AI agent as its single source of truth — splitting it means the agent (or you) has to keep multiple files in sync, which is exactly the kind of overhead a single well-sectioned document avoids. Staying as one file, just heavily sectioned (18 sections and counting) |
| Activity Timeline feature | **Adopted, de-emoji'd** | Genuinely cheap and high-impact — added to "Should Build" (Sec 9). The feedback's example used emoji icons for each entry; per your instruction, those are replaced with plain text labels / `lucide-react` icons, not unicode emoji |
| Must / Should / Nice-to-Have framing | **Adopted** | Section 9 restructured around exactly this framing, replacing the old flat Mandatory/Bonus split |

---

## 1. Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Backend | **FastAPI** | Async, auto-generated OpenAPI docs (huge for judge demo + teammate API contracts), Pydantic validation built-in, you already know it well from prior projects |
| ORM | **SQLAlchemy 2.0 (async)** + **Alembic** | Proper migrations = judges notice this vs. "we just ran db.create_all()" |
| DB | **PostgreSQL 16 (native local install)** | Explicitly required. Use `ENUM` types, `CHECK` constraints, and FK constraints to enforce business rules **at the DB layer**, not just app layer. **No Docker** — install Postgres directly (Windows installer or Postgres.app-equivalent), create a `transitops` DB, and point `.env`'s `DATABASE_URL` at `localhost:5432`. Docker Compose was considered purely for judge convenience but is skipped here since it adds risk without being a requirement. |
| Auth | **JWT (python-jose) + passlib[bcrypt]** | Stateless, standard, no external identity provider needed (local-first requirement) |
| Frontend | **React 18 + Vite + TypeScript** | Fast dev loop, type safety catches bugs before demo |
| Styling | **Tailwind CSS + shadcn/ui** | Consistent design tokens out of the box = "consistent color scheme" requirement satisfied almost for free |
| Charts | **Recharts** | Lightweight, good enough for KPI dashboard + fuel efficiency/ROI charts |
| State/data fetching | **TanStack Query (React Query)** | Real-time-ish polling, cache invalidation on mutations (dispatch → auto-refresh dashboard) |
| Forms/validation | **React Hook Form + Zod** | Shared validation *shape* mirrored on backend Pydantic schemas — reduces "we validated on frontend but backend accepts garbage" bugs |
| Real-time updates | **Polling (10–15s) via React Query**, OR **WebSocket** if time permits (Section 12) | Satisfies "avoid static JSON / dynamic data" without needing infra like Kafka |

**Why not Next.js / Node backend?** FastAPI's automatic OpenAPI/Swagger docs are a big judge-facing win (you get free API documentation deliverable), and Python + Pydantic gives you validation for free that mirrors your DB constraints — this directly serves the "robust validation" and "database design" evaluation criteria.

---

## 2. High-Level Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐        ┌─────────────────┐
│   React (Vite) SPA      │  HTTPS  │   FastAPI (Uvicorn)       │  SQL   │   PostgreSQL     │
│  - Auth pages           │◄──────► │  - /auth  /vehicles       │◄─────► │  (local, Docker) │
│  - Role-based routing   │  JSON   │  - /drivers /trips        │        │  (native local   │
│  - Dashboard + Charts   │  + JWT  │  - /maintenance /fuel     │        │   install)       │
│  - CRUD forms           │         │  - /expenses /reports     │        │  Users, Vehicles,│
│  React Query cache      │         │  Business Rule Engine     │        │  Drivers, Trips, │
└─────────────────────────┘         │  (service layer, NOT      │        │  Maintenance,    │
                                     │   in route handlers)      │        │  FuelLogs,       │
                                     └──────────────────────────┘        │  Expenses, Roles │
                                                                          └─────────────────┘
```

**Key architectural principle:** Business rules (e.g. "cargo weight ≤ capacity", "no dispatch if In Shop") live in a **service layer** (`services/trip_service.py`), never directly in route handlers and never only in the frontend. Route handlers stay thin (parse request → call service → return response). This is what "modularity" and "coding standard" scoring is looking for.

---

## 3. Database Design

### 3.1 ERD (entities & relationships)

```
User ──< Role (many-to-many via user_roles, OR simple enum role on User — see note)
Vehicle ──< Trip (1 vehicle : many trips, but only 1 ACTIVE trip at a time)
Driver  ──< Trip
Vehicle ──< MaintenanceLog
Vehicle ──< FuelLog
Vehicle ──< Expense
Trip ──< FuelLog (fuel consumed can be tied to a trip, optional)
```

> **Note on roles (updated per mockups):** The official Excalidraw uses **"Dispatcher"**, not "Driver", as the system-user role name — and this is the correct call, because it disambiguates two different things that the original PDF conflated: the **`users.role`** (a system account: Fleet Manager / Dispatcher / Safety Officer / Financial Analyst) vs. the **`drivers` table** (physical people like Alex, John, Priya who actually drive vehicles and never log into the app). Use a single `role` enum column on `User` (`FLEET_MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST`, plus a hidden `ADMIN` for seeding/dev only, not shown anywhere in the RBAC UI) rather than a full many-to-many RBAC table. A join table is "more correct" but burns time you don't have; a `CHECK`-constrained enum is defensible and judges will accept it if you can explain the tradeoff. If you finish early, upgrade to `roles` + `permissions` tables (Section 12).

### 3.2 Table Definitions

```sql
-- ENUMS (Postgres native enums enforce valid values at the DB layer)
CREATE TYPE user_role       AS ENUM ('FLEET_MANAGER','DISPATCHER','SAFETY_OFFICER','FINANCIAL_ANALYST','ADMIN');
CREATE TYPE vehicle_status  AS ENUM ('AVAILABLE','ON_TRIP','IN_SHOP','RETIRED');
CREATE TYPE driver_status   AS ENUM ('AVAILABLE','ON_TRIP','OFF_DUTY','SUSPENDED');
CREATE TYPE trip_status     AS ENUM ('DRAFT','DISPATCHED','COMPLETED','CANCELLED');
CREATE TYPE maintenance_status AS ENUM ('OPEN','CLOSED');
CREATE TYPE expense_category AS ENUM ('TOLL','MAINTENANCE','FUEL','OTHER');

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            user_role NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
    id                  SERIAL PRIMARY KEY,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    name_model          VARCHAR(100) NOT NULL,
    vehicle_type        VARCHAR(50) NOT NULL,           -- Truck, Van, Bike, etc.
    max_load_capacity_kg NUMERIC(10,2) NOT NULL CHECK (max_load_capacity_kg > 0),
    odometer_km         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
    acquisition_cost    NUMERIC(14,2) NOT NULL CHECK (acquisition_cost >= 0),
    status              vehicle_status NOT NULL DEFAULT 'AVAILABLE',
    region              VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
    id                  SERIAL PRIMARY KEY,
    full_name           VARCHAR(150) NOT NULL,
    license_number       VARCHAR(50) UNIQUE NOT NULL,
    license_category     VARCHAR(20) NOT NULL,          -- LMV, HMV, etc.
    license_expiry_date  DATE NOT NULL,
    contact_number       VARCHAR(20) NOT NULL,
    safety_score         NUMERIC(4,1) NOT NULL DEFAULT 100.0 CHECK (safety_score BETWEEN 0 AND 100),
    status               driver_status NOT NULL DEFAULT 'AVAILABLE',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trips (
    id                  SERIAL PRIMARY KEY,
    source               VARCHAR(150) NOT NULL,
    destination          VARCHAR(150) NOT NULL,
    vehicle_id           INTEGER REFERENCES vehicles(id),   -- nullable: mockup shows Draft trips created before a vehicle/driver is picked ("Awaiting driver")
    driver_id            INTEGER REFERENCES drivers(id),    -- nullable, same reason
    cargo_weight_kg      NUMERIC(10,2) NOT NULL CHECK (cargo_weight_kg > 0),
    planned_distance_km  NUMERIC(10,2) NOT NULL CHECK (planned_distance_km > 0),
    actual_distance_km   NUMERIC(10,2),
    revenue              NUMERIC(14,2),                     -- captured on completion, feeds ROI report
    status               trip_status NOT NULL DEFAULT 'DRAFT',
    cancellation_reason  VARCHAR(255),                       -- mockup shows e.g. "Vehicle went to shop" on cancelled trips
    dispatched_at        TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ,
    created_by           INTEGER NOT NULL REFERENCES users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dispatch_requires_assignment
      CHECK (status = 'DRAFT' OR (vehicle_id IS NOT NULL AND driver_id IS NOT NULL))
);

CREATE TABLE maintenance_logs (
    id              SERIAL PRIMARY KEY,
    vehicle_id       INTEGER NOT NULL REFERENCES vehicles(id),
    description      VARCHAR(255) NOT NULL,           -- e.g. "Oil Change"
    cost             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    status           maintenance_status NOT NULL DEFAULT 'OPEN',
    opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMPTZ,
    created_by       INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE fuel_logs (
    id            SERIAL PRIMARY KEY,
    vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id),
    trip_id        INTEGER REFERENCES trips(id),        -- nullable: fuel not always tied to a trip
    liters         NUMERIC(10,2) NOT NULL CHECK (liters > 0),
    cost           NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
    log_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by     INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE expenses (
    id            SERIAL PRIMARY KEY,
    vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id),
    category       expense_category NOT NULL,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    description    VARCHAR(255),
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by      INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE audit_logs (
    id            SERIAL PRIMARY KEY,
    table_name     VARCHAR(50) NOT NULL,
    record_id      INTEGER NOT NULL,
    action         VARCHAR(20) NOT NULL,        -- CREATE, UPDATE, STATUS_CHANGE, DELETE
    old_data       JSONB,
    new_data       JSONB,
    performed_by   INTEGER REFERENCES users(id),
    performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes that matter for a dashboard-heavy app
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_drivers_status  ON drivers(status);
CREATE INDEX idx_trips_status    ON trips(status);
CREATE INDEX idx_trips_vehicle   ON trips(vehicle_id);
CREATE INDEX idx_trips_driver    ON trips(driver_id);
CREATE INDEX idx_fuel_vehicle    ON fuel_logs(vehicle_id);
CREATE INDEX idx_expense_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_audit_record    ON audit_logs(table_name, record_id);

-- Partial unique index: only ONE active (DISPATCHED) trip per vehicle/driver at a time
CREATE UNIQUE INDEX uq_one_active_trip_per_vehicle
  ON trips(vehicle_id) WHERE status = 'DISPATCHED';
CREATE UNIQUE INDEX uq_one_active_trip_per_driver
  ON trips(driver_id) WHERE status = 'DISPATCHED';
```

**Why the partial unique indexes matter:** this is a DB-level guarantee (not just app-level `if` checks) that a vehicle/driver can never end up double-booked even under race conditions (two dispatchers clicking "Dispatch" at the same time). Mentioning this in your judge walkthrough is a strong "attention to detail" signal.

**Audit log, written from the service layer (not a DB trigger):** every mutating service function (`dispatch_trip`, `close_maintenance`, `retire_vehicle`, etc.) writes one `audit_logs` row in the same transaction as the actual change, capturing `old_data`/`new_data` as JSON. This gives you the "who changed what, when" story the review suggested, without duplicating business logic into database triggers (see Sec 0.1 for why triggers were rejected here).

**Revenue field for ROI — confirmed by mockup:** the Analytics screen shows the exact same formula `ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost`, which validates the earlier assumption. The nullable `revenue` column on `trips` (added above) captures this per completed trip; sum by vehicle for the ROI report. Still worth stating explicitly in your README that revenue is trip-logged, since it's not in the PDF's entity list.

---

## 4. Business Rules → State Machines

### 4.1 Vehicle status transitions

```
AVAILABLE ──(dispatch trip)──► ON_TRIP ──(complete/cancel trip)──► AVAILABLE
AVAILABLE ──(open maintenance)──► IN_SHOP ──(close maintenance)──► AVAILABLE
IN_SHOP / ON_TRIP ──(retire)──► RETIRED (terminal, cannot transition out except manual admin override)
```
**Illegal transitions to explicitly reject (test these):**
- Dispatch a trip on a `RETIRED` or `IN_SHOP` vehicle → 409 Conflict
- Open maintenance on a vehicle that's `ON_TRIP` → 409 Conflict ("vehicle currently on trip")
- Retire a vehicle that has an active `DISPATCHED` trip → 409 Conflict

### 4.2 Driver status transitions
```
AVAILABLE ──(dispatch)──► ON_TRIP ──(complete/cancel)──► AVAILABLE
AVAILABLE ──(mark off duty)──► OFF_DUTY ──► AVAILABLE
ANY ──(suspend, e.g. license expired)──► SUSPENDED
```
**Illegal:** dispatch a `SUSPENDED` or `OFF_DUTY` driver; dispatch a driver whose `license_expiry_date < today`.

### 4.3 Trip lifecycle
```
DRAFT ──(dispatch)──► DISPATCHED ──(complete)──► COMPLETED
DRAFT ──(cancel)──► CANCELLED
DISPATCHED ──(cancel)──► CANCELLED   (restores vehicle+driver to AVAILABLE)
```
**Illegal:** dispatch a trip already `DISPATCHED`/`COMPLETED`/`CANCELLED` (idempotency check); complete a trip still in `DRAFT`; dispatch a `DRAFT` trip missing a `vehicle_id` or `driver_id`.

**Per mockup — Draft trips can be partially filled:** the Live Board shows a Draft trip labelled "Awaiting driver" (vehicle assigned, driver not yet) and a Cancelled trip labelled "Unassigned — Vehicle went to shop" (assignment removed after the vehicle's status changed). So: (a) `vehicle_id`/`driver_id` are nullable and can be filled in incrementally while still `DRAFT`; (b) the UI derives a friendly label — "Awaiting vehicle" / "Awaiting driver" / "Awaiting both" — from whichever FK is null, no extra DB column needed; (c) `cancellation_reason` (added to schema, Sec 3.2) captures why a trip was cancelled, e.g. auto-fill "Vehicle sent to maintenance" if a cancellation is triggered by the assigned vehicle's status changing out from under it.

### 4.4 Maintenance lifecycle
```
OPEN (vehicle → IN_SHOP) ──(close)──► CLOSED (vehicle → AVAILABLE, unless vehicle is RETIRED)
```

### 4.5 Master validation checklist (enforce server-side, mirror on client for UX)

| # | Rule | Where enforced |
|---|---|---|
| 1 | Registration number unique | DB `UNIQUE` + Pydantic validator + friendly 409 message |
| 2 | Retired/In Shop vehicles excluded from dispatch dropdown | API filters `GET /vehicles?status=AVAILABLE` for the trip-creation form; **also re-validated server-side on submit** (never trust the dropdown was fresh) |
| 3 | Expired-license / Suspended drivers blocked from trips | Service-layer check comparing `license_expiry_date` to `date.today()` at dispatch time, not just at driver-list-fetch time |
| 4 | No double-booking vehicle/driver | Partial unique index (3.2) + service-layer pre-check for a clean error message before hitting the DB constraint |
| 5 | Cargo weight ≤ max load capacity | Pydantic validator cross-referencing vehicle record fetched in the service layer |
| 6 | Dispatch → vehicle & driver → ON_TRIP | Single DB transaction (all-or-nothing) |
| 7 | Complete → both → AVAILABLE | Same transaction pattern |
| 8 | Cancel dispatched trip → restores both to AVAILABLE | Same |
| 9 | Open maintenance → vehicle → IN_SHOP | Transaction; reject if vehicle `ON_TRIP` |
| 10 | Close maintenance → vehicle → AVAILABLE unless RETIRED | Conditional restore |

---

## 5. Backend API Design

Base URL: `/api/v1`. All endpoints (except `/auth/login`, `/auth/register`) require `Authorization: Bearer <JWT>`. Role checks via a `require_role([...])` FastAPI dependency.

### 5.1 Auth
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Admin only (or open in demo mode) | validates email format, password strength, unique email |
| POST | `/auth/login` | Public | returns `access_token`, `refresh_token`, `role` |
| POST | `/auth/refresh` | Public (valid refresh token) | rotate access token |
| GET | `/auth/me` | Authenticated | returns current user profile + role |

### 5.2 Vehicles
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/vehicles?status=&type=&region=&page=&limit=` | All | filters + pagination |
| POST | `/vehicles` | Fleet Manager, Admin | validates uniqueness of reg number |
| GET | `/vehicles/{id}` | All | 404 if not found |
| PUT | `/vehicles/{id}` | Fleet Manager, Admin | cannot change status directly here (status is derived from trip/maintenance actions) except explicit `/retire` |
| POST | `/vehicles/{id}/retire` | Fleet Manager, Admin | 409 if active trip exists |
| DELETE | `/vehicles/{id}` | Admin | soft-delete only if never used in a trip; otherwise reject |

### 5.3 Drivers
| Method | Path | Roles |
|---|---|---|
| GET | `/drivers?status=&license_category=` | All |
| POST | `/drivers` | Safety Officer, Fleet Manager, Admin |
| GET | `/drivers/{id}` | All |
| PUT | `/drivers/{id}` | Safety Officer, Fleet Manager, Admin |
| POST | `/drivers/{id}/suspend` | Safety Officer, Admin |
| POST | `/drivers/{id}/reinstate` | Safety Officer, Admin |
| POST | `/drivers/{id}/status` | Safety Officer, Fleet Manager, Admin | manual toggle **between `AVAILABLE` and `OFF_DUTY` only** (mockup shows quick status-toggle buttons on the Drivers page) — reject any attempt to manually set `ON_TRIP` (system-managed via dispatch) or `SUSPENDED` (use the dedicated suspend endpoint, which has its own audit trail) |

**Trip Completion % (mockup column, not in original PDF):** the Drivers table shows a "Trip Compl." percentage per driver. This is a **computed field, not a stored column** — return it from `GET /drivers` via a query like `COUNT(status='COMPLETED') / COUNT(status IN ('COMPLETED','CANCELLED')) * 100` per driver (decide whether Draft-only trips count; recommend excluding them since they were never actually attempted).

### 5.4 Trips
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/trips?status=&vehicle_id=&driver_id=` | All | response includes a derived `assignment_label` ("Awaiting driver"/"Awaiting vehicle"/null) for Draft trips, computed in the service layer, not stored |
| POST | `/trips` | Dispatcher, Fleet Manager, Admin | creates in `DRAFT`; vehicle/driver optional at this stage; runs full validation (rule #5) once both are present |
| PUT | `/trips/{id}` | Dispatcher, Fleet Manager, Admin | assign/change vehicle or driver on a still-`DRAFT` trip |
| POST | `/trips/{id}/dispatch` | Dispatcher, Fleet Manager, Admin | requires vehicle_id + driver_id both set; runs rules #2,3,4,6 atomically |
| POST | `/trips/{id}/complete` | Dispatcher, Fleet Manager, Admin | body: `actual_distance_km`, `final_odometer`, optional `fuel_consumed_liters`, `revenue` — see completion flow note below |
| POST | `/trips/{id}/cancel` | Dispatcher, Fleet Manager, Admin | allowed from DRAFT or DISPATCHED only; accepts optional `reason` string stored in `cancellation_reason` |

**Guided completion flow (per mockup — "On Complete: odometer → fuel log → expenses → Vehicle & Driver Available"):** don't build `/trips/{id}/complete` as a single flat form. Model it as a short frontend wizard/modal: Step 1 capture final odometer + actual distance, Step 2 optional fuel log entry, Step 3 optional expense entries (tolls etc.), Step 4 confirm → single backend call (or a small sequence of calls in one transaction) that finalizes the trip and flips vehicle/driver back to `AVAILABLE`. Keeps the mental model matching what's on screen and avoids a giant intimidating form.

### 5.5 Maintenance
| Method | Path | Roles |
|---|---|---|
| GET | `/maintenance?vehicle_id=&status=` | Fleet Manager, Financial Analyst, Admin |
| POST | `/maintenance` | Fleet Manager, Admin |
| POST | `/maintenance/{id}/close` | Fleet Manager, Admin |

### 5.6 Fuel & Expenses
| Method | Path | Roles |
|---|---|---|
| GET/POST | `/fuel-logs` | Fleet Manager, Financial Analyst, Admin |
| GET/POST | `/expenses` | Fleet Manager, Financial Analyst, Admin |

### 5.7 Dashboard & Reports
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/dashboard/kpis?region=&type=` | All | Active/Available/InShop vehicle counts, Active/Pending trips, Drivers On Duty, Fleet Utilization % |
| GET | `/reports/fuel-efficiency` | Fleet Manager, Financial Analyst, Admin | distance/fuel per vehicle |
| GET | `/reports/operational-cost` | Financial Analyst, Admin | fuel+maintenance per vehicle |
| GET | `/reports/roi` | Financial Analyst, Admin | `(revenue - (maintenance+fuel)) / acquisition_cost` |
| GET | `/reports/monthly-revenue` | Financial Analyst, Admin | sum of `trips.revenue` grouped by month — shown as a bar chart per mockup |
| GET | `/reports/top-costliest-vehicles` | Financial Analyst, Admin | vehicles ranked by (fuel + maintenance) descending, per mockup's "Top Costliest Vehicles" panel |
| GET | `/reports/export.csv?report=` | Financial Analyst, Admin | streamed CSV |

**Standard error contract (consistent across all endpoints):**
```json
{ "detail": "human readable message", "error_code": "VEHICLE_IN_SHOP", "field": "vehicle_id" }
```
Use proper HTTP status codes: `400` validation, `401` unauthenticated, `403` wrong role, `404` not found, `409` business-rule conflict, `422` schema validation (FastAPI default).

---

## 6. Authentication & RBAC Design

1. **Password storage:** bcrypt via `passlib`, never plaintext, never reversible encryption.
2. **JWT payload:** `{ sub: user_id, role: "FLEET_MANAGER", exp }`. Keep it minimal — don't stuff PII in the token.
3. **Access token:** short-lived (15–30 min). **Refresh token:** longer-lived (7 days), stored httpOnly cookie if time allows, else in memory (not localStorage, to reduce XSS exposure — mention this tradeoff to judges even if you take the shortcut).
4. **RBAC dependency:**
```python
def require_role(*allowed_roles: UserRole):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(403, detail="Insufficient permissions")
        return current_user
    return dependency

@router.post("/vehicles", dependencies=[Depends(require_role(UserRole.FLEET_MANAGER, UserRole.ADMIN))])
def create_vehicle(...): ...
```
5. **Frontend route guarding:** a `<ProtectedRoute allowedRoles={[...]}>` wrapper + hide/disable nav items and buttons the user's role can't use (defense in depth — but the *real* gate is always the backend check above).
6. **Important — role is NOT client-selectable.** The login mockup shows a "Role (RBAC)" dropdown on the sign-in form itself. Don't build it that way for real: a user picking their own role at login is a privilege-escalation bug waiting to happen. The role must come from the authenticated user's DB record (`users.role`), full stop. The dropdown in the wireframe most likely exists so whoever ran the demo could switch roles quickly while testing — replicate that *only* by seeding a handful of demo accounts (one per role, e.g. `fleetmanager@demo.com` / `dispatcher@demo.com` / etc., same password) so you can quickly log in as each role for the judges, not by letting the login form itself set the role.
7. **Login screen hardening (per mockup):**
   - **Account lockout:** lock a user out after 5 consecutive failed attempts (mockup shows this exact copy: "Account locked after 5 failed attempts"). Track a `failed_login_attempts` counter + `locked_until` timestamp on `users`; reset the counter on successful login.
   - **"Remember me":** when checked, issue a longer-lived refresh token (e.g. 30 days vs. the default 7); when unchecked, keep the default session length.
   - **"Forgot password":** a full email-based reset flow is overkill for 8 hours with no SMTP — stub the UI (link goes to a simple "reset request submitted" confirmation) and be upfront with judges that it's a stub, rather than skipping the button entirely and leaving a dead link.
8. **Rate limiting login attempts** (bonus, Section 12) to blunt brute force — complements the account-lockout mechanism above (lockout stops one account being brute-forced; rate limiting stops one IP hammering many accounts).

---

## 7. Frontend Structure

### 7.1 Pages / Routes
```
/login
/dashboard                      (KPIs, filters, charts)
/vehicles                       (list, filter, search, sort)
/vehicles/:id                   (detail, edit, retire, history)
/drivers                        (list, filter)
/drivers/:id                    (detail, edit, suspend/reinstate)
/trips                          (list, filter by status)
/trips/new                      (create — Dispatcher/Fleet Manager)
/trips/:id                      (detail, dispatch/complete/cancel actions)
/maintenance                    (list, create, close)
/fuel-expenses                  (fuel logs + expense entries, tabs)
/reports                        (charts + CSV export)
/settings                       (general config + RBAC matrix — see Sec 18.7)
/unauthorized                   (403 fallback page)
```

> Sidebar labels per mockup: **Fleet** (not "Vehicles"), **Analytics** (not "Reports") — cosmetic, but match them exactly since consistent naming across nav/page-title/API-docs is itself a small "attention to detail" signal.

### 7.2 Navigation & UX
- Persistent left sidebar with role-aware nav items (Fleet Manager sees Fleet/Maintenance; Financial Analyst sees Fuel & Expenses/Analytics prominently; Dispatcher sees Trips front and center).
- Topbar: current user, role badge, logout.
- Consistent spacing scale (Tailwind `space-y-4`/`gap-4` conventions throughout — pick once, don't mix `space-y-2` and `space-y-6` randomly across pages).
- Empty states, loading skeletons, and error states for **every** list/detail view — judges notice apps that only demo the happy path.
- Toast notifications for every mutation (success/error), not silent failures.

### 7.3 Component Modularity
```
src/
  components/
    ui/            (shadcn primitives: button, input, select, dialog, table, badge)
    layout/        (Sidebar, Topbar, ProtectedRoute)
    vehicles/      (VehicleTable, VehicleForm, VehicleStatusBadge)
    drivers/       (DriverTable, DriverForm, LicenseExpiryBadge)
    trips/         (TripTable, TripForm, TripTimeline)
    dashboard/     (KpiCard, FleetUtilizationChart, FilterBar)
  pages/
  hooks/           (useVehicles, useDrivers, useTrips — wrap React Query)
  api/             (axios instance + typed api client per resource)
  schemas/         (zod schemas — mirror backend Pydantic shapes)
  types/           (shared TS types generated/hand-mirrored from backend)
  context/         (AuthContext)
```

### 7.4 Design Tokens

Lock these in once, use them everywhere — this is what "consistent color scheme and layout" actually means in practice, not just "use Tailwind."

```
Colors
  background        #111111   (page background, matches mockup's dark theme)
  surface / card     #1C1C1C
  border             #2A2A2A
  primary / accent   #C98A1D   (amber — buttons, active nav item, focus rings)
  text primary       #F2F2F2
  text muted         #9A9A9A
  success            #22C55E   (Available, Completed)
  info               #3B82F6   (On Trip, Dispatched)
  warning            #F59E0B   (In Shop, Suspended)
  danger             #EF4444   (Retired, Cancelled, validation errors)

Radius
  small    8px   (inputs, badges)
  default  12px  (cards, buttons)
  large    16px  (modals)

Spacing scale (Tailwind steps)
  4, 8, 12, 16, 24, 32   (i.e. Tailwind's 1/2/3/4/6/8) — pick from this scale only, don't introduce arbitrary values like `p-[13px]`

Typography
  Headings: Inter or system-ui, semi-bold
  Body: same family, regular, 14-16px base
  Monospace (reg. numbers, license numbers, IDs): a mono font for scannability
```

Store these as CSS variables (`:root { --color-primary: #C98A1D; ... }`) or a Tailwind theme extension so status badge colors (Sec 3, 4) map 1:1 to these tokens instead of being picked ad hoc per component.

---

## 8. Validation Strategy (robust input validation, per guidelines)

**Two layers, always:**
1. **Frontend (Zod + React Hook Form):** instant feedback, e.g. email regex, required fields, numeric ranges, cargo weight vs. selected vehicle capacity (client can pre-check using already-fetched vehicle data for good UX).
2. **Backend (Pydantic v2 validators):** the *authoritative* layer — never trust client validation alone.

Example Pydantic validation (illustrative, not exhaustive):
```python
class TripCreate(BaseModel):
    source: str = Field(min_length=1, max_length=150)
    destination: str = Field(min_length=1, max_length=150)
    vehicle_id: int
    driver_id: int
    cargo_weight_kg: float = Field(gt=0)
    planned_distance_km: float = Field(gt=0)

    @field_validator("destination")
    def not_same_as_source(cls, v, info):
        if v.strip().lower() == info.data.get("source", "").strip().lower():
            raise ValueError("Source and destination cannot be identical")
        return v
```
Cross-entity checks (cargo vs. capacity, vehicle/driver availability) happen in the **service layer** after fetching the referenced rows — Pydantic alone can't see other tables.

**Specific validations to implement (this is what "robust input validation" scoring is checking for):**
- Email: proper regex/`EmailStr` (Pydantic) → clear message "Enter a valid email address"
- Password: min length 8, at least one number (state the policy in the UI, don't just reject silently)
- Phone numbers: digit-only + length check
- Dates: license expiry can't be in the past on creation (warn, don't necessarily block — a real fleet may onboard an already-expired license record for historical data, but flag it)
- Numeric fields: reject negative capacity/cost/odometer at both layers (DB `CHECK` is your safety net)
- Duplicate registration number / license number: catch DB `IntegrityError` and translate to a friendly 409, don't leak raw Postgres error text to the frontend

---

## 9. Complete Feature List (Must / Should / Nice-to-Have)

### 9.1 Must Build (the demo does not work without these)
1. Local Postgres install + Alembic migrations (no Docker — see Sec 1)
2. User model + JWT auth (login, with account lockout after 5 failed attempts) + RBAC middleware
3. Vehicle CRUD + uniqueness + status enum
4. Driver CRUD + license/status fields + manual Available/Off-Duty toggle + computed Trip Completion %
5. Trip creation with full validation chain (supports partial Draft — vehicle/driver assignable later)
6. Dispatch / Complete / Cancel trip actions with atomic status transitions + guided completion flow
7. Maintenance create/close with vehicle status side-effects
8. Fuel log + Expense entry (basic CRUD)
9. Operational cost auto-computation (fuel + maintenance per vehicle)
10. Dashboard KPIs (Active/Available/In-Shop vehicles, Active/Pending trips, Drivers on duty, Fleet Utilization %)
11. Dashboard filters (vehicle type, status, region)
12. Reports: Fuel Efficiency, Fleet Utilization, Operational Cost, ROI, Monthly Revenue chart, Top Costliest Vehicles
13. Responsive layout (mobile-usable at minimum for dashboard + lists)
14. Global error handling + loading/empty states
15. Seed script with realistic demo data (10–15 vehicles, 10 drivers, mixed trip states, at least one Draft trip missing a driver, one cancelled trip with a reason) — **critical for a good live demo**

### 9.2 Should Build (do these once 9.1 is fully working, before touching 9.3)
1. CSV export
2. Settings page — General config (depot name, currency, distance unit) as a simple form; static/read-only RBAC matrix display (see Sec 18.7 for why this stays read-only)
3. Audit log (Sec 3.2) — write one row per mutating service call
4. Activity Timeline — a simple reverse-chronological feed on the dashboard reading straight from `audit_logs` ("Trip TR005 dispatched", "Fuel log added for VAN-05", "Driver Alex suspended"). Plain text + a small `lucide-react` icon per action type, no emoji. Very little backend work since it's really just `SELECT * FROM audit_logs ORDER BY performed_at DESC LIMIT 20` plus a friendly-message formatter.
5. Search, sorting across all tables (backend query params + frontend column-header sort)
6. Rule-Based Smart Dispatch Engine — given a trip's cargo weight and route, suggest the best available vehicle+driver combo using a deterministic scored query: filter to `AVAILABLE` vehicles with sufficient capacity and `AVAILABLE`/license-valid drivers, then rank by (lowest excess capacity, highest driver safety score, lowest vehicle operational cost so far). Show the top pick with its reason ("closest capacity match, highest safety score") as a suggestion the dispatcher can accept or override — never auto-assigns without confirmation. This directly satisfies the guideline to use "trendy tech only if it adds real value" by explicitly being *not* an LLM: fully deterministic and explainable in one sentence to a judge.

### 9.3 Nice to Have (only if 9.1 and 9.2 are both demo-ready with time to spare)
1. PDF export (reuse CSV report data → `reportlab` or `weasyprint`)
2. Email reminders for expiring licenses (mock via console log / local file if no SMTP — "local solution, no cloud dependency" satisfies guideline)
3. Vehicle document management (upload insurance/RC docs — store as local file path, not S3, to respect "no cloud" guideline)
4. Dark mode (Tailwind `dark:` classes + a toggle)
5. WebSocket-based live dashboard updates instead of polling
6. Dynamic, DB-driven RBAC permission matrix with a working "Save changes" (Sec 18.7 / Sec 12)

---

## 10. Security Checklist

- [ ] Passwords hashed with bcrypt, never logged
- [ ] JWT secret loaded from `.env`, never hardcoded/committed
- [ ] `.env` in `.gitignore` from commit #1
- [ ] SQL injection: impossible by construction since SQLAlchemy ORM/parameterized queries only — no raw string-formatted SQL
- [ ] CORS configured explicitly (`allow_origins=["http://localhost:5173"]`), not `*` in anything resembling production
- [ ] Role checks on **every** mutating endpoint, not just UI-hidden buttons
- [ ] Rate limiting on `/auth/login` (bonus, e.g. `slowapi`) to blunt credential stuffing
- [ ] Input length limits on all string fields (prevents oversized payload abuse)
- [ ] Generic error messages to client (no stack traces, no raw DB errors) — full details only in server logs
- [ ] Dependency versions pinned (`requirements.txt` / `package-lock.json` committed)

---

## 11. 8-Hour Timeline (module order, reordered for early motivation)

Reordered from the original draft so a working Dashboard appears mid-way through, not at hour 5.5 — seeing real numbers on screen early keeps the team's morale and pace up, and gives you something to show if a judge does an early walkthrough.

```
Auth + DB  →  Vehicle  →  Driver  →  Dashboard (basic shell)  →  Trip  →  Maintenance  →  Fuel/Expense  →  Reports (full analytics)  →  Polish  →  Should/Nice-to-Have
```

| Time | What gets built | Notes |
|---|---|---|
| 0:00–0:30 | Repo + local Postgres created, FastAPI + Alembic + React/Vite/Tailwind/shadcn scaffolds, `.gitignore` committed first | All three people clone the repo and confirm it runs before anything else — this is also your first round of pushes, see Sec 19 |
| 0:30–1:30 | DB models + migrations (all tables incl. `audit_logs`), seed script skeleton, Auth endpoints + JWT + RBAC dependency, login page wired end-to-end | Auth has to exist before anything else is usable, so it stays first despite the reorder |
| 1:30–2:30 | Vehicle CRUD (backend + list/detail/form UI) | |
| 2:30–3:30 | Driver CRUD (backend + list/detail/form UI, incl. Trip Completion % placeholder returning 0 until trips exist) | |
| 3:30–4:15 | Dashboard shell: KPI cards + filters wired to real `/dashboard/kpis`, even if some counts are still zero | Deliberately placed here per the reordered priority — the app now visibly "does something" with real data, which is worth the small resequencing cost |
| 4:15–5:30 | Trip endpoints (create/dispatch/complete/cancel, full business-rule service layer) + Trip Dispatcher UI | Highest-risk module — the one to start earliest relative to its complexity and test edge cases continuously, not just at the end |
| 5:30–6:15 | Maintenance + Fuel + Expense endpoints and UI, operational cost aggregation | |
| 6:15–7:00 | Reports/Analytics fully wired (efficiency, utilization, cost, ROI, monthly revenue, top costliest), CSV export, Settings general-config form + static RBAC display | |
| 7:00–7:30 | Bug-fix pass against Sec 15's edge cases; responsive pass; seed final realistic demo data | |
| 7:30–8:00 | **Demo dry run** end-to-end as Fleet Manager → Dispatcher → Financial Analyst; write README with setup + assumptions; if time remains, pick up Section 9.2 items in order | |

**Non-negotiable cut line:** if you're behind schedule by hour 6, drop straight to Nice-to-Have (Sec 9.3) — do not touch anything in Section 9.2 until every item in 9.1 is 100% working and demoable.

---

## 12. If You Finish Early (stretch upgrades, in priority order)

1. Upgrade RBAC from single-enum to a proper `role_permissions` table + dynamic checks — this is also what would make the Settings page's permission matrix (Sec 18.7) genuinely editable instead of a static display
2. WebSocket live updates on dashboard (`fastapi` supports this natively) instead of polling
3. Rate limiting via `slowapi`
4. Alembic-based rollback demo (show you understand migrations aren't just forward-only)
5. Automated tests: at minimum, pytest coverage of the trip dispatch/complete/cancel service functions (the highest-value business logic) — even 8–10 tests here is a strong signal vs. zero tests

---

## 13. Git Workflow (guideline: "one member managing repo is not enough")

- `main` branch protected; no direct pushes.
- Each member works on `feature/<module>` branches (e.g. `feature/trip-endpoints`, `feature/dashboard-ui`) — module ownership assignments are in Section 19.
- Small, frequent commits with meaningful, human-written messages — no emojis, no robotic templated phrasing (see Sec 19.4 for exact guidance and examples).
- PRs (even informal, self-merged in a hackathon) so there's a visible multi-author commit history — judges do check this, and with three real git identities on the commit log it holds up to scrutiny.
- `.gitignore` from the first commit: `.env`, `node_modules/`, `__pycache__/`, `*.pyc`, `venv/`, `dist/`.
- Commit the seed script and a `README.md` with exact local Postgres setup + `alembic upgrade head` + seed commands — a judge should be able to clone and run in under 5 minutes without installing anything beyond Postgres, Python, and Node.
- **Your setup is one laptop actually running the build, three people needing to push.** Section 19 is the detailed playbook for that exact situation — read it now, not mid-hackathon.

---

## 14. Folder Structure

```
transitops/
├── README.md
├── .env.example              (DATABASE_URL, JWT_SECRET — for local Postgres connection)
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/            (config.py, security.py, deps.py)
│   │   ├── models/          (SQLAlchemy models, one file per entity)
│   │   ├── schemas/         (Pydantic request/response schemas)
│   │   ├── services/        (business logic: trip_service.py, vehicle_service.py, ...)
│   │   ├── routers/         (thin route handlers per resource)
│   │   └── db/              (session.py, base.py)
│   ├── alembic/
│   ├── tests/
│   ├── seed.py
│   └── requirements.txt
└── frontend/
    ├── src/ (as per Section 7.3)
    ├── package.json
    └── vite.config.ts
```

> **Optional stretch structure (only if you finish 9.1 and 9.2 early):** split `app/api/v1/` into one router file per resource (`auth.py`, `vehicle.py`, `driver.py`, `trip.py`, `maintenance.py`, `fuel.py`, `expense.py`, `analytics.py`, `settings.py`) and add a thin `repositories/` layer between `services/` and `models/` for pure data-access functions, plus a `validators/` module for cross-field checks shared across schemas. This is genuine Clean Architecture and looks great in a repo walkthrough, but it's extra indirection over ~8 tables that doesn't pay for itself inside 8 hours — treat it as a Section 9.3-tier polish item, not something to build from scratch. The flatter `models/schemas/services/routers` split already in Section 14 is the one to build first.

---

## 15. Edge Cases Checklist (walk through each before demo)

**Vehicles**
- Duplicate registration number on create → 409 with clear message
- Negative/zero capacity, cost, odometer → rejected
- Retiring a vehicle currently `ON_TRIP` → blocked
- Filtering dashboard by a region with zero vehicles → empty state, not a crash

**Drivers**
- License expiring *today* — is it still valid? (Pick a rule: expire at end of day, document your choice)
- Suspending a driver mid-trip → should this be allowed? (Recommendation: allow suspension record but don't auto-cancel their active trip; block *future* dispatches only — flag this as a documented assumption)
- Duplicate license number → 409

**Trips**
- Cargo weight exactly equal to max capacity → allowed (`≤`, not `<`)
- Cargo weight exceeds by 0.01 kg → rejected; error message should state the exact overage (e.g. "Capacity exceeded by 200 kg — dispatch blocked", matching the mockup's exact phrasing style — compute and show the delta, don't just say "too heavy")
- Dispatching the same trip twice (double-click) → idempotent 409, not two side-effects
- Attempting to dispatch a Draft trip still missing a vehicle or driver → 400 with a clear "assign both before dispatching" message
- Completing a trip with `actual_distance_km` = 0 → reject or flag (decide and document)
- Cancelling an already-`COMPLETED` trip → 409
- A vehicle assigned to a Draft trip gets sent to maintenance before the trip is dispatched → auto-cancel the trip with `cancellation_reason` = "Vehicle sent to maintenance" (mirrors the mockup's "Unassigned — Vehicle went to shop" example), or at minimum surface a warning; document whichever you pick

**Maintenance**
- Opening a second maintenance record while one is already `OPEN` on the same vehicle → block or allow-and-merge? (Recommendation: block, "vehicle already has an open maintenance record")
- Closing maintenance on an already-`CLOSED` record → 409

**Fuel/Expense**
- Fuel log with liters = 0 → reject
- Fuel efficiency calc when total fuel = 0 → guard divide-by-zero, show "N/A" not a crash

**Auth/RBAC**
- Expired JWT mid-session → graceful redirect to login, not a silent blank page
- Role-mismatched direct API call (e.g. Dispatcher hitting `POST /vehicles` via curl) → 403, verified even though UI hides the button
- 5th consecutive failed login → account locks; a *correct* 6th attempt should still be rejected while locked, with a clear "try again later" message (not a generic invalid-credentials message, which would be confusing once the password is actually right)

**General**
- Every list endpoint paginated — never return unbounded result sets
- Every numeric input tested with negative, zero, decimal, and absurdly large values
- Concurrent dispatch attempts on same vehicle from two browser tabs → DB partial unique index is the real guard, service-layer check is the UX nicety

---

## 16. Evaluation Criteria → Where You Score Points

| Criterion | Where this plan addresses it |
|---|---|
| Coding standard | Service-layer separation, typed schemas, consistent error contract |
| Logic | State machines (Sec 4) + master validation table |
| Modularity | Folder structure (Sec 14), thin routers/fat services |
| Performance | Indexes (Sec 3.2), pagination, partial unique indexes instead of app-level locking |
| Frontend design | Tailwind + shadcn consistent tokens, empty/loading/error states |
| Scalability | Async FastAPI, connection pooling, indexed queries, stateless JWT (horizontally scalable) |
| Usability | Role-aware nav, toasts, filters, responsive layout |
| Security | Section 10 checklist |
| Debugging skills | Documented edge-case decisions (Sec 15) — narrate these in your judge Q&A |
| Database design | Section 3 — enums, constraints, partial unique indexes, migrations |
| Approach to problem | This document — scoped mandatory-first, explicit cut lines |
| Attention to detail | Sec 15 edge cases + explicitly documented assumptions (revenue field, license-expiry-at-midnight rule, etc.) |

---

## 17. Assumptions to State Explicitly in Your Demo/README

1. `revenue` is logged per completed trip (not in original entity list) — needed for ROI formula, and confirmed by the Analytics mockup's formula.
2. RBAC implemented as a single `role` enum on `User` rather than full many-to-many, for time efficiency (documented upgrade path in Sec 12).
3. License expiry treated as invalid starting the day *of* expiry (i.e. `expiry_date < today` blocks dispatch, `expiry_date == today` still allowed) — adjust if your team decides otherwise, just be consistent and able to explain it.
4. Suspending a driver does not auto-cancel their currently active trip; it only blocks future dispatches.
5. Real-time = polling every 10–15s via React Query, not a full WebSocket/event-streaming pipeline (documented as a stretch goal, Sec 12).
6. The system-user role is named **Dispatcher**, matching the official mockup, rather than "Driver" as worded in the PDF's "Target Users" section — the PDF's "Driver" target user and the app's `drivers` table (the physical people driving vehicles) are two different things.
7. Login's "Role (RBAC)" dropdown is **not** wired as a client-selectable field in the real build — role always comes from the authenticated account. Multiple demo accounts (one per role) are seeded instead, so the dropdown-like experience during your live demo is "log out, log in as the next role," not "pick a role from a menu."
8. The Settings page's RBAC permission matrix is **display-only** unless Section 12's stretch item is reached — actual enforcement stays in code-level `require_role()` checks, not a DB-driven permission table (see Sec 18.7 for the reasoning).

---

## 18. Mockup-Driven Refinements (delta from the original PDF-only plan)

Everything below was triggered by reviewing the 9 Excalidraw screenshots (login, dashboard, fleet registry, drivers, trip dispatcher, maintenance, fuel & expenses, analytics, settings). All of these are already folded into the relevant sections above — this is a summary so you can see at a glance what changed and why, and quickly explain the deltas to your teammates.

**18.1 Role renamed: Driver → Dispatcher.** The mockup's login/RBAC screens use "Dispatcher" for the system-user role that creates and dispatches trips. This is genuinely clearer than the PDF's "Driver," since it avoids confusion with the `drivers` table (physical people, e.g. Alex/John/Priya, who never log in). Applied throughout Sections 3, 5, 6, 7, 11.

**18.2 Trips can start partially unassigned.** The Live Board shows a Draft trip "Awaiting driver" and a Cancelled trip "Unassigned — Vehicle went to shop." So `vehicle_id`/`driver_id` on `trips` are nullable, filled in incrementally, and only required at the moment of dispatch. Added a `cancellation_reason` column and a DB `CHECK` constraint enforcing assignment-before-dispatch. Applied in Sections 3.2, 4.3, 5.4, 15.

**18.3 Guided trip completion flow.** The mockup explicitly sequences completion as "odometer → fuel log → expenses → Vehicle & Driver Available." Build this as a short wizard/modal on the frontend rather than one flat form. Applied in Section 5.4.

**18.4 Driver list gets a computed "Trip Completion %" column** (not in the PDF's entity list) and **manual Available ⇄ Off-Duty toggle buttons.** Both are derived/action additions, no schema changes beyond what's already there. Applied in Section 5.3.

**18.5 Exact validation-error phrasing matters.** The capacity-exceeded error in the mockup states the overage explicitly ("exceeded by 200 kg"), not just "too heavy." Small thing, but it's a concrete, demoable "attention to detail" moment — compute and surface the delta in every over-limit validation message where it's easy to (capacity, maybe budget-type checks if you add any).

**18.6 Analytics needs two more charts:** Monthly Revenue (bar chart, by month) and Top Costliest Vehicles (ranked bar, by fuel+maintenance total) — both confirmed by the mockup and now in the mandatory list (Sec 9.1) and API design (Sec 5.7).

**18.7 Settings page is a bigger ask than it looks — scope it carefully.** The mockup shows an *editable-looking* RBAC permission matrix (checkmarks per role × module) plus general config (depot name, currency, distance unit). Two different things, two different priorities:
   - **General config form** — trivial, just a settings row in the DB and a form. Keep this mandatory (Sec 9.1).
   - **RBAC matrix** — if this were truly *data-driven* (permissions stored in a table, checked dynamically at runtime instead of hardcoded `require_role()` calls), it's a legitimately bigger feature: a `role_permissions` table, a service layer that checks it instead of static decorators, and a working "Save changes" button. That's real scope for an 8-hour hackathon. **Recommendation:** build the Settings page UI to visually match the mockup (a static table of role × module checkmarks, reflecting whatever your hardcoded `require_role()` rules actually are), but don't wire "Save changes" to actually alter enforcement unless you hit Section 12's stretch goals. Say this explicitly to judges if asked — "the matrix reflects our real RBAC rules; making it live-editable is on our stretch list" is a much better answer than a save button that silently does nothing.

**18.8 Login screen needs account lockout, "remember me," and a stubbed "forgot password."** All three are explicitly drawn in the mockup with specific copy ("Account locked after 5 failed attempts"). Applied in Section 6.

**18.9 Docker dropped from the whole plan** (this was your direct question, not mockup-driven, but folded in throughout): native local Postgres install instead, everywhere Docker was previously mentioned.

---

## 19. Team Workflow — 3 People, 1 Laptop Running the Build, Hourly Pushes Required

Your actual situation: Mayank, Kanishk, and Anurag are the team; the AI agent (Antigravity) does its heavy lifting on Mayank's laptop; the hackathon expects all three of you to be pushing code roughly every hour, not just one person managing the repo. Here's the concrete playbook.

### 19.1 The real fix: don't just relay files, split real ownership

The tempting-but-weak approach is "Mayank's agent writes everything, then hands files to Kanishk and Anurag to just commit." Don't do that as your primary plan — a judge (or a git log skim) can tell the difference between someone who typed 200 lines and someone who pasted 200 lines and added a comma. Instead:

- **Mayank + the agent own the entire backend** (all modules — one shared Postgres instance and one FastAPI app is far simpler than three people running three databases) **plus the Dashboard, Reports/Analytics, and Settings frontend pages**, plus integration and the README.
- **Kanishk owns the Vehicle Registry (Fleet) and Driver Management frontend pages**, built on his own laptop, in his own local clone.
- **Anurag owns the Trip Dispatcher, Maintenance, and Fuel & Expenses frontend pages**, same setup.

This means Kanishk and Anurag are genuinely writing their own React components against the design tokens (Sec 7.4) and the API contract Mayank's backend exposes — real work, real commits, and it directly satisfies the guideline "understand AI/code snippets thoroughly before using them" since they're not blindly relaying anything for their own modules.

### 19.2 How Kanishk and Anurag reach Mayank's backend

All three laptops on the same Wi-Fi/hotspot at the venue:
1. Mayank runs the backend bound to `0.0.0.0:8000` (not just `localhost`), so it's reachable from other devices on the same network — find his LAN IP with `ipconfig` (Windows) and share it once at the start.
2. Kanishk and Anurag each set `VITE_API_BASE_URL=http://<mayank-lan-ip>:8000/api/v1` in their own `.env.local`.
3. Mayank's FastAPI CORS config allows each teammate's dev server origin explicitly (e.g. `http://<kanishk-lan-ip>:5173`, `http://<anurag-lan-ip>:5173`) — not a wildcard, even for a hackathon.
4. **Fallback if venue Wi-Fi/networking is flaky** (worth planning for, given past local-network issues): Kanishk and Anurag build against a small local fixture file (`mockData.ts`) matching Mayank's published API shapes (share these early — either the FastAPI auto-generated `/docs` Swagger page or a short `ENDPOINTS.md` with example JSON) for the first few hours, and do a short "swap mock for real API" pass together once networking is confirmed or at the next in-person sync point.

### 19.3 Git identity setup (do this before the first commit, on every laptop)

On Kanishk's laptop:
```
git config --global user.name "Kanishk Gupta"
git config --global user.email "kanishk's actual github email"
```
On Anurag's laptop, same with his own name/email. On Mayank's laptop, double-check `git config --global user.name`/`user.email` are set to *his* identity too, not left on some default — an AI agent committing on his behalf should still commit under his configured git identity, since that's what actually gets attributed in the log.

**Branching:** `main` protected. Branches: `feature/auth-dashboard-reports` (Mayank), `feature/fleet-drivers` (Kanishk), `feature/trip-maintenance-fuel` (Anurag). Merge into `main` at the sync points in the schedule below, not just once at the end — frequent small merges are easier to reason about and look far better in the commit graph than one giant merge at hour 7:45.

### 19.4 Commit messages — making them read as human-written

**Rules:**
- No emojis, ever — not in the message, not in the body.
- No repeating the exact same template every time (a dead giveaway of copy-paste or AI generation is 20 commits all shaped like `feat: implement X functionality for Y module`).
- Lowercase is fine, imperfect phrasing is fine, occasional shorthand is fine — that's what a tired student's commit at hour 5 actually looks like.
- Say what changed and, often, what's still missing — real WIP commits do this naturally.
- Keep each one to a single line unless there's a genuinely important detail for the body.

**Example commits by person (style reference, not a script to copy verbatim):**

*Mayank:*
- `auth and jwt working end to end`
- `added rbac dependency, testing role checks now`
- `fixed division by zero in fuel efficiency calc`
- `wired dashboard kpi cards to backend`
- `audit log writes added to trip service`
- `csv export working for operational cost report`
- `readme + seed script done, ready for demo`

*Kanishk:*
- `vehicle table renders now, status badges still plain text`
- `add vehicle modal working, capacity validation pending`
- `fixed reg number uniqueness error message`
- `driver list page hooked to real api`
- `wired the available/off duty toggle buttons`
- `license expiry date was showing wrong format, fixed`
- `responsive fixes for fleet table on small screens`

*Anurag:*
- `trip form only shows available vehicles and drivers now`
- `dispatch button disabled when capacity exceeded, added the error message`
- `added awaiting driver label for draft trips`
- `maintenance page hooked to real api`
- `fuel log form, blocks zero liters now`
- `fixed cancel not restoring vehicle status`
- `completion flow step 2 (fuel log) done`

### 19.5 Hour-by-hour push schedule (minimum one push per person per block)

| Time block | Mayank pushes | Kanishk pushes | Anurag pushes |
|---|---|---|---|
| 0:00–0:30 | repo scaffold, `.gitignore`, initial commit | clones repo, confirms it runs, pushes a small setup-verification commit | same |
| 0:30–1:30 | DB models/migrations, auth + JWT + RBAC | starts Vehicle page UI shell against mock/fixture data | starts Trip Dispatcher UI shell against mock/fixture data |
| 1:30–2:30 | Vehicle backend endpoints, publishes contract | wires Vehicle UI to the real API | continues Trip UI, starts Maintenance UI shell |
| 2:30–3:30 | Driver backend endpoints | starts Driver UI shell | starts Fuel & Expense UI shell |
| 3:30–4:15 | Dashboard backend + frontend shell | finishes Driver UI, wires to real API | continues Trip validations UI |
| 4:15–5:30 | Trip backend endpoints (full business-rule layer) | polish pass: search/sort/responsive on Fleet + Drivers | wires Trip Dispatcher UI to real API, works through edge cases (Sec 15) |
| 5:30–6:15 | Maintenance + Fuel/Expense backend endpoints | assists with cross-role testing, polish | wires Maintenance + Fuel/Expense UI to real API |
| 6:15–7:00 | Reports/Analytics + Settings, backend and frontend | final polish on Fleet/Drivers pages, helps with seed data | final polish on Trip/Maintenance/Fuel pages |
| 7:00–7:30 | bug-fix pass, finalize seed data | bug-fix own pages against Sec 15 edge cases | bug-fix own pages against Sec 15 edge cases |
| 7:30–8:00 | demo dry run, finish README | demo dry run, verify own modules live | demo dry run, verify own modules live |

Every block above has a concrete, real deliverable per person — nobody is pushing an empty or cosmetic commit just to hit the hourly requirement.

### 19.6 One more thing worth saying out loud to judges

If asked how the team split work: "Backend and core integration were centralized since it's one shared database; Fleet/Driver management and Trip/Maintenance/Fuel were owned end-to-end by Kanishk and Anurag respectively, building against a shared API contract." That's a true, defensible answer — much stronger than pretending three people wrote every line of a codebase built mostly on one machine.
