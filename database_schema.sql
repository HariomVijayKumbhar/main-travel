-- --- Maharaja Travels: Supabase Database Schema ---

-- 1. Create bookings table
-- This table stores all booking transactions, including guest and registered user bookings.
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,                       -- Custom IDs like 'TXN123456789' or 'BK-XXXX'
    created_at TIMESTAMPTZ DEFAULT NOW(),      -- When the record was created
    name TEXT NOT NULL,                        -- Name of the traveler
    email TEXT NOT NULL,                       -- Email of the traveler
    package TEXT NOT NULL,                     -- Selected travel package
    travelers INTEGER NOT NULL DEFAULT 1,      -- Number of travelers
    total TEXT NOT NULL,                       -- Price string (e.g., '₹8,500')
    date TEXT NOT NULL,                        -- Booking/Travel date string
    status TEXT NOT NULL DEFAULT 'Pending',    -- Status (Pending, Confirmed, etc.)
    user_email TEXT,                           -- Associated user email (for history)
    payment_id TEXT,                           -- Transaction ID from payment gateway
    method TEXT                                -- Payment method (Card, UPI)
);

-- 2. Enable Row Level Security (RLS)
-- Supabase tables are protected by default. We need to define who can do what.
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: Allow authenticated users to insert their own bookings
CREATE POLICY "Users can insert their own bookings" 
ON public.bookings FOR INSERT 
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Policy: Allow users to see ONLY their own bookings
CREATE POLICY "Users can view their own bookings" 
ON public.bookings FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'email' = user_email);

-- 4. Create profiles table (Optional but highly recommended for User Data)
-- This links to Supabase's built-in Auth system.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- --- Setup Instructions ---
-- 1. Go to your Supabase Dashboard.
-- 2. Open the 'SQL Editor' from the left sidebar.
-- 3. Click 'New query'.
-- 4. Paste ALL the code above into the editor.
-- 5. Click 'Run'.
