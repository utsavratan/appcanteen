export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  item_type: 'veg' | 'non_veg' | 'beverages' | 'snacks' | 'meals';
  image_url: string | null;
  is_available: boolean;
  is_trending: boolean;
  is_recommended: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  preparation_time_mins: number;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  session_id: string;
  name: string | null;
  mobile: string | null;
  loyalty_points: number;
  wallet_balance: number;
  favorite_items: string[];
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  token_number: number;
  customer_id: string | null;
  status: OrderStatus;
  payment_mode: 'cash' | 'upi' | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  convenience_fee: number;
  grand_total: number;
  coupon_code: string | null;
  transaction_id: string | null;
  payment_screenshot_url: string | null;
  pickup_time: string | null;
  notes: string | null;
  gst_enabled: boolean;
  loyalty_points_used: number;
  loyalty_points_earned: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  quantity: number;
  total: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  expires_at: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_role: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export type OrderStatus = 'pending_payment' | 'awaiting_verification' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  awaiting_verification: 'Awaiting Verification',
  paid: 'Paid',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: 'bg-canteen-amber/20 text-canteen-amber',
  awaiting_verification: 'bg-canteen-purple/20 text-canteen-purple',
  paid: 'bg-canteen-teal/20 text-canteen-teal',
  preparing: 'bg-primary/20 text-primary',
  ready: 'bg-canteen-veg/20 text-canteen-veg',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/20 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};
