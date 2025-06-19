import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Enhanced error checking and logging
console.log('🔧 Supabase Client Configuration:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseAnonKey?.length || 0,
  environment: import.meta.env.MODE
});

if (!supabaseUrl) {
  console.error("❌ VITE_SUPABASE_URL is not set. Please check your .env.local file.");
  console.error("Available env vars:", Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
}

if (!supabaseAnonKey) {
  console.error("❌ VITE_SUPABASE_ANON_KEY is not set. Please check your .env.local file.");
  console.error("Available env vars:", Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
}

// Create client even if env vars are missing to prevent crashes
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

// Test connection on client creation
if (supabaseUrl && supabaseAnonKey) {
  console.log('✅ Supabase client created successfully');
} else {
  console.warn('⚠️ Supabase client created with placeholder values - check environment variables');
}