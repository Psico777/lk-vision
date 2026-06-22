"""
LK VISION - Database Models & Engine
"""

from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    DateTime, Text, ForeignKey, event
)
from sqlalchemy.orm import (
    declarative_base, sessionmaker, relationship, Session
)

from app.config import settings

DATABASE_URL = settings.database_url

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite needs this
    echo=False,
)

# Enable WAL mode for concurrent reads during WebSocket broadcasts
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


# ============================================================
# MODEL: Project (a saved "Lista de Productos")
# ============================================================
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    consignee = Column(String(255), default="Sres.Cristina y Victor")
    ruc = Column(String(50), default="")
    direccion = Column(String(500), default="")
    origin = Column(String(100), default="NINGBO, CHINA")
    destination = Column(String(100), default="CALLAO, PERÚ")
    payment_term = Column(String(200), default="")
    exchange_rate = Column(Float, default=7.2)
    date_str = Column(String(20), default="")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    products = relationship(
        "Product", back_populates="project",
        cascade="all, delete-orphan", order_by="Product.sort_order"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "consignee": self.consignee,
            "ruc": self.ruc,
            "direccion": self.direccion,
            "origin": self.origin,
            "destination": self.destination,
            "payment_term": self.payment_term,
            "exchange_rate": self.exchange_rate,
            "date_str": self.date_str,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active,
            "product_count": len(self.products) if self.products else 0,
        }


# ============================================================
# MODEL: Product (a row in the "Lista de Productos")
# ============================================================
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String(36), nullable=False, unique=True, index=True)  # UUID for frontend
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sort_order = Column(Integer, default=0)

    code = Column(Integer, nullable=False)
    articulo = Column(String(255), default="")
    description = Column(Text, default="")
    photo_url = Column(String(500), nullable=True)
    crop_url = Column(String(500), nullable=True)   # Smart-cropped thumbnail

    # Quantity
    quantity_cajas = Column(Integer, nullable=True)
    quantity_und_por_caja = Column(Integer, nullable=True)
    quantity_total = Column(Integer, default=0)

    # CBM (Volume)
    cbm_unit = Column(Float, default=0.0)
    cbm_total = Column(Float, default=0.0)

    # Pricing
    precio_unitario_cny = Column(Float, default=0.0)
    precio_unitario_usd = Column(Float, default=0.0)
    total_usd = Column(Float, default=0.0)
    tasa_cambio = Column(Float, default=7.2)

    # Bounding box from Gemini (for smart crop)
    bbox_x = Column(Integer, nullable=True)
    bbox_y = Column(Integer, nullable=True)
    bbox_w = Column(Integer, nullable=True)
    bbox_h = Column(Integer, nullable=True)
    source_image = Column(String(500), nullable=True)  # Original image path

    editable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    project = relationship("Project", back_populates="products")

    def to_dict(self):
        return {
            "id": self.uid,
            "db_id": self.id,
            "code": self.code,
            "articulo": self.articulo,
            "description": self.description,
            "photo_url": self.crop_url or self.photo_url,
            "photo_url_original": self.photo_url,
            "crop_url": self.crop_url,
            "quantity_cajas": self.quantity_cajas,
            "quantity_und_por_caja": self.quantity_und_por_caja,
            "quantity_total": self.quantity_total,
            "cbm_unit": self.cbm_unit,
            "cbm_total": self.cbm_total,
            "precio_unitario_cny": self.precio_unitario_cny,
            "precio_unitario_usd": self.precio_unitario_usd,
            "total_usd": self.total_usd,
            "tasa_cambio": self.tasa_cambio,
            "editable": self.editable,
            "sort_order": self.sort_order,
            "bbox": {
                "x": self.bbox_x, "y": self.bbox_y,
                "w": self.bbox_w, "h": self.bbox_h
            } if self.bbox_x is not None else None,
        }


# ============================================================
# MODEL: CompanySettings (white-label branding — single row)
# ============================================================
class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), default="LK VISION")
    tagline = Column(String(255), default="Order Management System")
    address = Column(String(500), default="")
    phone = Column(String(100), default="")
    email = Column(String(150), default="")
    ruc = Column(String(50), default="")
    logo_url = Column(String(500), default="")
    primary_color = Column(String(20), default="#00d4ff")
    accent_color = Column(String(20), default="#7c3aed")
    default_origin = Column(String(100), default="NINGBO, CHINA")
    default_destination = Column(String(100), default="CALLAO, PERÚ")
    default_consignee = Column(String(255), default="")
    # Import calculator defaults
    freight_per_cbm = Column(Float, default=180.0)   # USD per m³
    customs_rate = Column(Float, default=0.0)         # arancel % (0 = free trade agreement)
    igv_rate = Column(Float, default=18.0)            # IGV Perú %
    insurance_rate = Column(Float, default=1.0)       # seguro % sobre FOB
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "company_name": self.company_name,
            "tagline": self.tagline,
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
            "ruc": self.ruc,
            "logo_url": self.logo_url,
            "primary_color": self.primary_color,
            "accent_color": self.accent_color,
            "default_origin": self.default_origin,
            "default_destination": self.default_destination,
            "default_consignee": self.default_consignee,
            "freight_per_cbm": self.freight_per_cbm,
            "customs_rate": self.customs_rate,
            "igv_rate": self.igv_rate,
            "insurance_rate": self.insurance_rate,
        }


def get_company_settings(db: Session) -> "CompanySettings":
    """Get the single company settings row, creating defaults if missing."""
    cs = db.query(CompanySettings).first()
    if not cs:
        cs = CompanySettings()
        db.add(cs)
        db.commit()
        db.refresh(cs)
    return cs


# ============================================================
# Create all tables
# ============================================================
def init_db():
    """Create tables if they don't exist, and run migrations."""
    Base.metadata.create_all(bind=engine)
    # Migration: add quantity_und_por_caja column if missing
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    if "products" in insp.get_table_names():
        cols = [c["name"] for c in insp.get_columns("products")]
        if "quantity_und_por_caja" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE products ADD COLUMN quantity_und_por_caja INTEGER"))


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
