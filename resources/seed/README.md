# Catálogo de prueba — productos.csv

Este archivo se importa automáticamente al arrancar la app **si** la
variable de entorno `SEED_DEMO=true` está activa (ver `.env` en esta misma
carpeta de recursos). Podés editarlo con tu catálogo real y reiniciar la
app — no hace falta recompilar ni reinstalar nada.

La importación es **idempotente**: podés volver a abrir la app (o usar el
botón "Reiniciar datos de prueba" en Configuración) tantas veces como
quieras sin que se dupliquen productos ni variantes.

## Columnas

| Columna          | Obligatoria | Descripción |
|-------------------|:-----------:|-------------|
| `nombre`           | sí | Nombre del producto. Si varias filas repiten el mismo nombre, se agrupan como variantes de un mismo producto. |
| `categoria`         | no | Debe coincidir con una categoría existente (ver Configuración → Categorías) o se crea como texto libre. |
| `precio`            | sí | Precio de venta. |
| `costo`             | no | Costo del producto (para margen). |
| `stock`             | no | Stock inicial. Si el producto tiene variantes, el stock del producto se calcula sumando el de cada variante — completá el `stock` en la fila de cada variante, no en el producto base. |
| `sku`               | no | Código único. Si lo dejás vacío, se genera uno automático. **Recomendado completarlo** si vas a reimportar el CSV seguido, para que el sistema identifique claramente cada fila. |
| `tipo_variante`     | no | Nombre del atributo que varía: `Color`, `Tamaño`, `Fragancia`, `Material`, etc. Dejalo vacío si el producto no tiene variantes. |
| `valor_variante`    | no | Valor de ese atributo para esta fila: `Rojo`, `Grande`, `Lavanda`, etc. |

## Cómo agrupar variantes

Repetí el mismo `nombre` en varias filas, una por cada variante:

```csv
nombre,categoria,precio,costo,stock,sku,tipo_variante,valor_variante
Home Spray Lavanda,Aromas,3200,1500,15,HS-LAV,Fragancia,Lavanda
Home Spray Lavanda,Aromas,3200,1500,12,HS-CIT,Fragancia,Citrus
```

Esto crea **un solo producto** "Home Spray Lavanda" con dos variantes de
Fragancia (Lavanda / Citrus), cada una con su propio precio, costo, stock y
SKU.

Si un producto no tiene variantes, dejá `tipo_variante` y `valor_variante`
vacíos en su única fila.

## Identificación para no duplicar

- El **producto base** se identifica por (nombre + unidad de negocio). Si
  volvés a importar con el mismo nombre, actualiza en vez de duplicar.
- Cada **variante** se identifica por (producto + tipo_variante +
  valor_variante). Cambiar el precio/stock/sku de una variante existente y
  reimportar actualiza esa fila, no crea una nueva.
- Si cambiás el `nombre` de un producto en el CSV, se va a crear como un
  producto NUEVO (no reconoce el anterior).
