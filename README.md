# 🏷️ LocalPosSoftware

Sistema POS modular, multiplataforma y offline-first para comercios minoristas.

**Un producto, múltiples rubros.** El core cubre la operación común a cualquier comercio (ventas, stock, caja, facturación). Los **módulos verticales** se activan según el rubro del negocio: retail textil, taller a medida, gastronomía, ferretería, etc.

---

## 📌 Sobre el nombre

- **Producto:** LocalPosSoftware
- **Repositorio:** `local-pos-software`
- **Namespace interno:** `localpos`
- **Nombre visible al usuario:** configurable por instalación (ej. "Espacio BIP", "Ferretería Don Juan", etc.)

---

## 🏢 Primera instalación: Espacio BIP

La primera instalación productiva de LocalPosSoftware es **Espacio BIP**, un local en Landeta (Santa Fe, Argentina) con dos unidades de negocio:

1. **Front:** Blanquería, Decoración y Aromas (módulo `retail-textil`)
2. **Back:** Diseño de vestidos a medida (módulo `taller-medida`)

Esto sirve como caso de prueba real y como validación de que la arquitectura modular funciona.

---

## 📖 Documentación del Proyecto

Leer en este orden antes de trabajar:

| Documento                  | Propósito                                     | Audiencia                                    |
| -------------------------- | --------------------------------------------- | -------------------------------------------- |
| `README.md` (este archivo) | Cómo arrancar, comandos útiles, visión rápida | Todos                                        |
| `PROJECT.md`               | Especificación completa del producto          | Desarrolladores, agentes de IA, stakeholders |
| `AGENT_INSTRUCTIONS.md`    | Reglas de código y flujo de trabajo           | Desarrolladores, agentes de IA               |

---

## 🚀 Primeros pasos

### Prerrequisitos

- Node.js 20 LTS o superior
- npm 10 o superior
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/<tu-usuario>/local-pos-software.git
cd local-pos-software

# Instalar dependencias
npm install

# Copiar y editar las variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de AFIP y Supabase

# Correr las migraciones de la base de datos
npm run db:migrate

# Cargar datos de prueba (opcional, útil para desarrollo)
npm run db:seed

# Iniciar en modo desarrollo
npm run dev
```

### Setup inicial al primer arranque

La primera vez que se inicia la app (sin base de datos existente), se ejecuta un wizard de configuración:

1. **Datos del negocio:** nombre visible (ej. "Espacio BIP"), CUIT, logo, dirección
2. **Primera unidad de negocio:** nombre (ej. "Front"), categoría fiscal, numeración de facturas
3. **Módulo vertical:** elegir qué módulo aplica a esta unidad de negocio (ej. `retail-textil`)
4. **Usuario admin:** crear el primer usuario con rol administrador

Desde ese punto, el admin puede crear más unidades de negocio y asignarles sus módulos.

---

## 🧩 Arquitectura modular

### Core (siempre presente)

El código base cubre lo que tiene todo comercio:

- Gestión de productos y stock
- Punto de venta (POS)
- Caja diaria
- Clientes
- Facturación electrónica AFIP
- Reportes básicos
- Sincronización con la nube

### Módulos verticales (activables por unidad de negocio)

Cada unidad de negocio tiene asignado **uno** de estos módulos al crearla:

| Módulo           | Para qué rubro                 | Qué agrega                                                                  |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `retail-general` | Cualquier comercio básico      | Lo mínimo, sin extras                                                       |
| `retail-textil`  | Blanquería, deco, aromas, ropa | Variantes (color, tamaño, material), catálogo web con imágenes              |
| `taller-medida`  | Diseño a medida, sastrería     | Pedidos con seña, fechas de entrega, toma de medidas, estados de confección |
| `gastronomia`    | Restó, bar, rotisería          | Mesas/comandas, cocina, productos por hora del día                          |
| `ferreteria`     | Ferretería, materiales         | Unidades de medida (metros, kilos), stock por sucursal                      |

Los módulos se desarrollan incrementalmente. La primera versión del producto incluye `retail-general`, `retail-textil` y `taller-medida` (los que necesita Espacio BIP).

### Unidades de negocio (Business Units)

Una instalación de LocalPosSoftware puede tener **una o varias unidades de negocio**. Cada una:

- Tiene su propio stock (no se comparten productos entre unidades)
- Tiene su propia caja diaria
- Tiene su propia numeración de facturas
- Tiene su módulo vertical asignado
- Aparece como selector visible en la UI (el usuario elige en qué unidad está trabajando)

Comparten entre sí:

- Usuarios del sistema
- Configuración AFIP (puede ser el mismo CUIT o distintos)
- Branding global

---

## 🛠️ Comandos disponibles

### Desarrollo

| Comando                | Descripción                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm run dev`          | Inicia la app completa en modo desarrollo (backend + frontend + electron) |
| `npm run dev:server`   | Inicia solo el backend Express                                            |
| `npm run dev:renderer` | Inicia solo el frontend React                                             |

### Base de datos

| Comando               | Descripción                                 |
| --------------------- | ------------------------------------------- |
| `npm run db:generate` | Genera una nueva migration desde el schema  |
| `npm run db:migrate`  | Aplica las migrations pendientes            |
| `npm run db:studio`   | Abre Drizzle Studio para inspeccionar la DB |
| `npm run db:seed`     | Carga datos de ejemplo                      |
| `npm run db:reset`    | Borra la DB y vuelve a migrar (solo dev)    |

