# ClassFlow — Full-Stack Assignment Management Platform

ClassFlow is a production-grade student and tutor assignment management web application built with **React**, **TypeScript**, **Tailwind CSS**, **React Router**, and **Firebase** (Authentication, Cloud Firestore, Cloud Storage, and zero-trust Security Rules).

---

## 1. Architecture & Directory Structure

```text
src/
├── components/
│   ├── assignments/
│   │   └── GradingModal.tsx             # Tutor grading & feedback evaluation dialog
│   ├── common/
│   │   ├── ErrorBoundary.tsx            # Application-level fault recovery
│   │   ├── FileDropzone.tsx             # Validated file upload component with progress bar
│   │   ├── StatusIndicator.tsx          # Accessible semantic status indicators
│   │   └── ToastContainer.tsx           # Live notification feedback system
│   └── security/
│       └── SecurityRulesInspectorModal.tsx
├── contexts/
│   ├── AuthContext.tsx                  # Centralized Firebase Auth & Firestore role state
│   └── ToastContext.tsx                 # Notification provider
├── hooks/
│   ├── useAssignments.ts                # Real-time role-scoped assignment listener
│   └── useSubmissions.ts                # Real-time role-scoped submission listener
├── layouts/
│   ├── PublicLayout.tsx                 # Public marketing & auth header/footer layout
│   └── WorkspaceLayout.tsx              # Authenticated sidebar + breadcrumb workspace
├── lib/
│   ├── firebase.ts                      # Centralized Firebase SDK initialization
│   └── firestoreError.ts                # Structured JSON permission diagnostics
├── pages/
│   ├── public/                          # Home, About, Login, Register
│   ├── student/                         # Dashboard, Assignments, Detail, Submissions, Grades, Profile
│   └── tutor/                           # Dashboard, Assignments, Create, Detail, Submissions, Students, Profile
├── routes/
│   ├── AppRoutes.tsx                    # Complete route table
│   └── ProtectedRoute.tsx               # Role-based access control guard
├── services/
│   ├── assignmentService.ts             # Firestore CRUD for assignments
│   ├── authService.ts                   # Google & Email/Password authentication workflows
│   ├── storageService.ts                # Firebase Storage + protected file upload/download
│   ├── submissionService.ts             # Student submission & tutor grading workflows
│   └── userService.ts                   # Atomic profile & directory batch operations
├── types/
│   └── index.ts                         # Strict TypeScript interfaces
└── utils/
    ├── formatters.ts                    # Date, file size, deadline, and error formatters
    └── validation.ts                    # Synchronized schema & file validation rules
```

---

## 2. Firestore Data Model & Storage Paths

### Firestore Collections
- **`/users/{userId}`**: Private user account record containing PII (`email`), `uid`, `name`, `role` (`student` | `tutor`), `department`, `studentCode`, `bio`, `createdAt`, `updatedAt`. Readable strictly by the user themselves or a verified Tutor.
- **`/directory/{userId}`**: Non-PII institutional roster record (`uid`, `name`, `role`, `department`, `studentCode`, `createdAt`, `updatedAt`) synchronized atomically via `writeBatch` with `/users/{userId}`.
- **`/systemConfig/tutorBootstrap`**: Singleton lock document recording the initial bootstrapped Tutor UID (`primaryTutorUid`, `createdAt`).
- **`/tutorAuthorizations/{targetUid}`**: Authorization records created by an existing Tutor to grant Tutor privileges to another user UID.
- **`/assignments/{assignmentId}`**: Course assignments authored by tutors (`id`, `title`, `subject`, `description`, `instructions`, `tutorId`, `tutorName`, `deadline`, `maxPoints`, `status`, attachment metadata, timestamps).
- **`/submissions/{submissionId}`**: Student coursework submissions (`id` formatted as `{assignmentId}_{studentId}`, `assignmentId`, `tutorId`, `studentId`, file metadata, `status`, `grade`, `feedback`, `gradedBy`, `gradedAt`, timestamps).

### Firebase Cloud Storage Paths
- **Assignment Attachments**: `assignments/{assignmentId}/{fileName}`
- **Student Submissions**: `submissions/{assignmentId}/{studentId}/{fileName}`

---

## 3. Security Rules & Tutor Role Control

ClassFlow enforces authorization on the backend via [`firestore.rules`](./firestore.rules) and [`storage.rules`](./storage.rules):

1. **Secure Tutor Role Creation**:
   - No user can arbitrarily self-assign `role: "tutor"` by manipulating frontend code.
   - `firestore.rules` permits `role == 'tutor'` only if:
     1. The user is the verified project owner email (`request.auth.token.email_verified == true`), OR
     2. `/systemConfig/tutorBootstrap` does not yet exist and the user atomically creates it in the same batch (`existsAfter`), locking self-registration for all future users, OR
     3. An existing Tutor has created `/tutorAuthorizations/{userId}` for that user.
2. **PII Isolation**:
   - `/users/{userId}` (containing `email`) denies `get` and `list` requests from other students.
3. **Submission & Grading Integrity**:
   - Students can only create submissions with `grade == -1`, `feedback == ''`, and `status in ['in_progress', 'submitted']`.
   - Once a Tutor grades a submission (`status == 'graded'`), **Terminal State Locking** prevents the student from replacing the file or modifying the submission.

---

## 4. Local Development Setup

1. **Clone the repository and install dependencies**:
   ```bash
   git clone <your-repo-url>
   cd classflow
   npm install
   ```
2. **Configure environment variables**:
   Copy `.env.example` to `.env.local` and populate your Firebase project values (or use the provisioned `firebase-applet-config.json` in Google AI Studio):
   ```bash
   cp .env.example .env.local
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

4. **Validate TypeScript & Security Rules**:
   ```bash
   npm run lint
   npx eslint firestore.rules
   ```

---

## 5. Deploying to Netlify

This project includes [`netlify.toml`](./netlify.toml) and [`public/_redirects`](./public/_redirects) pre-configured for Single-Page Application (SPA) routing.

1. Push this repository to GitHub.
2. In Netlify, click **Add new site > Import an existing project** and select your GitHub repository.
3. Configure build settings (auto-detected from `netlify.toml`):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add your `VITE_FIREBASE_*` environment variables under **Site configuration > Environment variables**.
5. In the **Firebase Console > Authentication > Settings > Authorized domains**, add your `.netlify.app` domain so Firebase Auth popups and sessions are authorized.
