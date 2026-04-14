-- Supabase database schema for this app
-- Covers:
-- - Subjects (môn học)
-- - Curricula (giáo trình)
-- - Lessons (bài học)
-- - Quiz questions + Flashcards + lesson summary (trắc nghiệm/flash/tổng kết)
-- - Student progress (tiến độ học sinh)
--
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- =========================
-- 1) Subjects
-- =========================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  description text,
  icon text,

  created_at timestamptz not null default now(),

  -- This app currently uses localStorage-based auth, so keep it flexible.
  created_by text
);

create index if not exists subjects_created_at_idx on public.subjects (created_at desc);

-- =========================
-- 2) Curricula (courses / textbooks)
-- =========================
create table if not exists public.curricula (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid not null references public.subjects (id) on delete cascade,

  name text not null,
  grade text,
  publisher text,

  -- TeacherPage uploads documents to Supabase Storage and stores the public URL here.
  file_url text,

  -- TeacherPage also stores extracted text for plain text files (PDF/DOCX will be null).
  file_content text,

  -- TeacherPage sets this explicitly.
  lesson_count integer not null default 0,

  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists curricula_subject_id_idx on public.curricula (subject_id);
create index if not exists curricula_created_at_idx on public.curricula (created_at desc);

-- =========================
-- 3) Lessons
-- =========================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),

  curriculum_id uuid not null references public.curricula (id) on delete cascade,

  title text not null,
  description text,

  -- Order of lesson within curriculum (optional).
  sort_order integer not null default 0,

  -- Matches mockData ContentBlock[] structure.
  content jsonb not null default '[]'::jsonb,

  -- Matches mockData: summary + keyPoints + vocabulary.
  summary text,
  key_points text[] not null default '{}'::text[],

  -- vocabulary: { word, meaning }[]
  vocabulary jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists lessons_curriculum_id_idx on public.lessons (curriculum_id);
create index if not exists lessons_curriculum_sort_idx on public.lessons (curriculum_id, sort_order asc);

-- =========================
-- 4) Quiz Questions
-- =========================
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null references public.lessons (id) on delete cascade,

  question text not null,

  -- mockData QuizQuestion.options: string[]
  options text[] not null default '{}',

  -- mockData QuizQuestion.correctIndex: number (0..options.length-1)
  correct_index integer not null,
  explanation text,

  created_at timestamptz not null default now()
);

create index if not exists quiz_questions_lesson_id_idx on public.quiz_questions (lesson_id);

-- =========================
-- 5) Flashcards
-- =========================
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null references public.lessons (id) on delete cascade,

  front text not null,
  back text not null,

  created_at timestamptz not null default now()
);

create index if not exists flashcards_lesson_id_idx on public.flashcards (lesson_id);

-- =========================
-- 6) Student Progress
-- =========================
-- The app currently marks progress as "completed lesson ids" in localStorage.
-- In DB, store one row per (student, lesson).
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),

  student_id text not null,

  lesson_id uuid not null references public.lessons (id) on delete cascade,

  completed boolean not null default false,
  completed_at timestamptz,

  created_at timestamptz not null default now(),

  unique (student_id, lesson_id)
);

create index if not exists lesson_progress_student_idx on public.lesson_progress (student_id);
create index if not exists lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

-- =========================
-- Helper view (optional)
-- =========================
-- This view aggregates quiz/flashcards into JSON arrays to be closer to the
-- frontend mockData shapes (lesson.quiz / lesson.flashcards).
create or replace view public.lessons_full as
select
  l.*,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', q.id::text,
        'question', q.question,
        'options', q.options,
        'correctIndex', q.correct_index,
        'explanation', q.explanation
      )
      order by q.created_at
    )
    from public.quiz_questions q
    where q.lesson_id = l.id
  ), '[]'::jsonb) as quiz,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', f.id::text,
        'front', f.front,
        'back', f.back
      )
      order by f.created_at
    )
    from public.flashcards f
    where f.lesson_id = l.id
  ), '[]'::jsonb) as flashcards
from public.lessons l;

-- =========================
-- 7) Quizlets (Flashcard sets)
-- =========================
create table if not exists public.quizlet_sets (
  id uuid primary key default gen_random_uuid(),
  
  title text not null,
  description text,
  
  subject_id uuid references public.subjects (id) on delete set null,
  grade text,
  
  is_public boolean not null default true,
  user_id uuid references public.users(id) on delete set null,
  created_by text,
  
  created_at timestamptz not null default now()
);

create index if not exists quizlet_sets_user_id_idx on public.quizlet_sets (user_id);
create index if not exists quizlet_sets_subject_id_idx on public.quizlet_sets (subject_id);

create table if not exists public.quizlet_terms (
  id uuid primary key default gen_random_uuid(),
  
  quizlet_set_id uuid not null references public.quizlet_sets (id) on delete cascade,
  
  term text not null,
  definition text not null,
  image_url text,
  
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quizlet_terms_set_id_idx on public.quizlet_terms (quizlet_set_id);


-- =========================
-- Storage bucket guidance
-- =========================
-- TeacherPage uses Supabase Storage:
-- - bucket: "documents"
-- - upload: storage.from("documents").upload(fileName, file)
-- - getPublicUrl() for file_url
--
-- In Supabase dashboard:
-- 1) Create bucket "documents"
-- 2) Make it public (or ensure storage policies allow public read)
--
-- Optional: if you enabled RLS on storage.objects, create policies to allow
-- anon insert/select for this bucket.
