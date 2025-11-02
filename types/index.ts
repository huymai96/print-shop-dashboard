// User roles
export type UserRole = 'admin' | 'manager' | 'operator';

// Platform types
export type Platform = 'gelato' | 'fast_platform' | 'shopworks' | 'custom_ink' | 'ooshirts' | 'samedaycustom';

// Order status
export type OrderStatus = 'pending' | 'printing' | 'embroidery' | 'qc' | 'packing' | 'shipped' | 'completed' | 'cancelled';

// Decoration methods
export type DecorationMethod = 'screen_print' | 'embroidery' | 'dtg' | 'sublimation' | 'heat_transfer' | 'other';

// User type
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
  last_login?: Date;
}

// Order type
export interface Order {
  id: string;
  order_number: string;
  platform: Platform;
  customer_name?: string;
  customer_email?: string;
  quantity: number;
  decoration_method: DecorationMethod;
  due_date: Date;
  status: OrderStatus;
  priority: boolean;
  assigned_to?: string; // user id
  notes?: string;
  order_details?: any; // JSON field for platform-specific data
  created_at: Date;
  updated_at: Date;
  synced_at: Date;
}

// Order with relations
export interface OrderWithRelations extends Order {
  assigned_user?: User;
}

// Order filters
export interface OrderFilters {
  platform?: Platform;
  status?: OrderStatus;
  decoration_method?: DecorationMethod;
  date_from?: Date;
  date_to?: Date;
  assigned_to?: string;
  priority?: boolean;
  search?: string;
}

// Sync log
export interface SyncLog {
  id: string;
  platform: Platform;
  status: 'success' | 'error';
  orders_synced: number;
  error_message?: string;
  synced_at: Date;
}

// API response types for integrations
export interface GelatoOrder {
  id: string;
  orderReferenceId: string;
  quantity: number;
  dueDate: string;
  status: string;
  customer?: {
    email?: string;
    name?: string;
  };
}

export interface FastPlatformOrder {
  order_id: string;
  order_number: string;
  quantity: number;
  decoration_type: string;
  delivery_date: string;
  status: string;
  customer_info?: any;
}

export interface FileMakerOrder {
  recordId: string;
  fieldData: {
    OrderNumber: string;
    Quantity: number;
    DecorationMethod: string;
    DueDate: string;
    Status: string;
    CustomerName?: string;
  };
}

