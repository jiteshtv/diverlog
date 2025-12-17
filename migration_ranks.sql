-- Create ranks table
create table if not exists ranks (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table ranks enable row level security;

-- Policy: Allow authenticated users to read/insert/delete (Simple policy for internal app)
create policy "Enable all access for authenticated users" on ranks
    for all using (auth.role() = 'authenticated');

-- Seed default data
insert into ranks (name) values 
('Supervisor'), 
('Diver 1'), 
('Diver 2'), 
('Diver 3'), 
('Tender'), 
('LSS')
on conflict (name) do nothing;
