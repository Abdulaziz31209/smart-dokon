export interface CustomerDetails {
  name: string;
  phone?: string;
  address?: string;
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

