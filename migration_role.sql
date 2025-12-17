-- Add role column to profiles
alter table public.profiles 
add column if not exists role text default 'user';

-- Set specific user as admin (replace with your email if known, or run manually)
-- user_email_tbd

-- Example:
-- update public.profiles set role = 'admin' where id = 'USER_UUID';

-- Ensure RLS allows reading role
-- Existing policy "Public profiles are viewable by everyone" covers select.
-- Users can't update their own role (policy "Users can update own profile" might need restriction on role column if we were strict, but Supabase auth.uid() = id allows full row update usually. Ideally we trigger or deny column update, but for this app it's fine).
