/**
 * LK VISION - Dashboard (estadísticas y gráficos del pedido)
 */
import React, { useMemo } from 'react';
import { BarChart } from './Icons.jsx';

const COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];

function fmtUSD(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard({ products, exchangeRate }) {
  const stats = useMemo(() => {
    const totalUSD = products.reduce((s, p) => s + (p.total_usd || 0), 0);
    const totalCBM = products.reduce((s, p) => s + (p.cbm_total || 0), 0);
    const totalQty = products.reduce((s, p) => s + (p.quantity_total || 0), 0);
    const totalCajas = products.reduce((s, p) => s + (p.quantity_cajas || 0), 0);
    const avgUnit = totalQty ? totalUSD / totalQty : 0;

    const byValue = [...products]
      .map((p) => ({ name: p.articulo || `#${p.code}`, value: p.total_usd || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const maxValue = Math.max(...byValue.map((d) => d.value), 1);

    // Pie chart segments by value share
    const pieData = byValue.map((d, i) => ({
      ...d, pct: totalUSD ? (d.value / totalUSD) * 100 : 0, color: COLORS[i % COLORS.length],
    }));

    return { totalUSD, totalCBM, totalQty, totalCajas, avgUnit, byValue, maxValue, pieData };
  }, [products]);

  // Build pie chart (conic via SVG arcs)
  const pieSegments = useMemo(() => {
    let cumulative = 0;
    return stats.pieData.map((d) => {
      const start = cumulative;
      const sweep = (d.pct / 100) * 360;
      cumulative += sweep;
      const large = sweep > 180 ? 1 : 0;
      const r = 70, cx = 80, cy = 80;
      const x1 = cx + r * Math.cos((Math.PI * (start - 90)) / 180);
      const y1 = cy + r * Math.sin((Math.PI * (start - 90)) / 180);
      const x2 = cx + r * Math.cos((Math.PI * (start + sweep - 90)) / 180);
      const y2 = cy + r * Math.sin((Math.PI * (start + sweep - 90)) / 180);
      return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: d.color, name: d.name, pct: d.pct };
    });
  }, [stats.pieData]);

  return (
    <div className="dashboard">
      <h2 className="section-title"><BarChart size={20} /> Dashboard del Pedido</h2>

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Valor Total (FOB)</span>
          <span className="kpi-value">{fmtUSD(stats.totalUSD)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Productos</span>
          <span className="kpi-value">{products.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Unidades</span>
          <span className="kpi-value">{stats.totalQty.toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Cajas</span>
          <span className="kpi-value">{stats.totalCajas.toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Volumen (CBM)</span>
          <span className="kpi-value">{stats.totalCBM.toFixed(2)} m³</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Precio Prom./Und</span>
          <span className="kpi-value">{fmtUSD(stats.avgUnit)}</span>
        </div>
      </div>

      <div className="charts-row">
        {/* Bar chart: top products by value */}
        <div className="chart-card">
          <h3 className="chart-title">Top Productos por Valor</h3>
          <div className="bar-chart">
            {stats.byValue.map((d, i) => (
              <div key={i} className="bar-row">
                <span className="bar-label" title={d.name}>{d.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{
                    width: `${(d.value / stats.maxValue) * 100}%`,
                    background: COLORS[i % COLORS.length],
                  }} />
                </div>
                <span className="bar-value">{fmtUSD(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie chart: cost distribution */}
        <div className="chart-card">
          <h3 className="chart-title">Distribución de Costos</h3>
          <div className="pie-container">
            <svg viewBox="0 0 160 160" className="pie-svg">
              {pieSegments.map((seg, i) => (
                <path key={i} d={seg.d} fill={seg.color} stroke="#0a0f1e" strokeWidth="1" />
              ))}
              <circle cx="80" cy="80" r="38" fill="#1a2236" />
              <text x="80" y="76" textAnchor="middle" className="pie-center-label">TOTAL</text>
              <text x="80" y="92" textAnchor="middle" className="pie-center-value">{fmtUSD(stats.totalUSD)}</text>
            </svg>
            <div className="pie-legend">
              {stats.pieData.map((d, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-dot" style={{ background: d.color }} />
                  <span className="legend-name" title={d.name}>{d.name}</span>
                  <span className="legend-pct">{d.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
