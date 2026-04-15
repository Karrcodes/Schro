-- Migration: Add is_backlog to fin_tasks
ALTER TABLE public.fin_tasks ADD COLUMN is_backlog BOOLEAN DEFAULT false;
