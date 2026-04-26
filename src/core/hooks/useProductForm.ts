import { useState } from 'react';
import { createProductSchema, updateProductSchema } from '@/lib/validations/core/products';
import { productsApi } from '@/lib/api/products';
import type { Product } from '@shared/types';

export function useProductForm(businessUnitId: number, onSuccess?: () => void) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sku: '',
    costPrice: 0,
    basePrice: 0,
    taxRate: 21,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const schema = createProductSchema;
    const result = schema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
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
      await productsApi.create(businessUnitId, formData);
      setFormData({
        name: '',
        description: '',
        category: '',
        sku: '',
        costPrice: 0,
        basePrice: 0,
        taxRate: 21,
      });
      onSuccess?.();
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : 'Error al crear producto',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { formData, setFormData, errors, isSubmitting, onSubmit, validate };
}
