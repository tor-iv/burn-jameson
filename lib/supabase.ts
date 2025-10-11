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
  venmo_username: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rebate_amount?: number;
  venmo_payment_id?: string;
  paid_at?: string;
  admin_notes?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}
