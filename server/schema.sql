create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  display_name text,
  role text not null default 'user',
  education_level text,
  is_active boolean not null default true,
  plan text default 'Miễn phí',
  plan_start_date date,
  plan_end_date date,
  avatar_url text,
  created_at timestamptz not null default now()
);


create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  user_id uuid references users(id),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_subjects_user_id on subjects(user_id);


create table if not exists curricula (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  grade text,
  education_level text,
  is_public boolean not null default false,
  publisher text,
  lesson_count integer not null default 0,
  file_url text,
  file_content text,
  image_url text,
  sort_order integer not null default 0,
  user_id uuid references users(id),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_curricula_user_id on curricula(user_id);


create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  title text not null,
  description text,
  content jsonb not null default '[]'::jsonb,
  summary text,
  key_points text[] not null default '{}'::text[],
  vocabulary jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  question text not null,
  options text[] not null default '{}',
  correct_index integer not null default 0,
  explanation text,
  created_at timestamptz not null default now()
);

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  front text not null,
  back text not null,
  created_at timestamptz not null default now()
);

create table if not exists lesson_images (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  file_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);

create table if not exists quizlet_sets (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  description text,
  grade text,
  education_level text,
  is_public boolean not null default false,
  user_id uuid references users(id),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_quizlet_sets_user_id on quizlet_sets(user_id);


create table if not exists quizlet_terms (
  id uuid primary key default gen_random_uuid(),
  quizlet_set_id uuid not null references quizlet_sets(id) on delete cascade,
  term text not null,
  definition text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  description text,
  duration integer, -- in minutes
  grade text,
  education_level text,
  is_public boolean not null default false,
  user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_exams_user_id on exams(user_id);

create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  content text not null,
  type text not null, -- 'single', 'multiple', 'text'
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists exam_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references exam_questions(id) on delete cascade,
  content text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  score integer not null, -- percentage
  time_taken integer not null, -- in seconds
  created_at timestamptz not null default now()
);

create index if not exists idx_exam_results_exam_id on exam_results(exam_id);
create index if not exists idx_exam_results_user_id on exam_results(user_id);

create table if not exists dictation_exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level text not null default 'medium', -- 'easy', 'medium', 'hard', 'extreme'
  language text not null default 'vi', -- 'vi', 'en', 'ja'
  content text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dictation_created_by on dictation_exercises(created_by);

create table if not exists pictogram_questions (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  answer text not null,
  level text not null default 'medium',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pictogram_created_by on pictogram_questions(created_by);
