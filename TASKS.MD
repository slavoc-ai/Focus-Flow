# **FocusFlow: Consolidated Development Tasks & Future Roadmap**

This document analyzes and consolidates all pending tasks from user feedback, internal notes, and the project plan. It is structured to provide a clear roadmap for immediate fixes, medium-term feature development, and long-term strategic enhancements.

---

### **Part 1: Immediate Priorities & Core Enhancements**

This section covers critical bug fixes, core logic improvements, and high-impact user experience enhancements derived from direct feedback.

#### **1.1. Bug Fixes & Core Corrections**
-   [x] **Correct Project Deleting:** ✅ COMPLETED - Fixed the bug where projects were not being properly deleted from the "Projects" page. Implemented `deleteProject` method in `projectService` and updated `ProjectListPage` to use it properly.
-   [x] **Prevent Project Duplication:** ✅ COMPLETED - Resolved the issue causing projects to be duplicated during session creation. Fixed by moving project creation/update logic to `PlanReviewPage` before navigating to `DeepWorkPage`, ensuring project is always initialized before starting a session. Also fixed temporary sub-task IDs issue by ensuring database IDs are properly passed from `PlanReviewPage` to `DeepWorkPage`.
-   [x] **Fix Authentication Race Condition:** ✅ COMPLETED - Resolved critical race condition where both `AuthCallbackPage` and `AuthContext` were simultaneously trying to handle user profile creation after OAuth login, causing database query conflicts and hanging states. Simplified `AuthCallbackPage` to be a simple waiting room and centralized all authentication logic in `AuthContext` as a single source of truth.
-   [x] **Fix Page Reload Authentication Timing:** ✅ COMPLETED - Fixed the timing/race condition on page reload that caused "flash" of logged-out state and subsequent stuck loading. Simplified auth logic to rely solely on `onAuthStateChange` as single source of truth, eliminating redundant `getSession()` calls. Added full-screen loading spinner to prevent UI flash during auth state determination.
-   [x] **Fix Anonymous to Permanent User Conversion:** ✅ COMPLETED - Resolved the critical issue where anonymous users trying to create permanent accounts would get stuck on the sign-up page. Implemented `convertToPermanentUser()` function that uses `supabase.auth.updateUser()` instead of `signUp()`, preserving the user's ID and all associated data (projects, plans, sessions). Added proper handling of `USER_UPDATED` events in auth state listener to ensure smooth state transitions.
-   [x] **Fix Sub-task Database Constraint Violation:** ✅ COMPLETED - Resolved database constraint violation error where sub-tasks with invalid `estimated_minutes_per_sub_task` values (null, undefined, 0, or negative) were causing insertion failures. Added `validateEstimatedMinutes()` method in `projectService` that sanitizes estimated minutes to ensure they meet the database constraint (`> 0` or `null`). Enhanced logging to track data validation during sub-task creation.
-   [x] **Improve Anonymous User Progress Saving:** When an anonymous user with an active project signs into an existing account, the anonymous project and its progress must be seamlessly merged into the user's project list.
-   [x] **Implement Dynamic Theme System:** ✅ COMPLETED - Refactored the static color system to use CSS variables for dynamic theming. Moved color palettes from constants to Tailwind config, created semantic color tokens, implemented ThemeContext with localStorage persistence, and added ThemeToggle component with light/dark/system modes. This enables the foundation for the light/dark theme toggle feature.
-   [x] **Fix Theme Token Usage in Pages:** ✅ COMPLETED - Updated all pages (HomePage, LoginPage, SignUpPage, NotFoundPage, HistoryPage, TaskPlanPage) and components (ErrorBoundary, ProtectedRoute) to use semantic design tokens instead of hard-coded color classes. Replaced specific color shades with semantic tokens like `text-foreground`, `text-muted-foreground`, `bg-card`, `text-primary`, `border-border`, etc. This ensures consistent theming across the entire application.
-   [x] **Implement Multi-File AI Plan Generation:** ✅ COMPLETED - Successfully migrated from single document text extraction to the official Gemini File API for multi-file support. Updated frontend to handle multiple file selection with drag-and-drop interface, refactored plan store to manage file arrays, modified Edge Function to upload files concurrently to Gemini File API and reference them in plan generation requests. Users can now upload multiple PDFs and receive a synthesized plan based on all documents.
-   [x] **Implement Enhanced Plan Generation with Richer Structure:** ✅ COMPLETED - Successfully implemented the full enhanced plan generation system with AI-generated project titles, richer task structure (title, action, details), task granularity control (focused/small/micro steps), optional time allocation, and energy-influenced planning. Updated Edge Function with dynamic prompt generation, enhanced frontend UI with breakdown level selector, and modified database schema to support the new task structure while maintaining backward compatibility.
-   [x] **Fix DeepWork Page Task Display Inconsistency:** ✅ COMPLETED - Resolved the critical issue where DeepWork page displayed tasks correctly when accessed from plan-review but showed incorrect/inconsistent display when accessed from projects view or dashboard. The root cause was inconsistent data mapping in `ProjectListPage.tsx` and `DashboardPage.tsx` which only mapped the legacy `description` field instead of the enhanced structure fields (`title`, `action`, `details`). Fixed by updating both pages to properly map enhanced structure with fallbacks for backward compatibility, ensuring consistent task display across all navigation entry points.
-   [x] **Implement Dual Mode Homepage Interface:** ✅ COMPLETED - Successfully implemented the "Dual Mode" interface that provides a beautiful, guided experience for new users (Wizard Mode) and a fast, powerful experience for pro users (Power Mode). Created new UI store for view mode management, extracted TaskBreakdownLevelSelector component, built PowerLayout for efficient all-in-one view, created WizardLayout with dark-themed step-by-step conversational interface using framer-motion animations, and implemented intelligent redirect logic that automatically switches to Power Mode when users return from plan review page. The system preserves user preferences in localStorage and provides seamless switching between modes.
-   [x] **Implement Premium User Tier & Large File Uploads:** ✅ COMPLETED - Successfully implemented a comprehensive premium tier system with database migration for subscription status tracking, premium user verification in Edge Functions, large file upload support via Supabase Storage, dynamic upload limits based on subscription status, and enhanced UI indicators for premium features. Created database migration with subscription_status enum, implemented create-upload-url Edge Function for premium file handling, built storageService for signed URL management, updated AuthContext with premium status helpers, enhanced DocumentUpload component with dynamic limits and premium indicators, and modified generate-plan Edge Function to support both standard FormData uploads and premium Storage downloads. The system provides a robust foundation for premium features with proper security checks and user experience enhancements.
-   [x] **Implement TUS Resumable Uploads for Premium Users:** ✅ COMPLETED - Successfully migrated from signed URL uploads to TUS (Tus Resumable Upload) protocol for premium users, following Supabase's recommended best practices for large file uploads. Integrated `tus-js-client` library, completely rewrote `storageService` to use TUS endpoint directly, added real-time upload progress tracking in the UI, removed the problematic `create-upload-url` Edge Function that was causing RLS violations, and enhanced the DocumentUpload component with progress bars and TUS-specific indicators. The new system provides robust, resumable uploads with 6MB chunks, automatic retry logic, and proper authentication via JWT headers, solving the previous RLS policy violations while enabling uploads up to 500MB for premium users.

