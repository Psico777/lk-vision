/**
 * LK VISION - SettingsModal (white-label branding configuration)
 */
import React, { useState, useEffect } from 'react';
import { X, Settings, Loader2, Check } from './Icons.jsx';
import { getCompanySettings, updateCompanySettings } from '../services/api.js';

const FIELDS = [
  { section: 'Identidad de Marca', fields: [
    { key: 'company_name', label: 'Nombre de Empresa', placeholder: 'Mi Empresa S.A.C.' },
    { key: 'tagline', label: 'Eslogan / Subtítulo', placeholder: 'Order Management System' },
    { key: 'logo_url', label: 'URL del Logo (opcional)', placeholder: 'https://...' },
  ]},
  { section: 'Datos de Contacto', fields: [
    { key: 'address', label: 'Dirección', placeholder: 'Av. Principal 123, Lima' },
    { key: 'phone', label: 'Teléfono', placeholder: '+51 999 999 999' },
    { key: 'email', label: 'Email', placeholder: 'ventas@empresa.com' },
    { key: 'ruc', label: 'RUC', placeholder: '20123456789' },
  ]},
  { section: 'Valores por Defecto', fields: [
    { key: 'default_origin', label: 'Origen', placeholder: 'NINGBO, CHINA' },
    { key: 'default_destination', label: 'Destino', placeholder: 'CALLAO, PERÚ' },
    { key: 'default_consignee', label: 'Consignatario', placeholder: 'Nombre del cliente' },
  ]},
  { section: 'Colores de Marca', fields: [
    { key: 'primary_color', label: 'Color Primario', type: 'color' },
    { key: 'accent_color', label: 'Color Secundario', type: 'color' },
  ]},
];

export default function SettingsModal({ onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCompanySettings().then(setData).catch(() => setData({}));
  }, []);

  const update = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCompanySettings(data);
      setSaved(true);
      onSaved?.(updated);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Error guardando: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2><Settings size={20} /> Configuración de Empresa</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {!data ? (
          <div className="settings-loading"><Loader2 size={32} className="spinner" /></div>
        ) : (
          <div className="settings-body">
            <p className="settings-hint">
              Personaliza la marca. Estos datos aparecen en el encabezado, Excel y PDF exportados.
            </p>
            {FIELDS.map((group) => (
              <div key={group.section} className="settings-group">
                <h3 className="settings-group-title">{group.section}</h3>
                <div className="settings-grid">
                  {group.fields.map((f) => (
                    <div key={f.key} className={`form-group ${f.type === 'color' ? 'color-field' : ''}`}>
                      <label>{f.label}</label>
                      {f.type === 'color' ? (
                        <div className="color-input-group">
                          <input type="color" value={data[f.key] || '#00d4ff'}
                            onChange={(e) => update(f.key, e.target.value)} />
                          <span className="color-hex">{data[f.key]}</span>
                        </div>
                      ) : (
                        <input type="text" value={data[f.key] || ''} placeholder={f.placeholder}
                          onChange={(e) => update(f.key, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary settings-save" onClick={handleSave} disabled={saving || !data}>
            {saving ? <><Loader2 size={16} className="spinner" /> Guardando...</>
              : saved ? <><Check size={16} /> Guardado</>
              : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
