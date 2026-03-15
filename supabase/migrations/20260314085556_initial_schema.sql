-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table for user profiles linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  avatar_url text
);

-- Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Create a table for repositories
create table if not exists public.repositories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  repo_url text not null,
  name text not null,
  last_commit_hash text,
  file_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for repositories
alter table public.repositories enable row level security;
create policy "Users can view their own repositories." on repositories for select using (auth.uid() = user_id);
create policy "Users can insert their own repositories." on repositories for insert with check (auth.uid() = user_id);
create policy "Users can update their own repositories." on repositories for update using (auth.uid() = user_id);
create policy "Users can delete their own repositories." on repositories for delete using (auth.uid() = user_id);

-- Create a table for code chunks and embeddings
create table if not exists public.code_chunks (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references public.repositories(id) on delete cascade not null,
  file_path text not null,
  content text not null,
  embedding vector(1536), -- 1536 is for OpenAI embeddings; adjust to 768 for Gemini
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for code_chunks
alter table public.code_chunks enable row level security;
-- Users can only view code chunks belonging to their repositories
create policy "Users can view their own code chunks." on code_chunks for select using (
  exists (
    select 1 from public.repositories
    where repositories.id = code_chunks.repo_id
    and repositories.user_id = auth.uid()
  )
);
-- Users can insert code chunks for their repositories
create policy "Users can insert their own code chunks." on code_chunks for insert with check (
  exists (
    select 1 from public.repositories
    where repositories.id = code_chunks.repo_id
    and repositories.user_id = auth.uid()
  )
);
-- Users can delete their own code chunks.
create policy "Users can delete their own code chunks." on code_chunks for delete using (
  exists (
    select 1 from public.repositories
    where repositories.id = code_chunks.repo_id
    and repositories.user_id = auth.uid()
  )
);

-- Create an index to speed up similarity search
create index on public.code_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Make sure to set up Auth triggers to automatically create an entry in 'profiles'
-- when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
