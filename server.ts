import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';

// Shared Firebase client configuration for server-side operations
const firebaseConfig = {
  apiKey: 'AIzaSyA5kidBvi0FcLPrntMrZ20AiMc1cLyXPG4',
  authDomain: 'web-dikjyoti-test.firebaseapp.com',
  projectId: 'web-dikjyoti-test',
  storageBucket: 'web-dikjyoti-test.firebasestorage.app',
  messagingSenderId: '713357898437',
  appId: '1:713357898437:web:0e558786f412d14e0bb6ac',
};

const appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(appInstance);

const EXAM_SUBJECTS = ['math', 'reasoning', 'hindi', 'gk'] as const;

async function updateLeaderboardSummaryServer(database: any) {
  try {
    const resultsSnap = await getDocs(collection(database, 'results'));
    const studentMap = new Map<string, any>();

    resultsSnap.forEach((docSnap) => {
      const res = docSnap.data();
      if (!res.studentId) return;

      const score = Number(res.totalScore) || 0;
      const possible = Number(res.totalPossibleMarks) || 0;
      const pct = Number(res.percentage) || 0;
      const examTitle = res.examTitle || 'Test Paper';
      const submittedAt = res.submittedAt || new Date().toISOString();

      const existing = studentMap.get(res.studentId);
      if (!existing) {
        studentMap.set(res.studentId, {
          studentId: res.studentId,
          studentName: res.studentName || 'Student',
          studentEmail: res.studentEmail || '',
          totalScore: score,
          totalPossibleMarks: possible,
          percentages: [pct],
          bestScore: score,
          bestExamTitle: examTitle,
          lastActiveAt: submittedAt,
        });
      } else {
        existing.totalScore += score;
        existing.totalPossibleMarks += possible;
        existing.percentages.push(pct);
        if (score > existing.bestScore) {
          existing.bestScore = score;
          existing.bestExamTitle = examTitle;
        }
        if (
          !existing.lastActiveAt ||
          new Date(submittedAt).getTime() > new Date(existing.lastActiveAt).getTime()
        ) {
          existing.lastActiveAt = submittedAt;
        }
        if (res.studentName && res.studentName !== 'Student') {
          existing.studentName = res.studentName;
        }
        if (res.studentEmail && !existing.studentEmail) {
          existing.studentEmail = res.studentEmail;
        }
      }
    });

    const aggregatedList = Array.from(studentMap.values()).map((item) => {
      const count = item.percentages.length;
      const avgPct =
        count > 0
          ? Math.round((item.percentages.reduce((a: number, b: number) => a + b, 0) / count) * 10) /
            10
          : 0;
      return {
        studentId: item.studentId,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        totalScore: Math.round(item.totalScore * 100) / 100,
        totalPossibleMarks: item.totalPossibleMarks,
        examsAttempted: count,
        averagePercentage: avgPct,
        bestScore: Math.round(item.bestScore * 100) / 100,
        bestExamTitle: item.bestExamTitle,
        lastActiveAt: item.lastActiveAt,
      };
    });

    aggregatedList.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.averagePercentage !== a.averagePercentage)
        return b.averagePercentage - a.averagePercentage;
      return b.examsAttempted - a.examsAttempted;
    });

    const entries = aggregatedList.map((st, idx) => ({
      ...st,
      rank: idx + 1,
    }));

    const updatedAt = new Date().toISOString();
    await Promise.all([
      setDoc(doc(database, 'summaries', 'leaderboard'), {
        entries,
        updatedAt,
        totalRanked: entries.length,
      }),
      setDoc(doc(database, 'leaderboardSummary', 'allTime'), {
        entries,
        updatedAt,
        totalRanked: entries.length,
      }),
    ]);

    return { entries, updatedAt };
  } catch (err) {
    console.error('Error updating leaderboard summary on server:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 1. Validate medium password server-side without leaking password to client
  app.post('/api/exams/verify-password', async (req, res) => {
    try {
      const { examId, medium, password } = req.body;

      if (!examId || !medium || !password) {
        return res.status(400).json({
          success: false,
          error: 'Exam ID, Medium, and Password are required.',
        });
      }

      const examRef = doc(db, 'exams', examId);
      const examSnap = await getDoc(examRef);

      if (!examSnap.exists()) {
        return res.status(404).json({
          success: false,
          error: 'Examination not found on the server.',
        });
      }

      const examData = examSnap.data() as any;

      // Ensure exam is live
      const isLive = examData.status === 'live' || examData.isLive === true;
      if (!isLive) {
        return res.status(403).json({
          success: false,
          error: 'This examination is not currently live.',
        });
      }

      const mediumConfig = examData.mediums?.[medium];
      if (!mediumConfig || !mediumConfig.enabled) {
        return res.status(400).json({
          success: false,
          error: `The ${medium.toUpperCase()} medium is not enabled for this exam.`,
        });
      }

      const storedPassword = (mediumConfig.password || '').trim();
      const enteredPassword = String(password).trim();

      if (storedPassword !== enteredPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password. Please verify the code with your instructor.',
        });
      }

      return res.json({
        success: true,
        message: 'Password verified successfully.',
        examTitle: examData.title,
        subjectDurations: examData.subjectDurations,
      });
    } catch (err: any) {
      console.error('Password verification error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Server error during password verification.',
      });
    }
  });

  // 1b. Fetch questions for student with correctOption securely stripped
  app.get('/api/exams/:examId/questions', async (req, res) => {
    try {
      const { examId } = req.params;
      const { medium, subject } = req.query;

      if (!examId || !medium) {
        return res.status(400).json({
          success: false,
          error: 'Exam ID and medium are required.',
        });
      }

      // Check exam status
      const examRef = doc(db, 'exams', examId);
      const examSnap = await getDoc(examRef);
      if (!examSnap.exists()) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }

      const examData = examSnap.data() as any;
      if (examData.status !== 'live' && !examData.isLive) {
        return res.status(403).json({ success: false, error: 'This examination is not live.' });
      }

      const subjectsToFetch = subject ? [String(subject)] : EXAM_SUBJECTS;
      const resultSets: Record<string, any[]> = {};

      for (const subj of subjectsToFetch) {
        const setId = `${medium}_${subj}`;
        let setRef = doc(db, 'exams', examId, 'examQuestions', setId);
        let setSnap = await getDoc(setRef);
        if (!setSnap.exists()) {
          setRef = doc(db, 'exams', examId, 'questionSets', setId);
          setSnap = await getDoc(setRef);
        }

        const rawQuestions = setSnap.exists() ? (setSnap.data()?.questions || []) : [];
        // Strictly strip correctOption so students never receive answer keys
        const sanitizedQuestions = rawQuestions.map((q: any) => ({
          id: q.id,
          questionIndex: q.questionIndex,
          subject: q.subject || subj,
          text: q.text,
          imageUrl: q.imageUrl || '',
          options: q.options,
          marks: Number(q.marks) || 1,
          hasNegativeMarking: Boolean(q.hasNegativeMarking),
          negativeMarks: Number(q.negativeMarks) || 0,
        }));

        resultSets[subj] = sanitizedQuestions;
      }

      return res.json({
        success: true,
        examId,
        medium,
        questions: subject ? resultSets[String(subject)] : resultSets,
      });
    } catch (err: any) {
      console.error('Error serving stripped questions:', err);
      return res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
  });

  // 2. Submit and score exam securely on the server
  app.post('/api/exams/submit', async (req, res) => {
    try {
      const { examId, studentId, studentName, studentEmail, medium, answers } = req.body;

      if (!examId || !studentId || !medium) {
        return res.status(400).json({
          success: false,
          error: 'Missing required submission payload fields.',
        });
      }

      // Idempotency: check if student has already submitted a result for this exam
      const resultsRef = collection(db, 'results');
      const q = query(
        resultsRef,
        where('examId', '==', examId),
        where('studentId', '==', studentId)
      );
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        const existingResult = existingSnap.docs[0].data();
        return res.json({
          success: true,
          alreadySubmitted: true,
          result: existingResult,
        });
      }

      // Fetch master exam document
      const examRef = doc(db, 'exams', examId);
      const examSnap = await getDoc(examRef);
      if (!examSnap.exists()) {
        return res.status(404).json({
          success: false,
          error: 'Exam document not found.',
        });
      }
      const examData = examSnap.data() as any;

      // Fetch all questionSets for this medium across the 4 subjects
      const subjectBreakdown: Record<string, any> = {};
      const questionsReview: any[] = [];

      let grandTotalScore = 0;
      let grandTotalPossibleMarks = 0;
      let totalQuestionsCount = 0;
      let totalCorrectCount = 0;
      let totalIncorrectCount = 0;
      let totalUnattemptedCount = 0;

      const userAnswers = answers || {};

      for (const subj of EXAM_SUBJECTS) {
        const setId = `${medium}_${subj}`;
        const setRef = doc(db, 'exams', examId, 'questionSets', setId);
        const setSnap = await getDoc(setRef);

        let subjObtained = 0;
        let subjTotalMarks = 0;
        let subjCorrect = 0;
        let subjIncorrect = 0;
        let subjUnattempted = 0;
        let questions: any[] = [];

        if (setSnap.exists()) {
          questions = setSnap.data()?.questions || [];
        }

        for (const qItem of questions) {
          const qMarks = Number(qItem.marks) || 1;
          const hasNeg = Boolean(qItem.hasNegativeMarking);
          const negMarks = Number(qItem.negativeMarks) || 0;
          subjTotalMarks += qMarks;
          grandTotalPossibleMarks += qMarks;
          totalQuestionsCount++;

          const studentSelected = userAnswers[qItem.id];

          if (!studentSelected) {
            // Unanswered: ALWAYS scores zero (0), regardless of negative marking
            subjUnattempted++;
            totalUnattemptedCount++;
          } else {
            const correctOpt = (qItem.correctOption || '').toLowerCase().trim();
            const studentOpt = String(studentSelected).toLowerCase().trim();

            if (studentOpt === correctOpt) {
              subjObtained += qMarks;
              grandTotalScore += qMarks;
              subjCorrect++;
              totalCorrectCount++;
            } else {
              const penalty = hasNeg ? negMarks : 0;
              subjObtained -= penalty;
              grandTotalScore -= penalty;
              subjIncorrect++;
              totalIncorrectCount++;
            }
          }

          // Build question review showing which option was correct.
          // Note: Never store or show which option the student picked!
          questionsReview.push({
            id: qItem.id,
            questionIndex: qItem.questionIndex || questionsReview.length + 1,
            subject: subj,
            text: qItem.text,
            imageUrl: qItem.imageUrl || '',
            options: qItem.options,
            correctOption: (qItem.correctOption || 'a').toLowerCase(),
            marks: qMarks,
            hasNegativeMarking: hasNeg,
            negativeMarks: negMarks,
          });
        }

        subjectBreakdown[subj] = {
          subject: subj,
          obtainedMarks: Math.round(subjObtained * 100) / 100,
          totalMarks: subjTotalMarks,
          correctCount: subjCorrect,
          incorrectCount: subjIncorrect,
          unattemptedCount: subjUnattempted,
          totalQuestions: questions.length,
        };
      }

      // Round grand total score to 2 decimals
      grandTotalScore = Math.round(grandTotalScore * 100) / 100;
      const percentage =
        grandTotalPossibleMarks > 0
          ? Math.round((grandTotalScore / grandTotalPossibleMarks) * 1000) / 10
          : 0;

      const totalAttempted = totalCorrectCount + totalIncorrectCount;
      const accuracy =
        totalAttempted > 0
          ? Math.round((totalCorrectCount / totalAttempted) * 1000) / 10
          : 0;

      const resultId = `result_${examId}_${studentId}_${Date.now()}`;
      const finalResultDoc = {
        id: resultId,
        examId,
        examTitle: examData.title || 'Dikjyoti Examination',
        studentId,
        studentName: studentName || 'Student',
        studentEmail: studentEmail || '',
        medium,
        totalScore: grandTotalScore,
        totalPossibleMarks: grandTotalPossibleMarks,
        percentage,
        accuracy,
        subjectBreakdown,
        questionsReview,
        submittedAt: new Date().toISOString(),
      };

      // Save to results collection
      await setDoc(doc(db, 'results', resultId), finalResultDoc);

      // Trigger pre-aggregated leaderboard update in the background
      updateLeaderboardSummaryServer(db).catch((e) =>
        console.warn('Background leaderboard summary update failed:', e)
      );

      // Clean up / mark active examSession if present
      const sessionId = `${studentId}_${examId}_${medium}`;
      try {
        const sessionRef = doc(db, 'examSessions', sessionId);
        await updateDoc(sessionRef, {
          isSubmitted: true,
          submittedAt: new Date().toISOString(),
        });
      } catch (e) {
        // Session doc might not exist if saved offline or expired, ignore
      }

      return res.json({
        success: true,
        alreadySubmitted: false,
        result: finalResultDoc,
      });
    } catch (err: any) {
      console.error('Submission scoring error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Server error during submission scoring.',
      });
    }
  });

  // 3. Leaderboard retrieval and refresh APIs
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const snap = await getDoc(doc(db, 'summaries', 'leaderboard'));
      if (snap.exists() && Array.isArray(snap.data()?.entries)) {
        return res.json({
          success: true,
          entries: snap.data().entries,
          updatedAt: snap.data().updatedAt,
        });
      }
      const recalculated = await updateLeaderboardSummaryServer(db);
      return res.json({
        success: true,
        entries: recalculated?.entries || [],
        updatedAt: recalculated?.updatedAt || new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error serving leaderboard:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/leaderboard/refresh', async (req, res) => {
    try {
      const result = await updateLeaderboardSummaryServer(db);
      return res.json({
        success: true,
        entries: result?.entries || [],
        updatedAt: result?.updatedAt || new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dikjyoti full-stack server running on port ${PORT}`);
  });
}

startServer();
