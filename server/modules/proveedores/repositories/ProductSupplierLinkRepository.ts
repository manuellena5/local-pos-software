import { eq, and, ne, isNull } from 'drizzle-orm';
import { db, sqlite } from '../../../db/connection';
import { productSupplierLinks } from '../../../db/schemas/modules/productSupplierLinks';
import { supplierProducts } from '../../../db/schemas/modules/supplierProducts';
import { suppliers } from '../../../db/schemas/modules/suppliers';
import { products, stockItems } from '../../../db/schemas/core/products';
import type {
  ProductSupplierLink,
  SuggestedMatch,
  Product,
  SupplierProduct,
  UnlinkedSupplierProduct,
  CreateFromSupplierInput,
} from '../../../../shared/types';

// ── helpers ───────────────────────────────────────────────────────────────

function rowToLink(row: typeof productSupplierLinks.$inferSelect): ProductSupplierLink {
  return {
    id:                row.id,
    productId:         row.productId,
    supplierProductId: row.supplierProductId,
    businessUnitId:    row.businessUnitId,
    isPreferred:       row.isPreferred === 1,
    createdAt:         row.createdAt,
  };
}

/** Tokeniza un nombre para Jaccard: lowercase, sin tildes, split por espacios */
function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remover diacríticos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return new Set(normalized);
}

function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Genera un SKU único a partir del nombre + timestamp base-36 */
function generateSku(name: string): string {
  const base = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12);
  const suffix = Date.now().toString(36).toUpperCase().slice(-5);
  return `${base}-${suffix}`;
}

// ── repository ────────────────────────────────────────────────────────────

export interface ProductSupplierLinkWithDetails {
  link: ProductSupplierLink;
  supplierProduct: SupplierProduct;
  supplier: { id: number; name: string; shippingCost: number | null; minimumOrder: number | null };
}

export class ProductSupplierLinkRepository {
  findLinksForProduct(productId: number): ProductSupplierLinkWithDetails[] {
    const rows = db
      .select({
        link:            productSupplierLinks,
        supplierProduct: supplierProducts,
        supplierId:      suppliers.id,
        supplierName:    suppliers.name,
        shippingCost:    suppliers.shippingCost,
        minimumOrder:    suppliers.minimumOrder,
      })
      .from(productSupplierLinks)
      .innerJoin(supplierProducts, eq(productSupplierLinks.supplierProductId, supplierProducts.id))
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(eq(productSupplierLinks.productId, productId))
      .all();

    return rows.map((r) => ({
      link: rowToLink(r.link),
      supplierProduct: {
        id:             r.supplierProduct.id,
        supplierId:     r.supplierProduct.supplierId,
        businessUnitId: r.supplierProduct.businessUnitId,
        name:           r.supplierProduct.name,
        supplierCode:   r.supplierProduct.supplierCode ?? null,
        unitCost:       r.supplierProduct.unitCost,
        currency:       r.supplierProduct.currency,
        unit:           r.supplierProduct.unit,
        categoryHint:   r.supplierProduct.categoryHint ?? null,
        isActive:       r.supplierProduct.isActive,
        lastUpdated:    r.supplierProduct.lastUpdated,
        createdAt:      r.supplierProduct.createdAt,
      },
      supplier: {
        id:           r.supplierId,
        name:         r.supplierName,
        shippingCost: r.shippingCost ?? null,
        minimumOrder: r.minimumOrder ?? null,
      },
    }));
  }

  findAllLinksForBU(businessUnitId: number): ProductSupplierLinkWithDetails[] {
    const rows = db
      .select({
        link:            productSupplierLinks,
        supplierProduct: supplierProducts,
        supplierId:      suppliers.id,
        supplierName:    suppliers.name,
        shippingCost:    suppliers.shippingCost,
        minimumOrder:    suppliers.minimumOrder,
      })
      .from(productSupplierLinks)
      .innerJoin(supplierProducts, eq(productSupplierLinks.supplierProductId, supplierProducts.id))
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(eq(productSupplierLinks.businessUnitId, businessUnitId))
      .all();

    return rows.map((r) => ({
      link: rowToLink(r.link),
      supplierProduct: {
        id:             r.supplierProduct.id,
        supplierId:     r.supplierProduct.supplierId,
        businessUnitId: r.supplierProduct.businessUnitId,
        name:           r.supplierProduct.name,
        supplierCode:   r.supplierProduct.supplierCode ?? null,
        unitCost:       r.supplierProduct.unitCost,
        currency:       r.supplierProduct.currency,
        unit:           r.supplierProduct.unit,
        categoryHint:   r.supplierProduct.categoryHint ?? null,
        isActive:       r.supplierProduct.isActive,
        lastUpdated:    r.supplierProduct.lastUpdated,
        createdAt:      r.supplierProduct.createdAt,
      },
      supplier: {
        id:           r.supplierId,
        name:         r.supplierName,
        shippingCost: r.shippingCost ?? null,
        minimumOrder: r.minimumOrder ?? null,
      },
    }));
  }

