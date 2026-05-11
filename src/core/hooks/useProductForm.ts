import { useState, useEffect } from 'react';
import { createProductSchema } from '@/lib/validations/core/products';
import { productsApi } from '@/lib/api/products';
import type { Product } from '@shared/types';

interface FormData {
  name: string;
  description: string;
  category: string;
  sku: string;
  costPrice: number;
  basePrice: number;
  taxRate: number;
  barcode: string;
  supplierCode: string;
}

const EMPTY: FormData = {
  name: '',
  description: '',
  category: '',
  sku: '',
  costPrice: 0,
  basePrice: 0,
  taxRate: 21,
  barcode: '',
  supplierCode: '',
};

/**
 * @param businessUnitId  BU a la que pertenece el producto.
 * @param onSuccess       Callback tras guardar exitosamente.
 * @param existingProduct Si se pasa, activa el modo edición.
 */
export function useProductForm(
  businessUnitId: number,
  onSuccess?: () => void,
  existingProduct?: Product,
) {
  const isEditMode = Boolean(existingProduct);

  const [formData, setFormData] = useState<FormData>(() =>
    existingProduct
      ? {
          name:         existingProduct.name,
          description:  existingProduct.description ?? '',
          category:     existingProduct.category ?? '',
          sku:          existingProduct.sku,
          costPrice:    existingProduct.costPrice,
          basePrice:    existingProduct.basePrice,
          taxRate:      existingProduct.taxRate,
          barcode:      existingProduct.barcode ?? '',
          supplierCode: existingProduct.supplierCode ?? '',
        }
      : EMPTY,
  );

  // Si cambia el producto (ej. abrir distinto modal), refrescar
  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name:         existingProduct.name,
        description:  existingProduct.description ?? '',
        category:     existingProduct.category ?? '',
        sku:          existingProduct.sku,
        costPrice:    existingProduct.costPrice,
        basePrice:    existingProduct.basePrice,
        taxRate:      existingProduct.taxRate,
        barcode:      existingProduct.barcode ?? '',
        supplierCode: existingProduct.supplierCode ?? '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingProduct?.id]);

  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const result = createProductSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        newErrors[err.path.join('.')] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      // Normalizar campos opcionales: string vacío → null para que el servidor no guarde ""
      const payload = {
        ...formData,
        barcode:      formData.barcode.trim()      || null,
        supplierCode: formData.supplierCode.trim() || null,
      };
      if (isEditMode && existingProduct) {
        await productsApi.update(existingProduct.id, businessUnitId, payload);
      } else {
        await productsApi.create(businessUnitId, payload);
        setFormData(EMPTY);
      }
      onSuccess?.();
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Error al guardar producto' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { formData, setFormData, errors, isSubmitting, onSubmit, validate, isEditMode };
}
