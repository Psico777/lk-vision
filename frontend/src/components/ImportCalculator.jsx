/**
 * LK VISION - ImportCalculator (costo landed: flete, seguro, arancel, IGV)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, Loader2 } from './Icons.jsx';
import { calcImportCost } from '../services/api.js';

function fmtUSD(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImportCalculator({ products, defaults }) {
  const [rates, setRates] = useState({
    freight_per_cbm: defaults?.freight_per_cbm ?? 180,
    customs_rate: defaults?.customs_rate ?? 0,
    igv_rate: defaults?.igv_rate ?? 18,
    insurance_rate: defaults?.insurance_rate ?? 1,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const recalc = useCallback(async () => {
    if (!products.length) return;
    setLoading(true);
    try {
      const res = await calcImportCost({ products, ...rates });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [products, rates]);

  useEffect(() => {
    const t = setTimeout(recalc, 400);
    return () => clearTimeout(t);
  }, [recalc]);

  const updateRate = (key, value) => {
    setRates((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const RATE_FIELDS = [
    { key: 'freight_per_cbm', label: 'Flete USD/m³', step: 10 },
    { key: 'insurance_rate', label: 'Seguro %', step: 0.5 },
    { key: 'customs_rate', label: 'Arancel %', step: 1 },
    { key: 'igv_rate', label: 'IGV %', step: 1 },
  ];

  return (
    <div className="import-calc">
      <h2 className="section-title"><Calculator size={20} /> Calculadora de Importación (Landed Cost)</h2>

      <div className="calc-rates">
        {RATE_FIELDS.map((f) => (
          <div key={f.key} className="form-group">
            <label>{f.label}</label>
            <input type="number" step={f.step} value={rates[f.key]}
              onChange={(e) => updateRate(f.key, e.target.value)} />
          </div>
        ))}
      </div>

      {loading && <div className="calc-loading"><Loader2 size={20} className="spinner" /> Calculando...</div>}

      {result && (
        <>
          <div className="calc-summary">
            <div className="calc-summary-item">
              <span>FOB</span><strong>{fmtUSD(result.totals.fob)}</strong>
            </div>
            <span className="calc-op">+</span>
            <div className="calc-summary-item">
              <span>Flete</span><strong>{fmtUSD(result.totals.freight)}</strong>
            </div>
            <span className="calc-op">+</span>
            <div className="calc-summary-item">
              <span>Seguro</span><strong>{fmtUSD(result.totals.insurance)}</strong>
            </div>
            <span className="calc-op">+</span>
            <div className="calc-summary-item">
              <span>Arancel</span><strong>{fmtUSD(result.totals.customs)}</strong>
            </div>
            <span className="calc-op">+</span>
            <div className="calc-summary-item">
              <span>IGV</span><strong>{fmtUSD(result.totals.igv)}</strong>
            </div>
            <span className="calc-op">=</span>
            <div className="calc-summary-item calc-total">
              <span>LANDED COST</span><strong>{fmtUSD(result.totals.landed)}</strong>
            </div>
          </div>

          <div className="table-container calc-table-wrap">
            <table className="lk-table calc-table">
              <thead>
                <tr className="header-columns-row">
                  <th className="header-cell">CÓDIGO</th>
                  <th className="header-cell">ARTÍCULO</th>
                  <th className="header-cell">FOB</th>
                  <th className="header-cell">CIF</th>
                  <th className="header-cell">IGV</th>
                  <th className="header-cell">LANDED</th>
                  <th className="header-cell">COSTO/UND</th>
                </tr>
              </thead>
              <tbody>
                {result.products.map((p, i) => (
                  <tr key={p.id} className={`data-row ${i % 2 === 0 ? 'row-even' : 'row-odd'}`}>
                    <td className="data-cell cell-code">{p.code}</td>
                    <td className="data-cell">{p.articulo}</td>
                    <td className="data-cell cell-number">{fmtUSD(p.fob)}</td>
                    <td className="data-cell cell-number">{fmtUSD(p.cif)}</td>
                    <td className="data-cell cell-number">{fmtUSD(p.igv)}</td>
                    <td className="data-cell cell-total">{fmtUSD(p.landed)}</td>
                    <td className="data-cell cell-currency" style={{ color: 'var(--accent)' }}>{fmtUSD(p.unit_landed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
