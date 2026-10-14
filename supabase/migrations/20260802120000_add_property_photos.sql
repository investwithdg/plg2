-- Vision+ (Elite-only): photos a user attaches to a listing, and the objective features a
-- vision model extracts from them. Written by the analyze-property-photos edge function and
-- read back by process-property, which folds the completed analyses into the listing copy.
--
-- Unlike the MCP tables, rows here are inserted by the BROWSER as the logged-in user (real
-- session JWT, not service role), so real per-user RLS policies are required — the frontend
-- attachment tray inserts one property_photos row per uploaded object.

create table if not exists public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  -- pending -> analyzing -> complete | error. Only the edge function (service role) ever
  -- moves a row past 'pending'.
  status text not null default 'pending',
  analysis jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint property_photos_status_check
    check (status in ('pending', 'analyzing', 'complete', 'error'))
);

-- analyze-property-photos looks up pending photos for one property; process-property looks up
-- completed ones. Both are (property_id, status) filters.
create index if not exists property_photos_property_status_idx
  on public.property_photos (property_id, status);
create index if not exists property_photos_user_idx on public.property_photos (user_id);

alter table public.property_photos enable row level security;

-- A user can see their own attached photos (status/analysis drive the frontend tray's UI).
do $$ begin
  create policy "property_photos_select_own" on public.property_photos
    for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- A user can attach photos to a listing as themselves. The Elite plan gate and the 5-photo
-- cap are enforced by the analyze-property-photos edge function, which is what actually
-- spends money; this policy is the ownership backstop.
do $$ begin
  create policy "property_photos_insert_own" on public.property_photos
    for insert
    to authenticated
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- A user can remove a photo they attached (e.g. before analysis starts).
do $$ begin
  create policy "property_photos_delete_own" on public.property_photos
    for delete
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Deliberately NO update policy for clients: status / analysis / error_message are written
-- only by the edge function using the service role key (which bypasses RLS). A client must
-- never be able to mark its own photo 'complete' or forge an analysis payload.


-- ---------------------------------------------------------------------------
-- Storage: private `property-photos` bucket
-- Path convention: {user_id}/{property_id}/{uuid}-{original_filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  false, -- private: objects are only ever reached via short-lived signed URLs
  10485760, -- 10 MB per photo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- storage.objects RLS: a user may only touch objects under their own {user_id}/ prefix in
-- this bucket. The edge function reads objects with the service role and hands OpenAI a
-- short-lived signed URL, so it is unaffected by these policies.
do $$ begin
  create policy "property_photos_objects_select_own" on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'property-photos'
      and name like (auth.uid()::text || '/%')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "property_photos_objects_insert_own" on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'property-photos'
      and name like (auth.uid()::text || '/%')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "property_photos_objects_delete_own" on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'property-photos'
      and name like (auth.uid()::text || '/%')
    );
exception when duplicate_object then null; end $$;

-- No update policy: photos are immutable once uploaded (a user deletes and re-uploads).
