# Spec - Study Navigation

## Overview
The heart of **Smart Learn** is its content navigation system, which organizes knowledge into Subjects, Curricula, and Lessons for a structured learning experience.

## Features
- **Subject Notebook (Sổ tay môn học)**: Lists available subjects based on the student's needs with quick-access notes and focal points.
- **Curriculum Details**: Displays grade level, publisher, and progress for individual textbooks.
- **Tabbed Learning Interface**: Lessons are divided into logical sections (Nội dung, Hình ảnh Slide, Trắc nghiệm, Flashcard, Tổng kết) for focused study.
- **Multiple Timetables (Thời khóa biểu đa nhóm)**: Users can manage multiple independent schedule categories. Task descriptions support multi-line text with preserved line breaks for better readability.
- **Progress Tracking**: Holistic overview of learning activity via daily streaks and key metrics (Lessons learned, Achievement tier).

## Database Schema
- `subjects`: Top-level categorization (e.g., Mathematics, Vietnamese).
- `curricula`: Specific textbooks or courses under a subject.
- `lessons`: Individual study units within a curriculum.
- `lesson_progress`: User-specific tracking of lesson completions.

## API Endpoints
- `GET /api/subjects`: Fetch subjects for the current user.
- `GET /api/curricula?subject_id=...`: Fetch textbooks for a subject.
- `GET /api/lessons?curriculum_id=...`: Fetch lessons for a curriculum.
- `PUT /api/progress/:lessonId`: Toggle lesson completion status.
