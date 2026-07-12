"""
Seed script — run once after `alembic upgrade head` to populate demo data.

Usage:
    cd backend
    python seed.py

Creates demo users (one per role), 12 vehicles, 10 drivers,
mixed trips (drafts, dispatched, completed, cancelled), maintenance logs, fuel logs, expenses.
"""

import asyncio
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.driver import Driver, DriverStatus
from app.models.expense import Expense, ExpenseCategory
from app.models.fuel_log import FuelLog
from app.models.maintenance import MaintenanceLog, MaintenanceStatus
from app.models.trip import Trip, TripStatus
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleStatus

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

DEMO_PASSWORD = "Transit@123"


async def seed():
    async with AsyncSessionLocal() as db:
        # ----------------------------------------------------------------
        # Users (one per role — swap credentials for each demo role during judging)
        # ----------------------------------------------------------------
        users_data = [
            ("Fleet Manager", "fleetmanager@demo.com", UserRole.FLEET_MANAGER),
            ("Dispatcher", "dispatcher@demo.com", UserRole.DISPATCHER),
            ("Safety Officer", "safety@demo.com", UserRole.SAFETY_OFFICER),
            ("Finance Analyst", "finance@demo.com", UserRole.FINANCIAL_ANALYST),
            ("Admin", "admin@demo.com", UserRole.ADMIN),
        ]
        users: dict[str, User] = {}
        for full_name, email, role in users_data:
            u = User(email=email, password_hash=hash_password(DEMO_PASSWORD), full_name=full_name, role=role)
            db.add(u)
            users[role.value] = u

        await db.flush()

        fm = users[UserRole.FLEET_MANAGER.value]
        disp = users[UserRole.DISPATCHER.value]

        # ----------------------------------------------------------------
        # Vehicles
        # ----------------------------------------------------------------
        vehicles_data = [
            ("TN-01-AB-1234", "Tata Prima 4928.S", "Truck", 15000, 45230, 2800000, VehicleStatus.AVAILABLE, "South"),
            ("MH-12-CD-5678", "Mahindra Furio 7", "Truck", 7000, 28900, 1600000, VehicleStatus.ON_TRIP, "West"),
            ("DL-08-EF-9012", "Eicher Pro 2095", "Truck", 9000, 62100, 2100000, VehicleStatus.IN_SHOP, "North"),
            ("KA-03-GH-3456", "Bajaj RE Maxima", "Rickshaw", 500, 18700, 250000, VehicleStatus.AVAILABLE, "South"),
            ("GJ-05-IJ-7890", "Ashok Leyland Dost", "Van", 1500, 33200, 850000, VehicleStatus.AVAILABLE, "West"),
            ("RJ-14-KL-2345", "Force Traveller 3350", "Van", 1200, 41800, 720000, VehicleStatus.AVAILABLE, "North"),
            ("UP-80-MN-6789", "Tata Ace HT", "Mini-Truck", 750, 55600, 600000, VehicleStatus.AVAILABLE, "North"),
            ("MP-09-OP-1234", "Mahindra Bolero Pik-Up", "Pickup", 1000, 29800, 800000, VehicleStatus.AVAILABLE, "Central"),
            ("WB-20-QR-5678", "Tata 407", "Truck", 4000, 71200, 1200000, VehicleStatus.AVAILABLE, "East"),
            ("HR-26-ST-9012", "Isuzu D-MAX", "Pickup", 1000, 38500, 1050000, VehicleStatus.AVAILABLE, "North"),
            ("PB-10-UV-3456", "Tata Prima 3130.K", "Truck", 12000, 84300, 2500000, VehicleStatus.RETIRED, "North"),
            ("TN-09-WX-7890", "Maruti Eeco Cargo", "Van", 640, 22100, 550000, VehicleStatus.AVAILABLE, "South"),
        ]
        vehicles: list[Vehicle] = []
        for reg, model, vtype, capacity, odometer, cost, vstatus, region in vehicles_data:
            v = Vehicle(
                registration_number=reg,
                name_model=model,
                vehicle_type=vtype,
                max_load_capacity_kg=capacity,
                odometer_km=odometer,
                acquisition_cost=cost,
                status=vstatus,
                region=region,
            )
            db.add(v)
            vehicles.append(v)

        await db.flush()

        # ----------------------------------------------------------------
        # Drivers
        # ----------------------------------------------------------------
        today = date.today()
        drivers_data = [
            ("Rajesh Kumar", "DL-1234567890", "HMV", today + timedelta(days=540), "9876543210", 94.5, DriverStatus.ON_TRIP),
            ("Priya Singh", "MH-0987654321", "LMV", today + timedelta(days=120), "8765432109", 88.0, DriverStatus.AVAILABLE),
            ("Arun Sharma", "KA-1122334455", "HMV", today + timedelta(days=365), "7654321098", 97.0, DriverStatus.AVAILABLE),
            ("Meena Patel", "GJ-5544332211", "LMV", today + timedelta(days=200), "6543210987", 82.5, DriverStatus.AVAILABLE),
            ("Vikram Rao", "TN-9988776655", "HMV", today + timedelta(days=730), "9988776655", 91.0, DriverStatus.AVAILABLE),
            ("Sunita Devi", "UP-6677889900", "LMV", today - timedelta(days=10), "8877665544", 76.0, DriverStatus.SUSPENDED),
            ("Mohan Das", "RJ-1234509876", "HMV", today + timedelta(days=180), "7766554433", 85.5, DriverStatus.OFF_DUTY),
            ("Kavitha R", "WB-0011223344", "LMV", today + timedelta(days=450), "6655443322", 93.0, DriverStatus.AVAILABLE),
            ("Suresh Nair", "HR-9876501234", "HMV", today + timedelta(days=600), "9001122334", 96.5, DriverStatus.AVAILABLE),
            ("Deepa Iyer", "PB-4433221100", "LMV", today + timedelta(days=90), "8112233445", 79.0, DriverStatus.AVAILABLE),
        ]
        drivers: list[Driver] = []
        for fname, lic, cat, expiry, contact, score, dstatus in drivers_data:
            d = Driver(
                full_name=fname,
                license_number=lic,
                license_category=cat,
                license_expiry_date=expiry,
                contact_number=contact,
                safety_score=score,
                status=dstatus,
            )
            db.add(d)
            drivers.append(d)

        await db.flush()

        # ----------------------------------------------------------------
        # Trips
        # ----------------------------------------------------------------
        trips_data = [
            # (src, dst, v_idx, d_idx, cargo_kg, dist_km, status, actual_km, revenue, reason, disp_days_ago)
            ("Mumbai", "Pune", 1, 0, 5000, 148, TripStatus.DISPATCHED, None, None, None, 1),
            ("Delhi", "Jaipur", 0, 2, 8000, 282, TripStatus.DRAFT, None, None, None, 0),
            ("Bangalore", "Chennai", 3, 1, 400, 346, TripStatus.DRAFT, None, None, None, 0),  # awaiting driver
            ("Hyderabad", "Visakhapatnam", 4, 4, 1200, 625, TripStatus.COMPLETED, 628, 45000, None, -5),
            ("Kolkata", "Patna", 8, 7, 3200, 575, TripStatus.COMPLETED, 581, 38000, None, -10),
            ("Ahmedabad", "Surat", 5, 3, 900, 265, TripStatus.COMPLETED, 268, 22000, None, -3),
            ("Chennai", "Coimbatore", 11, None, 500, 497, TripStatus.DRAFT, None, None, None, 0),  # awaiting driver
            ("Lucknow", "Kanpur", 6, 9, 600, 85, TripStatus.CANCELLED, None, None, "Vehicle went to maintenance", 0),
            ("Chandigarh", "Amritsar", 9, 8, 800, 230, TripStatus.DRAFT, None, None, None, 0),
        ]

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        for src, dst, v_idx, d_idx, cargo, dist, tstatus, actual, rev, reason, disp_ago in trips_data:
            trip = Trip(
                source=src,
                destination=dst,
                vehicle_id=vehicles[v_idx].id if v_idx is not None else None,
                driver_id=drivers[d_idx].id if d_idx is not None else None,
                cargo_weight_kg=cargo,
                planned_distance_km=dist,
                status=tstatus,
                actual_distance_km=actual,
                revenue=rev,
                cancellation_reason=reason,
                created_by=disp.id,
            )
            if tstatus == TripStatus.DISPATCHED:
                trip.dispatched_at = now - timedelta(days=abs(disp_ago))
            elif tstatus == TripStatus.COMPLETED:
                trip.dispatched_at = now - timedelta(days=abs(disp_ago) + 1)
                trip.completed_at = now - timedelta(days=abs(disp_ago))
            elif tstatus == TripStatus.CANCELLED:
                trip.cancelled_at = now
            db.add(trip)

        await db.flush()

        # ----------------------------------------------------------------
        # Maintenance log for vehicle #3 (IN_SHOP)
        # ----------------------------------------------------------------
        m = MaintenanceLog(
            vehicle_id=vehicles[2].id,
            description="Engine overhaul — crankshaft replacement",
            cost=85000,
            status=MaintenanceStatus.OPEN,
            created_by=fm.id,
        )
        db.add(m)

        # Closed maintenance record for vehicle #1
        m2 = MaintenanceLog(
            vehicle_id=vehicles[0].id,
            description="Tyre replacement — all four",
            cost=32000,
            status=MaintenanceStatus.CLOSED,
            closed_at=now - timedelta(days=20),
            created_by=fm.id,
        )
        db.add(m2)

        # ----------------------------------------------------------------
        # Fuel logs
        # ----------------------------------------------------------------
        fuel_entries = [
            (vehicles[0].id, None, 120, 9600),
            (vehicles[1].id, None, 85, 6800),
            (vehicles[3].id, None, 18, 1440),
            (vehicles[4].id, None, 45, 3600),
            (vehicles[5].id, None, 38, 3040),
            (vehicles[7].id, None, 28, 2240),
            (vehicles[8].id, None, 95, 7600),
        ]
        for vid, tid, liters, cost in fuel_entries:
            db.add(FuelLog(vehicle_id=vid, trip_id=tid, liters=liters, cost=cost, created_by=fm.id))

        # ----------------------------------------------------------------
        # Expenses
        # ----------------------------------------------------------------
        expense_entries = [
            (vehicles[0].id, ExpenseCategory.TOLL, 1200, "NH-48 toll charges"),
            (vehicles[4].id, ExpenseCategory.TOLL, 850, "Mumbai-Pune expressway"),
            (vehicles[1].id, ExpenseCategory.MAINTENANCE, 5500, "Brake pad replacement"),
            (vehicles[8].id, ExpenseCategory.OTHER, 2200, "Parking charges — Kolkata port"),
        ]
        for vid, cat, amount, desc in expense_entries:
            db.add(Expense(vehicle_id=vid, category=cat, amount=amount, description=desc, created_by=fm.id))

        await db.commit()
        print("Seed complete.")
        print(f"Demo accounts (password: {DEMO_PASSWORD}):")
        for full_name, email, role in users_data:
            print(f"  {role.value}: {email}")


if __name__ == "__main__":
    asyncio.run(seed())
