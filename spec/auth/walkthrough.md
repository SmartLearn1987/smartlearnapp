# Walkthrough - Authentication Flow

## User Registration
1. Navigate to the registration page.
2. Enter values in: Username, Email, Password, and Confirm Password.
3. System validates input (empty fields, password mismatch, duplicate data).
4. On success, the user is redirected to the login page.

## User Login
1. Enter Username and Password.
2. System verifies credentials with the database.
3. User session is saved to `sessionStorage`.
4. User is redirected to their private dashboard.

## Data Isolation
- After login, all API requests include the user ID.
- Subjects created by the user will only be seen by them.
- Logout clears the session and returns the user to the login screen.
