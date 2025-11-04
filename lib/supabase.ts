import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email?: string;
  phone?: string;
  age_verified_at?: string;
  created_at: string;
}

export interface BottleScan {
  id: string;
  user_id?: string;
  session_id: string;
  bottle_image?: string;
  detected_brand?: string;
  confidence?: number;
  scanned_at: string;
  status: 'pending_receipt' | 'completed' | 'rejected';
  ip_address?: string;
  user_agent?: string;
  image_hash?: string;
}

export interface Receipt {
  id: string;
  session_id: string;
  user_id?: string;
  image_url: string;
  paypal_email: string; // Updated from venmo_username
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rebate_amount?: number;
  paypal_payout_id?: string; // Updated from venmo_payment_id
  paid_at?: string;
  admin_notes?: string;
  image_hash?: string; // Added for duplicate detection
  auto_approved?: boolean; // Whether receipt was auto-approved by AI
  confidence_score?: number; // AI confidence score (0.00-1.00)
  review_reason?: string; // Reason for manual review if auto-approval failed
  auto_approved_at?: string; // Timestamp of auto-approval
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

// PayPal Webhook Types
export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: {
    payout_item_id: string;
    transaction_id?: string;
    transaction_status: string;
    payout_item_fee?: {
      currency: string;
      value: string;
    };
    payout_batch_id: string;
    sender_batch_id: string;
    payout_item: {
      amount: {
        currency: string;
        value: string;
      };
      receiver: string;
      sender_item_id: string; // Receipt ID
    };
    time_processed?: string;
    errors?: {
      name: string;
      message: string;
    };
  };
  summary?: string;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export type PayPalWebhookEventType =
  | 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED'
  | 'PAYMENT.PAYOUTS-ITEM.FAILED'
  | 'PAYMENT.PAYOUTS-ITEM.BLOCKED'
  | 'PAYMENT.PAYOUTS-ITEM.CANCELED'
  | 'PAYMENT.PAYOUTS-ITEM.DENIED'
  | 'PAYMENT.PAYOUTS-ITEM.HELD'
  | 'PAYMENT.PAYOUTS-ITEM.REFUNDED'
  | 'PAYMENT.PAYOUTS-ITEM.RETURNED'
  | 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED';
