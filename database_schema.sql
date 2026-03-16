-- --- Maharaja Travels: Neon Database Schema ---

-- 1. Create users table for custom auth
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    package TEXT NOT NULL,
    travelers INTEGER NOT NULL DEFAULT 1,
    total TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    user_email TEXT,
    payment_id TEXT,
    method TEXT
);

-- Note: Neon (Standard Postgres) doesn't use Supabase-style RLS policies 
-- in the same way for Express apps. Access control is handled in server.js.

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON public.bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
