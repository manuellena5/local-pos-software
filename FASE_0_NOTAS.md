# Notas de implementación — Fase 0: Setup y arquitectura base

**Fecha:** Abril 2026
**Estado:** ✅ Completa y verificada manualmente

---

## Qué se implementó

La Fase 0 establece el esqueleto completo del proyecto. No hay lógica de negocio todavía — solo herramientas, estructura y un "hello world" end-to-end que demuestra que los tres procesos (Electron + React + Express) se comunican correctamente.

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `package.json` | Dependencias y scripts completos |
| `tsconfig.json` | TypeScript para el renderer (React/Vite) |
| `tsconfig.node.json` | TypeScript para Electron y Express |
| `vite.config.ts` | Build del renderer con aliases `@/` y `@shared/` |
| `tailwind.config.js` + `postcss.config.js` | Estilos |
| `.eslintrc.json` + `.prettierrc` | Calidad de código |
| `vitest.config.ts` | Configuración de tests |
| `index.html` + `src/main.tsx` + `src/App.tsx` | Renderer React mínimo |
| `src/index.css` | Entry de Tailwind |
| `src/core/api/extensions.ts` | Registry de puntos de extensión para módulos |
| `src/core/api/hooks.ts` | Hooks públicos del core (stubs por ahora) |
| `src/core/api/index.ts` | Re-exports de la API pública del core |
| `src/core/types.ts` | Tipos del core (re-exports de `shared/`) |
| `src/modules/retail-general/` | Placeholder módulo (Fase 7) |
| `src/modules/retail-textil/` | Placeholder módulo (Fase 7) |
| `src/modules/taller-medida/` | Placeholder módulo (Fase 8) |
| `shared/types.ts` | Tipos compartidos front+back (`BusinessUnit`, `InstallationConfig`, `ApiResponse`) |
| `shared/constants.ts` | Constantes globales (`LOCALPOS_VERSION`, `MODULE_IDS`) |
| `shared/module-registry.ts` | Registro de módulos verticales disponibles |
| `electron/main.ts` | Main process: levanta server, abre ventana |
| `electron/preload.ts` | Preload seguro con `contextBridge` |
| `server/server.ts` | Express: `GET /api/health`, `createApp()`, `startServer()` |
| `server/lib/errors.ts` | Clases de error: `AppError`, `NotFoundError`, `ValidationError`, `BusinessRuleError` |
| `server/middleware/errorHandler.ts` | Middleware global de errores Express |
| `.env.example` | Template de variables de entorno |
| `.gitignore` | Ignora `node_modules`, `dist`, `.env`, `*.db`, `certs/` |

---

## Problemas encontrados y soluciones

### 1. `@afipsdk/afip.js@^2.0.0` no existe en npm

**Problema:** `AGENT_INSTRUCTIONS.md` especifica `^2.0.0`, pero la versión más alta publicada es `1.2.3`.

**Solución:** Se usa `^1.2.3`. Al momento de integrar AFIP (Fase 5), verificar si salió una versión 2.x o si se necesita otro SDK.

**Acción en Fase 5:** Revisar `npm show @afipsdk/afip.js versions` antes de implementar.

---

### 2. `better-sqlite3@^9.4.0` no compila en Node.js v24

**Problema:** `AGENT_INSTRUCTIONS.md` especifica `^9.4.0`. Node.js v24 (la versión instalada) no tiene binarios precompilados para esa versión, y la compilación desde fuente falla con `gyp: common.gypi not found`.

**Error exacto:**
```
prebuild-install warn install No prebuilt binaries found (target=24.14.1 runtime=node arch=x64)
gyp: common.gypi not found while reading includes of binding.gyp
```

**Solución:** Se usa `^12.9.0` (última versión estable, compatible con Node 24).

**Impacto:** Ninguno en Fase 0 (no se usa SQLite todavía). En Fase 1, al implementar el schema, usar la API de `better-sqlite3` v12 (la API es compatible con v9).

---

### 3. `tsconfig.node.json` tenía `"noEmit": true` hardcodeado

**Problema:** El script `dev:electron` hace `tsc -p tsconfig.node.json --outDir .dist` para compilar el main process antes de abrir Electron. Con `noEmit: true` en el config, TypeScript no emitía ningún archivo aunque se pasara `--outDir`.

**Síntoma:** `.dist/` no se creaba, Electron fallaba al intentar cargar `.dist/electron/main.js`.

**Solución:** Se removió `"noEmit": true` de `tsconfig.node.json`. El script de typecheck ya pasa `--noEmit` por CLI, así que el typecheck sigue funcionando correctamente:
```
"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.node.json"
```

