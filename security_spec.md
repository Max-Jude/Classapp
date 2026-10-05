# ClassFlow Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Authentication Gate**: All writes require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Path Variable Hardening (`isValidId`)**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates that the path ID is a string of length 1..128 matching `^[a-zA-Z0-9_\-]+$`.
4. **PII Isolation (`/users/{userId}` vs `/directory/{userId}`)**:
   - `/users/{userId}` contains PII (`email`) and is readable (`get`) strictly by the owner (`request.auth.uid == userId`) or a verified Tutor (`isTutor()`). Cross-user `list` queries by students on `/users` are forbidden.
   - `/directory/{userId}` contains zero PII (no `email`, `phone`, or `address`) and is kept atomically synchronized with `/users/{userId}` via `existsAfter`/`getAfter`.
5. **Anti-Privilege-Escalation (`role` Control)**:
   - A user creating `/users/{userId}` with `role == 'student'` is permitted for any verified user for their own `uid`.
   - A user creating or updating `/users/{userId}` with `role == 'tutor'` is strictly forbidden unless:
     - They are the bootstrapped primary tutor (`request.auth.token.email == 'gabrieljude757@gmail.com' && request.auth.token.email_verified == true`), OR
     - No initial tutor exists yet (`!exists(/databases/$(database)/documents/systemConfig/tutorBootstrap)`) AND they atomically claim `/systemConfig/tutorBootstrap` in the same batch (`getAfter(/databases/$(database)/documents/systemConfig/tutorBootstrap).data.primaryTutorUid == request.auth.uid`), OR
     - An existing tutor has explicitly authorized their UID in `/tutorAuthorizations/$(request.auth.uid)`.
   - Normal profile updates by a user cannot mutate `role`, `uid`, `email`, or `createdAt`.
6. **Assignment Integrity (`/assignments/{assignmentId}`)**:
   - Only verified Tutors (`isTutor()`) can create, update, or delete assignments, and `tutorId` must equal `request.auth.uid` on creation and remain immutable on update.
   - Students can only read (`get`, `list`) assignments where `resource.data.status == 'published'`.
7. **Submission Integrity & Terminal State Lock (`/submissions/{submissionId}`)**:
   - A submission can only be created by the owning student (`incoming().studentId == request.auth.uid`) for an existing, published assignment (`exists(/databases/$(database)/documents/assignments/$(incoming().assignmentId))`), with `status in ['in_progress', 'submitted']`, `grade == -1`, `feedback == ''`, `gradedBy == ''`, and `gradedAt == ''`.
   - Once `resource.data.status == 'graded'` (Terminal State), the student cannot modify or delete the submission.
   - Before grading, a student can only update `['fileName', 'storagePath', 'fileUrl', 'fileSize', 'notes', 'status', 'submittedAt', 'updatedAt']` and can never set `status == 'graded'` or modify `grade` / `feedback`.
   - Only a Tutor (`isTutor()`) who owns the course assignment (`resource.data.tutorId == request.auth.uid || isBootstrappedTutor()`) can execute the Grade Action, modifying strictly `['status', 'grade', 'feedback', 'gradedBy', 'gradedAt', 'updatedAt']` with `grade >= 0 && grade <= 100`.
8. **Zero `get()`/`exists()` in `allow list`**:
   - Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` or public status invariants without incurring O(n) `get()` or `exists()` lookups.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Privilege Escalation on Registration**: Student attempts to create `/users/student_1` with `"role": "tutor"` after `/systemConfig/tutorBootstrap` is already locked and without a `/tutorAuthorizations/student_1` record.
2. **Payload 2 — Shadow Field Injection on User Profile**: Authenticated user sends valid `/users/student_1` update plus ghost field `"isAdmin": true`.
3. **Payload 3 — Cross-User PII Read**: Student `student_1` attempts `get` on `/users/student_2` to harvest `student_2`'s `email`.
4. **Payload 4 — Email Spoofing Attack**: Unverified user (`email_verified: false`) with email `gabrieljude757@gmail.com` attempts to create an assignment or read protected tutor data.
5. **Payload 5 — ID Poisoning Attack**: User attempts to create `/assignments/invalid$id!with*spaces` or a 200-character document ID.
6. **Payload 6 — Student Self-Grading on Submission Create**: Student creates `/submissions/asgn1_student1` with `"grade": 100, "status": "graded"`.
7. **Payload 7 — Student Grade Tampering on Update**: Student updates their existing `/submissions/asgn1_student1` document to change `"grade": 98` or `"feedback": "Great job"`.
8. **Payload 8 — Terminal State Bypass**: Student attempts to replace `"fileUrl"` on `/submissions/asgn1_student1` after its `status` has already reached `"graded"`.
9. **Payload 9 — Cross-Student Submission Espionage**: Student `student_2` attempts `get` or `list` on `/submissions/asgn1_student1` belonging to `student_1`.
10. **Payload 10 — Orphaned Submission Write**: Student attempts to create a submission referencing a non-existent `assignmentId: "ghost_assignment_999"`.
11. **Payload 11 — Temporal Integrity Spoofing**: Client attempts to create an assignment or submission with a backdated `createdAt` timestamp instead of `request.time`.
12. **Payload 12 — Value Poisoning / Denial of Wallet**: Tutor attempts to update `title` on `/assignments/asgn_1` with a 10,000-character string or a boolean value.
