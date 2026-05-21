-- ============================================================================
-- CLARITY COMMUNITY — Supabase Migration
-- ============================================================================
-- Im Supabase SQL Editor komplett ausführen. Idempotent.
-- ============================================================================


-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================
-- auth.uid() = Supabase Auth UUID. Wir brauchen aber meistens community_profiles.id.
-- Diese Helpers übersetzen zwischen den beiden.

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from community_profiles where clarity_id = auth.uid() limit 1;
$$;

create or replace function public.is_platform_ceo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_ceo from community_profiles where clarity_id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.is_community_admin(p_community_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_platform_ceo()
    or exists (
      select 1 from community_members m
      where m.community_id = p_community_id
        and m.profile_id = public.current_profile_id()
        and m.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from communities c
      where c.id = p_community_id
        and c.created_by = public.current_profile_id()
    );
$$;

grant execute on function public.current_profile_id() to anon, authenticated;
grant execute on function public.is_platform_ceo() to anon, authenticated;
grant execute on function public.is_community_admin(uuid) to anon, authenticated;


-- ============================================================================
-- 2. NEW TABLES — Course Tests (Bug 13 / Feature 2)
-- ============================================================================

create table if not exists public.community_course_tests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.community_courses(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid references public.community_profiles(id) on delete set null,
  title text not null default 'Test',
  created_at timestamptz not null default now()
);
create index if not exists idx_course_tests_course on public.community_course_tests(course_id);
create index if not exists idx_course_tests_community on public.community_course_tests(community_id);

create table if not exists public.community_course_test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.community_course_tests(id) on delete cascade,
  question_type text not null check (question_type in ('multipleChoice','trueFalse','fillInBlank','freeResponse')),
  question_text text not null,
  options_json text,
  correct_answer text,
  order_index int not null default 0
);
create index if not exists idx_test_questions_test on public.community_course_test_questions(test_id, order_index);

create table if not exists public.community_course_test_results (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.community_course_tests(id) on delete cascade,
  course_id uuid not null references public.community_courses(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.community_profiles(id) on delete cascade,
  score double precision not null,
  stars int not null check (stars between 0 and 5),
  passed boolean not null,
  completed_at timestamptz not null default now()
);
create index if not exists idx_test_results_profile on public.community_course_test_results(profile_id);
create index if not exists idx_test_results_course on public.community_course_test_results(course_id);
create index if not exists idx_test_results_lookup on public.community_course_test_results(profile_id, course_id, passed);


-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

alter table public.community_profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_courses enable row level security;
alter table public.community_lessons enable row level security;
alter table public.community_subgroups enable row level security;
alter table public.community_course_tests enable row level security;
alter table public.community_course_test_questions enable row level security;
alter table public.community_course_test_results enable row level security;


-- ============================================================================
-- 4. PUBLIC READ POLICIES
-- ============================================================================
-- Damit Feed, Kurse, Leaderboard, Members etc. überhaupt Daten laden.

do $$
declare t text;
declare tables text[] := array[
  'community_profiles','communities','community_members','community_posts',
  'community_post_likes','community_comments','community_courses',
  'community_lessons','community_subgroups','community_course_tests',
  'community_course_test_questions'
];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
  end loop;
end$$;


-- ============================================================================
-- 5. community_profiles
-- ============================================================================

drop policy if exists "insert own profile" on public.community_profiles;
create policy "insert own profile"
  on public.community_profiles for insert
  with check (clarity_id = auth.uid());

drop policy if exists "update own profile" on public.community_profiles;
create policy "update own profile"
  on public.community_profiles for update
  using (clarity_id = auth.uid() or public.is_platform_ceo())
  with check (clarity_id = auth.uid() or public.is_platform_ceo());


-- ============================================================================
-- 6. communities
-- ============================================================================

drop policy if exists "create community" on public.communities;
create policy "create community"
  on public.communities for insert
  with check (auth.uid() is not null and created_by = public.current_profile_id());

drop policy if exists "update community" on public.communities;
create policy "update community"
  on public.communities for update
  using (public.is_community_admin(id))
  with check (public.is_community_admin(id));

drop policy if exists "delete community" on public.communities;
create policy "delete community"
  on public.communities for delete
  using (created_by = public.current_profile_id() or public.is_platform_ceo());


-- ============================================================================
-- 7. community_members
-- ============================================================================

drop policy if exists "join community" on public.community_members;
create policy "join community"
  on public.community_members for insert
  with check (profile_id = public.current_profile_id() or public.is_community_admin(community_id));

drop policy if exists "update member" on public.community_members;
create policy "update member"
  on public.community_members for update
  using (public.is_community_admin(community_id) or profile_id = public.current_profile_id());

drop policy if exists "leave or remove" on public.community_members;
create policy "leave or remove"
  on public.community_members for delete
  using (profile_id = public.current_profile_id() or public.is_community_admin(community_id));


-- ============================================================================
-- 8. community_posts
-- ============================================================================

drop policy if exists "create post" on public.community_posts;
create policy "create post"
  on public.community_posts for insert
  with check (auth.uid() is not null and author_id = public.current_profile_id());

drop policy if exists "update post" on public.community_posts;
create policy "update post"
  on public.community_posts for update
  using (author_id = public.current_profile_id() or public.is_community_admin(community_id));

drop policy if exists "delete post" on public.community_posts;
create policy "delete post"
  on public.community_posts for delete
  using (author_id = public.current_profile_id() or public.is_community_admin(community_id));


-- ============================================================================
-- 9. community_post_likes
-- ============================================================================

drop policy if exists "like post" on public.community_post_likes;
create policy "like post"
  on public.community_post_likes for insert
  with check (profile_id = public.current_profile_id());

drop policy if exists "unlike post" on public.community_post_likes;
create policy "unlike post"
  on public.community_post_likes for delete
  using (profile_id = public.current_profile_id());


-- ============================================================================
-- 10. community_comments
-- ============================================================================

drop policy if exists "create comment" on public.community_comments;
create policy "create comment"
  on public.community_comments for insert
  with check (auth.uid() is not null and author_id = public.current_profile_id());

drop policy if exists "update comment" on public.community_comments;
create policy "update comment"
  on public.community_comments for update
  using (author_id = public.current_profile_id());

drop policy if exists "delete comment" on public.community_comments;
create policy "delete comment"
  on public.community_comments for delete
  using (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and public.is_community_admin(p.community_id)
    )
  );


