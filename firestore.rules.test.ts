import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';

/**
 * ClassFlow Firestore Security Rules Verification Suite
 * Tests all 12 "Dirty Dozen" adversarial payloads and core RBAC invariants.
 */
export async function runSecurityRulesTests() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'resolute-hold-d40ks-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    // Seed initial state via security-rules-disabled context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'systemConfig', 'tutorBootstrap'), {
        primaryTutorUid: 'tutor_1',
        createdAt: new Date(),
      });
      await setDoc(doc(adminDb, 'users', 'tutor_1'), {
        uid: 'tutor_1',
        name: 'Dr. Eleanor Vance',
        email: 'gabrieljude757@gmail.com',
        role: 'tutor',
        department: 'Computer Science',
        studentCode: 'TUT-001',
        bio: 'Lead Instructor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'users', 'student_1'), {
        uid: 'student_1',
        name: 'Alex Rivera',
        email: 'alex@example.edu',
        role: 'student',
        department: 'Computer Science',
        studentCode: 'STU-101',
        bio: 'Undergraduate',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'users', 'student_2'), {
        uid: 'student_2',
        name: 'Jamie Chen',
        email: 'jamie@example.edu',
        role: 'student',
        department: 'Mathematics',
        studentCode: 'STU-102',
        bio: 'Undergraduate',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'assignments', 'asgn_1'), {
        id: 'asgn_1',
        title: 'Distributed Consensus Algorithms',
        subject: 'Computer Science',
        description: 'Implement Raft leader election.',
        instructions: 'Submit a comprehensive report and source archive.',
        tutorId: 'tutor_1',
        tutorName: 'Dr. Eleanor Vance',
        deadline: '2026-12-01T23:59:00.000Z',
        maxPoints: 100,
        status: 'published',
        attachmentName: '',
        attachmentPath: '',
        attachmentUrl: '',
        attachmentSize: 0,
        publishedAt: '2026-10-05T08:00:00.000Z',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'submissions', 'asgn_1_student_1'), {
        id: 'asgn_1_student_1',
        assignmentId: 'asgn_1',
        assignmentTitle: 'Distributed Consensus Algorithms',
        subject: 'Computer Science',
        tutorId: 'tutor_1',
        studentId: 'student_1',
        studentName: 'Alex Rivera',
        studentCode: 'STU-101',
        fileName: 'raft_report.pdf',
        storagePath: 'submissions/asgn_1/student_1/raft_report.pdf',
        fileUrl: 'https://example.com/raft_report.pdf',
        fileSize: 20480,
        notes: 'Completed all test cases.',
        status: 'submitted',
        grade: -1,
        feedback: '',
        gradedBy: '',
        gradedAt: '',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const student1Ctx = testEnv.authenticatedContext('student_1', {
      email: 'alex@example.edu',
      email_verified: true,
    });
    const student2Ctx = testEnv.authenticatedContext('student_2', {
      email: 'jamie@example.edu',
      email_verified: true,
    });
    const unverifiedSpoofCtx = testEnv.authenticatedContext('spoof_uid', {
      email: 'gabrieljude757@gmail.com',
      email_verified: false,
    });

    // 1. Privilege Escalation on Registration
    await assertFails(
      setDoc(doc(student2Ctx.firestore(), 'users', 'student_2_new'), {
        uid: 'student_2',
        name: 'Jamie Chen',
        email: 'jamie@example.edu',
        role: 'tutor',
        department: 'CS',
        studentCode: 'STU-102',
        bio: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 2. Shadow Field Injection on User Profile
    await assertFails(
      updateDoc(doc(student1Ctx.firestore(), 'users', 'student_1'), {
        name: 'Alex Updated',
        isAdmin: true,
        updatedAt: serverTimestamp(),
      })
    );

    // 3. Cross-User PII Read
    await assertFails(getDoc(doc(student1Ctx.firestore(), 'users', 'student_2')));

    // 4. Email Spoofing Attack (email_verified: false)
    await assertFails(getDoc(doc(unverifiedSpoofCtx.firestore(), 'users', 'student_1')));

    // 5. ID Poisoning Attack
    await assertFails(
      getDoc(doc(student1Ctx.firestore(), 'assignments', 'bad$id!with*invalid*chars'))
    );

    // 6. Student Self-Grading on Submission Create
    await assertFails(
      setDoc(doc(student2Ctx.firestore(), 'submissions', 'asgn_1_student_2'), {
        id: 'asgn_1_student_2',
        assignmentId: 'asgn_1',
        assignmentTitle: 'Distributed Consensus Algorithms',
        subject: 'Computer Science',
        tutorId: 'tutor_1',
        studentId: 'student_2',
        studentName: 'Jamie Chen',
        studentCode: 'STU-102',
        fileName: 'solution.pdf',
        storagePath: 'submissions/asgn_1/student_2/solution.pdf',
        fileUrl: 'https://example.com/solution.pdf',
        fileSize: 1024,
        notes: '',
        status: 'graded',
        grade: 100,
        feedback: 'Self graded',
        gradedBy: 'student_2',
        gradedAt: '2026-10-05T09:00:00.000Z',
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 7. Student Grade Tampering on Update
    await assertFails(
      updateDoc(doc(student1Ctx.firestore(), 'submissions', 'asgn_1_student_1'), {
        grade: 100,
        status: 'graded',
        updatedAt: serverTimestamp(),
      })
    );

    // 8. Terminal State Bypass (after graded)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'submissions', 'asgn_1_student_1'), {
        status: 'graded',
        grade: 95,
        feedback: 'Well done.',
        gradedBy: 'tutor_1',
        gradedAt: '2026-10-05T09:10:00.000Z',
      });
    });
    await assertFails(
      updateDoc(doc(student1Ctx.firestore(), 'submissions', 'asgn_1_student_1'), {
        fileName: 'replaced_after_grading.pdf',
        updatedAt: serverTimestamp(),
      })
    );

    // 9. Cross-Student Submission Espionage
    await assertFails(
      getDoc(doc(student2Ctx.firestore(), 'submissions', 'asgn_1_student_1'))
    );

    // 10. Orphaned Submission Write
    await assertFails(
      setDoc(doc(student2Ctx.firestore(), 'submissions', 'ghost_student_2'), {
        id: 'ghost_student_2',
        assignmentId: 'non_existent_assignment',
        assignmentTitle: 'Ghost',
        subject: 'CS',
        tutorId: 'tutor_1',
        studentId: 'student_2',
        studentName: 'Jamie Chen',
        studentCode: 'STU-102',
        fileName: 'solution.pdf',
        storagePath: 'submissions/non_existent/student_2/solution.pdf',
        fileUrl: 'https://example.com/solution.pdf',
        fileSize: 1024,
        notes: '',
        status: 'submitted',
        grade: -1,
        feedback: '',
        gradedBy: '',
        gradedAt: '',
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 11. Temporal Integrity Spoofing (client Date instead of serverTimestamp)
    await assertFails(
      updateDoc(doc(student1Ctx.firestore(), 'users', 'student_1'), {
        name: 'Alex Backdated',
        updatedAt: new Date('2020-01-01T00:00:00Z'),
      })
    );

    // 12. Value Poisoning / Denial of Wallet
    const tutorCtx = testEnv.authenticatedContext('tutor_1', {
      email: 'gabrieljude757@gmail.com',
      email_verified: true,
    });
    await assertFails(
      updateDoc(doc(tutorCtx.firestore(), 'assignments', 'asgn_1'), {
        title: 'A'.repeat(500),
        updatedAt: serverTimestamp(),
      })
    );
  } finally {
    await testEnv.cleanup();
  }
}
