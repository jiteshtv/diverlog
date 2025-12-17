-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Divers Table
create table public.divers (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  rank text, -- e.g. Supervisor, Diver 1, Diver 2
  email text,
  phone text,
  certification_no text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Jobs Table
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  job_name text not null,
  location text,
  client_name text,
  description text,
  status text default 'active', -- active, completed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dives Table
create table public.dives (
  id uuid default gen_random_uuid() primary key,
  dive_no serial unique, -- Auto incrementing dive number
  job_id uuid references public.jobs(id),
  diver_id uuid references public.divers(id),
  supervisor_id uuid references public.profiles(id), -- logged by
  date date not null default CURRENT_DATE,
  start_time time without time zone,
  end_time time without time zone,
  max_depth numeric,
  bottom_time interval,
  status text default 'in_progress', -- in_progress, completed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dive Events (Timeline)
create table public.dive_events (
  id uuid default gen_random_uuid() primary key,
  dive_id uuid references public.dives(id),
  event_time timestamp with time zone default timezone('utc'::text, now()) not null,
  event_type text not null, -- 'leave_surface', 'arrive_worksite', 'start_work', etc.
  description text,
  depth numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies for business tables (simplified for now: authenticated users have full access)
alter table divers enable row level security;
alter table jobs enable row level security;
alter table dives enable row level security;
alter table dive_events enable row level security;

create policy "Authenticated users can view/edit divers" on divers for all using (auth.role() = 'authenticated');
create policy "Authenticated users can view/edit jobs" on jobs for all using (auth.role() = 'authenticated');
create policy "Authenticated users can view/edit dives" on dives for all using (auth.role() = 'authenticated');
create policy "Authenticated users can view/edit dive_events" on dive_events for all using (auth.role() = 'authenticated');