-- ============================================================================
-- 11. community_courses & community_lessons
-- ============================================================================

drop policy if exists "manage courses" on public.community_courses;
create policy "manage courses"
  on public.community_courses for all
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

drop policy if exists "manage lessons" on public.community_lessons;
create policy "manage lessons"
  on public.community_lessons for all
  using (
    exists (
      select 1 from public.community_courses c
      where c.id = community_lessons.course_id
        and public.is_community_admin(c.community_id)
    )
  )
  with check (
    exists (
      select 1 from public.community_courses c
      where c.id = community_lessons.course_id
        and public.is_community_admin(c.community_id)
    )
  );


-- ============================================================================
-- 12. community_subgroups
-- ============================================================================

drop policy if exists "manage subgroups" on public.community_subgroups;
create policy "manage subgroups"
  on public.community_subgroups for all
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));


-- ============================================================================
-- 13. community_course_tests
-- ============================================================================

drop policy if exists "manage tests" on public.community_course_tests;
create policy "manage tests"
  on public.community_course_tests for all
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

drop policy if exists "manage test questions" on public.community_course_test_questions;
create policy "manage test questions"
  on public.community_course_test_questions for all
  using (
    exists (
      select 1 from public.community_course_tests t
      where t.id = community_course_test_questions.test_id
        and public.is_community_admin(t.community_id)
    )
  )
  with check (
    exists (
      select 1 from public.community_course_tests t
      where t.id = community_course_test_questions.test_id
        and public.is_community_admin(t.community_id)
    )
  );


-- ============================================================================
-- 14. community_course_test_results
-- ============================================================================

drop policy if exists "read own or admin results" on public.community_course_test_results;
create policy "read own or admin results"
  on public.community_course_test_results for select
  using (profile_id = public.current_profile_id() or public.is_community_admin(community_id));

drop policy if exists "submit own test result" on public.community_course_test_results;
create policy "submit own test result"
  on public.community_course_test_results for insert
  with check (profile_id = public.current_profile_id());


-- ============================================================================
-- 15. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
-- Damit jeder neue Auth-User automatisch eine community_profiles-Zeile bekommt.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  default_name text;
begin
  default_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1),
    'User'
  );

  insert into public.community_profiles (
    clarity_id, display_name, avatar_emoji, total_points, level,
    is_verified, is_ceo, is_banned, created_at
  )
  values (
    new.id,
    default_name,
    '😊',
    0,
    1,
    false,
    new.email = 'clarity.support@icloud.com',
    false,
    now()
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 16. BACKFILL — Profile für bereits existierende Auth-Users anlegen
-- ============================================================================

insert into public.community_profiles (
  clarity_id, display_name, avatar_emoji, total_points, level,
  is_verified, is_ceo, is_banned, created_at
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'User'),
  '😊',
  0,
  1,
  false,
  u.email = 'clarity.support@icloud.com',
  false,
  now()
from auth.users u
where not exists (
  select 1 from public.community_profiles p where p.clarity_id = u.id
);


-- ============================================================================
-- 17. CEO FLAG — sicherstellen, dass der CEO-Account is_ceo = true hat
-- ============================================================================

update public.community_profiles p
set is_ceo = true, is_verified = true
from auth.users u
where p.clarity_id = u.id and u.email = 'clarity.support@icloud.com';


-- ============================================================================
-- 18. STORAGE — Public Bucket Policy für community-images
-- ============================================================================
-- Falls der Bucket schon existiert: nur die Policies setzen.
-- Falls nicht: erst manuell im Dashboard "community-images" als Public Bucket anlegen.

do $$
begin
  -- Bucket-Policies (idempotent)
  if exists (select 1 from storage.buckets where id = 'community-images') then
    -- Public read
    delete from storage.policies where name = 'community-images public read' and bucket_id = 'community-images';
  end if;
exception when others then null;
end$$;

-- Done.
