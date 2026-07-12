"""initial schema - all tables, enums, indexes

Revision ID: 0001
Revises:
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # ENUMS
    # ------------------------------------------------------------------
    user_role = postgresql.ENUM(
        "FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "ADMIN",
        name="user_role",
    )
    vehicle_status = postgresql.ENUM(
        "AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED",
        name="vehicle_status",
    )
    driver_status = postgresql.ENUM(
        "AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED",
        name="driver_status",
    )
    trip_status = postgresql.ENUM(
        "DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED",
        name="trip_status",
    )
    maintenance_status = postgresql.ENUM(
        "OPEN", "CLOSED",
        name="maintenance_status",
    )
    expense_category = postgresql.ENUM(
        "TOLL", "MAINTENANCE", "FUEL", "OTHER",
        name="expense_category",
    )

    user_role.create(op.get_bind(), checkfirst=True)
    vehicle_status.create(op.get_bind(), checkfirst=True)
    driver_status.create(op.get_bind(), checkfirst=True)
    trip_status.create(op.get_bind(), checkfirst=True)
    maintenance_status.create(op.get_bind(), checkfirst=True)
    expense_category.create(op.get_bind(), checkfirst=True)

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("role", postgresql.ENUM("FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "ADMIN", name="user_role", create_type=False), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_users_email", "users", ["email"])

    # ------------------------------------------------------------------
    # vehicles
    # ------------------------------------------------------------------
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("registration_number", sa.String(20), unique=True, nullable=False),
        sa.Column("name_model", sa.String(100), nullable=False),
        sa.Column("vehicle_type", sa.String(50), nullable=False),
        sa.Column("max_load_capacity_kg", sa.Numeric(10, 2), nullable=False),
        sa.Column("odometer_km", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("acquisition_cost", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", postgresql.ENUM("AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED", name="vehicle_status", create_type=False), nullable=False, server_default="AVAILABLE"),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("max_load_capacity_kg > 0", name="chk_capacity_positive"),
        sa.CheckConstraint("odometer_km >= 0", name="chk_odometer_non_negative"),
        sa.CheckConstraint("acquisition_cost >= 0", name="chk_acquisition_non_negative"),
    )
    op.create_index("idx_vehicles_status", "vehicles", ["status"])
    op.create_index("idx_vehicles_reg_number", "vehicles", ["registration_number"])

    # ------------------------------------------------------------------
    # drivers
    # ------------------------------------------------------------------
    op.create_table(
        "drivers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("license_number", sa.String(50), unique=True, nullable=False),
        sa.Column("license_category", sa.String(20), nullable=False),
        sa.Column("license_expiry_date", sa.Date(), nullable=False),
        sa.Column("contact_number", sa.String(20), nullable=False),
        sa.Column("safety_score", sa.Numeric(4, 1), nullable=False, server_default="100.0"),
        sa.Column("status", postgresql.ENUM("AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED", name="driver_status", create_type=False), nullable=False, server_default="AVAILABLE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("safety_score >= 0 AND safety_score <= 100", name="chk_safety_score_range"),
    )
    op.create_index("idx_drivers_status", "drivers", ["status"])
    op.create_index("idx_drivers_license", "drivers", ["license_number"])

    # ------------------------------------------------------------------
    # trips
    # ------------------------------------------------------------------
    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(150), nullable=False),
        sa.Column("destination", sa.String(150), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("drivers.id"), nullable=True),
        sa.Column("cargo_weight_kg", sa.Numeric(10, 2), nullable=False),
        sa.Column("planned_distance_km", sa.Numeric(10, 2), nullable=False),
        sa.Column("actual_distance_km", sa.Numeric(10, 2), nullable=True),
        sa.Column("revenue", sa.Numeric(14, 2), nullable=True),
        sa.Column("status", postgresql.ENUM("DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED", name="trip_status", create_type=False), nullable=False, server_default="DRAFT"),
        sa.Column("cancellation_reason", sa.String(255), nullable=True),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("cargo_weight_kg > 0", name="chk_cargo_positive"),
        sa.CheckConstraint("planned_distance_km > 0", name="chk_planned_distance_positive"),
        sa.CheckConstraint(
            "status = 'DRAFT' OR (vehicle_id IS NOT NULL AND driver_id IS NOT NULL)",
            name="chk_dispatch_requires_assignment",
        ),
    )
    op.create_index("idx_trips_status", "trips", ["status"])
    op.create_index("idx_trips_vehicle", "trips", ["vehicle_id"])
    op.create_index("idx_trips_driver", "trips", ["driver_id"])

    # Partial unique indexes — DB-level guarantee against double-booking
    op.create_index(
        "uq_one_active_trip_per_vehicle",
        "trips",
        ["vehicle_id"],
        unique=True,
        postgresql_where=sa.text("status = 'DISPATCHED'"),
    )
    op.create_index(
        "uq_one_active_trip_per_driver",
        "trips",
        ["driver_id"],
        unique=True,
        postgresql_where=sa.text("status = 'DISPATCHED'"),
    )

    # ------------------------------------------------------------------
    # maintenance_logs
    # ------------------------------------------------------------------
    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", postgresql.ENUM("OPEN", "CLOSED", name="maintenance_status", create_type=False), nullable=False, server_default="OPEN"),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.CheckConstraint("cost >= 0", name="chk_maintenance_cost_non_negative"),
    )
    op.create_index("idx_maintenance_vehicle", "maintenance_logs", ["vehicle_id"])

    # ------------------------------------------------------------------
    # fuel_logs
    # ------------------------------------------------------------------
    op.create_table(
        "fuel_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id"), nullable=True),
        sa.Column("liters", sa.Numeric(10, 2), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("log_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("liters > 0", name="chk_fuel_liters_positive"),
        sa.CheckConstraint("cost >= 0", name="chk_fuel_cost_non_negative"),
    )
    op.create_index("idx_fuel_vehicle", "fuel_logs", ["vehicle_id"])

    # ------------------------------------------------------------------
    # expenses
    # ------------------------------------------------------------------
    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("category", postgresql.ENUM("TOLL", "MAINTENANCE", "FUEL", "OTHER", name="expense_category", create_type=False), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("expense_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("amount >= 0", name="chk_expense_amount_non_negative"),
    )
    op.create_index("idx_expense_vehicle", "expenses", ["vehicle_id"])

    # ------------------------------------------------------------------
    # audit_logs
    # ------------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("table_name", sa.String(50), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("old_data", postgresql.JSONB(), nullable=True),
        sa.Column("new_data", postgresql.JSONB(), nullable=True),
        sa.Column("performed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("performed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_audit_record", "audit_logs", ["table_name", "record_id"])
    op.create_index("idx_audit_performed_at", "audit_logs", ["performed_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("expenses")
    op.drop_table("fuel_logs")
    op.drop_table("maintenance_logs")
    op.drop_index("uq_one_active_trip_per_driver", table_name="trips")
    op.drop_index("uq_one_active_trip_per_vehicle", table_name="trips")
    op.drop_table("trips")
    op.drop_table("drivers")
    op.drop_table("vehicles")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS expense_category")
    op.execute("DROP TYPE IF EXISTS maintenance_status")
    op.execute("DROP TYPE IF EXISTS trip_status")
    op.execute("DROP TYPE IF EXISTS driver_status")
    op.execute("DROP TYPE IF EXISTS vehicle_status")
    op.execute("DROP TYPE IF EXISTS user_role")
