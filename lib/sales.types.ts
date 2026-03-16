export interface CustomerDetails {
  name: string;
  phone?: string;
  address?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock_level: number;
  product_metadata?: {
    image_url?: string;
    description?: string;
    brand?: string;
  };
}

export interface SalesRow {
  id: string;
  date: string;
  item: string;
  qty: number;
  total: number;
  employee: string;
  payment_type: 'cash' | 'debt';
  status: 'paid' | 'unpaid';
  customer_details?: CustomerDetails;
}

export interface DebtRow {
  id: string;
  customer_name: string;
  amount: number;
  paid: number;
  remaining: number;
  due_date: string;
  sale_id: string;
}

export type PaymentType = 'cash' | 'debt';
export type PaymentStatus = 'paid' | 'unpaid';

