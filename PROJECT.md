# 📘 ESPECIFICACIÓN DE PROYECTO

## LocalPosSoftware — Sistema POS modular para comercios minoristas

---

**Versión:** 2.0
**Fecha:** Abril 2026
**Repositorio:** `local-pos-software`
**Producto:** LocalPosSoftware
**Primera instalación:** Espacio BIP (Landeta, Santa Fe, Argentina)

---

## 📑 Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Visión del Producto](#2-visión-del-producto)
3. [Arquitectura Modular](#3-arquitectura-modular)
4. [Primera Instalación: Espacio BIP](#4-primera-instalación-espacio-bip)
5. [Alcance del Sistema](#5-alcance-del-sistema)
6. [Requisitos Funcionales](#6-requisitos-funcionales)
7. [Requisitos No Funcionales](#7-requisitos-no-funcionales)
8. [Stack Tecnológico](#8-stack-tecnológico)
9. [Arquitectura Técnica](#9-arquitectura-técnica)
10. [Modelo de Datos](#10-modelo-de-datos)
11. [Módulos Verticales](#11-módulos-verticales)
12. [Integraciones Externas](#12-integraciones-externas)
13. [Plan de Desarrollo](#13-plan-de-desarrollo)
14. [Criterios de Aceptación](#14-criterios-de-aceptación)
15. [Glosario](#15-glosario)

---

## 1. Resumen Ejecutivo

### 1.1 Descripción

**LocalPosSoftware** es un sistema de gestión comercial (POS) multiplataforma, offline-first, diseñado para comercios minoristas pequeños y medianos. Opera sobre una base común (core) y se extiende mediante **módulos verticales** que se activan según el tipo de negocio de cada **unidad de negocio** configurada.

### 1.2 Propuesta de valor

- **Un solo producto, múltiples rubros:** blanquería, gastronomía, ferretería, taller a medida, etc.
- **Una instalación, múltiples unidades de negocio:** un mismo local puede operar dos negocios diferenciados sin mezclarlos.
- **Offline-first real:** funciona 100% sin internet; la nube es un complemento, no un requisito.
- **Facturación electrónica integrada:** cumple con normativa AFIP (Argentina) desde el día 1.
- **Nombre de marca personalizable:** cada instalación muestra al usuario el nombre del negocio, no el del software.
- **Código 100% propio, open-source, sin costos de licencia recurrentes.**

### 1.3 Objetivos del producto

| Plazo               | Objetivo                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Corto (3-4 meses)   | Core funcional + módulos `retail-textil` y `taller-medida` operativos en Espacio BIP                |
| Mediano (6-9 meses) | Agregar módulo de proveedores y comparador de compras; pulir para uso productivo estable            |
| Largo (1 año+)      | Producto comercializable a otros comercios, con módulos adicionales (gastronomía, ferretería, etc.) |

### 1.4 Usuarios del sistema

| Rol                 | Descripción             | Permisos                                                                      |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| **Admin**           | Propietario o encargado | Todo: configuración, usuarios, reportes, ajustes de stock, gestión de módulos |
| **Cajero/Vendedor** | Operación diaria        | POS, consultas de stock, carga de clientes, apertura/cierre de caja           |
| **Visualizador**    | Solo lectura            | Dashboards y reportes, sin modificar nada (futuro)                            |

**Concurrencia esperada:** 2 a 3 usuarios simultáneos por instalación.

---

## 2. Visión del Producto

### 2.1 Diferenciadores vs competencia

Sistemas comerciales existentes (genéricos como Ahora Gestión, Tango Gestión, o específicos como Fudo) tienen uno de dos problemas:

- **Genéricos:** abarcan mucho pero son complejos, caros y con features que el comercio pequeño no usa.
- **Específicos:** son excelentes en un rubro pero no sirven para nada más.

**LocalPosSoftware apunta a un punto medio:**

- Un core simple y sólido que cualquier comercio necesita.
- Módulos específicos que el comercio activa solo si los usa.
- Una sola instalación para negocios con más de una unidad comercial.
- Sin licencias mensuales.
- Arquitectura offline-first (muchos sistemas cloud no funcionan sin internet).

### 2.2 Casos de uso representativos

**Caso 1: Comercio de un solo rubro**
Una blanquería con un solo dueño y un cajero. Instala el software, configura una única unidad de negocio con módulo `retail-textil`, y opera normalmente.

**Caso 2: Comercio con dos negocios diferenciados (Espacio BIP)**
Un mismo local con dos unidades: una de productos de retail (blanquería/deco/aromas) y otra de confección a medida (vestidos). Instala el software, configura dos unidades de negocio con módulos distintos, y cada operador elige en cuál trabajar al abrir la app.

**Caso 3: Futuro — Red de comercios**
El dueño de una cadena pequeña de ferreterías (3 sucursales) instala el software en cada una. Cada instalación es independiente pero comparten módulo `ferreteria` y misma configuración base.

---

## 3. Arquitectura Modular

### 3.1 Modelo conceptual

```
┌─────────────────────────────────────────────────────────┐
│                 LocalPosSoftware (Core)                 │
│                                                         │
│  Features comunes a todo comercio:                      │
│  • POS                • Caja diaria                     │
│  • Stock              • Facturación AFIP                │
│  • Clientes           • Reportes básicos                │
│  • Usuarios           • Sincronización nube             │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ extiende mediante
                          │
┌─────────────────────────┴───────────────────────────────┐
│              Módulos Verticales (opcionales)            │
│                                                         │
│  retail-general  │  retail-textil  │  taller-medida     │
│  gastronomia     │  ferreteria     │  (futuros)         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ asignado a
                          │
┌─────────────────────────┴───────────────────────────────┐
│              Unidades de Negocio (Business Units)       │
│                                                         │
│  Cada BU tiene:                                         │
│  • Un módulo vertical asignado                          │
│  • Su propio stock, caja, ventas, reportes              │
│  • Numeración de facturas independiente                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Principios de la arquitectura modular

1. **El core no conoce los módulos.** El core expone puntos de extensión (hooks, tipos extensibles). Los módulos se enganchan a esos puntos.
2. **Los módulos no dependen entre sí.** Cada módulo es autocontenido. Si dos módulos necesitan algo común, ese algo sube al core.
3. **Todo el código viaja junto.** No hay carga dinámica de código en runtime. Los módulos se activan/desactivan por configuración, no por instalación.
4. **Una BU = un módulo.** Una unidad de negocio tiene exactamente un módulo asignado. Si un negocio necesita múltiples módulos, crea múltiples BUs.
5. **El core es productivo sin módulos.** Solo con el core + un módulo mínimo (`retail-general`) se puede vender.

### 3.3 Qué puede aportar un módulo vertical

Un módulo vertical puede aportar al sistema:

- **Campos extra en entidades:** ej. `retail-textil` agrega campos de variantes a productos.
- **Pantallas propias:** ej. `taller-medida` agrega pantallas de toma de medidas.
- **Reglas de negocio:** ej. `gastronomia` valida que no se pueda vender un plato fuera de horario de cocina.
- **Reportes específicos:** ej. `taller-medida` agrega reporte de pedidos por fecha de entrega.
- **Integraciones:** ej. `gastronomia` puede integrar con impresora de cocina.

### 3.4 Qué NO puede un módulo vertical

- Modificar el comportamiento del core (el core es inmutable desde los módulos).
- Reemplazar funcionalidad core (ej. un módulo no puede sobreescribir el POS; lo extiende si hace falta).
- Acceder a datos de otras unidades de negocio.
- Comunicarse directamente con otros módulos (todo pasa por el core).

---

## 4. Primera Instalación: Espacio BIP

### 4.1 Contexto

**Espacio BIP** es un local comercial en Landeta (Santa Fe, Argentina, ~1500 habitantes) con apertura estimada para mayo/junio de 2026. Es la primera instalación productiva de LocalPosSoftware y sirve como validación de la arquitectura modular.

### 4.2 Configuración inicial de Espacio BIP

| Parámetro                         | Valor                              |
| --------------------------------- | ---------------------------------- |
| Nombre visible                    | Espacio BIP                        |
| Ubicación                         | Landeta, Santa Fe, Argentina       |
| Cantidad de usuarios concurrentes | 2-3                                |
| Condición fiscal                  | Por definir (probable monotributo) |
| Apertura estimada                 | Mayo/Junio 2026                    |

### 4.3 Unidades de Negocio de Espacio BIP

**BU "Front" — Blanquería, Decoración y Aromas**

- Módulo asignado: `retail-textil`
- Tipo de operación: venta mostrador de productos físicos con stock
- Cantidad estimada de productos: 200-500 al inicio
- Medios de pago: efectivo, transferencia, tarjeta, Mercado Pago, Modo/Ualá
- Facturación: B (consumidor final) y C (si se va a monotributo)

**BU "Back" — Diseño de vestidos a medida**

- Módulo asignado: `taller-medida`
- Tipo de operación: pedidos a medida con seña, toma de medidas, entregas programadas
- Sin stock de productos terminados (solo de materiales/insumos, opcional)
- Medios de pago: transferencia mayormente, efectivo como segundo
- Facturación: B o C según condición fiscal

### 4.4 Operación típica diaria

```
08:00 - Apertura del local
08:05 - Operador abre caja de BU "Front" con monto inicial
08:30 - Primeras ventas de blanquería → stock se descuenta, facturas se emiten
11:00 - Llega cliente para prueba de vestido → operador cambia a BU "Back",
        registra la prueba, actualiza estado del pedido
14:00 - Cobro de seña de vestido nuevo → factura se emite en BU "Back"
17:00 - Más ventas en BU "Front"
19:30 - Cierre: se cierran ambas cajas, se generan reportes Z
```

---

## 5. Alcance del Sistema

### 5.1 Dentro del alcance — Core (todas las instalaciones)

- Gestión de usuarios con roles (admin, cajero)
- Configuración inicial con wizard
- Gestión de **unidades de negocio** (crear, activar/desactivar)
- Gestión de productos con campos base (ampliables por módulo)
- Control de inventario con movimientos y trazabilidad
- Punto de venta (POS) básico
- Facturación electrónica AFIP (tipos A, B y C)
- Gestión de clientes
- Caja diaria por unidad de negocio
- Reportes básicos (ventas, stock, más vendidos)
- Impresión de tickets térmicos
- Modo offline completo con cola de sincronización
- Backups automáticos locales
- Sincronización con Supabase
- Nombre del negocio configurable (se muestra en ventana, tickets, facturas)

### 5.2 Dentro del alcance — Módulos verticales (fase 1)

**Módulo `retail-general`** (mínimo viable)

- Productos con precio, costo, categoría
- Stock por unidad
- Ventas simples

**Módulo `retail-textil`**

- Productos con variantes (color, tamaño, material, fragancia)
- SKU por variante, código de barras
- Imágenes de producto
- Campos específicos del rubro (ej. composición textil)

**Módulo `taller-medida`**

- Pedidos con estados (presupuestado, seña recibida, en confección, listo, entregado)
- Fechas de entrega programadas
- Ficha de toma de medidas del cliente
- Historial de pedidos por cliente con fotos de pruebas
- Cobro fraccionado (seña + saldo al entregar)

### 5.3 Dentro del alcance — Fase 2

- API pública REST para catálogo web (por unidad de negocio)
- Módulo de proveedores y comparación de precios
- Simulador de compras con cálculo de ROI
- Alertas de stock mínimo
- Exportación de reportes a Excel y PDF

### 5.4 Fuera del alcance

- Contabilidad completa (libro diario, balances)
- Gestión de empleados y nómina
- E-commerce transaccional propio (solo catálogo de lectura)
- Integración directa con posnet de tarjetas (registro manual)
- Facturación en monedas extranjeras
- Multi-sucursal con sincronización en tiempo real (cada sucursal es una instalación)

---

## 6. Requisitos Funcionales

### 6.1 Requisitos del Core

#### 6.1.1 Configuración Inicial

| ID       | Requisito                                                                    | Prioridad |
| -------- | ---------------------------------------------------------------------------- | --------- |
| RF-CO-01 | Wizard de setup en primer arranque (datos del negocio, primer usuario admin) | Alta      |
| RF-CO-02 | Configurar nombre visible del negocio (ej. "Espacio BIP")                    | Alta      |
| RF-CO-03 | Configurar datos fiscales (CUIT, condición, domicilio fiscal)                | Alta      |
| RF-CO-04 | Subir logo del negocio (se muestra en tickets y facturas)                    | Media     |
| RF-CO-05 | Cambiar configuración posterior sin reinstalar                               | Alta      |

#### 6.1.2 Unidades de Negocio

| ID       | Requisito                                                                                     | Prioridad |
| -------- | --------------------------------------------------------------------------------------------- | --------- |
| RF-BU-01 | Crear unidad de negocio con nombre, módulo asignado y numeración de facturas                  | Alta      |
| RF-BU-02 | Editar configuración de una unidad de negocio existente                                       | Alta      |
| RF-BU-03 | Activar/desactivar unidades de negocio (desactivar = no se puede operar, pero conserva datos) | Alta      |
| RF-BU-04 | Selector visible de unidad de negocio en la UI principal (el usuario elige en cuál trabaja)   | Alta      |
| RF-BU-05 | Restricción: no mezclar operaciones entre unidades (carrito, caja, reportes)                  | Alta      |
| RF-BU-06 | Cada unidad tiene numeración de facturas independiente                                        | Alta      |
| RF-BU-07 | Listar todas las unidades con indicador de estado (abierta/cerrada)                           | Media     |

#### 6.1.3 Gestión de Productos (core)

| ID       | Requisito                                                                     | Prioridad |
| -------- | ----------------------------------------------------------------------------- | --------- |
| RF-PR-01 | Crear, editar, eliminar (soft delete) productos                               | Alta      |
| RF-PR-02 | Los productos pertenecen a una unidad de negocio (no se comparten entre BUs)  | Alta      |
| RF-PR-03 | Campos base: nombre, descripción, categoría, precio base, costo, alícuota IVA | Alta      |
| RF-PR-04 | Búsqueda rápida por nombre o código                                           | Alta      |
| RF-PR-05 | Los módulos verticales pueden agregar campos específicos                      | Alta      |

#### 6.1.4 Control de Stock

| ID       | Requisito                                                  | Prioridad |
| -------- | ---------------------------------------------------------- | --------- |
| RF-ST-01 | Actualizar stock automáticamente al vender                 | Alta      |
| RF-ST-02 | Registrar movimientos (entrada, salida, ajuste) con motivo | Alta      |
| RF-ST-03 | Historial completo de movimientos filtrable                | Alta      |
| RF-ST-04 | Ajustes manuales con justificación obligatoria             | Alta      |
| RF-ST-05 | Alertas visuales de stock bajo o agotado                   | Alta      |
| RF-ST-06 | Stock por unidad de negocio (no compartido)                | Alta      |

#### 6.1.5 Punto de Venta

| ID        | Requisito                                                             | Prioridad |
| --------- | --------------------------------------------------------------------- | --------- |
| RF-POS-01 | Búsqueda rápida de productos con autocomplete                         | Alta      |
| RF-POS-02 | Escaneo por código de barras                                          | Media     |
| RF-POS-03 | Carrito con suma, modificación y eliminación de ítems                 | Alta      |
| RF-POS-04 | Aplicar descuentos por ítem o global (% o $)                          | Alta      |
| RF-POS-05 | Dividir pago entre múltiples medios                                   | Alta      |
| RF-POS-06 | Calcular vuelto automáticamente                                       | Alta      |
| RF-POS-07 | Imprimir ticket al finalizar la venta (con nombre de negocio visible) | Alta      |
| RF-POS-08 | Anular venta con motivo                                               | Media     |
| RF-POS-09 | Poner venta en espera (hold)                                          | Baja      |

#### 6.1.6 Facturación AFIP

| ID       | Requisito                                           | Prioridad |
| -------- | --------------------------------------------------- | --------- |
| RF-AF-01 | Integración con Web Service de AFIP                 | Alta      |
| RF-AF-02 | Generar factura tipo A, B o C según cliente         | Alta      |
| RF-AF-03 | Obtener y almacenar CAE                             | Alta      |
| RF-AF-04 | Notas de crédito/débito                             | Media     |
| RF-AF-05 | Cola de facturas pendientes (modo offline)          | Alta      |
| RF-AF-06 | Procesar cola automáticamente al recuperar conexión | Alta      |
| RF-AF-07 | Generar PDF de factura con branding del negocio     | Media     |
| RF-AF-08 | Reimprimir facturas anteriores                      | Media     |
| RF-AF-09 | Numeración independiente por unidad de negocio      | Alta      |

#### 6.1.7 Gestión de Clientes

| ID       | Requisito                                                             | Prioridad |
| -------- | --------------------------------------------------------------------- | --------- |
| RF-CL-01 | Registrar clientes con datos fiscales                                 | Alta      |
| RF-CL-02 | Consumidor final por defecto (sin datos)                              | Alta      |
| RF-CL-03 | Historial de compras por cliente (agregado entre unidades de negocio) | Media     |
| RF-CL-04 | Búsqueda rápida por nombre o documento                                | Alta      |
| RF-CL-05 | Los clientes se comparten entre unidades de negocio (base única)      | Media     |

#### 6.1.8 Caja Diaria

| ID       | Requisito                                                                                 | Prioridad |
| -------- | ----------------------------------------------------------------------------------------- | --------- |
| RF-CA-01 | Apertura con monto inicial por unidad de negocio                                          | Alta      |
| RF-CA-02 | Registrar ingresos y egresos manuales                                                     | Alta      |
| RF-CA-03 | Cierre con arqueo (esperado vs real)                                                      | Alta      |
| RF-CA-04 | Reporte Z al cierre                                                                       | Media     |
| RF-CA-05 | Prevenir operaciones con caja cerrada                                                     | Alta      |
| RF-CA-06 | Cada BU tiene su caja independiente (dos BUs pueden tener cajas abiertas simultáneamente) | Alta      |

#### 6.1.9 Reportes Core

| ID       | Requisito                                                                | Prioridad |
| -------- | ------------------------------------------------------------------------ | --------- |
| RF-RP-01 | Ventas por período filtrable por unidad de negocio                       | Alta      |
| RF-RP-02 | Productos más vendidos por unidad de negocio                             | Alta      |
| RF-RP-03 | Ventas por medio de pago                                                 | Media     |
| RF-RP-04 | Stock actual por categoría y por unidad de negocio                       | Alta      |
| RF-RP-05 | Exportar reportes a Excel                                                | Media     |
| RF-RP-06 | Dashboard con métricas clave consolidadas (toda la instalación o una BU) | Media     |

#### 6.1.10 Sincronización

| ID       | Requisito                                                             | Prioridad |
| -------- | --------------------------------------------------------------------- | --------- |
| RF-SY-01 | Detectar automáticamente conexión a internet                          | Alta      |
| RF-SY-02 | Sincronizar datos con Supabase cada N minutos                         | Alta      |
| RF-SY-03 | API REST pública de solo lectura para catálogo web (filtrable por BU) | Media     |
| RF-SY-04 | Resolver conflictos (last-write-wins)                                 | Alta      |
| RF-SY-05 | Log de sincronizaciones exitosas y fallidas                           | Media     |

### 6.2 Requisitos del módulo `retail-textil`

| ID       | Requisito                                                                               | Prioridad |
| -------- | --------------------------------------------------------------------------------------- | --------- |
| RF-RT-01 | Agregar variantes a productos (múltiples atributos: color, tamaño, material, fragancia) | Alta      |
| RF-RT-02 | Cada variante tiene SKU único, código de barras y stock propio                          | Alta      |
| RF-RT-03 | Imágenes por producto (múltiples)                                                       | Alta      |
| RF-RT-04 | Campos fiscales adicionales: composición, origen                                        | Baja      |
| RF-RT-05 | Variantes se cargan en lote al crear un producto                                        | Media     |

### 6.3 Requisitos del módulo `taller-medida`

| ID       | Requisito                                                                                           | Prioridad |
| -------- | --------------------------------------------------------------------------------------------------- | --------- |
| RF-TM-01 | Crear pedido con: cliente, descripción, fecha estimada de entrega                                   | Alta      |
| RF-TM-02 | Estados de pedido: presupuestado, confirmado, en confección, en prueba, listo, entregado, cancelado | Alta      |
| RF-TM-03 | Cobro fraccionado: seña al confirmar, saldo al entregar                                             | Alta      |
| RF-TM-04 | Ficha de medidas del cliente (personalizable)                                                       | Alta      |
| RF-TM-05 | Subir fotos de pruebas intermedias                                                                  | Media     |
| RF-TM-06 | Alertas de pedidos próximos a fecha de entrega                                                      | Media     |
| RF-TM-07 | Reporte de pedidos por estado y por fecha                                                           | Media     |

---

## 7. Requisitos No Funcionales

### 7.1 Performance

- **Tiempo de respuesta POS:** menor a 200ms para búsquedas locales
- **Tiempo de apertura de la app:** menor a 5 segundos
- **Capacidad:** hasta 50.000 productos totales, 100.000 ventas/año
- **Concurrencia:** 3 usuarios simultáneos sin degradación
- **Cambio entre unidades de negocio:** menor a 500ms

### 7.2 Disponibilidad

- Uptime 99.9% en horario comercial (funciona sin internet)
- Reinicio automático tras crash
- Backups automáticos cada 6 horas en local, diarios en nube

### 7.3 Seguridad

- Autenticación local con usuario/password (bcrypt, 12 rondas mínimo)
- Roles diferenciados (admin, cajero)
- Logs de auditoría para operaciones críticas
- Encriptación de credenciales AFIP en disco
- No exposición de datos sensibles al frontend

### 7.4 Usabilidad

- Interfaz optimizada para uso con teclado (atajos)
- Compatible con pantallas táctiles
- Fuente legible y botones grandes en el POS
- Mensajes de error claros y accionables
- Modo oscuro opcional
- Nombre del negocio visible en título de ventana

### 7.5 Mantenibilidad

- Código modular siguiendo principios SOLID
- **Separación clara core vs módulos:** el core jamás importa desde módulos
- Cobertura de tests unitarios mínima del 70%
- Documentación inline (JSDoc) en funciones públicas
- Logs estructurados para debugging
- Actualizaciones automáticas (electron-updater)

### 7.6 Compatibilidad

- **SO:** Windows 10+, macOS 11+, Linux (Ubuntu 22+)
- **Hardware mínimo:** 4GB RAM, 10GB disco, dual-core
- **Impresoras:** compatibles ESC/POS
- **Navegadores (catálogo web):** Chrome, Firefox, Safari, Edge últimas 2 versiones

### 7.7 Escalabilidad a nuevos rubros

- Agregar un nuevo módulo vertical NO debe requerir modificar el core
- Todo módulo nuevo vive en su propia carpeta bajo `src/modules/` y `server/modules/`
- Un módulo nuevo se integra definiendo: schema extra, rutas API, pantallas, hooks core que consume

---

## 8. Stack Tecnológico

### 8.1 Justificación

La elección prioriza: un solo lenguaje (TypeScript) para todo, comunidad grande, sin costos de licencia, type-safety para reducir bugs, y facilidad de mantenimiento por parte de desarrolladores con experiencia básica asistidos por IA.

### 8.2 Componentes

| Capa           | Tecnología              | Versión | Rol                          |
| -------------- | ----------------------- | ------- | ---------------------------- |
| App escritorio | Electron                | 28.x    | Contenedor multiplataforma   |
| UI             | React                   | 18.x    | Interfaz de usuario          |
| Lenguaje       | TypeScript              | 5.x     | Type-safety                  |
| Build          | Vite                    | 5.x     | Dev + empaquetado            |
| Estilos        | Tailwind CSS            | 3.x     | Diseño consistente           |
| Componentes UI | Shadcn/UI               | latest  | Componentes accesibles       |
| Estado global  | Zustand                 | 4.x     | Estado simple                |
| Formularios    | React Hook Form         | 7.x     | Formularios performantes     |
| Validación     | Zod                     | 3.x     | Schemas type-safe            |
| Backend        | Express.js              | 4.x     | API REST local               |
| DB local       | SQLite (better-sqlite3) | 9.x     | Base embebida                |
| ORM            | Drizzle ORM             | 0.29.x  | Queries type-safe            |
| DB nube        | Supabase (PostgreSQL)   | -       | Sincronización + API pública |
| AFIP           | @afipsdk/afip.js        | 2.x     | Facturación electrónica      |
| Impresión      | node-thermal-printer    | 4.x     | Tickets ESC/POS              |
| Testing unit   | Vitest                  | 1.x     | Tests rápidos                |
| Testing E2E    | Playwright              | 1.x     | Tests de UI                  |
| Empaquetado    | electron-builder        | 24.x    | Instaladores                 |

### 8.3 Servicios externos

| Servicio          | Uso                     | Costo                            |
| ----------------- | ----------------------- | -------------------------------- |
| AFIP Web Services | Facturación electrónica | Gratuito                         |
| Supabase          | BD nube + API REST      | Free tier (500MB, 2GB bandwidth) |
| GitHub            | Repo + releases         | Gratuito                         |

---

## 9. Arquitectura Técnica

### 9.1 Arquitectura de tres capas

Ejecutándose todo en la misma notebook:

1. **Electron main process:** ventanas, IPC, auto-updates
2. **React renderer:** interfaz de usuario
3. **Express local server:** lógica de negocio + acceso a datos

Comunicación React ↔ Express por HTTP REST en `localhost:3001`. Esto permite a futuro exponer selectivamente endpoints para el catálogo web sin reescribir nada.

### 9.2 Separación core vs módulos

```
┌───────────────────────────────────────────┐
│              Frontend (React)             │
│  src/core/           src/modules/         │
│  ├── pos/            ├── retail-textil/   │
│  ├── stock/          ├── taller-medida/   │
│  ├── caja/           └── ...              │
│  └── ...                                  │
└───────────────────────────────────────────┘
┌───────────────────────────────────────────┐
│           Backend (Express)               │
│  server/core/        server/modules/      │
│  ├── products/       ├── retail-textil/   │
│  ├── sales/          ├── taller-medida/   │
│  └── ...             └── ...              │
└───────────────────────────────────────────┘
┌───────────────────────────────────────────┐
│              SQLite local                 │
│  Tablas core + tablas de cada módulo      │
└───────────────────────────────────────────┘
```

**Reglas inviolables:**

- `core/*` **nunca** importa desde `modules/*`
- Un módulo puede importar desde `core/*` pero solo de interfaces públicas
- Un módulo **nunca** importa desde otro módulo
- Si dos módulos necesitan compartir algo, ese algo sube al core

### 9.3 Puntos de extensión del core

El core expone "hooks" (no los de React, sino puntos de extensión) que los módulos pueden usar:

- **Product extensions:** campos adicionales en el schema de productos
- **Sale extensions:** datos adicionales en ventas (ej. fecha de entrega del `taller-medida`)
- **Custom screens:** pantallas propias registradas en el router
- **Custom reports:** reportes adicionales que aparecen en el módulo de reportes
- **Business rules hooks:** reglas de negocio que se ejecutan antes/después de acciones core

### 9.4 Flujos críticos

**Apertura de la app:**

1. Electron main arranca → carga configuración desde `electron-store`
2. Si no hay config: muestra wizard de setup inicial
3. Si hay config: arranca server Express → abre ventana → muestra login
4. Usuario ingresa → se consulta qué BUs están activas → usuario elige una
5. Se carga la UI con los módulos de esa BU

**Venta en BU "Front" de Espacio BIP (módulo retail-textil):**

1. Usuario escanea producto → busca por SKU en DB filtrando por BU activa
2. Agrega al carrito (Zustand state local)
3. Confirma → se inicia transacción SQL:
   - Inserta `sale` con `business_unit_id`
   - Inserta `sale_items` (con snapshot de variantes)
   - Descuenta stock en `product_variants`
   - Registra `stock_movement`
4. Si hay internet: AFIP → CAE → guarda
5. Si no: encola en `pending_invoices`
6. Imprime ticket con "Espacio BIP" como nombre del negocio

**Cambio de BU:**

1. Usuario clickea selector de BU
2. Si hay caja abierta en BU actual sin cerrar: alerta ("¿seguro? caja sigue abierta")
3. Si confirma: cambia `activeBusinessUnitId` en store global
4. UI recarga solo las partes que dependen de BU (productos, caja, reportes)
5. Los módulos activos en la nueva BU se cargan dinámicamente en el menú

### 9.5 Principios arquitectónicos

- **Offline-first:** la nube nunca es crítica
- **Single source of truth local:** SQLite es la verdad; la nube es réplica
- **Fail-safe:** errores de sync nunca bloquean operación local
- **Separation of concerns:** UI no sabe de SQL, services no saben de HTTP
- **Type-safe end-to-end:** TypeScript + Zod + Drizzle
- **Core-first:** el core es sagrado; los módulos se adaptan a él, no al revés

---

## 10. Modelo de Datos

### 10.1 Entidades del Core

| Entidad                 | Descripción                                             | Relaciones                                             |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `installation_config`   | Configuración global (nombre negocio, CUIT, etc.)       | Singleton                                              |
| `business_units`        | Unidades de negocio configuradas                        | Tiene muchas `sales`, `cash_registers`, `products`     |
| `business_unit_modules` | Asignación de módulos a BUs                             | Muchos a muchos                                        |
| `users`                 | Usuarios del sistema                                    | Tiene muchas `sales`, `cash_registers`                 |
| `products`              | Productos (campos base)                                 | Pertenece a `business_unit`                            |
| `stock_items`           | Stock por producto (unidad o por variante según módulo) | Pertenece a `products`                                 |
| `stock_movements`       | Movimientos de stock                                    | Pertenece a `stock_items`                              |
| `sales`                 | Ventas/tickets                                          | Pertenece a `business_unit`, tiene muchos `sale_items` |
| `sale_items`            | Líneas de venta                                         | Pertenece a `sales`                                    |
| `customers`             | Clientes (compartidos entre BUs)                        | Tiene muchas `sales`                                   |
| `cash_registers`        | Sesiones de caja                                        | Pertenece a `business_unit`                            |
| `cash_movements`        | Movimientos de caja                                     | Pertenece a `cash_register`                            |
| `pending_invoices`      | Cola AFIP offline                                       | Pertenece a `sales`                                    |
| `sync_logs`             | Log de sincronización                                   | Sin relaciones                                         |

### 10.2 Entidades de módulos

**Módulo `retail-textil`:**

| Entidad            | Descripción                                        |
| ------------------ | -------------------------------------------------- |
| `product_variants` | Variantes de un producto (color, tamaño, material) |
| `product_images`   | Imágenes de productos                              |

**Módulo `taller-medida`:**

| Entidad                 | Descripción                   |
| ----------------------- | ----------------------------- |
| `custom_orders`         | Pedidos a medida              |
| `custom_order_payments` | Pagos parciales (seña, saldo) |
| `customer_measurements` | Medidas del cliente           |
| `custom_order_photos`   | Fotos de pruebas              |

### 10.3 Reglas de integridad

- Toda operación que modifique stock debe generar un registro en `stock_movements`
- Las ventas son inmutables una vez confirmadas (solo se pueden anular, no editar)
- Los ajustes de stock requieren motivo obligatorio
- Los precios históricos de venta se guardan en `sale_items` (snapshot)
- Los productos no se eliminan físicamente (soft delete con `is_active`)
- **Toda tabla transaccional tiene `business_unit_id`** (sales, stock, cash, etc.). Productos también. Clientes NO (son globales).
- Un módulo solo puede leer/escribir en sus propias tablas + las tablas core que el core expone

### 10.4 Sincronización con la nube

Se sincronizan a Supabase:

| Tabla local           | Tabla nube         | Dirección | Filtro                                |
| --------------------- | ------------------ | --------- | ------------------------------------- |
| `installation_config` | `installations`    | push      | Una fila por instalación              |
| `business_units`      | `business_units`   | push      | Con `installation_id`                 |
| `products`            | `products`         | push      | Con `business_unit_id`                |
| `product_variants`    | `product_variants` | push      | Solo si módulo `retail-textil` activo |
| `stock_items`         | `stock_items`      | push      | Con `business_unit_id`                |
| `sales` (resumen)     | `sales_summary`    | push      | Con `business_unit_id`                |

Las tablas de caja, logs internos, credenciales y pagos parciales **nunca** van a la nube.

---

## 11. Módulos Verticales

### 11.1 Módulo `retail-general` (mínimo viable)

**Para qué:** comercios simples que solo necesitan "vender productos con stock".

**Características:**

- Productos con precio/costo/categoría
- Stock por unidad (sin variantes)
- Sin imágenes
- Lo mínimo para operar

### 11.2 Módulo `retail-textil`

**Para qué:** blanquería, decoración, aromas, ropa, calzado, cualquier producto con variantes.

**Agrega:**

- Variantes múltiples (color, tamaño, material, fragancia) configurables
- SKU único y código de barras por variante
- Imágenes de productos (múltiples)
- Stock por variante (no por producto)
- Campos fiscales extra (composición, origen)

### 11.3 Módulo `taller-medida`

**Para qué:** diseño de vestidos, sastrería, tapicería, mueblería a medida, cualquier negocio de "hecho a medida con fecha de entrega".

**Agrega:**

- Concepto de "Pedido" con estados (presupuestado, confirmado, en confección, etc.)
- Seña + saldo con cobros parciales
- Ficha de medidas del cliente
- Fotos de pruebas intermedias
- Alertas de entregas próximas
- Reportes específicos de taller

**No usa stock tradicional:** los productos son únicos y a medida.

### 11.4 Módulos futuros (no en fase 1)

- **`gastronomia`:** mesas, comandas, cocina, productos por horario
- **`ferreteria`:** unidades de medida variables, stock por sucursal
- **`libreria`:** editorial, autor, ISBN
- **`veterinaria`:** ficha de mascota, vacunas, historial médico
- **`kiosko`:** productos rápidos, sin seguimiento detallado

---

## 12. Integraciones Externas

### 12.1 AFIP (Facturación Electrónica)

**Tipo:** SOAP Web Services
**SDK:** @afipsdk/afip.js
**Certificados:** Clave fiscal nivel 3 + certificado digital
**Doc oficial:** https://www.afip.gob.ar/ws/

**Servicios:**

- `wsfe` (Facturación Electrónica)
- `wsfev1` (v1)
- Consulta de padrón de contribuyentes

**Notas:**

- Certificados se renuevan cada 2 años
- Cada BU puede tener distinta numeración (distintos puntos de venta AFIP)
- Entorno de homologación para testing

### 12.2 Supabase

**Tipo:** REST API + PostgREST
**SDK:** @supabase/supabase-js
**Plan:** Free tier

**Uso:**

- Réplica de productos y stock (catálogo web)
- Réplica de ventas (resumen)
- API pública read-only para catálogo web

**Límites free tier:**

- 500 MB de DB
- 2 GB de bandwidth mensual

### 12.3 Impresora Térmica

**Tipo:** ESC/POS
**Librería:** node-thermal-printer
**Conexión:** USB o red (IP)

**Modelos compatibles:**

- Epson TM-T20III
- Xprinter XP-58III
- Cualquiera con soporte ESC/POS

---

## 13. Plan de Desarrollo

### 13.1 Fases y duración estimada

#### Etapa 1 — Core funcional

| Fase                                           | Duración  | Entregable                                      |
| ---------------------------------------------- | --------- | ----------------------------------------------- |
| Fase 0: Setup y arquitectura base              | 1 semana  | Proyecto configurado, hello-world end-to-end    |
| Fase 1: Business Units + configuración inicial | 1 semana  | Wizard de setup, gestión de BUs, selector de BU |
| Fase 2: CRUD Productos y Stock (core)          | 2 semanas | Productos base + stock sin variantes            |
| Fase 3: POS básico                             | 2 semanas | Ventas completas con ticket térmico             |
| Fase 4: Caja y Clientes                        | 1 semana  | Caja diaria + base de clientes                  |
| Fase 5: Facturación AFIP                       | 2 semanas | Factura electrónica funcionando                 |
| Fase 6: Modo offline y cola de sync            | 1 semana  | Resiliencia sin internet validada               |

**Hito Etapa 1:** al final de Fase 6, se puede abrir un comercio simple usando solo el core + módulo `retail-general`.

#### Etapa 2 — Módulos verticales para Espacio BIP

| Fase                                  | Duración  | Entregable                                        |
| ------------------------------------- | --------- | ------------------------------------------------- |
| Fase 7: Módulo `retail-textil`        | 2 semanas | Variantes, imágenes, operativo en BU "Front"      |
| Fase 8: Módulo `taller-medida`        | 2 semanas | Pedidos, medidas, estados, operativo en BU "Back" |
| Fase 9: Reportes, Dashboard, Supabase | 2 semanas | Métricas, exportación, catálogo web               |

**Hito Etapa 2:** Espacio BIP operativo con sus dos unidades de negocio.

#### Etapa 3 — Producto comercializable

| Fase                                       | Duración  | Entregable                 |
| ------------------------------------------ | --------- | -------------------------- |
| Fase 10: Módulo de Proveedores y simulador | 2 semanas | Comparador y ROI           |
| Fase 11: Pulido, testing, instaladores     | 2 semanas | Instaladores Win/Mac/Linux |

**Total estimado:** ~20 semanas (5 meses a dedicación parcial con agente de IA).

### 13.2 Entregables por fase

Cada fase debe entregar:

- Código funcional commiteado
- Tests unitarios de la lógica nueva
- Test manual documentado de los flujos principales
- Actualización de este documento si hubo cambios
- Demo en video corto del flujo completo

### 13.3 Orden obligatorio de implementación

El orden NO es negociable por dos razones:

1. **Los módulos dependen del core.** No tiene sentido arrancar por `retail-textil` antes de tener productos y stock en el core.
2. **Los módulos necesitan BUs configuradas.** No tiene sentido desarrollar módulos si no se sabe a qué BU asignarlos.

**Regla:** no empezar Etapa 2 hasta que Etapa 1 esté completa y validada manualmente.

---

## 14. Criterios de Aceptación

### 14.1 Generales

El sistema se acepta cuando:

- Todos los RF de prioridad Alta del core están implementados y testeados
- Los módulos `retail-textil` y `taller-medida` cumplen sus RF Altos
- Cobertura de tests >= 70% en servicios
- Funciona sin internet durante al menos 8 horas continuas sin errores
- Sincroniza correctamente al recuperar conexión (sin pérdida de datos)
- El instalador funciona en Windows, macOS y Linux sin pasos manuales complejos
- Documentación de usuario cubre los 10 flujos principales

### 14.2 Criterios por flujo crítico

**Setup inicial:** un usuario sin conocimiento técnico puede configurar una instalación desde cero (datos del negocio + 2 BUs + admin) en menos de 10 minutos.

**Venta simple:** un cajero completa una venta de 3 productos con factura B en menos de 60 segundos, incluyendo búsqueda, cobro y impresión.

**Cambio de BU:** el usuario cambia de BU "Front" a BU "Back" sin reiniciar la app; la UI refleja el cambio en menos de 500ms.

**Modo offline:** tras 4 horas sin internet, la app opera sin errores visibles; al reconectar, todas las facturas pendientes se procesan en menos de 2 minutos.

**Pedido a medida (taller-medida):** registrar un nuevo pedido de vestido con cliente, descripción, medidas y seña en menos de 2 minutos.

**Sincronización:** un cambio de stock local aparece en el catálogo web de Supabase en menos de 5 minutos.

---

## 15. Glosario

| Término               | Definición                                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| POS                   | Point of Sale (punto de venta)                                                  |
| Core                  | Conjunto de features comunes a todo comercio, siempre presentes                 |
| Módulo vertical       | Paquete de features específicas de un rubro (ej. `retail-textil`)               |
| Business Unit (BU)    | Unidad de negocio: un espacio comercial independiente dentro de una instalación |
| Instalación           | Una copia de LocalPosSoftware corriendo en una notebook                         |
| SKU                   | Stock Keeping Unit (identificador único de variante)                            |
| CAE                   | Código de Autorización Electrónico (emitido por AFIP)                           |
| AFIP                  | Administración Federal de Ingresos Públicos (organismo fiscal argentino)        |
| IVA                   | Impuesto al Valor Agregado (21% general en Argentina)                           |
| Monotributo           | Régimen fiscal simplificado argentino                                           |
| Responsable Inscripto | Contribuyente del régimen general de IVA                                        |
| Consumidor Final      | Cliente sin condición fiscal declarada                                          |
| Arqueo                | Conteo físico de caja al cierre                                                 |
| Offline-first         | Arquitectura que funciona sin conexión permanente                               |
| ORM                   | Object-Relational Mapping                                                       |
| IPC                   | Inter-Process Communication (entre main y renderer de Electron)                 |
| CRUD                  | Create, Read, Update, Delete                                                    |
| DTO                   | Data Transfer Object                                                            |
| ROI                   | Return on Investment                                                            |
| Seña                  | Pago parcial adelantado, común en pedidos a medida                              |

---

## 📝 Control de Versiones

| Versión | Fecha      | Cambios                                                                                                                                                                   |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Abril 2026 | Versión inicial                                                                                                                                                           |
| 2.0     | Abril 2026 | Reestructurado como producto LocalPosSoftware modular. Introducción de Business Units y módulos verticales. Separación core vs módulos. Primera instalación: Espacio BIP. |

---

**Fin del documento de especificación.**
