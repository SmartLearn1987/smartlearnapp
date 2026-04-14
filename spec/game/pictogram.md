# Spec - Đuổi hình bắt chữ (Pictogram Game)

## Overview
The **Đuổi hình bắt chữ** (Pictogram) game challenges students to guess words or phrases based on visual clues (images). It improves vocabulary and creative thinking.

## Features

### Admin Management
- **Question CRUD**: Admins can Create, Read, Update, and Delete pictogram questions.
- **Image Upload**: Supports uploading images (.jpg, .png, .webp) directly to the server.
- **Level Configuration**: Questions are categorized by difficulty: **Dễ (Easy)**, **Trung bình (Medium)**, **Khó (Hard)**, **Cực khó (Extreme)**.
- **Answer Setting**: Admins set the correct answer, which is automatically normalized (uppercase, spaces preserved for display).

### Student Gameplay
- **Selection Modal**: Before playing, students choose:
  - **Cấp độ (Level)**
  - **Số lượng câu hỏi (Question Count)**: 5, 10, 15, 20...
  - **Thời gian (Time Limit)**: 1, 3, 5, 10 minutes...
- **Interactive Game Interface**:
  - **Countdown Timer**: Real-time timer with visual urgency (red pulse) when time is low.
  - **Dynamic Image View**: High-quality image display that resizes to fit any screen without scrolling.
  - **Segmented Answer Input**: Each letter of the answer is entered into an individual box.
  - **Vietnamese Support**: 100% compatible with Vietnamese IMEs (Telex/VNI). No auto-jump to prevent focus bugs during character composition.
  - **Manual Navigation**: Use Left/Right Arrow keys or click to move between boxes.
- **Result & Review**:
  - **Scoring**: Immediate calculation of correct vs. total answers.
  - **Detailed Review**: Shows the image, the user's answer, and the correct answer side-by-side for each question.
  - **Retry/Home**: Options to restart the game with new random questions or return to the dashboard.

## Database Schema
### Table: `pictogram_questions`
- `id`: UUID (Primary Key)
- `image_url`: Text (Path to the uploaded image)
- `answer`: Text (The correct answer string)
- `level`: Enum/Text (`easy`, `medium`, `hard`, `extreme`)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## API Endpoints
- `GET /api/pictogram`: Fetch all questions for admin management.
- `GET /api/pictogram/play?level=&limit=`: Fetch random questions for a game session.
- `POST /api/pictogram`: Create a new question + upload image.
- `PUT /api/pictogram/:id`: Update an existing question.
- `DELETE /api/pictogram/:id`: Delete a question and its image.
- `POST /api/upload`: Generic endpoint for uploading images to `/uploads`.
