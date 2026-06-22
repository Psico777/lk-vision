# LK VISION - Guia de Presentacion

## Que es LK VISION?

Sistema inteligente de gestion de pedidos que usa **Inteligencia Artificial** para convertir fotos de productos en ordenes de compra listas para exportar. Reduce el tiempo de entrada manual de datos de **horas a minutos**.

---

## Paso a Paso para Demo

### PASO 1 — Iniciar el Sistema

Doble clic en `start.bat` o ejecutar:

```
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

### PASO 2 — Crear una Lista de Productos

1. Haz clic en el boton **hamburguesa** (tres lineas) en la esquina superior izquierda
2. En el panel lateral, escribe el nombre de la lista (ej: "Pedido China Julio 2026")
3. Haz clic en el boton **+** verde para crear

### PASO 3 — Subir Fotos de Productos

1. Arrastra fotos de productos al area de **drag & drop**
   - Acepta JPG, PNG, WebP
   - Puedes subir multiples fotos a la vez
2. Revisa las previews de las imagenes
3. Haz clic en **"Procesar con IA"**

> La IA (Google Gemini Vision) analiza cada foto y extrae automaticamente:
> - Nombre del producto
> - Precio en Yuanes (CNY)
> - Cantidad de unidades
> - Volumen (CBM)
> - Tamano

### PASO 4 — Editar la Tabla

La tabla es completamente editable como Excel:

- **Click** en cualquier celda para editar
- Los totales se recalculan automaticamente
- Columnas: Foto, Codigo, Articulo, Descripcion, Cajas, Und/Caja, Total, CBM, Precio USD

#### Funciones de la tabla:
- **+ Agregar Producto** — agrega una fila manual
- **Limpiar Todo** — borra todos los productos
- **Recortar** — recorta manualmente la foto de un producto
- **Eliminar** — boton rojo por fila para borrar un producto

### PASO 5 — Ajustar Tasa de Cambio

En la esquina superior derecha:

1. Cambia el valor de **TASA CNY/USD** (ej: 7.2)
2. Haz clic en el check verde **✓**
3. Todos los precios USD se recalculan al instante

### PASO 6 — Completar Datos de Exportacion

Abajo de la tabla, completa los campos:

| Campo | Descripcion |
|-------|-------------|
| CONSIGNEE | Nombre del destinatario |
| DATE | Fecha del pedido |
| RUC | Numero de identificacion fiscal |
| DIRECCION | Direccion de entrega |
| ORIGIN | Puerto de origen (ej: NINGBO, CHINA) |
| DESTINATION | Puerto de destino (ej: CALLAO, PERU) |
| PAYMENT TERM | Condiciones de pago |

### PASO 7 — Exportar

Tres opciones disponibles:

1. **Exportar a Excel (.xlsx)** — Archivo Excel con formato profesional, fotos embebidas y totales
2. **Exportar a PDF** — PDF profesional generado localmente (sin servicios externos ni costo)
3. **Exportar a CSV** — Para integrar con otros sistemas

### PASO 8 — Dashboard (pestaña "Dashboard")

Vista ejecutiva del pedido:
- KPIs: valor total, productos, unidades, cajas, volumen, precio promedio
- Grafico de barras: top productos por valor
- Grafico circular: distribucion de costos

### PASO 9 — Calculadora de Importacion (pestaña "Calculadora")

Calcula el **costo real puesto en destino (landed cost)**:
1. Ajusta las tasas: flete USD/m³, seguro %, arancel %, IGV %
2. El sistema calcula automaticamente: FOB + Flete + Seguro + Arancel + IGV = **Landed Cost**
3. Muestra el costo unitario real por producto — clave para fijar precios de venta

### PASO 10 — Personalizar la Marca (boton ⚙️ Configuracion)

**Funcion estrella para revender:**
1. Cambia nombre de empresa, eslogan y logo
2. Agrega direccion, telefono, email, RUC
3. Elige colores de marca
4. Todo se aplica al instante en la interfaz, el Excel y el PDF

> Un mismo sistema personalizado para cada cliente, sin tocar codigo.

---

## Argumentos de Venta (Pitch)

- **Ahorro de tiempo:** de 30+ min a 2 min por foto. Si un agente procesa 50 fotos/dia, ahorra ~24 horas/semana.
- **Cero errores:** la IA lee y calcula; no hay digitacion ni conversiones manuales equivocadas.
- **Sin costos recurrentes:** PDF y Excel se generan localmente. Solo se paga la IA por uso (centavos por foto).
- **White-label:** revendelo a multiples empresas con su propia marca.
- **Listo para Peru:** calculadora con IGV 18% y aranceles incluida.
- **Funciona offline:** todo excepto la IA opera sin internet.

---

## Funciones Clave para la Presentacion

### Inteligencia Artificial
- Sube una foto de bodega con productos y datos manuscritos
- La IA detecta cada producto, lee precios, cantidades y volumenes
- Reduce el trabajo manual de 30+ minutos a 2 minutos por foto

### Colaboracion en Tiempo Real
- Multiples usuarios pueden editar la misma lista simultaneamente
- Indicador de conexion (verde = online, rojo = offline)
- Los cambios se sincronizan al instante via WebSocket

### Smart Crop (Recorte Inteligente)
- La IA detecta automaticamente cada producto en la foto
- Genera thumbnails individuales para cada fila
- Opcion de recorte manual con herramienta canvas interactiva

### Gestion de Proyectos
- Guarda multiples listas de productos
- Cada lista se persiste en base de datos
- Acceso rapido desde el panel lateral

### Exportacion Profesional
- Excel con branding de la empresa
- Fotos de productos embebidas en cada fila
- Formato listo para imprimir o enviar a proveedores

---

## Requisitos Tecnicos

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | React 19, Vite 6 |
| Backend | Python, FastAPI |
| Base de Datos | SQLite (incluida) |
| IA | Google Gemini 2.5 Flash |
| Exportacion | openpyxl (Excel), reportlab (PDF local) |

### Para activar la IA:
1. Obtener API Key en https://aistudio.google.com/apikey
2. Crear archivo `backend/.env`:
```
GEMINI_API_KEY=tu_api_key_aqui
```
3. Reiniciar el backend

---

## Flujo Visual

```
  FOTO DE PRODUCTO          INTELIGENCIA ARTIFICIAL         TABLA EDITABLE
 ┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
 │   Arrastra y     │ ---> │  Google Gemini AI    │ ---> │  Edita precios,  │
 │   suelta fotos   │      │  detecta productos,  │      │  cantidades,     │
 │   de bodega      │      │  lee texto manuscrito │      │  volumenes       │
 └─────────────────┘      └─────────────────────┘      └────────┬────────┘
                                                                 │
                                                                 v
                                                        ┌─────────────────┐
                                                        │  EXPORTAR       │
                                                        │  Excel o PDF    │
                                                        │  con fotos      │
                                                        └─────────────────┘
```

---

## Preguntas Frecuentes (FAQ)

**P: Necesito internet para usar el sistema?**
R: Solo para la funcion de IA (Gemini). El resto funciona 100% offline.

**P: Cuantos productos puede procesar a la vez?**
R: Sin limite. La IA puede analizar multiples fotos simultaneamente.

**P: Se puede personalizar el formato del Excel?**
R: Si, el formato es completamente configurable desde el codigo.

**P: Los datos se guardan?**
R: Si, todo se guarda en una base de datos local (SQLite). No se pierde nada al cerrar.

**P: Funciona en celular?**
R: Si, el diseno es responsive. Se adapta a cualquier pantalla.

---

*LK VISION v2.0 — Gestion Inteligente de Pedidos*
