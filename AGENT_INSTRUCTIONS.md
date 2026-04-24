# 🤖 INSTRUCCIONES PARA EL AGENTE DE IA

## Guía operativa para desarrollo de LocalPosSoftware

---

**Producto:** LocalPosSoftware
**Repositorio:** `local-pos-software`
**Documento relacionado:** `PROJECT.md` (especificación completa)
**Dirigido a:** Agentes de IA (GitHub Copilot, Cursor, Claude Code, etc.) trabajando en VS Code
**Versión:** 2.0

---

## 📑 Tabla de Contenidos

1. [Cómo usar este documento](#1-cómo-usar-este-documento)
2. [Principios de trabajo](#2-principios-de-trabajo)
3. [Core vs Módulos (regla de oro)](#3-core-vs-módulos-regla-de-oro)
4. [Stack y versiones exactas](#4-stack-y-versiones-exactas)
5. [Estructura de carpetas obligatoria](#5-estructura-de-carpetas-obligatoria)
6. [Convenciones de código](#6-convenciones-de-código)
7. [Business Units: cómo afectan el código](#7-business-units-cómo-afectan-el-código)
8. [Flujo de trabajo por tarea](#8-flujo-de-trabajo-por-tarea)
9. [Patrones obligatorios](#9-patrones-obligatorios)
10. [Testing](#10-testing)
11. [Manejo de errores](#11-manejo-de-errores)
12. [Seguridad](#12-seguridad)
13. [Git y commits](#13-git-y-commits)
14. [Plantillas de prompts](#14-plantillas-de-prompts)
15. [Checklist antes de marcar una tarea como completa](#15-checklist-antes-de-marcar-una-tarea-como-completa)
16. [Errores comunes a evitar](#16-errores-comunes-a-evitar)

---

## 1. Cómo usar este documento

### 1.1 Para el desarrollador humano

Al pedirle una tarea al agente, siempre hacer referencia a este documento:

> "Leé `AGENT_INSTRUCTIONS.md` y `PROJECT.md` antes de trabajar. Implementá la tarea siguiendo estrictamente las convenciones."

### 1.2 Para el agente de IA

Antes de escribir código, leer completamente:

1. Este archivo (`AGENT_INSTRUCTIONS.md`)
2. `PROJECT.md` (especificación)
3. `README.md` (comandos y contexto)

**Si hay conflicto entre esta guía y código existente, detenerse y preguntar.** No inventar soluciones que contradigan la guía.

**Primera acción siempre:** identificar si la tarea afecta al **core** o a un **módulo vertical** (ver sección 3).

---

## 2. Principios de trabajo

### 2.1 KISS (Keep It Simple)

Siempre la solución más simple que resuelva el problema. Si el código necesita muchos comentarios para explicarse, es demasiado complejo.

### 2.2 YAGNI (You Aren't Gonna Need It)

No agregar features, abstracciones ni "puntos de extensión" que no están en requisitos. Nada "por las dudas".

**Excepción:** los puntos de extensión del core para módulos están explícitamente planeados en `PROJECT.md`. Esos sí se implementan aunque no se usen todavía.

### 2.3 DRY (Don't Repeat Yourself)

Evitar duplicar lógica. Pero no abstraer prematuramente: regla de tres (se abstrae en la tercera repetición, no en la segunda).

### 2.4 Código para humanos

Nombres descriptivos > brevedad. `calculateSaleSubtotalForBusinessUnit` es mejor que `calc`.

### 2.5 Fallar temprano y en voz alta

Validar inputs en el borde (HTTP, IPC, UI). Errores claros e inmediatos; nunca datos inválidos llegando a la DB.

### 2.6 Single Responsibility

Cada función/clase/módulo hace una cosa. Si necesitás "y" para describirla, separala.

### 2.7 Cambios mínimos

Cambiar lo mínimo necesario para la tarea. No refactorizar código aledaño "de paso" sin pedido explícito.

### 2.8 Core sagrado

El core no se modifica para satisfacer necesidades de un módulo. Si un módulo necesita algo del core, se diseña un punto de extensión genérico, no un hack específico para ese módulo. Ver sección 3.

---

## 3. Core vs Módulos (regla de oro)

**Esta es la decisión arquitectónica más importante del proyecto. Leela antes de escribir cualquier código.**

### 3.1 ¿Qué es el core?

El **core** es todo lo que cualquier comercio necesita, sin importar su rubro:

- Gestión de usuarios
- Gestión de Business Units (BUs)
- Productos (campos básicos: nombre, precio, costo, categoría, stock)
- Stock y movimientos
- POS (carrito, pagos, ticket)
- Caja diaria
- Clientes
- Facturación AFIP
- Reportes básicos
- Configuración global

### 3.2 ¿Qué es un módulo vertical?

Un **módulo vertical** es un paquete de features específicas de un rubro que se conecta al core:

- `retail-general` — mínimo viable
- `retail-textil` — blanquería, deco, aromas, ropa
- `taller-medida` — confección a medida, sastrería
- `gastronomia` — restaurantes, bares (futuro)
- `ferreteria` — ferretería, materiales (futuro)

Cada módulo vive en `src/modules/{nombre}/` y `server/modules/{nombre}/`.

### 3.3 Reglas inviolables

#### Regla 1: `core/*` NUNCA importa desde `modules/*`

```typescript
// ❌ PROHIBIDO: el core importa un módulo
// src/core/products/ProductForm.tsx
import { VariantSelector } from '@/modules/retail-textil/components/VariantSelector'; // ❌

// ✅ CORRECTO: el core expone un punto de extensión, el módulo lo usa
// src/core/products/ProductForm.tsx
import { useProductExtensions } from '@/core/extensions';
export function ProductForm() {
  const extensions = useProductExtensions(); // cualquier módulo puede registrarse
  return (
    <form>
      {/* campos base */}
      {extensions.map(Ext => <Ext key={Ext.name} />)}
    </form>
  );
}
```

#### Regla 2: Un módulo NUNCA importa desde otro módulo

```typescript
// ❌ PROHIBIDO
// src/modules/retail-textil/...
import { something } from '@/modules/taller-medida/...'; // ❌

// ✅ CORRECTO: si dos módulos necesitan algo común, sube al core
// src/core/lib/common-utility.ts
```

#### Regla 3: Un módulo solo importa del core mediante su API pública

El core define qué expone. El módulo no puede importar archivos internos del core.

```typescript
// ✅ CORRECTO
import { registerProductExtension, useBusinessUnit } from '@/core/api';

// ❌ PROHIBIDO
import { internalHelper } from '@/core/products/internals/helper';
```

#### Regla 4: El core debe funcionar sin ningún módulo activo

Si se desactivan todos los módulos, el core debe seguir siendo usable (aunque funcionalmente limitado).

#### Regla 5: Los tipos compartidos van en `shared/`

Si un tipo lo usan core y módulos, va en `shared/types.ts`. Si solo lo usa el core, va en `src/core/types.ts`. Si solo lo usa un módulo, va en `src/modules/{modulo}/types.ts`.

### 3.4 Cómo saber si una tarea es core o modular

Antes de codear, responder:

- **¿Esto lo necesita cualquier comercio, sin importar el rubro?** → Core
- **¿Esto solo tiene sentido para un tipo de negocio específico?** → Módulo
- **¿Ya existe en el core y solo necesito agregarle un campo para mi rubro?** → Extensión desde un módulo (no modificar el core)

**Casos ambiguos:** preguntar al usuario antes de decidir.

### 3.5 Puntos de extensión del core (qué expone)

El core expone los siguientes puntos de extensión que los módulos pueden usar:

| Punto de extensión         | Qué permite                                              |
| -------------------------- | -------------------------------------------------------- |
| `registerProductExtension` | Agregar campos y lógica a productos (ej. variantes)      |
| `registerSaleExtension`    | Agregar datos a ventas (ej. fecha de entrega del taller) |
| `registerScreen`           | Registrar pantallas propias del módulo en el router      |
| `registerReport`           | Agregar reportes al módulo de reportes                   |
| `registerMenuItem`         | Agregar ítems al menú lateral                            |
| `useBusinessUnit`          | Hook para obtener la BU activa                           |
| `useInstallationConfig`    | Hook para obtener config global (nombre negocio, etc.)   |

Estos se implementan en Fase 1 y se van usando desde Fase 7 en adelante.

---

## 4. Stack y versiones exactas

```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.3.0",
    "express": "^4.19.0",
    "better-sqlite3": "^9.4.0",
    "drizzle-orm": "^0.29.0",
    "@afipsdk/afip.js": "^2.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "node-cron": "^3.0.3",
    "electron-store": "^8.1.0",
    "electron-updater": "^6.1.0",
    "node-thermal-printer": "^4.4.0",
    "lucide-react": "^0.383.0",
    "date-fns": "^3.0.0",
    "nanoid": "^5.0.4"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron-builder": "^24.9.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2",
    "playwright": "^1.41.0",
    "drizzle-kit": "^0.20.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0"
  }
}
```

### 4.1 Reglas para dependencias

- No agregar dependencias nuevas sin justificación escrita
- Preferir utilidades estándar de Node/JS antes que paquetes externos
- Nada de librerías UI adicionales (Shadcn/UI + Tailwind + Lucide alcanzan)
- Un módulo vertical **no puede agregar dependencias al package.json del proyecto principal**. Si un módulo realmente necesita algo, se discute y se agrega al package.json global.

---

## 5. Estructura de carpetas obligatoria

```
local-pos-software/
├── electron/                    # Main process de Electron
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
├── src/                         # Renderer (React)
│   ├── components/              # Componentes UI genéricos (Shadcn)
│   │   ├── ui/
│   │   ├── forms/
│   │   └── layouts/
│   ├── core/                    # Core del producto
│   │   ├── api/                 # API pública del core (lo que módulos pueden importar)
│   │   │   ├── extensions.ts    # Puntos de extensión
│   │   │   ├── hooks.ts         # Hooks públicos
│   │   │   └── index.ts         # Re-exports
│   │   ├── config/              # Configuración global + business units
│   │   ├── products/            # Gestión de productos base
│   │   ├── stock/               # Control de stock
│   │   ├── pos/                 # Punto de venta
│   │   ├── sales/               # Historial de ventas
│   │   ├── customers/           # Clientes
│   │   ├── cash/                # Caja diaria
│   │   ├── afip/                # Facturación
│   │   ├── reports/             # Reportes base
│   │   ├── settings/            # Configuración
│   │   └── types.ts             # Tipos del core
│   ├── modules/                 # Módulos verticales
│   │   ├── retail-general/
│   │   │   ├── index.ts         # Registro del módulo
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── retail-textil/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── types.ts
│   │   └── taller-medida/
│   │       ├── index.ts
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── store/
│   │       └── types.ts
│   ├── lib/                     # Utilidades 100% agnósticas de negocio
│   │   ├── api/                 # Cliente HTTP
│   │   ├── utils/               # Helpers generales
│   │   └── validations/         # Zod utils compartidos
│   ├── types/                   # Tipos globales
│   └── App.tsx
├── server/                      # Express backend
│   ├── db/
│   │   ├── schemas/
│   │   │   ├── core/            # Schemas del core
│   │   │   └── modules/         # Schemas de módulos
│   │   └── migrations/
│   ├── core/                    # Lógica core del backend
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── repositories/
│   ├── modules/                 # Lógica de módulos del backend
│   │   ├── retail-textil/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── repositories/
│   │   └── taller-medida/
│   │       └── ...
│   ├── middleware/
│   └── jobs/
├── shared/                      # Código compartido front + back
│   ├── types.ts
│   ├── constants.ts
│   └── module-registry.ts       # Lista de módulos disponibles
├── tests/
└── assets/
```

### 5.1 Reglas de ubicación

| Qué es                                                | Dónde va                            |
| ----------------------------------------------------- | ----------------------------------- |
| Componente UI genérico (botón, input)                 | `src/components/ui/`                |
| Feature del core (ej. POS)                            | `src/core/pos/`                     |
| Feature de módulo específico (ej. variantes textiles) | `src/modules/retail-textil/`        |
| Utilidad agnóstica (formatear moneda)                 | `src/lib/utils/`                    |
| Utilidad específica del core                          | `src/core/lib/`                     |
| Utilidad específica de un módulo                      | `src/modules/{nombre}/lib/`         |
| Schema de Zod para entidad del core                   | `src/lib/validations/core/`         |
| Schema de Zod para entidad de módulo                  | `src/modules/{nombre}/validations/` |
| Schema de Drizzle (tabla del core)                    | `server/db/schemas/core/`           |
| Schema de Drizzle (tabla de módulo)                   | `server/db/schemas/modules/`        |
| Endpoint HTTP del core                                | `server/core/routes/`               |
| Endpoint HTTP de módulo                               | `server/modules/{nombre}/routes/`   |
| Tipo compartido front + back                          | `shared/types.ts`                   |

### 5.2 Regla de oro de módulos

Un módulo es autocontenido. Si estás modificando algo en `modules/retail-textil/` y necesitás tocar `modules/taller-medida/`, **detenete**: estás violando la encapsulación. Si dos módulos comparten lógica, esa lógica sube al core.

---

## 6. Convenciones de código

### 6.1 Naming

| Tipo                    | Convención                                      | Ejemplo                                                    |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Variables y funciones   | camelCase                                       | `totalAmount`, `calculateTax`                              |
| Componentes React       | PascalCase                                      | `ProductCard`, `CartItem`                                  |
| Archivos de componentes | PascalCase.tsx                                  | `ProductCard.tsx`                                          |
| Archivos de hooks       | camelCase.ts con prefix use                     | `useProducts.ts`                                           |
| Archivos de utilidades  | camelCase.ts                                    | `formatters.ts`                                            |
| Tipos e interfaces      | PascalCase                                      | `Product`, `SaleDTO`, `BusinessUnit`                       |
| Constantes              | UPPER_SNAKE_CASE                                | `MAX_STOCK_ITEMS`, `LOCALPOS_VERSION`                      |
| Enums                   | PascalCase, valores UPPER                       | `enum SaleStatus { COMPLETED, CANCELLED }`                 |
| Booleans                | prefijo `is`, `has`, `should`                   | `isActive`, `hasStock`, `shouldSync`                       |
| Namespace del producto  | `localpos` (minúsculas)                         | `localpos.config`, `LOCALPOS_VERSION`                      |
| Módulos en código       | kebab-case en paths, camelCase en importaciones | `/modules/retail-textil/`, `import { retailTextilModule }` |

### 6.2 Nombres específicos del proyecto

- **Producto visible al usuario:** se toma de `installationConfig.businessName` (configurable, ej. "Espacio BIP")
- **Producto en el código:** `LocalPosSoftware` en docs, `localpos` como namespace interno
- **Nunca hardcodear "Espacio BIP" en el código.** Siempre leer el nombre desde configuración.

### 6.3 TypeScript

- **Nunca `any`.** Si no sabés el tipo, usá `unknown` y narrow con type guards.
- **`interface` para entidades, `type` para uniones y utilidades.**
- **Evitar `export default`** para componentes. Usar exports nombrados.
- **Siempre tipar props** con una interface.

```typescript
// ✅ Correcto
interface ProductCardProps {
  product: Product;
  businessUnitId: number;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, businessUnitId, onSelect }: ProductCardProps) {
  // ...
}
```

### 6.4 Formateo

- Prettier con config del proyecto (`npm run format`)
- 2 espacios de indentación
- Máximo 100 caracteres por línea
- Semicolons obligatorios
- Comillas simples en JS/TS, dobles en JSX

### 6.5 Comentarios

Comentar el **por qué**, no el **qué**.

```typescript
// ❌ Mal
// Incrementa el contador en 1
counter++;

// ✅ Bien
// Usamos offset de 1 porque AFIP espera el próximo número de factura,
// no el último emitido
const nextInvoiceNumber = lastInvoiceNumber + 1;
```

**JSDoc obligatorio para:**

- Funciones públicas de services
- Funciones públicas de repositories
- Puntos de extensión del core
- Funciones complejas en `lib/utils/`

```typescript
/**
 * Calcula el subtotal de una venta aplicando descuentos por ítem
 * y el descuento global si corresponde.
 *
 * @param items - Ítems de la venta
 * @param globalDiscount - Porcentaje de descuento global (0-100)
 * @returns Subtotal en pesos argentinos, redondeado a 2 decimales
 * @throws {BusinessRuleError} Si algún ítem tiene cantidad o precio negativo
 */
export function calculateSubtotal(items: SaleItem[], globalDiscount: number): number {
  // implementación
}
```

### 6.6 Imports

Orden obligatorio, separados por línea en blanco:

```typescript
// 1. Librerías externas
import { useState } from 'react';
import { z } from 'zod';

// 2. Alias absolutos del proyecto (@/ y @shared/)
import { Button } from '@/components/ui/button';
import { useBusinessUnit } from '@/core/api';
import { useVariants } from '@/modules/retail-textil/hooks/useVariants';
import type { Product } from '@shared/types';

// 3. Imports relativos
import { ProductCard } from './ProductCard';
import type { LocalProduct } from './types';
```

Aliases a configurar en `vite.config.ts` y `tsconfig.json`:

- `@/*` → `src/*`
- `@shared/*` → `shared/*`

---

## 7. Business Units: cómo afectan el código

### 7.1 Concepto

Una instalación de LocalPosSoftware tiene **una o varias Business Units (BUs)**. Cada BU es un negocio independiente dentro de la misma instalación.

Ejemplo en Espacio BIP:

- BU "Front" con módulo `retail-textil`
- BU "Back" con módulo `taller-medida`

### 7.2 Impacto en el modelo de datos

**Toda tabla transaccional tiene `business_unit_id`:**

- `products`
- `stock_items`, `stock_movements`
- `sales`, `sale_items`
- `cash_registers`, `cash_movements`
- Tablas de módulos (ej. `product_variants`, `custom_orders`)

**Tablas que NO tienen `business_unit_id`:**

- `installation_config` (singleton)
- `business_units` (es la tabla misma)
- `users` (compartidos entre BUs)
- `customers` (compartidos entre BUs, ver RF-CL-05)

### 7.3 Impacto en queries

**Toda query transaccional filtra por BU activa:**

```typescript
// ❌ PROHIBIDO: no filtrar por BU
async findAllProducts(): Promise<Product[]> {
  return db.select().from(products);
}

// ✅ CORRECTO: siempre filtrar por BU
async findAllProductsForBU(businessUnitId: number): Promise<Product[]> {
  return db.select().from(products).where(eq(products.businessUnitId, businessUnitId));
}
```

### 7.4 Impacto en la UI

El usuario siempre tiene una BU activa. El frontend obtiene su ID con un hook del core:

```typescript
import { useActiveBusinessUnit } from '@/core/api';

export function ProductList() {
  const { activeBU } = useActiveBusinessUnit();
  const { products } = useProducts(activeBU.id);
  // ...
}
```

### 7.5 Impacto en el backend

Los endpoints del backend reciben el `businessUnitId` por header o en el body, según la operación. El middleware valida que exista y esté activa.

```typescript
// Request desde el frontend
const response = await fetch('/api/products', {
  headers: { 'X-Business-Unit-Id': '1' },
});

// Middleware en backend valida y lo inyecta en req
req.businessUnitId; // disponible en controllers
```

### 7.6 Reglas clave

1. Un usuario NUNCA ve datos de una BU distinta a la activa (excepto admin en reportes consolidados).
2. Un pedido/venta NUNCA cruza BUs (no podés agregar productos de BU "Front" a una venta de BU "Back").
3. La caja es por BU: pueden estar dos cajas abiertas al mismo tiempo (una en cada BU).
4. Los clientes son globales: un mismo cliente puede haber comprado en ambas BUs y su historial se ve consolidado.

---

## 8. Flujo de trabajo por tarea

### Paso 1: Entender la tarea

- Leer la especificación en `PROJECT.md`
- Identificar los RF involucrados
- **Identificar si la tarea es CORE o MODULAR** (sección 3.4)
- Si no queda claro, preguntar antes de codear

### Paso 2: Revisar código existente

- `grep` o búsqueda por términos relacionados
- Identificar si la feature ya tiene estructura
- Revisar features similares para mantener consistencia

### Paso 3: Plantear el diseño

Antes de escribir código, decidir:

- ¿Qué archivos vas a crear o modificar?
- ¿La tarea vive en `core/` o en `modules/{nombre}/`?
- Si es modular, ¿necesita un punto de extensión nuevo en el core?
- ¿Qué datos se mueven por el sistema?
- ¿Cambios en schema de DB? (si sí, migrations)
- ¿Nuevas validaciones Zod?
- ¿Qué tests vas a escribir?

Si la tarea toca más de 5 archivos, pausá y presentá el plan al usuario.

### Paso 4: Implementar en orden

**Para una feature del core:**

1. Schema de DB (si aplica) y migration
2. Tipos TypeScript (`shared/types.ts` o `src/core/types.ts`)
3. Schemas Zod (`src/lib/validations/core/`)
4. Repository (`server/core/repositories/`)
5. Service (`server/core/services/`)
6. Controller (`server/core/controllers/`)
7. Route (`server/core/routes/`)
8. API client (`src/lib/api/`)
9. Hook React (`src/core/{feature}/hooks/`)
10. Store Zustand si aplica
11. Componentes UI (`src/core/{feature}/components/`)
12. Tests

**Para una feature de módulo:**

1. Schema de DB (tablas del módulo, nunca modificar tablas core)
2. Tipos TypeScript del módulo
3. Schemas Zod del módulo
4. Repository del módulo
5. Service del módulo
6. Controller del módulo
7. Route del módulo (registrada bajo `/api/modules/{nombre}/`)
8. Registrar el módulo en `shared/module-registry.ts` si es nuevo
9. API client del módulo
10. Hook React del módulo
11. Componentes UI del módulo
12. **Registrar puntos de extensión** (ej. `registerProductExtension(...)`)
13. Tests

### Paso 5: Testear manualmente

- Ejecutar la app
- Probar el flujo completo
- Probar casos borde
- Probar con internet y sin internet si aplica
- **Si es modular: probar con el módulo activado Y desactivado** (el sistema debe seguir funcionando)

### Paso 6: Commit

Ver sección 13.

---

## 9. Patrones obligatorios

### 9.1 Repository Pattern

Todo acceso a DB pasa por un Repository. Services NO hacen queries directas.

```typescript
// ✅ Correcto
// server/core/repositories/ProductRepository.ts
export class ProductRepository {
  async findByIdForBU(id: number, businessUnitId: number): Promise<Product | null> {
    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .limit(1);
    return result[0] ?? null;
  }
}
```

### 9.2 Service Layer

Lógica de negocio en services, nunca en controllers.

### 9.3 Validación con Zod

Todos los inputs externos se validan con Zod.

### 9.4 Transacciones SQL

Cualquier operación multi-tabla está en transacción.

### 9.5 Estado en React

| Tipo                  | Herramienta           | Ejemplo                |
| --------------------- | --------------------- | ---------------------- |
| Estado local          | `useState`            | Input, modal abierto   |
| Estado local complejo | `useReducer`          | Formulario multi-campo |
| Compartido global     | Zustand               | Carrito POS, BU activa |
| Estado del servidor   | Hook custom con fetch | Lista de productos     |

### 9.6 Componentes

- Un componente, un archivo
- Componentes puros cuando se pueda
- Separar lógica de presentación con hooks custom

### 9.7 Puntos de extensión (patrón para módulos)

El core provee un registry. Los módulos se registran en el inicio.

```typescript
// src/core/api/extensions.ts
type ProductExtension = {
  name: string;
  component: React.ComponentType<{ product: Product }>;
};

const productExtensions: ProductExtension[] = [];

export function registerProductExtension(ext: ProductExtension): void {
  productExtensions.push(ext);
}

export function useProductExtensions(): ProductExtension[] {
  return productExtensions;
}

// src/modules/retail-textil/index.ts
import { registerProductExtension } from '@/core/api';
import { VariantsPanel } from './components/VariantsPanel';

registerProductExtension({
  name: 'variants',
  component: VariantsPanel,
});
```

---

## 10. Testing

### 10.1 Qué testear obligatoriamente

- **Services del core:** cobertura mínima 80%
- **Services de módulos:** cobertura mínima 70%
- **Utils de cálculo:** 100%
- **Validaciones Zod:** casos válidos e inválidos

### 10.2 Qué NO hace falta testear

- Componentes puramente presentacionales
- Código third-party
- Getters/setters triviales

### 10.3 Estructura de test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SalesService } from '@/server/core/services/SalesService';

describe('SalesService', () => {
  let service: SalesService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = { create: vi.fn(), findById: vi.fn() };
    service = new SalesService(mockRepo);
  });

  describe('calculateTotal', () => {
    it('should calculate total for single item', () => {
      const items = [{ quantity: 2, unitPrice: 100 }];
      expect(service.calculateTotal(items)).toBe(200);
    });
  });
});
```

### 10.4 Naming de tests

En inglés, estructura "should X when Y":

- ✅ `should reject sale when stock is insufficient for BU`
- ✅ `should throw NotFoundError when product does not exist`

---

## 11. Manejo de errores

### 11.1 Errores customizados

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}
```

### 11.2 Dónde tirar errores

- **Repository:** `NotFoundError` si no encuentra
- **Service:** `BusinessRuleError` si regla de negocio no se cumple
- **Controller:** captura `ZodError` → `ValidationError`
- **Middleware global:** captura todo y formatea HTTP

### 11.3 Mensajes de error

- **Español** para el usuario final
- **Inglés** para logs internos

### 11.4 Nunca tragar errores

Siempre loggear o propagar. Nunca `catch` vacío.

---

## 12. Seguridad

### 12.1 Reglas absolutas

- Nunca commitear secretos (`.env`, certificados)
- Nunca exponer credenciales AFIP al frontend
- Nunca concatenar strings en queries SQL (usar parámetros Drizzle)
- Validar todos los inputs externos con Zod
- Passwords con bcrypt (12 rondas mínimo)
- Sanitizar archivos subidos (MIME type + tamaño)

### 12.2 Variables de entorno

`.env` en la raíz (ignorado por git), `.env.example` con placeholders en el repo.

### 12.3 Electron específico

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Usar `preload.ts` con `contextBridge`
- Nunca `webSecurity: false`

---

## 13. Git y commits

### 13.1 Ramas

- `main`: productivo, siempre funcionando
- `develop`: integración
- `feature/nombre`: desarrollos
- `fix/nombre`: bugs
- `docs/nombre`: solo documentación
- `module/nombre`: trabajo específico en un módulo vertical

### 13.2 Conventional Commits

```
<tipo>(<scope>): <descripción corta>

<cuerpo opcional>
```

**Scopes especiales del proyecto:**

| Scope           | Uso                             |
| --------------- | ------------------------------- |
| `core`          | Cambios en el core              |
| `retail-textil` | Cambios en módulo retail-textil |
| `taller-medida` | Cambios en módulo taller-medida |
| `bu`            | Business Units                  |
| `afip`          | Integración AFIP                |
| `sync`          | Sincronización Supabase         |

**Ejemplos:**

```
feat(core): agregar selector de business unit en header

feat(retail-textil): implementar variantes por color y tamaño

fix(afip): corregir cálculo de IVA para factura tipo A

refactor(core): extraer puntos de extensión a src/core/api

docs: actualizar PROJECT.md con arquitectura modular

feat(taller-medida): agregar estados de pedido con transiciones
```

### 13.3 Reglas

- Commits atómicos
- No commitear código roto en `main` o `develop`
- No `git push --force` a ramas compartidas
- PRs para merge a `develop` y `main`
- Máximo 500 líneas modificadas por commit

---

## 14. Plantillas de prompts

### 14.1 Crear feature del core

```
Leé AGENT_INSTRUCTIONS.md y PROJECT.md.

Tarea: Implementar feature CORE de [NOMBRE].
Scope: core
RF relevantes: RF-XX, RF-YY

Confirmá antes de codear:
1. Presentame el plan (archivos a crear/modificar)
2. Esperá mi OK
3. Implementá siguiendo el orden de Paso 4 de AGENT_INSTRUCTIONS.md
4. Tests + checklist final
```

### 14.2 Crear feature de módulo vertical

```
Leé AGENT_INSTRUCTIONS.md y PROJECT.md.

Tarea: Implementar feature del MÓDULO [nombre-modulo].
Scope: módulo vertical
RF relevantes: RF-XX, RF-YY

Recordatorios críticos:
- El módulo NO puede modificar el core
- Si necesita algo del core, usá los puntos de extensión (sección 3.5)
- Registrá el módulo en shared/module-registry.ts si no está
- Probá el sistema con el módulo activado Y desactivado

Confirmá antes de codear:
1. Plan de archivos
2. Espero OK
3. Implementás
4. Tests + checklist
```

### 14.3 Corregir bug

```
Leé AGENT_INSTRUCTIONS.md y PROJECT.md.

Bug: [DESCRIPCIÓN]
Pasos: 1. ... 2. ...
Esperado: ...
Actual: ...

Por favor:
1. Investigá causa raíz antes de codear
2. ¿Es core o módulo? Indicame
3. Proponé solución
4. Implementá con test que reproduzca el bug
5. Verificá que no rompió otros tests
```

### 14.4 Refactor

```
Leé AGENT_INSTRUCTIONS.md y PROJECT.md.

Refactorizar: [ARCHIVO/MÓDULO]
Motivo: ...
Objetivo: ...

Restricción: comportamiento externo NO cambia. Tests siguen pasando.

Presentame plan antes de modificar código.
```

### 14.5 Crear nuevo módulo vertical (desde cero)

```
Leé AGENT_INSTRUCTIONS.md y PROJECT.md.

Tarea: Crear módulo vertical NUEVO llamado [nombre].
RF relevantes: RF-XX

Pasos esperados:
1. Registrar en shared/module-registry.ts
2. Crear estructura de carpetas en src/modules/{nombre} y server/modules/{nombre}
3. Definir schema de DB específico del módulo
4. Definir qué puntos de extensión del core va a usar
5. Implementar features
6. Tests
7. Probar activación/desactivación
```

---

## 15. Checklist antes de marcar una tarea como completa

### Funcionalidad

- [ ] La feature cumple todos los RF declarados
- [ ] Probé manualmente el happy path
- [ ] Probé al menos 2 casos borde
- [ ] Probé con internet y sin internet si aplica
- [ ] Funciona consistentemente al reiniciar la app
- [ ] Si es modular: probé con módulo activado y desactivado
- [ ] Si toca BUs: probé con múltiples BUs configuradas

### Código

- [ ] Sin `console.log` olvidados
- [ ] Sin `// TODO` sin ticket
- [ ] Sin código comentado sin razón
- [ ] Pasa lint (`npm run lint`)
- [ ] Pasa format (`npm run format:check`)
- [ ] Sin `any` en TypeScript
- [ ] Inputs externos validados con Zod
- [ ] Operaciones multi-tabla en transacciones
- [ ] Si es core: no importé nada de `modules/*`
- [ ] Si es módulo: no importé de otros módulos
- [ ] Si es módulo: usé la API pública del core, no internos
- [ ] Queries transaccionales filtran por `business_unit_id` donde corresponde

### Tests

- [ ] Tests nuevos para lógica de negocio
- [ ] Todos los tests pasan (`npm test`)
- [ ] Cobertura no bajó respecto al baseline

### Documentación

- [ ] Funciones públicas con JSDoc
- [ ] Si hubo cambios de alcance: actualicé `PROJECT.md`
- [ ] Commit sigue Conventional Commits con scope correcto

### Seguridad

- [ ] Sin secretos commiteados
- [ ] Sin credenciales expuestas al frontend
- [ ] Permisos validados si la operación lo requiere

---

## 16. Errores comunes a evitar

### 16.1 Cálculos con floats

```typescript
// ❌
const total = 0.1 + 0.2; // 0.30000000000000004

// ✅
const total = Math.round((0.1 + 0.2) * 100) / 100;
```

### 16.2 Fechas sin timezone

```typescript
// ❌
const now = new Date().toISOString();

// ✅
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
const fecha = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
```

### 16.3 SKU humano-leíble

```typescript
// ❌
const sku = variant.id.toString();

// ✅
import { nanoid } from 'nanoid';
const sku = `BIP-${product.category.slice(0, 3).toUpperCase()}-${nanoid(6)}`;
```

### 16.4 Queries N+1

```typescript
// ❌
const products = await productRepo.findAll();
for (const p of products) p.variants = await variantRepo.findByProductId(p.id);

// ✅
const products = await db
  .select()
  .from(productsTable)
  .leftJoin(productVariants, eq(productsTable.id, productVariants.productId));
```

### 16.5 Mutaciones de state

```typescript
// ❌
cart.items.push(item);
setCart(cart);

// ✅
setCart({ ...cart, items: [...cart.items, item] });
```

### 16.6 Memory leaks en useEffect

```typescript
// ✅
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/products', { signal: controller.signal })
    .then((r) => r.json())
    .then(setProducts);
  return () => controller.abort();
}, []);
```

### 16.7 Stock negativo

```typescript
// ✅ verificar antes
const variant = await tx
  .select()
  .from(productVariants)
  .where(eq(productVariants.id, variantId))
  .for('update');
if (variant[0].stock < quantity) {
  throw new BusinessRuleError(`Stock insuficiente para ${variant[0].sku}`);
}
```

### 16.8 Electron IPC inseguro

```typescript
// ❌
window.ipcRenderer = ipcRenderer;

// ✅ en preload.ts
contextBridge.exposeInMainWorld('api', {
  products: {
    list: () => ipcRenderer.invoke('products:list'),
  },
});
```

### 16.9 Olvidar filtrar por Business Unit

```typescript
// ❌ muestra productos de todas las BUs
const products = await db.select().from(productsTable);

// ✅
const products = await db
  .select()
  .from(productsTable)
  .where(eq(productsTable.businessUnitId, activeBU.id));
```

### 16.10 Core importando desde módulos

```typescript
// ❌ NUNCA en src/core/...
import { something } from '@/modules/retail-textil/...';

// ✅ usar punto de extensión
import { useProductExtensions } from '@/core/api';
```

### 16.11 Hardcodear "Espacio BIP" en el código

```typescript
// ❌
<title>Espacio BIP - POS</title>

// ✅
const { businessName } = useInstallationConfig();
<title>{businessName} - POS</title>
```

### 16.12 Mezclar operaciones entre BUs

```typescript
// ❌ agregar producto de otra BU al carrito
addToCart(productFromOtherBU);

// ✅ validar que el producto pertenece a la BU activa
if (product.businessUnitId !== activeBU.id) {
  throw new BusinessRuleError('El producto no pertenece a la unidad de negocio activa');
}
```

---

## 📝 Control de versiones

| Versión | Fecha      | Cambios                                                                                                                                       |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Abril 2026 | Versión inicial                                                                                                                               |
| 2.0     | Abril 2026 | Reescrito para arquitectura modular: core vs módulos verticales, Business Units, puntos de extensión, nomenclatura LocalPosSoftware/localpos. |

---

## 🔗 Referencias

- Proyecto: `PROJECT.md`
- README: `README.md`
- Conventional Commits: https://www.conventionalcommits.org/
- Drizzle ORM: https://orm.drizzle.team/
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- Zod: https://zod.dev/

---

**Fin del documento.**

**Antes de escribir código, el agente debe confirmar que leyó `PROJECT.md` y tiene claro si la tarea es core o modular.**
