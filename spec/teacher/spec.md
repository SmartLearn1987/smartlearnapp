# Spec - Teacher & Admin Management

## Overview
Administrative tools for managing users, content creation, and platform-wide configurations.

## Features
- **User Management**: Admins can view, create, edit, and delete user accounts, including **Subscription Plan** and **Active Status** management.
- **Content Creation**: Teachers can create curricula and lessons.
- **Workflow Management**: 
  - **Curricula**: Teachers only see and manage curricula they created. Admins retain full view.
  - **Enhanced UI**: Cards display **number of lessons**, **creator avatar/name**, and **creation date**.
  - **Lessons**: Flexible editor with text, images, quiz, and flashcards.
- **Import/Export**: Bulk import of flashcards via CSV format.
- **Role-Based Access**: Permission-based restrictions. Teachers are restricted from deleting system-wide subjects but have full control over their own content.

## Database Schema
- `users`: Core identity management.
- `subjects`, `curricula`, `lessons`: Ownership and structure.
- `lesson_images`: Visual content for lessons.

## API Endpoints
- `GET /api/users`: List all users (Admin only).
- `POST /api/users`: Create a new account.
- `POST /api/subjects`: Create a new study category.
- `POST /api/curricula`: Create a curriculum (config-based).
- `POST /api/lessons`: Add a new unit of study.
- `PUT /api/lessons/:id/quiz-flashcards`: Sync all interactive elements.
- `POST /api/lessons/:id/images`: Bulk upload lesson visuals.
