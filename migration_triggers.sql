-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id, 
    new.email, -- Use email as default username
    split_part(new.email, '@', 1), -- Default full name from email
    'user' -- Default role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger logic
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