  createLink(data: {
    productId: number;
    supplierProductId: number;
    businessUnitId: number;
  }): ProductSupplierLink {
    const row = db
      .insert(productSupplierLinks)
      .values({
        productId:         data.productId,
        supplierProductId: data.supplierProductId,
        businessUnitId:    data.businessUnitId,
        isPreferred:       0,
      })
      .returning()
      .get();
    return rowToLink(row);
  }

  setPreferred(linkId: number): void {
    const link = db
      .select()
      .from(productSupplierLinks)
      .where(eq(productSupplierLinks.id, linkId))
      .get();
    if (!link) return;

    // Quitar preferido de todos los otros vínculos del mismo producto
    db.update(productSupplierLinks)
      .set({ isPreferred: 0 })
      .where(
        and(
          eq(productSupplierLinks.productId, link.productId),
          ne(productSupplierLinks.id, linkId),
        ),
      )
      .run();

    // Marcar este como preferido
    db.update(productSupplierLinks)
      .set({ isPreferred: 1 })
      .where(eq(productSupplierLinks.id, linkId))
      .run();
  }

  deleteLink(linkId: number): void {
    db.delete(productSupplierLinks)
      .where(eq(productSupplierLinks.id, linkId))
      .run();
  }

  /**
   * Sugiere vínculos usando similitud Jaccard entre nombres de productos propios
   * y productos del catálogo de proveedores aún no vinculados.
   * Solo retorna sugerencias con score >= 0.4. Máximo 50.
   */
  suggestMatches(businessUnitId: number): SuggestedMatch[] {
    // Productos propios de la BU
    const ownProducts = db
      .select()
      .from(products)
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all();

    // Productos de proveedores sin vínculo aún para esta BU
    const linkedSpIds = db
      .select({ spId: productSupplierLinks.supplierProductId })
      .from(productSupplierLinks)
      .where(eq(productSupplierLinks.businessUnitId, businessUnitId))
      .all()
      .map((r) => r.spId);

    const linkedSet = new Set(linkedSpIds);

    const allSupplierProducts = db
      .select({ sp: supplierProducts, supplierName: suppliers.name })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(
        and(
          eq(supplierProducts.businessUnitId, businessUnitId),
          eq(supplierProducts.isActive, true),
        ),
      )
      .all()
      .filter((r) => !linkedSet.has(r.sp.id));

    const suggestions: SuggestedMatch[] = [];

    for (const spRow of allSupplierProducts) {
      const spTokens = tokenize(spRow.sp.name);
      let bestScore = 0;
      let bestProduct: (typeof ownProducts)[number] | null = null;

      for (const op of ownProducts) {
        const opTokens = tokenize(op.name);
        const score = jaccardScore(spTokens, opTokens);
        if (score > bestScore) {
          bestScore = score;
          bestProduct = op;
        }
      }

      if (bestScore >= 0.4 && bestProduct) {
        suggestions.push({
          supplierProduct: {
            id:             spRow.sp.id,
            supplierId:     spRow.sp.supplierId,
            businessUnitId: spRow.sp.businessUnitId,
            name:           spRow.sp.name,
            supplierCode:   spRow.sp.supplierCode ?? null,
            unitCost:       spRow.sp.unitCost,
            currency:       spRow.sp.currency,
            unit:           spRow.sp.unit,
            categoryHint:   spRow.sp.categoryHint ?? null,
            isActive:       spRow.sp.isActive,
            lastUpdated:    spRow.sp.lastUpdated,
            createdAt:      spRow.sp.createdAt,
            supplierName:   spRow.supplierName,
          },
          suggestedProduct: {
            id:              bestProduct.id,
            businessUnitId:  bestProduct.businessUnitId,
            name:            bestProduct.name,
            description:     bestProduct.description ?? null,
            category:        bestProduct.category ?? null,
            sku:             bestProduct.sku,
            costPrice:       bestProduct.costPrice,
            basePrice:       bestProduct.basePrice,
            taxRate:         bestProduct.taxRate,
            isActive:        bestProduct.isActive,
            brand:           null,
            code:            null,
            showInCatalog:   false,
            catalogDescription: null,
            barcode:            bestProduct.barcode ?? null,
            supplierCode:       bestProduct.supplierCode ?? null,
            minimumSalePrice:   null,
            supplierId:         null,
            supplierLeadTime:   null,
            showCatalogPrice:   true,
            showCatalogStock:   false,
            createdAt:          bestProduct.createdAt,
            updatedAt:          bestProduct.updatedAt,
          } satisfies Product,
          score: bestScore,
        });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, 50);
  }

  /** Para tests: expone la función de tokenización */
  static tokenize = tokenize;

  /** Para tests: expone el cálculo Jaccard */
  static jaccardScore = jaccardScore;

  findById(id: number): ProductSupplierLink | null {
    const row = db
      .select()
      .from(productSupplierLinks)
      .where(eq(productSupplierLinks.id, id))
      .get();
    return row ? rowToLink(row) : null;
  }

  findByProductAndSupplierProduct(productId: number, supplierProductId: number): ProductSupplierLink | null {
    const row = db
      .select()
      .from(productSupplierLinks)
      .where(
        and(
          eq(productSupplierLinks.productId, productId),
          eq(productSupplierLinks.supplierProductId, supplierProductId),
        ),
      )
      .get();
    return row ? rowToLink(row) : null;
  }

  /** Solo para tests: devuelve todos los vínculos de un producto (incluyendo isPreferred) */
  findAllForProduct(productId: number): ProductSupplierLink[] {
    return db
      .select()
      .from(productSupplierLinks)
      .where(eq(productSupplierLinks.productId, productId))
      .all()
      .map(rowToLink);
  }

  /**
   * Devuelve todos los productos del catálogo de proveedores de la BU
   * que NO tienen ningún vínculo con un producto propio.
   */
  findUnlinkedForBU(businessUnitId: number): UnlinkedSupplierProduct[] {
    const rows = db
      .select({
        sp:          supplierProducts,
        supplierName: suppliers.name,
        linkId:      productSupplierLinks.id,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .leftJoin(
        productSupplierLinks,
        and(
          eq(productSupplierLinks.supplierProductId, supplierProducts.id),
          eq(productSupplierLinks.businessUnitId, businessUnitId),
        ),
      )
      .where(
        and(
          eq(supplierProducts.businessUnitId, businessUnitId),
          eq(supplierProducts.isActive, true),
          isNull(productSupplierLinks.id),
        ),
      )
      .orderBy(suppliers.name, supplierProducts.name)
      .all();

    return rows.map((r) => ({
      supplierProductId: r.sp.id,
      supplierId:        r.sp.supplierId,
      supplierName:      r.supplierName,
      supplierCode:      r.sp.supplierCode ?? null,
      name:              r.sp.name,
      unitCost:          r.sp.unitCost,
      unit:              r.sp.unit,
    }));
  }

  /**
   * Crea un producto propio a partir de un producto del catálogo del proveedor,
   * vincula ambos y opcionalmente setea stock inicial.
   * Todo en una única transacción SQLite.
   */
  createProductFromSupplier(input: CreateFromSupplierInput): Product {
    const { supplierProductId, businessUnitId, name, salePrice, costPrice, initialStock } = input;
    const effectiveCost = costPrice ?? 0;

    const sku = generateSku(name);

    let createdProduct!: typeof products.$inferSelect;

    const doCreate = sqlite.transaction(() => {
      // 1 — insertar producto
      createdProduct = db
        .insert(products)
        .values({
          businessUnitId,
          name,
          sku,
          costPrice:  effectiveCost,
          basePrice:  salePrice,
          taxRate:    21,
          isActive:   true,
        })
        .returning()
        .get();

      // 2 — crear vínculo con el producto del proveedor
      db.insert(productSupplierLinks)
        .values({
          productId:         createdProduct.id,
          supplierProductId,
          businessUnitId,
          isPreferred:       1,
        })
        .run();

      // 3 — stock inicial (si se especificó)
      const qty = initialStock != null && initialStock > 0 ? Math.round(initialStock) : 0;
      db.insert(stockItems)
        .values({
          productId:        createdProduct.id,
          businessUnitId,
          quantity:         qty,
          minimumThreshold: 5,
        })
        .run();
    });

    doCreate();

    return {
      id:                 createdProduct.id,
      businessUnitId:     createdProduct.businessUnitId,
      name:               createdProduct.name,
      description:        createdProduct.description ?? null,
      category:           createdProduct.category ?? null,
      sku:                createdProduct.sku,
      costPrice:          createdProduct.costPrice,
      basePrice:          createdProduct.basePrice,
      taxRate:            createdProduct.taxRate,
      isActive:           createdProduct.isActive,
      brand:              null,
      code:               null,
      showInCatalog:      false,
      catalogDescription: null,
      barcode:            createdProduct.barcode ?? null,
      supplierCode:       createdProduct.supplierCode ?? null,
      minimumSalePrice:   null,
      supplierId:         null,
      supplierLeadTime:   null,
      showCatalogPrice:   true,
      showCatalogStock:   false,
      createdAt:          createdProduct.createdAt,
      updatedAt:          createdProduct.updatedAt,
    };
  }
}
