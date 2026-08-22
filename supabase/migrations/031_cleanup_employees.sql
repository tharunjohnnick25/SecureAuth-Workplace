-- ==========================================
-- Migration 031: Cleanup Employees Status Duplication
-- ==========================================

-- The employees table currently tracks 'status', which is also tracked in 'profiles' and 'users'.
-- To prevent divergence and maintain a single source of truth, we drop it from employees.
-- The canonical status for a user/employee is public.users.status (or profiles.status).

-- ALTER TABLE public.employees DROP COLUMN IF EXISTS status;
