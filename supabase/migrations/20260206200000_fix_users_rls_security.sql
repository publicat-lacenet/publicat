-- Fix critical security vulnerabilities in users table RLS policies
-- Previous policies allowed ANY authenticated user to INSERT/DELETE users
-- This was a major security hole that could allow privilege escalation

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow delete for authenticated" ON users;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON users;

-- Create restrictive policies - only admin_global can insert/delete users
-- This matches the API-level restrictions and provides defense-in-depth

CREATE POLICY "Only admin_global can insert users"
ON users FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Only admin_global can delete users"
ON users FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
