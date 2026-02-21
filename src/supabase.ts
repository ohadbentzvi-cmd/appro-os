import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export interface Building {
  id: string;
  name: string;
  address_street: string;
  address_city: string;
  num_floors: number;
  num_units: number;
  built_year: number | null;
  created_at: string;
}

export interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number;
  created_at: string;
}

export interface Person {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface UnitRole {
  id: string;
  unit_id: string;
  person_id: string;
  role_type: 'owner' | 'tenant';
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}
