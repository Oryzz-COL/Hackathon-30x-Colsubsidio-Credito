-- Esquema de referencia Supabase/Postgres. No se aplica automáticamente.
-- Supabase 2026: habilitar exposición del Data API explícitamente si el proyecto la desactiva.
create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null,
  retention_days int not null default 90 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null, role text not null check (role in ('ADVISOR','ANALYST','PRIVACY','ADMIN')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null, primary key (workspace_id,user_id)
);
create table public.profiles (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  display_name text not null, city text, affiliation_status text, synthetic boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index profiles_workspace_idx on public.profiles(workspace_id, created_at desc) where deleted_at is null;
create table public.profile_identifiers (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id) on delete cascade, kind text not null,
  encrypted_value text not null, masked_value text not null, fingerprint text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,kind,fingerprint)
);
create table public.consents (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id) on delete cascade, purpose text not null,
  text_version text not null, status text not null check (status in ('ACTIVE','REVOKED','EXPIRED')),
  valid_from timestamptz not null, valid_until timestamptz, revoked_at timestamptz,
  evidence_reference text, synthetic boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.consent_scopes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  consent_id uuid not null references public.consents(id) on delete cascade, scope text not null,
  source_ids uuid[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.data_sources (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  name text not null, source_type text not null, legal_basis text not null, enabled boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.evidence (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id) on delete cascade, data_source_id uuid references public.data_sources(id),
  source_reference text not null, captured_at timestamptz not null, last_verified_at timestamptz,
  confidence numeric(4,3) check (confidence between 0 and 1), status text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.data_points (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id) on delete cascade, evidence_id uuid references public.evidence(id),
  field_key text not null, value_encrypted text, normalized_value text, data_nature text not null,
  source_type text not null, confidence numeric(4,3), consent_scope text, excluded boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index data_points_profile_idx on public.data_points(workspace_id, profile_id, field_key);

create table public.connectors (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  connector_key text not null, config jsonb not null default '{}', enabled boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,connector_key)
);
create table public.product_catalog (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  product_key text not null, version text not null, name text not null, config jsonb not null,
  valid_from timestamptz not null, valid_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,product_key,version)
);
create table public.product_requirements (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  product_id uuid not null references public.product_catalog(id) on delete cascade, label text not null,
  config jsonb not null default '{}', official_status text not null default 'PENDING_VALIDATION',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.rule_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  version text not null, status text not null, checksum text not null, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,version)
);
create table public.affinity_rules (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  rule_version_id uuid not null references public.rule_versions(id), product_id uuid not null references public.product_catalog(id),
  category text not null, weight numeric not null, category_cap numeric not null, expression jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.affinity_results (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id) on delete cascade, product_id uuid not null references public.product_catalog(id),
  rule_version_id uuid not null references public.rule_versions(id), affinity_score numeric not null check (affinity_score between 0 and 100),
  confidence numeric not null check (confidence between 0 and 100), explanation jsonb not null, requires_human_review boolean not null,
  calculated_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index affinity_results_profile_idx on public.affinity_results(workspace_id,profile_id,calculated_at desc);
create table public.recommendations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id), affinity_result_id uuid not null references public.affinity_results(id),
  status text not null default 'PENDING_HUMAN_REVIEW', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.recommendation_explanations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade, provider text not null,
  structured_output jsonb not null, grounded boolean not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.review_cases (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  recommendation_id uuid references public.recommendations(id), reason text not null, status text not null,
  assigned_to uuid references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.review_actions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  review_case_id uuid not null references public.review_cases(id) on delete cascade, reviewer_id uuid references public.users(id),
  action text not null, comment text, before_state jsonb, after_state jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.batch_jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  status text not null, total_rows int not null, processed_rows int not null default 0, config jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.batch_rows (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  batch_job_id uuid not null references public.batch_jobs(id) on delete cascade, row_number int not null, status text not null,
  errors jsonb not null default '[]', profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(batch_job_id,row_number)
);
create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  user_id uuid references public.users(id), provider text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade, role text not null,
  content_redacted text not null, evidence_ids uuid[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  actor_id uuid references public.users(id), action text not null, subject_type text, subject_id uuid,
  metadata_redacted jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index audit_events_workspace_idx on public.audit_events(workspace_id,created_at desc);
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  profile_id uuid not null references public.profiles(id), status text not null, requested_at timestamptz not null default now(),
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Aislamiento de tenant: toda tabla expuesta usa RLS. Las políticas no confían en user_metadata.
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','users','workspace_members','profiles','profile_identifiers','consents','consent_scopes',
    'data_sources','evidence','data_points','connectors','product_catalog','product_requirements','rule_versions',
    'affinity_rules','affinity_results','recommendations','recommendation_explanations','review_cases','review_actions',
    'batch_jobs','batch_rows','assistant_conversations','assistant_messages','audit_events','deletion_requests'
  ] loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- Ejemplo de política para aplicar a tablas con workspace_id.
create policy "members_select_profiles" on public.profiles for select to authenticated
using (exists(select 1 from public.workspace_members m where m.workspace_id = profiles.workspace_id and m.user_id = (select auth.uid())));
create policy "members_insert_profiles" on public.profiles for insert to authenticated
with check (exists(select 1 from public.workspace_members m where m.workspace_id = profiles.workspace_id and m.user_id = (select auth.uid())));
create policy "members_update_profiles" on public.profiles for update to authenticated
using (exists(select 1 from public.workspace_members m where m.workspace_id = profiles.workspace_id and m.user_id = (select auth.uid())))
with check (exists(select 1 from public.workspace_members m where m.workspace_id = profiles.workspace_id and m.user_id = (select auth.uid())));

-- Si Data API está deshabilitada por defecto en el proyecto, otorgar solo las tablas y operaciones necesarias.
-- grant select, insert, update on public.profiles to authenticated;
