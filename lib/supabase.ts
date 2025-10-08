import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email?: string;
  phone?: string;
  age_verified_at?: string;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id?: string;
  qr_code: string;
  scanned_at: string;
  coupon_code: string;
}

export interface Receipt {
  id: string;
  scan_id: string;
  user_id: string;
  image_url: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rebate_amount?: number;
  venmo_username?: string;
  paid_at?: string;
}
