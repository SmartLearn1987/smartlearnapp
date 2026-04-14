# Implementation Plan - Game & Dictation Module

## Goal
Implement a fully functional "Chép chính tả" (Dictation) game, accessible to all users, with a management interface for administrators.

## Proposed Changes
### Database
- [NEW] Add `dictation_exercises` table to `schema.sql`.
- [MODIFY] Update `server/index.mjs` with column-level migrations.

### Backend
- [NEW] `POST /api/dictation`: Create exercise.
- [NEW] `GET /api/dictation`: List all exercises.
- [NEW] `GET /api/dictation/random`: Get a random exercise based on level and language.
- [NEW] `PUT /api/dictation/:id`: Update exercise.
- [NEW] `DELETE /api/dictation/:id`: Remove exercise.

### Frontend
- [NEW] `DictationManagePage.tsx`: Admin-only management UI.
- [NEW] `DictationPlayPage.tsx`: Student gameplay UI with scoring and timer.
- [MODIFY] `App.tsx`: Register routes.
- [MODIFY] `GameGrid.tsx`: Integrated selection modal for students and configuration link for admins.

## Verification
- CRUD operations for exercises.
- Validated random selection.
- Validated scoring algorithm (normalized word matching).
- Verified UI responsiveness and scrollable content for long texts.
