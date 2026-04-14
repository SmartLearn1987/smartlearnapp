# Implementation Plan - Curriculum Hierarchy

## Proposed Hierarchy
Organize study content using a three-tier model for maximum flexibility and discovery.

## Logic Overview
- **Subject**: Higher-level category.
- **Curriculum**: A specific textbook or course with publisher/grade attributes.
- **Lesson**: Individual content pages within each curriculum.
- **Progress Tracking**: Cross-reference between users and lessons to track state.

## Tech Implementation
- React state management for nested navigation.
- Simple JSON structure for lesson contents (allows for flexible layout).
- Foreign key cascading for database consistency.
