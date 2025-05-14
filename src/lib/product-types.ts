
export type ProductType = 'sativa' | 'indica' | 'hibrido' | 'other';

export interface Product {
  id?: number;
  name: string;
  type: ProductType;
  thcContent: number;
  cbdContent: number;
  price: number;
  stock: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}