#### **1.2. High-Impact UX/UI Enhancements**
-   [x] **Light/Dark Theme:** ✅ COMPLETED - Implemented a complete theme system with toggle switch for users to choose between light, dark, and system modes. Added ThemeProvider context, ThemeToggle component, and updated all components to use semantic color tokens.
-   [ ] **Make "Total Projects" Clickable:** The "total projects" statistic on the dashboard should be a clickable link that navigates to the projects list page (scrolls down).
-   [ ] **Implement Auto-Save:** The application should automatically save progress to prevent data loss after each subtask status change or before going to any other page.
-   [ ] **Improve Plan Digestibility:** The AI-generated plan text can be long. Implement UI changes to make it more digestible (e.g., use accordions, better formatting, highlight key sections).
-   [ ] **Refine In-Session Navigation:** Allow users to click the "Finished" button in the "View Full Plan" modal without being navigated away from the current task.
-   [ ] **Enhance Navigation Flow:**
    -   Set the "Dashboard" or "Projects" page as the default home page for signed-in users.
    -   Make project titles on the "Projects" page clickable, leading directly to the task view for that project.
-   [ ] **Fill In Empty Pages:** Add content to the "History," "Privacy Policy," and "Terms of Service" pages. Completed projects should be displayed on the History page and be removed from Projects page.

#### **1.3. AI & Plan Generation Improvements**
-   [ ] **Allow Initial Prompt Editing:** After a plan is generated, give the user an option to go back and edit the initial prompt/script to regenerate the plan.
-   [ ] **Refine AI Task Generation:**
    -   Address feedback that "Task one feels a bit stupid" and estimated times can seem wrong. This requires prompt engineering and potentially model tuning.
    -   Implement an AI rule to break down large tasks into smaller sub-tasks (e.g., tasks should be ~10 minutes or no more than 15 minutes long).
-   [ ] **Improve Loading Experience:**
    -   Adjust (slow down by 40 percent) the message rotation speed for the focus tips shown during plan generation.
