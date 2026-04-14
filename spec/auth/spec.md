# Spec - Authentication & Data Isolation

## Overview
Authentication in **Smart Learn** manages user identities, security, and data privacy. It ensures that every user has their own private workspace for subjects, lessons, and quizlets.

## Features
- **Registration**: Allows new users to create accounts with Username, Email, Password, and **Education Level** (default: "Tiểu học"). Upon success, sends an automated **Welcome Email** and activates a **6-day free trial**.
- **Login**: Authenticates users against the database using SHA-256 password hashing.
- **Session Management**: Uses `sessionStorage` to maintain login state across tab navigation.
- **Data Isolation**: All subjects and quizlets are linked to a `user_id`. Users can only see and manage their own content.
- **Admin Role & Management**: Special `admin` role for managing all users and platform-wide configurations. Admins can view, edit profiles, reset passwords, and lock/unlock user accounts via the `is_active` flag. Creating a user via Admin also triggers a Welcome Email and sets a default 6-day trial.
- **Password Recovery**: Users can request a password reset via email. The system generates a new secure password and sends it in a formatted email.
- **Subscription Management**: Admins can manage member plans (`plan`, `plan_start_date`, `plan_end_date`). Default behavior for new accounts is a 6-day free trial.
- **Auto-Migration**: Server automatically ensures the existence of required columns on boot.
- **Profile Customization**: Users can view and update their own detailed profile and passwords. Changes are synchronized via the `GET /api/me` endpoint.
- **Admin-level Restrictions**: The **Education Level** field can only be modified by users with the `admin` role. 

## Database Schema
- `users`: Stores user credentials and profile information, including user roles, education level, presentation name, subscription plan details, and an `is_active` boolean field.
- `user_id`: Foreign key added to `subjects`, `curricula`, and `quizlet_sets`.

## API Endpoints
- `POST /api/register`: Create a new user account, including mandatory fields and optional `education_level`.
- `POST /api/login`: Verify credentials and start a session. Failures occur when `is_active` equals `false`.
- `GET /api/users`: List all users mapped with their respective info (Admin only).
- `POST /api/users`: Admin account creation gateway.
- `PUT /api/users/:id`: Edit user basic profile attributes (email, name, role, education, status). Used both by Admin and Account owners.
- `PUT /api/users/:id/password`: Change account password.
- `DELETE /api/users/:id`: Eliminate a user record completely.
