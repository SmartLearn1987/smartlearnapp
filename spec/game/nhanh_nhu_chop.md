# Nhanh Như Chớp (Fast Response) - Game Specification

## Overview
"Nhanh Như Chớp" is a time-pressured multiple-choice quiz game. Users must answer a series of questions correctly within a fixed time limit. Correct answers contribute to a scoring streak, while incorrect answers or time expiration end the session.

## User Flow

### 1. Game Initialization
- **EntryPoint**: Users click "Bắt đầu" on the "Nhanh như chớp" card in the Game Grid.
- **Configuration Modal**:
    - Select Difficulty: Dễ (Easy), Trung bình (Medium), Khó (Hard).
    - Select Limit: Total number of questions (e.g., 10, 20).
    - Select Time: Total seconds for the session (e.g., 60s, 120s).
    - **Action**: "Chơi ngay" redirects to `/games/nhanhnhuchop/play?level=...&limit=...&time=...`.

### 2. Gameplay Phase
- **Interface**:
    - Large question text at the center.
    - 4 large multiple-choice buttons.
    - Floating countdown timer (Red when < 10s).
    - Progress sidebar showing current question vs. total.
- **Rules**:
    - Clicking an answer automatically moves to the next question.
    - The game ends if the timer reaches 0 or all questions are answered.

### 3. Results Phase
- **Scoring**: Final score = number of correct answers.
- **Review**: Users can see a list of all questions answered, their choice vs. the correct choice, and an explanation for the correct answer.
- **Action**: "Chơi lại" (Restart) or "Về trang chủ" (Back to Home).

## Administrative Management
- **URL**: `/manage/nhanh-nhu-chop`
- **Features**:
    - Table view of all questions with pagination.
    - Filter by level.
    - CRUD operations for questions:
        - `question` (Text)
        - `options` (Array of 4 strings)
        - `correct_index` (0-3)
        - `explanation` (Optional text)
        - `level` (Enum: easy, medium, hard)

## Data Structure (PostgreSQL)
```sql
CREATE TABLE nhanh_nhu_chop_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  level TEXT NOT NULL DEFAULT 'medium',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints
- `GET /api/nhanhnhuchop/play?level=...&limit=...`: Returns randomized questions.
- `GET /api/nhanhnhuchop/questions`: Admin list view.
- `POST /api/nhanhnhuchop/questions`: Add new question.
- `PUT /api/nhanhnhuchop/questions/:id`: Edit question.
- `DELETE /api/nhanhnhuchop/questions/:id`: Remove question.
