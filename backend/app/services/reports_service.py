"""
Reports service — fuel efficiency, operational cost, ROI, monthly revenue, top costliest vehicles.
"""

import csv
import io
from decimal import Decimal

from sqlalchemy import extract, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.models.maintenance import MaintenanceLog
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle


async def get_fuel_efficiency(db: AsyncSession) -> list[dict]:
    """
    Per vehicle: total distance driven (sum of actual_distance_km on completed trips)
    divided by total fuel consumed (sum of fuel_logs.liters).
    Guard divide-by-zero: return None when fuel = 0.
    """
    # Total completed distance per vehicle
    dist_q = (
        select(Trip.vehicle_id, func.sum(Trip.actual_distance_km).label("total_distance"))
        .where(Trip.status == TripStatus.COMPLETED, Trip.actual_distance_km.isnot(None))
        .group_by(Trip.vehicle_id)
        .subquery()
    )

    # Total fuel per vehicle
    fuel_q = (
        select(FuelLog.vehicle_id, func.sum(FuelLog.liters).label("total_liters"))
        .group_by(FuelLog.vehicle_id)
        .subquery()
    )

    q = (
        select(
            Vehicle.id,
            Vehicle.registration_number,
            Vehicle.name_model,
            Vehicle.vehicle_type,
            dist_q.c.total_distance,
            fuel_q.c.total_liters,
        )
        .outerjoin(dist_q, Vehicle.id == dist_q.c.vehicle_id)
        .outerjoin(fuel_q, Vehicle.id == fuel_q.c.vehicle_id)
        .order_by(Vehicle.id)
    )
    rows = (await db.execute(q)).all()

    result = []
    for row in rows:
        dist = float(row.total_distance or 0)
        liters = float(row.total_liters or 0)
        efficiency = round(dist / liters, 2) if liters > 0 else None
        result.append(
            {
                "vehicle_id": row.id,
                "registration_number": row.registration_number,
                "name_model": row.name_model,
                "vehicle_type": row.vehicle_type,
                "total_distance_km": dist,
                "total_fuel_liters": liters,
                "efficiency_km_per_liter": efficiency,
            }
        )
    return result


async def get_operational_cost(db: AsyncSession) -> list[dict]:
    """
    Per vehicle: total fuel cost + total maintenance cost = operational cost.
    """
    fuel_q = (
        select(FuelLog.vehicle_id, func.sum(FuelLog.cost).label("fuel_cost"))
        .group_by(FuelLog.vehicle_id)
        .subquery()
    )
    maint_q = (
        select(MaintenanceLog.vehicle_id, func.sum(MaintenanceLog.cost).label("maint_cost"))
        .group_by(MaintenanceLog.vehicle_id)
        .subquery()
    )

    q = (
        select(
            Vehicle.id,
            Vehicle.registration_number,
            Vehicle.name_model,
            Vehicle.vehicle_type,
            func.coalesce(fuel_q.c.fuel_cost, 0).label("fuel_cost"),
            func.coalesce(maint_q.c.maint_cost, 0).label("maint_cost"),
        )
        .outerjoin(fuel_q, Vehicle.id == fuel_q.c.vehicle_id)
        .outerjoin(maint_q, Vehicle.id == maint_q.c.vehicle_id)
        .order_by(Vehicle.id)
    )
    rows = (await db.execute(q)).all()

    result = []
    for row in rows:
        fuel = float(row.fuel_cost or 0)
        maint = float(row.maint_cost or 0)
        result.append(
            {
                "vehicle_id": row.id,
                "registration_number": row.registration_number,
                "name_model": row.name_model,
                "vehicle_type": row.vehicle_type,
                "fuel_cost": fuel,
                "maintenance_cost": maint,
                "total_operational_cost": round(fuel + maint, 2),
            }
        )
    return result


async def get_roi(db: AsyncSession) -> list[dict]:
    """
    ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    """
    op_costs = await get_operational_cost(db)
    op_map = {r["vehicle_id"]: r for r in op_costs}

    # Revenue per vehicle
    rev_q = (
        select(Trip.vehicle_id, func.sum(Trip.revenue).label("total_revenue"))
        .where(Trip.status == TripStatus.COMPLETED, Trip.revenue.isnot(None))
        .group_by(Trip.vehicle_id)
        .subquery()
    )

    q = select(Vehicle.id, Vehicle.registration_number, Vehicle.name_model, Vehicle.acquisition_cost, rev_q.c.total_revenue).outerjoin(
        rev_q, Vehicle.id == rev_q.c.vehicle_id
    )
    rows = (await db.execute(q)).all()

    result = []
    for row in rows:
        op = op_map.get(row.id, {})
        revenue = float(row.total_revenue or 0)
        op_cost = op.get("total_operational_cost", 0)
        acq = float(row.acquisition_cost or 1)
        roi = round((revenue - op_cost) / acq, 4) if acq > 0 else None
        result.append(
            {
                "vehicle_id": row.id,
                "registration_number": row.registration_number,
                "name_model": row.name_model,
                "acquisition_cost": acq,
                "total_revenue": revenue,
                "total_operational_cost": op_cost,
                "roi": roi,
            }
        )
    return result


async def get_monthly_revenue(db: AsyncSession) -> list[dict]:
    """
    Sum of trips.revenue grouped by year-month, for the last 12 months.
    """
    q = (
        select(
            extract("year", Trip.completed_at).label("year"),
            extract("month", Trip.completed_at).label("month"),
            func.sum(Trip.revenue).label("total_revenue"),
            func.count(Trip.id).label("trip_count"),
        )
        .where(
            Trip.status == TripStatus.COMPLETED,
            Trip.revenue.isnot(None),
            Trip.completed_at.isnot(None),
        )
        .group_by("year", "month")
        .order_by("year", "month")
    )
    rows = (await db.execute(q)).all()
    return [
        {
            "year": int(row.year),
            "month": int(row.month),
            "month_label": f"{int(row.year)}-{int(row.month):02d}",
            "total_revenue": float(row.total_revenue or 0),
            "trip_count": row.trip_count,
        }
        for row in rows
    ]


async def get_top_costliest_vehicles(db: AsyncSession, top_n: int = 10) -> list[dict]:
    """
    Vehicles ranked by (fuel_cost + maintenance_cost) descending.
    """
    op_costs = await get_operational_cost(db)
    sorted_costs = sorted(op_costs, key=lambda x: x["total_operational_cost"], reverse=True)
    return sorted_costs[:top_n]


async def export_csv(db: AsyncSession, report: str) -> str:
    """
    Generate a CSV string for the given report type.
    """
    if report == "fuel-efficiency":
        data = await get_fuel_efficiency(db)
        fields = ["vehicle_id", "registration_number", "name_model", "vehicle_type", "total_distance_km", "total_fuel_liters", "efficiency_km_per_liter"]
    elif report == "operational-cost":
        data = await get_operational_cost(db)
        fields = ["vehicle_id", "registration_number", "name_model", "vehicle_type", "fuel_cost", "maintenance_cost", "total_operational_cost"]
    elif report == "roi":
        data = await get_roi(db)
        fields = ["vehicle_id", "registration_number", "name_model", "acquisition_cost", "total_revenue", "total_operational_cost", "roi"]
    elif report == "monthly-revenue":
        data = await get_monthly_revenue(db)
        fields = ["year", "month", "month_label", "total_revenue", "trip_count"]
    else:
        data = await get_top_costliest_vehicles(db)
        fields = ["vehicle_id", "registration_number", "name_model", "vehicle_type", "fuel_cost", "maintenance_cost", "total_operational_cost"]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()
