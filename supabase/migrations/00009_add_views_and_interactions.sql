-- Create views table for unique user views
create table if not exists public.views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  reel_id uuid references public.reels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id),
  unique(reel_id, user_id)
);

-- Ensure RLS for views
alter table public.views enable row level security;

create policy "Views are viewable by everyone" 
  on public.views for select 
  using (true);

create policy "Authenticated users can insert views" 
  on public.views for insert 
  with check (auth.role() = 'authenticated');

-- Policies for likes
alter table public.likes enable row level security;

create policy "Likes are viewable by everyone" 
  on public.likes for select 
  using (true);

create policy "Authenticated users can toggle likes" 
  on public.likes for insert 
  with check (auth.role() = 'authenticated');

create policy "Users can remove their own likes" 
  on public.likes for delete 
  using (auth.uid() = user_id);

-- Policies for comments
alter table public.comments enable row level security;

create policy "Comments are viewable by everyone" 
  on public.comments for select 
  using (true);

create policy "Authenticated users can insert comments" 
  on public.comments for insert 
  with check (auth.role() = 'authenticated');

create policy "Users can delete their own comments" 
  on public.comments for delete 
  using (auth.uid() = user_id);
