# Spec - Quizlet & Flashcards

## Overview
Quizlet integration manages interactive study sets consisting of flashcards and terms to help students memorize key concepts.

## Features
- **Flashcard Practice**: Interactive front/back flipping cards.
- **Set Management**: Users can create, edit, and delete their own study sets.
- **Media Support**: Terms can include individual images.
- **Bulk Import**: Users can import terms in bulk from various sources.
- **Search & Filter**: Quickly find specific study sets.
- **Flashcard Customization**: Users can configure text color and font size separately for the front and back of cards using a rich color palette.
- **Card List UI**: Set titles support up to 2 lines with reduced font size for cleaner display. Cards are grouped by education level and subject.
- **Personalized Community Content**: For `user` and `teacher` roles, the "Cộng đồng" tab automatically filters study sets to only display those matching the user's current **Education Level**. Filtering is robust, accounting for string trimming and case-insensitivity.

## Database Schema
- `quizlet_sets`: Top-level metadata (Title, Description, Visibility).
- `quizlet_terms`: Individually stored terms (Term, Definition, Image, Sort Order).

## API Endpoints
- `GET /api/quizlets`: Fetch study sets for the current user.
- `POST /api/quizlets`: Create a new study set.
- `PUT /api/quizlets/:id`: Update an existing set.
- `DELETE /api/quizlets/:id`: Remove a study set.
