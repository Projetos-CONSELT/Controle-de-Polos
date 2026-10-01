-- Migration: Create polo_stock, polo_loans, and loan_notifications tables with Realtime support
-- Generated for real-time synchronization between Supabase and frontend

-- 1. Create polo_stock table
CREATE TABLE IF NOT EXISTS public.polo_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('sede', 'evento')),
  size TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  available INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT polo_stock_type_size_unique UNIQUE (type, size)
);

-- 2. Create polo_loans table
CREATE TABLE IF NOT EXISTS public.polo_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sede', 'evento')),
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_return TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'return_pending', 'returned')),
  returned_date TIMESTAMP WITH TIME ZONE,
  return_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create loan_notifications table
CREATE TABLE IF NOT EXISTS public.loan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.polo_loans(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approved', 'rejected', 'return_approved', 'return_rejected')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create trigger function to update updated_at if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach triggers to polo_stock and polo_loans
DROP TRIGGER IF EXISTS update_polo_stock_updated_at ON public.polo_stock;
CREATE TRIGGER update_polo_stock_updated_at
  BEFORE UPDATE ON public.polo_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_polo_loans_updated_at ON public.polo_loans;
CREATE TRIGGER update_polo_loans_updated_at
  BEFORE UPDATE ON public.polo_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.polo_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polo_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_notifications ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for polo_stock (allow reading and updating)
DROP POLICY IF EXISTS "Allow select for polo_stock" ON public.polo_stock;
CREATE POLICY "Allow select for polo_stock"
  ON public.polo_stock FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert for polo_stock" ON public.polo_stock;
CREATE POLICY "Allow insert for polo_stock"
  ON public.polo_stock FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for polo_stock" ON public.polo_stock;
CREATE POLICY "Allow update for polo_stock"
  ON public.polo_stock FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for polo_stock" ON public.polo_stock;
CREATE POLICY "Allow delete for polo_stock"
  ON public.polo_stock FOR DELETE
  TO anon, authenticated
  USING (true);

-- 7. Create RLS Policies for polo_loans
DROP POLICY IF EXISTS "Allow select for polo_loans" ON public.polo_loans;
CREATE POLICY "Allow select for polo_loans"
  ON public.polo_loans FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert for polo_loans" ON public.polo_loans;
CREATE POLICY "Allow insert for polo_loans"
  ON public.polo_loans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for polo_loans" ON public.polo_loans;
CREATE POLICY "Allow update for polo_loans"
  ON public.polo_loans FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for polo_loans" ON public.polo_loans;
CREATE POLICY "Allow delete for polo_loans"
  ON public.polo_loans FOR DELETE
  TO anon, authenticated
  USING (true);

-- 8. Create RLS Policies for loan_notifications
DROP POLICY IF EXISTS "Allow select for loan_notifications" ON public.loan_notifications;
CREATE POLICY "Allow select for loan_notifications"
  ON public.loan_notifications FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert for loan_notifications" ON public.loan_notifications;
CREATE POLICY "Allow insert for loan_notifications"
  ON public.loan_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for loan_notifications" ON public.loan_notifications;
CREATE POLICY "Allow update for loan_notifications"
  ON public.loan_notifications FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for loan_notifications" ON public.loan_notifications;
CREATE POLICY "Allow delete for loan_notifications"
  ON public.loan_notifications FOR DELETE
  TO anon, authenticated
  USING (true);

-- 9. Enable Realtime Publications and Replica Identity
ALTER TABLE public.polo_stock REPLICA IDENTITY FULL;
ALTER TABLE public.polo_loans REPLICA IDENTITY FULL;
ALTER TABLE public.loan_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'polo_stock'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.polo_stock;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'polo_loans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.polo_loans;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'loan_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_notifications;
  END IF;
END $$;

-- 10. Seed initial stock data for Sede (total 32) and Evento (total 48)
INSERT INTO public.polo_stock (type, size, total, available) VALUES
  ('sede', 'PP', 2, 2),
  ('sede', 'P', 6, 6),
  ('sede', 'M', 12, 12),
  ('sede', 'G', 8, 8),
  ('sede', 'GG', 3, 3),
  ('sede', 'XGG', 1, 1),
  ('evento', 'PP', 5, 5),
  ('evento', 'P', 10, 10),
  ('evento', 'M', 15, 15),
  ('evento', 'G', 10, 10),
  ('evento', 'GG', 5, 5),
  ('evento', 'XGG', 3, 3)
ON CONFLICT (type, size) DO UPDATE 
SET 
  total = EXCLUDED.total,
  available = EXCLUDED.available;
