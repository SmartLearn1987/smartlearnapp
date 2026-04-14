# Implementation Plan - Local to DB Authentication

## Proposed Approach
Transition from initial prototype auth (using local storage) to a secure database-driven model with user registration.

## Changes Included
- [x] Schema update: Create `users` table and add `user_id` foreign keys.
- [x] Seeding logic: Create default admin  with email
- [x] Backend API support: New `/register` and `/login` endpoints.
- [x] Frontend integration: `RegisterPage.tsx` and updated `LoginPage.tsx`.
- [x] API header: Include `X-User-Id` for all authenticated requests to ensure data isolation.

## Security
- Use SHA-256 password hashing with salt.
- Filter all CRUD operations by the user ID from the request header.