### Testing

| Comando                 | Descripción                     |
| ----------------------- | ------------------------------- |
| `npm test`              | Corre todos los tests unitarios |
| `npm run test:watch`    | Tests en modo watch             |
| `npm run test:coverage` | Reporte de cobertura            |
| `npm run test:e2e`      | Tests end-to-end con Playwright |

### Calidad de código

| Comando                | Descripción                    |
| ---------------------- | ------------------------------ |
| `npm run lint`         | Corre ESLint                   |
| `npm run lint:fix`     | ESLint con auto-fix            |
| `npm run format`       | Formatea con Prettier          |
| `npm run format:check` | Verifica formato sin modificar |
| `npm run typecheck`    | Verifica tipos de TypeScript   |

### Build y distribución

| Comando              | Descripción                    |
| -------------------- | ------------------------------ |
| `npm run build`      | Compila la app para producción |
| `npm run dist:win`   | Genera instalador para Windows |
| `npm run dist:mac`   | Genera instalador para macOS   |
| `npm run dist:linux` | Genera paquete para Linux      |

---

## 📁 Estructura del proyecto

```
local-pos-software/
├── electron/          # Main process de Electron
├── src/               # Frontend React + TypeScript
│   ├── components/    # Componentes reutilizables
│   ├── core/          # Features del core (POS, stock, caja, etc.)
│   ├── modules/       # Módulos verticales (retail-textil, taller-medida, etc.)
│   ├── lib/           # Utilidades compartidas
│   └── types/         # Tipos globales
├── server/            # Backend Express + SQLite
│   ├── db/            # Schemas y migrations
│   ├── core/          # Servicios y rutas del core
│   ├── modules/       # Servicios y rutas de módulos verticales
│   └── repositories/  # Acceso a datos
├── shared/            # Tipos y constantes compartidas
├── tests/             # Tests unitarios y E2E
└── assets/            # Íconos, imágenes, fuentes
```

Ver `AGENT_INSTRUCTIONS.md` sección 4 para la estructura completa y reglas de ubicación.

---

## 🧑‍💻 Trabajando con un agente de IA

Este proyecto está diseñado para ser desarrollado con asistencia de agentes de IA (GitHub Copilot, Cursor, Claude Code, etc.).

### Prompt inicial para cualquier tarea

```
Leé AGENT_INSTRUCTIONS.md y PROJECT.md antes de trabajar.

Tarea: [descripción de la tarea]

Requisitos funcionales relacionados: [RF-XX, RF-YY]
Módulo afectado: [core | retail-textil | taller-medida | etc.]

Por favor:
1. Primero presentame un plan con los archivos que vas a crear o modificar
2. Esperá mi confirmación antes de codear
3. Seguí las convenciones de AGENT_INSTRUCTIONS.md
4. Al terminar, dame el checklist de la sección 13 completado
```

Ver `AGENT_INSTRUCTIONS.md` sección 12 para más plantillas.

### Reglas importantes

- Identificar siempre si una tarea es **core** o **modular** antes de empezar
- No agregar dependencias sin justificación
- Seguir el orden de implementación: schema → service → controller → UI
- Siempre validar inputs con Zod
- Siempre testear la lógica de negocio
- Seguir Conventional Commits

---

## 🗺️ Roadmap

El desarrollo está dividido en fases. Ver `PROJECT.md` sección 11 para el detalle.

### Etapa 1 — Core funcional

- [ ] **Fase 0:** Setup y arquitectura base
- [ ] **Fase 1:** Modelo de Business Units + configuración inicial
- [ ] **Fase 2:** CRUD de productos y control de stock (core)
- [ ] **Fase 3:** POS básico
- [ ] **Fase 4:** Caja diaria y gestión de clientes
- [ ] **Fase 5:** Facturación electrónica AFIP
- [ ] **Fase 6:** Modo offline con cola de sincronización

### Etapa 2 — Primeros módulos verticales

- [ ] **Fase 7:** Módulo `retail-textil` (para el Front de Espacio BIP)
- [ ] **Fase 8:** Módulo `taller-medida` (para el Back de Espacio BIP)
- [ ] **Fase 9:** Dashboard, reportes y sincronización con Supabase

### Etapa 3 — Producto comercial

- [ ] **Fase 10:** Módulo de proveedores y simulador de compras
- [ ] **Fase 11:** Pulido, testing, instaladores
- [ ] **Fase 12+:** Nuevos módulos verticales (gastronomía, ferretería, etc.)

---

## 🧪 Cómo contribuir

1. Crear una rama desde `develop`: `git checkout -b feature/nombre-del-feature`
2. Hacer los cambios siguiendo `AGENT_INSTRUCTIONS.md`
3. Correr tests y linter: `npm test && npm run lint`
4. Commit siguiendo Conventional Commits
5. Abrir un pull request a `develop`

---

## 🔒 Variables de entorno

Ver `.env.example` para la lista completa. Las más importantes:

```env
NODE_ENV=development
SERVER_PORT=3001

# AFIP
AFIP_CUIT=20123456789
AFIP_CERT_PATH=./certs/certificate.crt
AFIP_KEY_PATH=./certs/private.key
AFIP_ENVIRONMENT=testing

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

⚠️ **Nunca commitear el archivo `.env`.** Ya está en `.gitignore`.

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.

---

**Versión del README:** 2.0
**Última actualización:** Abril 2026