**Regla para el futuro:** En los tsconfig que se usan también para compilar (no solo para type-check), no poner `noEmit: true`. Pasarlo por CLI en el script de typecheck.

---

### 4. `electron/main.ts` usaba `process.env.NODE_ENV` para detectar dev/prod

**Problema:** `const IS_DEV = process.env.NODE_ENV === 'development'` requería setear la variable de entorno en el script de dev, lo cual varía por plataforma (Windows vs Unix).

**Solución:** Se usa `!app.isPackaged` que es la forma idiomática de Electron:
- `app.isPackaged === false` en desarrollo (electron directo)
- `app.isPackaged === true` en producción (instalador generado por electron-builder)

No requiere ninguna variable de entorno.

---

### 5. Modal de error "EADDRINUSE" al correr `npm run dev` con el servidor ya levantado

**Problema:** Al probar el punto 3 (server + renderer separados) y luego correr `npm run dev` sin cerrar el server anterior, Electron intentaba levantar el servidor en el puerto 3001 que ya estaba ocupado. Esto lanzaba una excepción no manejada que mostraba un modal de error de Electron, aunque la app funcionaba igualmente (usaba el server ya levantado).

**Solución:** Se agregó un handler para el evento `error` en el server de Express que captura `EADDRINUSE` y loguea un aviso en lugar de tirar la excepción:

```typescript
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Server] Port ${port} already in use, reusing existing server`);
  } else {
    console.error('[Server] Startup error:', err);
  }
});
```

Ahora, si el puerto ya está ocupado, Electron simplemente reutiliza el server existente sin mostrar error.

---

## Cómo correr en desarrollo

### Solo backend (para testear la API)
```bash
npm run dev:server
# Server en http://localhost:3001
# Test: curl http://localhost:3001/api/health
# Respuesta esperada: {"data":{"status":"ok","version":"0.1.0"},"error":null}
```

### Solo frontend (para trabajar en la UI)
```bash
npm run dev:renderer
# Vite en http://localhost:5173
# Sin el server corriendo, muestra "Servidor no disponible"
# Con el server corriendo, muestra "✓ ok — v0.1.0"
```

### Full stack con Electron (flujo normal de desarrollo)
```bash
npm run dev
# Levanta los tres en orden:
# 1. dev:server  → Express en :3001
# 2. dev:renderer → Vite en :5173
# 3. dev:electron → espera :5173, compila a .dist/, abre ventana Electron
```

> **Nota:** La primera vez tarda ~10 segundos porque compila el TypeScript de electron+server a `.dist/`. Las siguientes veces es más rápido.

### Comandos de calidad de código
```bash
npm run typecheck      # 0 errores = todo ok
npm run lint           # ESLint
npm run format         # Prettier
npm test               # Vitest (no hay tests todavía)
```

---

## Estado actual verificado

- [x] `npm run typecheck` → 0 errores en renderer y node
- [x] `npm run dev:server` → Express responde en :3001
- [x] `npm run dev:renderer` → Vite sirve la UI en :5173
- [x] `npm run dev` → ventana Electron muestra el health check de la API
- [x] Estructura de carpetas según `AGENT_INSTRUCTIONS.md` §5
- [x] Core API stubs implementados (puntos de extensión para módulos, Fase 7+)
- [x] Clases de error implementadas
- [x] Middleware de error implementado

---

## Cosas a tener en cuenta en Fase 1

1. **Verificar versión de `@afipsdk/afip.js`** antes de integrar AFIP (Fase 5). Puede haber una v2 para entonces.

2. **`src/core/api/hooks.ts` retorna null** — los hooks `useActiveBusinessUnit` y `useInstallationConfig` son stubs. En Fase 1 se reemplazan con stores Zustand reales.

3. **No hay DB todavía** — `server/server.ts` no inicializa SQLite. En Fase 1 se agrega `server/db/` con el schema de Drizzle y las migrations.

4. **Los módulos verticales son placeholders vacíos** — `src/modules/retail-general/index.ts` etc. no registran nada todavía. Se implementan en Fases 7 y 8.

5. **`electron/preload.ts` solo expone `version`** — en Fase 1 se pueden agregar más canales IPC según se necesiten (pero siempre via `contextBridge`, nunca `nodeIntegration`).

6. **No hay autenticación** — el servidor Express no tiene middleware de auth. Se agrega en Fase 1 junto con el modelo de usuarios.

7. **CORS está fijo a `http://localhost:5173`** — en producción hay que actualizar la config de CORS o desactivarlo (el frontend y backend conviven en el mismo proceso Electron).

---

**Próxima tarea:** Fase 1 — Business Units + configuración inicial (wizard de setup, RF-CO-01 a RF-BU-07).
