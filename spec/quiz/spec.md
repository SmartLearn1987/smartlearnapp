# Quiz (Trắc nghiệm) Feature Specification

## Overview
The Quiz feature allows users to create, edit, delete, and manage standalone quizzes (bài thi trắc nghiệm) with various question types and time limits.

## Functional Requirements
- **Menu Integration**: A dedicated "Trắc nghiệm" link in the main navigation.
- **Quiz List**: A dashboard displaying all quizzes created by the user, with search and management actions (Edit/Delete).
- **Quiz Configuration**:
    - **Title**: Mandatory name for the quiz.
    - **Description**: Optional context or instructions.
    - **Duration**: Time limit in minutes for the quiz.
- **Question Editor**:
    - **Dynamic Creation**: Add multiple questions, similar to Microsoft Forms.
    - **Question Types**:
        1. **Single Choice**: Questions with one correct radio button option.
        2. **Multiple Choice**: Questions with multiple correct checkbox options.
        3. **Text Input**: Questions requiring a short phrase as the correct answer.
    - **Option Management**: Add/remove options per question and toggle their "is_correct" status.
- **Quiz Taking (Student View)**:
    - **Entrance**: "Làm bài" button on the quiz card.
    - **Timer**: Premium "Flip-clock" style countdown with dual (minutes/seconds) cards and dynamic warning gradients when time is low.
    - **Navigation**: Move between questions with a sidebar or "Next/Prev" buttons.
    - **Submission**: Manual submit or automatic submit when time expires.
- **Results & Review**:
    - **Scoring**: Immediate percentage and points calculation.
    - **Review**: Question-by-question breakdown showing user answer vs correct answer.
    - **Retake**: Option to restart the quiz immediately.
- **Personalized Community Content**: Similar to Flashcards, the "Cộng đồng" tab for quizzes automatically filters the displayed exams to match the authenticated user's **Education Level** (for `user` and `teacher` roles). Filtering is case-insensitive and robust against string formatting differences.


## Technical Requirements
- **Database Tables**:
    - `exams`: Stores quiz metadata (id, title, duration, user_id).
    - `exam_questions`: Stores individual questions (exam_id, content, type, sort_order).
    - `exam_options`: Stores question choices (question_id, content, is_correct, sort_order).
- **API Endpoints**:
    - `GET /api/exams`: Lists user's quizzes.
    - `POST /api/exams`: Creates a new quiz with nested structure.
    - `GET /api/exams/:id`: Fetches detailed quiz structure.
    - `PUT /api/exams/:id`: Updates an existing quiz.
    - `DELETE /api/exams/:id`: Removes a quiz and its components.

## Security & Data Isolation
- Quizzes are private to the creator; access is restricted based on the `X-User-Id` header.
- Cascading deletions on the database level ensure no orphaned records.
