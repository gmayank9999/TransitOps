<div align="center">
  
# 🚚 TransitOps
**Next-Generation Smart Fleet Operations & Logistics Platform**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
<br>
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)](#)

*A comprehensive, full-stack fleet management solution designed to modernize logistics, optimize vehicle dispatching, track driver performance, and generate real-time financial analytics.*

</div>

---

## ⚡ Why TransitOps?

Managing a logistics fleet usually involves spreadsheets, fragmented software, and manual dispatching. **TransitOps** centralizes everything into one blazing-fast, data-driven interface powered by an asynchronous Python backend and a highly reactive React frontend.

### 🌟 Core Capabilities
- **Role-Based Access Control (RBAC)**: Fine-grained permissions mapping exactly to your company hierarchy (Fleet Managers, Dispatchers, Safety Officers, Financial Analysts, Admins).
- **Intelligent Dispatch Engine**: Full lifecycle management of trips (Draft → Dispatched → Completed/Cancelled) utilizing an atomic state machine to completely eliminate vehicle double-booking.
- **Dynamic Driver Telemetry**: Monitor license validity, contact details, and actively updating driver safety scores.
- **Maintenance & Fuel Logging**: Granular tracking of repair costs and fuel consumption per vehicle for accurate operational expense reporting.
- **Financial Analytics**: Real-time KPI dashboards, monthly revenue projection charts, and per-vehicle ROI reporting.

---

## 💻 Tech Architecture

The platform uses a modern, decoupled client-server architecture:

### 🎨 Client (Frontend)
- **Framework**: React 18 powered by Vite for instant HMR
- **Language**: Strict TypeScript
- **Styling**: Tailwind CSS & Lucide Icons for a beautiful, custom design system
- **State & Data Fetching**: TanStack React Query (v5)
- **Data Visualization**: Recharts (Responsive SVG Charts)
- **Forms & Validation**: React Hook Form + Zod

### ⚙️ Server (Backend)
- **Framework**: FastAPI (High-performance async Python API)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0 (Async Engine) & Alembic (Migrations)
- **Authentication**: JWT (JSON Web Tokens) with secure password hashing algorithms (bcrypt)
- **Architecture**: Service-oriented architecture ensuring complete business logic isolation from routing layers.

---

## 🛠️ Getting Started (Local Setup)

Want to run TransitOps locally? Follow these steps.

### 1. Database Setup
Ensure you have [PostgreSQL](https://www.postgresql.org/download/) installed and running on your machine. Open your SQL shell (`psql`) or pgAdmin and create an empty database:
```sql
CREATE DATABASE transitops;
```

### 2. Backend Setup
Navigate to the `backend` directory, set up your Python environment, and install dependencies:

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Set up your environment variables. Copy the template from the root directory into the `backend` folder:
```bash
# On Windows
copy ..\.env.example .env

# On Mac/Linux
# cp ../.env.example .env
```
> **Important**: Open the new `.env` file and update `DATABASE_URL` with your actual PostgreSQL password.

Run the migrations and seed the database with realistic demo data:
```bash
alembic upgrade head
python seed.py
```

Launch the high-performance API server:
```bash
uvicorn app.main:app --reload
```
*The API is now running at `http://127.0.0.1:8000`.*

### 3. Frontend Setup
Open a **new** terminal window, navigate to the `frontend` directory, and start the development server:

```bash
cd frontend

# Install Node modules
npm install

# Start the Vite server
npm run dev
```
*The frontend application is now running at `http://localhost:5173`.*

---

## 🔐 Demo Access

If you ran the `seed.py` script successfully during setup, you can immediately log in and explore the platform using the following demo accounts. 

🔑 **Password for all accounts:** `Transit@123`

| Role | Email Address | Access Level |
|------|---------------|--------------|
| **Fleet Manager** | `fleetmanager@demo.com` | Full write access to Fleet, Drivers, Trips, and Reports. |
| **Dispatcher** | `dispatcher@demo.com` | Write access to Trips and Drivers. Read access to Fleet. |
| **Safety Officer**| `safety@demo.com` | Write access to Driver safety scores and profiles. |
| **Financial Analyst**| `finance@demo.com` | Write access to Expenses. Read access to Analytics. |

---

<div align="center">
  <p>Built for modern logistics. Licensed under the MIT License.</p>
</div>
