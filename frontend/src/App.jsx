/**
 * LK VISION - Order Management System
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ImageUploader from './components/ImageUploader.jsx';
import EditableTable from './components/EditableTable.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import ProjectPanel from './components/ProjectPanel.jsx';
import Dashboard from './components/Dashboard.jsx';
import ImportCalculator from './components/ImportCalculator.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { Settings, Search, BarChart, Calculator, FileUp, Download, FileSpreadsheet } from './components/Icons.jsx';
import {
  getConfig, listProjects, createProject, getProject,
  deleteProject as apiDeleteProject, updateProject,
  recalculateAll, clearAllProducts, deleteProduct,
  connectWebSocket, getCompanySettings, exportToCsv, importCsv,
} from './services/api.js';

const today = new Date();
const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

export default function App() {
  // === STATE ===
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [rateInput, setRateInput] = useState('7.2');
  const [exportConfig, setExportConfig] = useState({
    consignee: 'Sres.Cristina y Victor',
    ruc: '', direccion: '',
    origin: 'NINGBO, CHINA', destination: 'CALLAO, PERÚ',
    payment_term: '', date: formattedDate,
  });

  // Projects
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectName, setActiveProjectName] = useState('');
  const [showProjectPanel, setShowProjectPanel] = useState(false);

  // WebSocket
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // New: white-label, views, search
  const [company, setCompany] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState('table'); // table | dashboard | calc
  const [searchTerm, setSearchTerm] = useState('');
  const csvInputRef = useRef(null);

  // ── Apply company branding (colors + defaults) ──
  const applyBranding = useCallback((c) => {
    if (!c) return;
    setCompany(c);
    if (c.primary_color) document.documentElement.style.setProperty('--accent', c.primary_color);
    if (c.accent_color) document.documentElement.style.setProperty('--accent-secondary', c.accent_color);
    document.title = `${c.company_name || 'LK VISION'} - OMS`;
    setExportConfig((prev) => ({
      ...prev,
      origin: prev.origin || c.default_origin || 'NINGBO, CHINA',
      destination: prev.destination || c.default_destination || 'CALLAO, PERÚ',
      consignee: c.default_consignee || prev.consignee,
    }));
  }, []);

  // ── Load config + projects on mount ──
  useEffect(() => {
    getConfig()
      .then((config) => {
        if (config.cny_to_usd_rate) {
          setExchangeRate(config.cny_to_usd_rate);
          setRateInput(String(config.cny_to_usd_rate));
        }
        if (config.company) applyBranding(config.company);
      })
      .catch(() => console.log('Backend no disponible'));

    refreshProjects();
  }, []);

  const refreshProjects = async () => {
    try {
      const list = await listProjects();
      setProjects(list);
    } catch {
      console.log('No se pudieron cargar proyectos');
    }
  };

  // ── WebSocket management ──
  useEffect(() => {
    if (!activeProjectId) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setWsConnected(false);
      setOnlineUsers([]);
      return;
    }

    const ws = connectWebSocket(activeProjectId);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => { setWsConnected(false); setOnlineUsers([]); };
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'user_joined':
          case 'user_left':
            if (msg.users) setOnlineUsers(msg.users);
            break;
          case 'product_added':
          case 'product_updated':
            setProducts((prev) => {
              const idx = prev.findIndex((p) => p.id === msg.data.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = msg.data;
                return copy;
              }
              return [...prev, msg.data];
            });
            break;
          case 'product_deleted':
            setProducts((prev) => prev.filter((p) => p.id !== msg.data.id));
            break;
          case 'products_cleared':
            setProducts([]);
            break;
          case 'products_added_batch':
            if (msg.data?.products) {
              setProducts((prev) => [...prev, ...msg.data.products]);
            }
            break;
          case 'products_recalculated':
            if (msg.data?.products) {
              setProducts(msg.data.products);
              if (msg.data.exchange_rate) {
                setExchangeRate(msg.data.exchange_rate);
                setRateInput(String(msg.data.exchange_rate));
              }
            }
            break;
          case 'project_updated':
            if (msg.data?.exchange_rate) {
              setExchangeRate(msg.data.exchange_rate);
              setRateInput(String(msg.data.exchange_rate));
            }
            break;
          default:
            break;
        }
      } catch {}
    };

    // Ping keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [activeProjectId]);

  // ── Project actions ──
  const handleSelectProject = async (projectId) => {
    try {
      const project = await getProject(projectId);
      setActiveProjectId(project.id);
      setActiveProjectName(project.name);
      setProducts(project.products || []);
      if (project.exchange_rate) {
        setExchangeRate(project.exchange_rate);
        setRateInput(String(project.exchange_rate));
      }
      if (project.consignee) {
        setExportConfig((prev) => ({ ...prev, consignee: project.consignee }));
      }
    } catch (e) {
      alert('Error cargando proyecto: ' + e.message);
    }
  };

  const handleCreateProject = async (name) => {
    try {
      const project = await createProject({
        name,
        exchange_rate: exchangeRate,
      });
      await refreshProjects();
      handleSelectProject(project.id);
    } catch (e) {
      alert('Error creando proyecto: ' + e.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await apiDeleteProject(projectId);
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setActiveProjectName('');
        setProducts([]);
      }
      await refreshProjects();
    } catch (e) {
      alert('Error eliminando proyecto: ' + e.message);
    }
  };

  // ── Exchange rate ──
  const handleRateChange = (e) => {
    setRateInput(e.target.value);
  };

  const applyNewRate = async () => {
    const newRate = parseFloat(rateInput);
    if (isNaN(newRate) || newRate <= 0) {
      alert('Tasa de cambio inválida');
      return;
    }
    setExchangeRate(newRate);

    if (activeProjectId && products.length > 0) {
      try {
        const result = await recalculateAll(activeProjectId, newRate);
        if (result.products) setProducts(result.products);
      } catch (e) {
        // Fallback: recalculate locally
        setProducts((prev) =>
          prev.map((p) => {
            const usd = Math.round((p.precio_unitario_cny / newRate) * 100) / 100;
            return {
              ...p,
              tasa_cambio: newRate,
              precio_unitario_usd: usd,
              total_usd: Math.round(p.quantity_total * usd * 100) / 100,
            };
          })
        );
      }
    }
  };

  const handleRateKeyDown = (e) => {
    if (e.key === 'Enter') applyNewRate();
  };

  // ── Products (from AI) ──
  const handleProcessed = (result) => {
    if (result.success && result.products) {
      setProducts((prev) => [...prev, ...result.products]);
      if (result.date) {
        setExportConfig((prev) => ({ ...prev, date: result.date }));
      }
    }
  };

  // ── Manual product add ──
  const addEmptyProduct = () => {
    const nextCode = products.length > 0
      ? Math.max(...products.map((p) => p.code || 0)) + 1
      : 10001;
    setProducts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        code: nextCode,
        articulo: `Producto ${products.length + 1}`,
        description: '', photo_url: null, crop_url: null,
        quantity_cajas: 1, quantity_und_por_caja: 0, quantity_total: 0,
        cbm_unit: 0, cbm_total: 0,
        precio_unitario_cny: 0, precio_unitario_usd: 0,
        total_usd: 0, tasa_cambio: exchangeRate,
        editable: true,
      },
    ]);
  };

  // ── Delete single product ──
  const handleDeleteProduct = async (productUid) => {
    if (activeProjectId) {
      try {
        await deleteProduct(activeProjectId, productUid);
      } catch {}
    }
    setProducts((prev) => prev.filter((p) => p.id !== productUid));
  };

  // ── Clear all products ──
  const handleClearAll = async () => {
    if (!window.confirm('¿Eliminar TODOS los productos de esta lista? Esta acción no se puede deshacer.')) return;
    if (activeProjectId) {
      try {
        await clearAllProducts(activeProjectId);
      } catch {}
    }
    setProducts([]);
  };

  // ── Duplicate a product ──
  const handleDuplicateProduct = (productUid) => {
    setProducts((prev) => {
      const src = prev.find((p) => p.id === productUid);
      if (!src) return prev;
      const nextCode = Math.max(...prev.map((p) => p.code || 0), 10000) + 1;
      const copy = { ...src, id: crypto.randomUUID(), code: nextCode, articulo: `${src.articulo} (copia)` };
      const idx = prev.findIndex((p) => p.id === productUid);
      const out = [...prev];
      out.splice(idx + 1, 0, copy);
      return out;
    });
  };

  // ── CSV export ──
  const handleExportCsv = async () => {
    if (!products.length) { alert('No hay productos para exportar'); return; }
    try {
      await exportToCsv({ products, ...exportConfig });
    } catch (e) {
      alert('Error exportando CSV: ' + e.message);
    }
  };

  // ── CSV import ──
  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeProjectId) { alert('Selecciona o crea una lista primero'); return; }
    try {
      const res = await importCsv(activeProjectId, file);
      alert(`${res.imported} producto(s) importados desde CSV`);
      const project = await getProject(activeProjectId);
      setProducts(project.products || []);
    } catch (err) {
      alert('Error importando CSV: ' + (err.response?.data?.detail || err.message));
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div className="app-layout">
      {/* ============ PROJECT PANEL (sidebar) ============ */}
      {showProjectPanel && (
        <ProjectPanel
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onClose={() => setShowProjectPanel(false)}
        />
      )}

      <div className="app-main">
        {/* ============ HEADER CORPORATIVO ============ */}
        <header className="header">
          <div className="header-left">
            <button
              className="btn-icon header-menu-btn"
              onClick={() => setShowProjectPanel(!showProjectPanel)}
              title="Listas Guardadas"
            >
              ☰
            </button>
            <div className="header-content">
              <h1 className="company-name">{company?.company_name || 'LK VISION'}</h1>
              <p className="company-address">
                {company?.tagline || 'Order Management System — Gestión Inteligente de Pedidos'}
              </p>
              <p className="company-contact">
                Powered by Gemini AI &nbsp;|&nbsp; Real-time Collaboration
              </p>
            </div>
          </div>

          <div className="header-right">
            {/* Exchange Rate */}
            <div className="rate-control">
              <label className="rate-label">TASA CNY/USD</label>
              <div className="rate-input-group">
                <input
                  type="number"
                  step="0.1"
                  value={rateInput}
                  onChange={handleRateChange}
                  onKeyDown={handleRateKeyDown}
                  className="rate-input"
                />
                <button className="btn-rate-apply" onClick={applyNewRate} title="Aplicar nueva tasa">
                  ✓
                </button>
              </div>
            </div>

            {/* Sync indicator */}
            <div className="sync-indicator">
              <span className={`sync-dot ${wsConnected ? 'sync-connected' : 'sync-disconnected'}`} />
              <span className="sync-text">
                {wsConnected ? `Online (${onlineUsers.length})` : 'Offline'}
              </span>
            </div>

            <div className="header-badge">
              <span className="badge-title">
                {activeProjectName || 'LISTA DE PRODUCTOS'}
              </span>
              <span className="badge-subtitle">{(company?.company_name || 'LK VISION')} OMS</span>
            </div>

            <button className="btn-icon header-settings-btn" onClick={() => setShowSettings(true)} title="Configuración de Empresa">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* ============ CONTENIDO PRINCIPAL ============ */}
        <main className="main">
          {/* Upload */}
          <ImageUploader
            onProcessed={handleProcessed}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            projectId={activeProjectId}
          />

          {/* View tabs */}
          {products.length > 0 && (
            <div className="view-tabs">
              <button className={`view-tab ${activeView === 'table' ? 'view-tab-active' : ''}`} onClick={() => setActiveView('table')}>
                📋 Tabla
              </button>
              <button className={`view-tab ${activeView === 'dashboard' ? 'view-tab-active' : ''}`} onClick={() => setActiveView('dashboard')}>
                <BarChart size={15} /> Dashboard
              </button>
              <button className={`view-tab ${activeView === 'calc' ? 'view-tab-active' : ''}`} onClick={() => setActiveView('calc')}>
                <Calculator size={15} /> Calculadora
              </button>
            </div>
          )}

          {/* DASHBOARD view */}
          {products.length > 0 && activeView === 'dashboard' && (
            <section className="products-section">
              <Dashboard products={products} exchangeRate={exchangeRate} />
            </section>
          )}

          {/* CALCULATOR view */}
          {products.length > 0 && activeView === 'calc' && (
            <section className="products-section">
              <ImportCalculator products={products} defaults={company} />
            </section>
          )}

          {/* TABLE view */}
          {products.length > 0 && activeView === 'table' && (
            <section className="products-section">
              <div className="products-header">
                <h2 className="section-title">
                  📋 Tabla de Productos
                  <span className="product-count">{products.length} items</span>
                </h2>
                <div className="products-actions">
                  <div className="search-box">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <button className="btn-secondary" onClick={addEmptyProduct}>
                    + Agregar
                  </button>
                  <button className="btn-secondary" onClick={handleExportCsv} title="Exportar CSV">
                    <Download size={14} /> CSV
                  </button>
                  <button className="btn-secondary" onClick={() => csvInputRef.current?.click()} title="Importar CSV">
                    <FileUp size={14} /> Importar
                  </button>
                  <input ref={csvInputRef} type="file" accept=".csv" onChange={handleImportCsv} style={{ display: 'none' }} />
                  <button className="btn-danger" onClick={handleClearAll}>
                    🗑 Limpiar
                  </button>
                </div>
              </div>

              <EditableTable
                products={products}
                setProducts={setProducts}
                exchangeRate={exchangeRate}
                onDeleteProduct={handleDeleteProduct}
                onDuplicateProduct={handleDuplicateProduct}
                searchTerm={searchTerm}
                projectId={activeProjectId}
              />

              <ExportPanel
                products={products}
                exportConfig={exportConfig}
                setExportConfig={setExportConfig}
              />
            </section>
          )}

          {/* Empty state */}
          {products.length === 0 && !isLoading && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No hay productos</h3>
              <p>
                {activeProjectId
                  ? 'Sube fotos o agrega productos manualmente'
                  : 'Crea o selecciona una lista desde el panel lateral (☰)'}
              </p>
              <div className="empty-actions">
                {!activeProjectId && (
                  <button className="btn-primary" onClick={() => setShowProjectPanel(true)}>
                    📂 Abrir Listas Guardadas
                  </button>
                )}
                <button className="btn-secondary" onClick={addEmptyProduct}>
                  + Agregar producto manualmente
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ============ FOOTER ============ */}
        <footer className="footer">
          <span>{company?.company_name || 'LK VISION'} v2.0 • Powered by Gemini AI</span>
          <span>Tasa: 1 USD = {exchangeRate} CNY</span>
          <span>Ruta: {exportConfig.origin} → {exportConfig.destination}</span>
        </footer>
      </div>

      {/* ============ SETTINGS MODAL ============ */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={(c) => applyBranding(c)}
        />
      )}
    </div>
  );
}
