"""
LK VISION - PDF Export (local, reportlab — sin APIs externas)
Genera un PDF profesional de la lista de productos con imagenes embebidas.
"""

import io
import os
from datetime import date
from pathlib import Path
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from PIL import Image as PILImage

from app.config import settings


def _hex(c: str, fallback: str = "#1a2236") -> colors.Color:
    try:
        return colors.HexColor(c if c and c.startswith("#") else fallback)
    except Exception:
        return colors.HexColor(fallback)


def _resolve_image_path(photo_url: Optional[str]) -> Optional[str]:
    if not photo_url:
        return None
    rel = photo_url.lstrip("/")
    p = Path(rel)
    if p.exists():
        return str(p)
    p = Path(settings.upload_dir).parent / rel
    if p.exists():
        return str(p)
    return None


def _make_thumb(image_path: str, max_px: int = 70) -> Optional[RLImage]:
    try:
        img = PILImage.open(image_path).convert("RGB")
        img.thumbnail((max_px, max_px), PILImage.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        buf.seek(0)
        w, h = img.size
        ratio = h / w if w else 1
        disp_w = 16 * mm
        return RLImage(buf, width=disp_w, height=disp_w * ratio)
    except Exception:
        return None


def generate_pdf(data, company: Optional[dict] = None) -> bytes:
    """Genera un PDF de la lista de productos. `company` = branding white-label."""
    company = company or {}
    name = company.get("company_name", "LK VISION")
    tagline = company.get("tagline", "Order Management System")
    primary = _hex(company.get("primary_color", "#00d4ff"), "#00d4ff")
    dark = colors.HexColor("#0a0f1e")
    header_bg = colors.HexColor("#1a2236")
    light_row = colors.HexColor("#eef6f9")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=8 * mm, rightMargin=8 * mm,
        topMargin=8 * mm, bottomMargin=8 * mm,
        title=f"{name} - Lista de Productos",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=20,
                                 textColor=dark, alignment=TA_LEFT, spaceAfter=2)
    tagline_style = ParagraphStyle("tag", parent=styles["Normal"], fontSize=8,
                                   textColor=colors.HexColor("#64748b"), alignment=TA_LEFT)
    info_style = ParagraphStyle("info", parent=styles["Normal"], fontSize=8,
                                textColor=colors.black, leading=11)
    cell_style = ParagraphStyle("cell", parent=styles["Normal"], fontSize=7, leading=8,
                                alignment=TA_CENTER)
    cell_left = ParagraphStyle("cellL", parent=styles["Normal"], fontSize=7, leading=8,
                               alignment=TA_LEFT)

    elements = []

    # ── Header band ──
    header_tbl = Table(
        [[Paragraph(name, title_style), Paragraph(
            f"<b>FECHA:</b> {data.date or date.today().strftime('%d/%m/%Y')}",
            ParagraphStyle("d", parent=info_style, alignment=TA_RIGHT, fontSize=10))]],
        colWidths=[180 * mm, 90 * mm],
    )
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_tbl)
    elements.append(Paragraph(tagline, tagline_style))
    elements.append(Spacer(1, 4 * mm))

    # ── Consignee / route info ──
    info_left = (f"<b>CONSIGNEE:</b> {data.consignee or '-'}<br/>"
                 f"<b>RUC:</b> {data.ruc or '-'} &nbsp;&nbsp; "
                 f"<b>DIRECCIÓN:</b> {data.direccion or '-'}")
    info_right = (f"<b>ORIGEN:</b> {data.origin or '-'} &nbsp;→&nbsp; "
                  f"<b>DESTINO:</b> {data.destination or '-'}<br/>"
                  f"<b>PAGO:</b> {data.payment_term or '-'}")
    info_tbl = Table([[Paragraph(info_left, info_style), Paragraph(info_right, info_style)]],
                     colWidths=[135 * mm, 135 * mm])
    info_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_tbl)
    elements.append(Spacer(1, 4 * mm))

    # ── Products table ──
    headers = ["FOTO", "CÓDIGO", "ARTÍCULO", "DESCRIPCIÓN", "CAJAS", "UND/CAJA",
               "TOTAL", "CBM UNIT", "CBM TOT", "USD UNIT", "USD TOTAL"]
    rows = [[Paragraph(f"<b>{h}</b>", ParagraphStyle("h", parent=cell_style,
            textColor=colors.white, fontSize=7)) for h in headers]]

    tot_cajas = tot_qty = 0
    tot_cbm = tot_usd = 0.0

    for p in data.products:
        img_path = _resolve_image_path(p.crop_url or p.photo_url)
        thumb = _make_thumb(img_path) if img_path else None
        photo_cell = thumb if thumb else Paragraph("—", cell_style)
        rows.append([
            photo_cell,
            Paragraph(str(p.code), cell_style),
            Paragraph(p.articulo or "", cell_left),
            Paragraph(p.description or "", cell_left),
            Paragraph(str(p.quantity_cajas or 0), cell_style),
            Paragraph(str(p.quantity_und_por_caja or 0), cell_style),
            Paragraph(str(p.quantity_total or 0), cell_style),
            Paragraph(f"{p.cbm_unit or 0:.2f}", cell_style),
            Paragraph(f"{p.cbm_total or 0:.2f}", cell_style),
            Paragraph(f"${p.precio_unitario_usd or 0:.2f}", cell_style),
            Paragraph(f"<b>${p.total_usd or 0:,.2f}</b>", cell_style),
        ])
        tot_cajas += (p.quantity_cajas or 0)
        tot_qty += (p.quantity_total or 0)
        tot_cbm += (p.cbm_total or 0)
        tot_usd += (p.total_usd or 0)

    # Totals row
    rows.append([
        Paragraph("<b>TOTALES</b>", ParagraphStyle("t", parent=cell_style,
                  textColor=colors.white, fontSize=8)),
        "", "", "",
        Paragraph(f"<b>{tot_cajas}</b>", ParagraphStyle("t1", parent=cell_style, textColor=colors.white)),
        "",
        Paragraph(f"<b>{tot_qty}</b>", ParagraphStyle("t2", parent=cell_style, textColor=colors.white)),
        "",
        Paragraph(f"<b>{tot_cbm:.2f}</b>", ParagraphStyle("t3", parent=cell_style, textColor=colors.white)),
        "",
        Paragraph(f"<b>${tot_usd:,.2f}</b>", ParagraphStyle("t4", parent=cell_style, textColor=colors.white)),
    ])

    col_widths = [20 * mm, 16 * mm, 30 * mm, 55 * mm, 14 * mm, 16 * mm,
                  16 * mm, 16 * mm, 16 * mm, 18 * mm, 24 * mm]
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        # Alternating rows
        *[("BACKGROUND", (0, i), (-1, i), light_row)
          for i in range(2, len(rows) - 1, 2)],
        # Totals row
        ("BACKGROUND", (0, -1), (-1, -1), header_bg),
        ("SPAN", (0, -1), (3, -1)),
        ("LINEABOVE", (0, 0), (-1, 0), 1.5, primary),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 4 * mm))

    footer = ParagraphStyle("f", parent=styles["Normal"], fontSize=7,
                            textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER)
    elements.append(Paragraph(
        f"{name} • {tagline} • Generado el {date.today().strftime('%d/%m/%Y')}", footer))

    doc.build(elements)
    buf.seek(0)
    return buf.read()


# Backwards-compatible async wrapper (route calls excel_to_pdf historically)
async def excel_to_pdf(excel_buffer) -> bytes:  # pragma: no cover
    raise NotImplementedError("Usa generate_pdf() en su lugar")