-   [ ] ** Projects filtering (by status, time of execution, energy, progress, etc)

---

### **Part 2: New Feature Implementation**

This section outlines new features requested in the feedback and notes.

#### **2.1. Core Application Features**
-   [ ] **Localization:** Add support for multiple languages, starting with:
    -   [ ] French
    -   [ ] Russian
-   [ ] **Manual Plan Input:**
    -   Create a "Manual Mode" for plan creation.
    -   Allow users to input tasks with titles and descriptions.
    -   Add fields for `estimate time` and `task tag`.
    -   Include an optional "Enhance with AI" button to process the manually entered tasks.
-   [ ] **Goal Setting & Streaks:**
    -   **Big Goals:** Add a feature for users to define large, long-term goals (e.g., "learn guitar," "prepare for exam").
    -   **Study Planner:** Allow users to upload a textbook syllabus or course program, and have the AI generate a daily study plan.
    -   **Session Streaks:** Implement a streak counter for completed study sessions, with Duolingo-style reminders to maintain momentum.
-   [ ] **Trash & Recovery:** Implement a "trash" system to allow users to recover accidentally deleted projects.

#### **2.2. Integrations & External Services**
-   [ ] **Music Integration:** Synchronize with Spotify to offer different music "regimes" (e.g., focus, relax) during sessions.
-   [ ] **Podcast Generation (R&D):** Investigate notebook LM APIs for potential podcast generation features based on study materials.

#### **2.3. Technical & Backend Tasks**
-   [ ] **Server Error Handling:**
    -   Create a dedicated error screen to display when the server is unavailable.
    -   Implement a periodic connection check (every N minutes) to monitor server status and send an alert if there is a problem.
-   [ ] **AI Task-breaker Developer Tools:**
    -   **Cache AI Commands:** Implement caching to reduce latency and cost.
    -   **Create a Developer Control Panel:** Build a simple internal UI for easily changing AI parameters:
        -   Provider (e.g., OpenAI, Anthropic)
        -   Model (e.g., GPT-4, Claude 3)
        -   Parameters (Temperature, `p`, etc.)
        -   **System Prompt** (critical for rapid iteration)

---

### **Part 3: Future Roadmap (Derived from Phase 3)**

This is the long-term vision for transforming FocusFlow into an enterprise-level platform.

#### **3.1. Chapter 6: Advanced Analytics & Insights**
-   [ ] **Implement Advanced Productivity Metrics:** Track trends, focus patterns, habits, goals, and productivity scores.
-   [ ] **Develop Visual Analytics:** Build interactive charts (Chart.js/D3.js), exportable reports (PDF/CSV), and a customizable dashboard.
-   [ ] **Integrate AI-Powered Insights:** Provide smart recommendations for work times, task difficulty, break timing, and workload balancing.
-   [ ] **Enable Third-Party Integrations:** Connect with Google Calendar, Slack, Todoist, Asana, GitHub, Zapier.

#### **3.2. Chapter 7: Mobile Experience & PWA**
-   [ ] **Implement Full PWA Features:** Add service workers for offline functionality, installation prompts, push notifications, and background sync.
-   [ ] **Create a Mobile-Optimized Interface:** Redesign components for touch, add swipe gestures, and optimize for mobile screen sizes.
-   [ ] **Develop a Desktop Application:** Evaluate Electron/Tauri for a native desktop app with system tray integration and native notifications.

#### **3.3. Chapter 8: Performance & Scalability**
-   [ ] **Frontend Optimization:** Implement code splitting, lazy loading, virtual scrolling, and advanced caching (React Query/SWR).
-   [ ] **Real-Time Features:** Enable real-time collaboration on projects, live session sharing, and team focus modes.
-   [ ] **Backend Optimization:** Enhance Edge Functions with caching, rate limiting, and implement advanced data management like archiving and partitioning.

#### **3.4. Chapter 9: Testing & Quality Assurance**
-   [ ] **Build a Comprehensive Testing Suite:** Achieve 90%+ test coverage (unit, integration) and implement end-to-end testing with Playwright/Cypress.
-   [ ] **Enforce Quality Assurance:** Enforce strict TypeScript, create detailed documentation, and automate code reviews and security scanning.

#### **3.5. Chapter 10: Advanced Features & Innovation**
-   [ ] **Enhance AI & ML Capabilities:** Implement personalized task generation, intelligent session recommendations, and predictive analytics for optimal work times.
-   [ ] **Develop Collaboration & Team Features:** Create team workspaces, shared goals, manager dashboards, and team productivity competitions.
-   [ ] **Build Enterprise Features:** Add SSO, role-based access control (RBAC), custom branding, and an enterprise API.