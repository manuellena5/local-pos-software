# Configuración AFIP — Facturación Electrónica

## Modos de operación

| Variable `AFIP_ENVIRONMENT` | Comportamiento |
|-----------------------------|---------------|
| `mock` (default)            | CAE falso generado localmente — sin conexión a AFIP |
| `testing`                   | Homologación AFIP (requiere certificado de testing) |
| `production`                | Producción real (requiere certificado válido) |

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto (nunca commitear con datos reales):

```env
# Entorno AFIP: mock | testing | production
AFIP_ENVIRONMENT=mock

# CUIT del emisor (sin guiones)
AFIP_CUIT=20000000000

# Rutas a los archivos de certificado
AFIP_CERT_PATH=/ruta/absoluta/afip.crt
AFIP_KEY_PATH=/ruta/absoluta/afip.key

# Número de punto de venta habilitado en AFIP (default: 1)
AFIP_POINT_OF_SALE=1
```

---

## Modo mock (desarrollo)

No se requiere ninguna configuración adicional. Al confirmar una venta:

1. Se genera un CAE ficticio de 14 dígitos
2. Se guarda en la venta con `invoiceStatus = 'issued'`
3. El ticket muestra el número de comprobante y CAE

---

## Configuración para testing/producción

### 1. Obtener certificado digital

1. Acceder al portal de AFIP: https://afip.gob.ar
2. Ir a **Servicios en Línea → Administrador de Relaciones**
3. Generar un certificado para el servicio **wsfe** (Facturación Electrónica)
4. Descargar `.crt` y `.key`

### 2. Habilitar punto de venta

1. En AFIP → **Mis Datos → Puntos de Venta**
2. Crear un punto de venta de tipo **Facturación Electrónica** (no controlador fiscal)
3. Anotar el número de punto de venta

### 3. Configurar variables

```env
AFIP_ENVIRONMENT=testing  # o production
AFIP_CUIT=20123456789
AFIP_CERT_PATH=C:\certs\afip-testing.crt
AFIP_KEY_PATH=C:\certs\afip-testing.key
AFIP_POINT_OF_SALE=1
```

---

## Tipos de comprobante

| Tipo | Código AFIP | Uso |
|------|-------------|-----|
| `B`  | 6           | Consumidor final |
| `C`  | 11          | Monotributista |

El sistema siempre emite **Factura B** (consumidor final) por defecto.

---

## Flujo de facturación

```
Venta confirmada
      ↓
SalesService.confirmSale()
      ↓
saleRepo.create() ← transacción atómica
      ↓ (non-blocking)
InvoiceQueueService.tryIssueAfterSale()
      ↓
┌─────────────────────────────┐
│ AFIP responde en < 10s      │ → invoiceStatus = 'issued'
│ AFIP timeout / error        │ → enqueue pending_invoices
│ 3 reintentos fallidos       │ → invoiceStatus = 'failed'
└─────────────────────────────┘
      ↓ (cada 5 minutos)
InvoiceProcessor cron job
→ procesa pending_invoices
→ reintenta hasta 3 veces
→ estado final: 'issued' | 'failed'
```

---

## Monitoreo desde la UI

El badge de facturación en el header muestra:
- ✅ **N emitidas** — todo correcto
- 🕐 **N pendientes** — esperando reintento automático
- ⚠️ **N fallas** — requieren intervención manual

Click en el badge → panel con detalle de la cola y botón de reintento manual.

---

## Solución de problemas

| Error | Causa probable | Solución |
|-------|----------------|----------|
| `AFIP timeout after 10000ms` | Servidor AFIP no disponible | Reintento automático cada 5 min |
| `Error de autenticación` | Certificado vencido o incorrecto | Renovar certificado en portal AFIP |
| `Punto de venta inactivo` | PV no habilitado en AFIP | Verificar configuración en portal |
| `invoiceStatus = 'failed'` | 3 reintentos fallidos | Usar botón "Reintentar" en la UI |
