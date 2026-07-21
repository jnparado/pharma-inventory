-- Run in Supabase SQL Editor to store prescription text with each record

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS prescription_text text;
