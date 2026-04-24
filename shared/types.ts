export interface InstallationConfig {
  id: number;
  businessName: string;
  cuit: string;
  address: string;
  logoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessUnit {
  id: number;
  installationId: number;
  name: string;
  moduleId: string;
  isActive: boolean;
  invoicePrefix: string;
  lastInvoiceNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  installationId: number;
  email: string;
  role: 'admin' | 'cashier';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    code: string;
    message: string;
  };
}
