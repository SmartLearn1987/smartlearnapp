# Spec - Game Modules (Dictation & Pictogram)

## Overview
The Game module provides interactive educational games. Currently, two games are implemented:
1. **Chép chính tả** (Dictation): Practices listening and writing.
2. **Đuổi hình bắt chữ** (Pictogram): Practices vocabulary and visual reasoning. See [Detailed Pictogram Spec](./pictogram.md).

## Features
### Admin Management
- **Exercise CRUD**: Admins can Create, Read, Update, and Delete dictation exercises.
- **Categorization**: Exercises are grouped by **Language** (Vietnamese, English, Japanese) and **Level** (Easy, Medium, Hard, Extreme).
- **Rich Content**: Supports title and long text content.

### Student Gameplay
- **Selection Popup**: Users can choose their preferred Level and Language before starting.
- **Random Selection**: The system automatically picks a random exercise matching the user's criteria.
- **Interactive Interface**:
  - Read-only title and content.
  - Scrollable content area for long texts to ensure input field visibility.
  - Dictation input area (Textarea).
- **Real-time Tools**:
  - **Timer**: Tracks the duration of the dictation session (HH:MM:SS).
  - **Scoring**: Instant word-matching algorithm calculates accuracy percentage.
  - **Visual Feedback**: Highlights correct (green) and incorrect (red) words in a result view.
  - **Retry/New**: Option to retry the current exercise or pick a new random one.

## Database Schema
- `dictation_exercises`:
  - `id`: UUID (Primary Key)
  - `title`: Text
  - `level`: Text (easy, medium, hard, extreme)
  - `language`: Text (vi, en, ja)
  - `content`: Text
  - `created_by`: UUID (references users)
  - `created_at`: Timestamptz

## API Endpoints
- `GET /api/dictation`: Fetch all exercises (used by Admin).
- `GET /api/dictation/random?level=&language=`: Fetch one random exercise matching filters (used by Players).
- `POST /api/dictation`: Create a new exercise.
- `PUT /api/dictation/:id`: Update an exercise.
- `DELETE /api/dictation/:id`: Remove an exercise.
