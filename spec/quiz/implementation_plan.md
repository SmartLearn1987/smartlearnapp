# Implementation Plan - Trắc nghiệm (Quiz/Exam) Feature

This plan outlines the addition of a standalone Quiz/Exam management system where users can create multi-type questions (Single, Multiple, Text) with time limits and then take those exams.

## Core Components

### 1. Database Schema
- **Exams Table**: Standard CRUD for quiz metadata (title, duration, user_id).
- **Exam Questions Table**: Dynamic list of question cards (exam_id, content, type).
- **Exam Options Table**: Interactive choice selection (question_id, content, is_correct).

### 2. Backend Implementation
- CRUD endpoints are implemented in `server/index.mjs` within a single file for simplicity.
- Uses **PostgreSQL transactions** for `POST` and `PUT` to ensure atomicity of quiz structure.
- Implementation handles cascading deletions automatically on the database layer.

### 3. Frontend Architecture
- **QuizListPage.tsx**:
    - Uses `apiFetch` to manage data fetching.
    - Responsive grid layout for quiz cards.
    - **Làm bài** button for direct exam entry.
- **QuizFormPage.tsx**:
    - **State Management**: Deeply nested React state to handle questions and options.
    - **Interface**: Microsft Forms-style interaction (add/remove questions, toggle answer types).
- **QuizTakePage.tsx**:
    - **Timer**: `useEffect` driven countdown with auto-submit logic.
    - **UI**: Sidebar navigation map for jumping between questions.
    - **Question Support**: Dynamic rendering for Single, Multiple, and Text types.
- **QuizResultPage.tsx**:
    - **Logic**: Client-side score calculation for instant feedback.
    - **Review**: Visual side-by-side comparison of user choices vs correct answers.

## Design Decisions
- **Unified Form**: A single `QuizFormPage.tsx` handles both creation and editing.
- **Cascading Deletes**: `ON DELETE CASCADE` is set on the foreign keys.
- **Stateless Results**: Quiz results are currently calculated on the client to minimize server load.
