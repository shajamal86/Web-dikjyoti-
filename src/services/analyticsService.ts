import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  LeaderboardEntry,
  ExamLeaderboardEntry,
  StudentAnalyticsData,
  StudentExamHistoryItem,
  ExamAnalyticsSummary,
  SubjectAnalyticsStats,
  ExamResultDocument,
  ExamDocument,
  EXAM_SUBJECTS,
  SubjectType,
} from '../types';

/**
 * Re-aggregates the complete all-time leaderboard from the results collection
 * and writes the pre-aggregated summary to summaries/leaderboard in Firestore.
 */
export async function recalculateLeaderboardSummary(): Promise<{
  entries: LeaderboardEntry[];
  updatedAt: string;
}> {
  try {
    const resultsSnap = await getDocs(collection(db, 'results'));
    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentEmail: string;
        totalScore: number;
        totalPossibleMarks: number;
        percentages: number[];
        bestScore: number;
        bestExamTitle: string;
        lastActiveAt: string;
      }
    >();

    resultsSnap.forEach((docSnap) => {
      const res = docSnap.data() as ExamResultDocument;
      if (!res.studentId) return;

      const existing = studentMap.get(res.studentId);
      const score = Number(res.totalScore) || 0;
      const possible = Number(res.totalPossibleMarks) || 0;
      const pct = Number(res.percentage) || 0;
      const examTitle = res.examTitle || 'Test Paper';
      const submittedAt = res.submittedAt || new Date().toISOString();

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

    // Also include any registered students who have not taken an exam yet with 0 score
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((uDoc) => {
        const u = uDoc.data();
        if (u.role === 'student' && !studentMap.has(uDoc.id)) {
          studentMap.set(uDoc.id, {
            studentId: uDoc.id,
            studentName: u.displayName || 'Candidate',
            studentEmail: u.email || '',
            totalScore: 0,
            totalPossibleMarks: 0,
            percentages: [],
            bestScore: 0,
            bestExamTitle: '—',
            lastActiveAt: u.createdAt || '',
          });
        }
      });
    } catch {
      // Non-fatal if users collection permissions are restricted
    }

    const aggregatedList = Array.from(studentMap.values()).map((item) => {
      const examsCount = item.percentages.length;
      const avgPct =
        examsCount > 0
          ? Math.round((item.percentages.reduce((a, b) => a + b, 0) / examsCount) * 10) / 10
          : 0;

      return {
        studentId: item.studentId,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        totalScore: Math.round(item.totalScore * 100) / 100,
        totalPossibleMarks: item.totalPossibleMarks,
        examsAttempted: examsCount,
        averagePercentage: avgPct,
        bestScore: Math.round(item.bestScore * 100) / 100,
        bestExamTitle: item.bestExamTitle,
        lastActiveAt: item.lastActiveAt,
      };
    });

    // Sort descending by total score, then by average percentage, then by exams attempted
    aggregatedList.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (b.averagePercentage !== a.averagePercentage) {
        return b.averagePercentage - a.averagePercentage;
      }
      return b.examsAttempted - a.examsAttempted;
    });

    // Assign 1-indexed ranks
    const entries: LeaderboardEntry[] = aggregatedList.map((st, idx) => ({
      ...st,
      rank: idx + 1,
    }));

    const updatedAt = new Date().toISOString();

    // Store pre-aggregated summary in Firestore
    try {
      await setDoc(doc(db, 'summaries', 'leaderboard'), {
        entries,
        updatedAt,
        totalRanked: entries.length,
      });
    } catch (saveErr) {
      console.warn('Could not persist leaderboard summary document to Firestore:', saveErr);
    }

    return { entries, updatedAt };
  } catch (error) {
    console.error('Error recalculating leaderboard:', error);
    throw error;
  }
}

/**
 * Fetches the student-facing all-time leaderboard.
 * Reads once from pre-aggregated summary document (summaries/leaderboard)
 * without using a live listener to eliminate UI flickering.
 * If summary is not found, calculates it on demand.
 */
export async function fetchLeaderboard(forceRefresh = false): Promise<{
  entries: LeaderboardEntry[];
  updatedAt: string;
}> {
  try {
    if (!forceRefresh) {
      // 1. First try pre-aggregated summary document
      try {
        const summaryDoc = await getDoc(doc(db, 'summaries', 'leaderboard'));
        if (summaryDoc.exists()) {
          const data = summaryDoc.data();
          if (Array.isArray(data.entries) && data.entries.length > 0) {
            return {
              entries: data.entries as LeaderboardEntry[],
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
          }
        }
      } catch (e) {
        console.warn('Direct summary doc read failed, recalculating:', e);
      }
    }

    // 2. Recalculate on demand
    return await recalculateLeaderboardSummary();
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return { entries: [], updatedAt: new Date().toISOString() };
  }
}

/**
 * Fetches the leaderboard for a single specific exam/date.
 * Sorted by score descending.
 */
export async function fetchExamLeaderboard(examId: string): Promise<ExamLeaderboardEntry[]> {
  if (!examId) return [];
  try {
    const q = query(collection(db, 'results'), where('examId', '==', examId));
    const snap = await getDocs(q);
    const list: ExamLeaderboardEntry[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ExamResultDocument;
      list.push({
        rank: 0,
        studentId: data.studentId,
        studentName: data.studentName || 'Student',
        studentEmail: data.studentEmail || '',
        examId: data.examId,
        examTitle: data.examTitle || 'Exam',
        score: Number(data.totalScore) || 0,
        totalPossibleMarks: Number(data.totalPossibleMarks) || 0,
        percentage: Number(data.percentage) || 0,
        accuracy: Number(data.accuracy) || 0,
        submittedAt: data.submittedAt || '',
        medium: data.medium,
      });
    });

    // Sort descending by score, then percentage, then earlier submission time
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } catch (error) {
    console.error('Error fetching exam leaderboard:', error);
    return [];
  }
}

/**
 * Fetches all live exams (status == 'live' or isLive == true)
 * to accurately determine exams the student could have attempted.
 * Never counts unpublished draft exams!
 */
export async function fetchPublishedLiveExams(): Promise<ExamDocument[]> {
  try {
    const examMap = new Map<string, ExamDocument>();

    // 1. Check status == 'live'
    const q1 = query(collection(db, 'exams'), where('status', '==', 'live'));
    const snap1 = await getDocs(q1);
    snap1.forEach((d) => {
      const data = d.data() as ExamDocument;
      examMap.set(data.id, data);
    });

    // 2. Check isLive == true
    try {
      const q2 = query(collection(db, 'exams'), where('isLive', '==', true));
      const snap2 = await getDocs(q2);
      snap2.forEach((d) => {
        const data = d.data() as ExamDocument;
        examMap.set(data.id, data);
      });
    } catch {
      // Ignore if index missing
    }

    return Array.from(examMap.values());
  } catch (error) {
    console.error('Error fetching published live exams:', error);
    return [];
  }
}

/**
 * Computes a student's full analytics dashboard data:
 * - Overall average score
 * - Total exams attempted
 * - Total exams not attempted (only counting published live exams, never drafts)
 * - Date-wise list of every exam taken with rank and score
 * - Best score
 */
export async function fetchStudentAnalytics(
  studentId: string,
  studentNameFallback = 'Student',
  studentEmailFallback = ''
): Promise<StudentAnalyticsData> {
  try {
    // 1. Get published live exams
    const liveExams = await fetchPublishedLiveExams();
    const liveExamsCount = liveExams.length;

    // 2. Get student's submissions
    const qResults = query(collection(db, 'results'), where('studentId', '==', studentId));
    const resultsSnap = await getDocs(qResults);
    const myResults: ExamResultDocument[] = [];

    resultsSnap.forEach((d) => {
      myResults.push(d.data() as ExamResultDocument);
    });

    if (myResults.length === 0) {
      return {
        studentId,
        studentName: studentNameFallback,
        studentEmail: studentEmailFallback,
        totalExamsAttempted: 0,
        totalExamsNotAttempted: liveExamsCount,
        overallAverageScore: 0,
        totalScoreObtained: 0,
        totalMarksPossible: 0,
        bestScore: 0,
        bestExamTitle: '—',
        examHistory: [],
      };
    }

    // 3. For each unique exam this student took, calculate their rank among all examinees
    const uniqueExamIds = Array.from(new Set(myResults.map((r) => r.examId)));
    const examRanksMap = new Map<string, { rank: number; total: number }>();

    for (const examId of uniqueExamIds) {
      try {
        const examResultsSnap = await getDocs(
          query(collection(db, 'results'), where('examId', '==', examId))
        );
        const examSubmissions: { studentId: string; score: number }[] = [];
        examResultsSnap.forEach((d) => {
          const res = d.data() as ExamResultDocument;
          examSubmissions.push({
            studentId: res.studentId,
            score: Number(res.totalScore) || 0,
          });
        });

        // Sort descending
        examSubmissions.sort((a, b) => b.score - a.score);
        const myIndex = examSubmissions.findIndex((s) => s.studentId === studentId);
        examRanksMap.set(examId, {
          rank: myIndex >= 0 ? myIndex + 1 : 1,
          total: examSubmissions.length,
        });
      } catch {
        examRanksMap.set(examId, { rank: 1, total: 1 });
      }
    }

    // 4. Construct date-wise history items
    const historyItems: StudentExamHistoryItem[] = myResults.map((res) => {
      const rankInfo = examRanksMap.get(res.examId) || { rank: 1, total: 1 };
      return {
        examId: res.examId,
        examTitle: res.examTitle || 'Exam',
        score: Number(res.totalScore) || 0,
        totalPossibleMarks: Number(res.totalPossibleMarks) || 0,
        percentage: Number(res.percentage) || 0,
        accuracy: Number(res.accuracy) || 0,
        submittedAt: res.submittedAt,
        rankOnExam: rankInfo.rank,
        totalParticipantsOnExam: rankInfo.total,
        medium: res.medium,
        resultId: res.id,
      };
    });

    // Sort most recent first
    historyItems.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    const totalAttempted = myResults.length;
    // Exams not attempted from live exams
    const attemptedExamIds = new Set(myResults.map((r) => r.examId));
    let notAttemptedCount = 0;
    for (const le of liveExams) {
      if (!attemptedExamIds.has(le.id)) {
        notAttemptedCount++;
      }
    }

    const totalScoreObtained = myResults.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
    const totalMarksPossible = myResults.reduce(
      (acc, curr) => acc + (curr.totalPossibleMarks || 0),
      0
    );
    const sumPercentage = myResults.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
    const overallAverageScore =
      totalAttempted > 0 ? Math.round((sumPercentage / totalAttempted) * 10) / 10 : 0;

    let bestScore = 0;
    let bestExamTitle = '—';
    for (const r of myResults) {
      if ((r.totalScore || 0) >= bestScore) {
        bestScore = r.totalScore;
        bestExamTitle = r.examTitle || 'Exam';
      }
    }

    const resolvedName = myResults[0]?.studentName || studentNameFallback;
    const resolvedEmail = myResults[0]?.studentEmail || studentEmailFallback;

    return {
      studentId,
      studentName: resolvedName,
      studentEmail: resolvedEmail,
      totalExamsAttempted: totalAttempted,
      totalExamsNotAttempted: notAttemptedCount,
      overallAverageScore,
      totalScoreObtained: Math.round(totalScoreObtained * 100) / 100,
      totalMarksPossible,
      bestScore: Math.round(bestScore * 100) / 100,
      bestExamTitle,
      examHistory: historyItems,
    };
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    throw error;
  }
}

/**
 * Computes exam-level and subject-wise analytics for an exam.
 */
export async function fetchExamSubjectAnalytics(
  examId: string,
  examTitleFallback = 'Examination'
): Promise<ExamAnalyticsSummary | null> {
  if (!examId) return null;
  try {
    const q = query(collection(db, 'results'), where('examId', '==', examId));
    const snap = await getDocs(q);

    const subjectStats: Record<SubjectType, SubjectAnalyticsStats> = {
      math: {
        subject: 'math',
        attemptsCount: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 9999,
        totalPossibleMarks: 0,
      },
      reasoning: {
        subject: 'reasoning',
        attemptsCount: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 9999,
        totalPossibleMarks: 0,
      },
      hindi: {
        subject: 'hindi',
        attemptsCount: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 9999,
        totalPossibleMarks: 0,
      },
      gk: {
        subject: 'gk',
        attemptsCount: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 9999,
        totalPossibleMarks: 0,
      },
    };

    let totalSubmissions = 0;
    let sumPercentages = 0;
    let highestScore = 0;
    let lowestScore = 999999;
    let resolvedExamTitle = examTitleFallback;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ExamResultDocument;
      totalSubmissions++;
      resolvedExamTitle = data.examTitle || resolvedExamTitle;

      const score = Number(data.totalScore) || 0;
      const pct = Number(data.percentage) || 0;
      sumPercentages += pct;

      if (score > highestScore) highestScore = score;
      if (score < lowestScore) lowestScore = score;

      if (data.subjectBreakdown) {
        for (const subj of EXAM_SUBJECTS) {
          const sBreak = data.subjectBreakdown[subj];
          if (sBreak) {
            const obtained = Number(sBreak.obtainedMarks) || 0;
            const total = Number(sBreak.totalMarks) || 0;
            const stat = subjectStats[subj];

            stat.attemptsCount++;
            stat.averageScore += obtained;
            stat.totalPossibleMarks = Math.max(stat.totalPossibleMarks, total);
            if (obtained > stat.highestScore) stat.highestScore = obtained;
            if (obtained < stat.lowestScore) stat.lowestScore = obtained;
          }
        }
      }
    });

    if (totalSubmissions === 0) {
      return {
        examId,
        examTitle: resolvedExamTitle,
        totalSubmissions: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        subjectStats: {
          math: { subject: 'math', attemptsCount: 0, averageScore: 0, highestScore: 0, lowestScore: 0, totalPossibleMarks: 0 },
          reasoning: { subject: 'reasoning', attemptsCount: 0, averageScore: 0, highestScore: 0, lowestScore: 0, totalPossibleMarks: 0 },
          hindi: { subject: 'hindi', attemptsCount: 0, averageScore: 0, highestScore: 0, lowestScore: 0, totalPossibleMarks: 0 },
          gk: { subject: 'gk', attemptsCount: 0, averageScore: 0, highestScore: 0, lowestScore: 0, totalPossibleMarks: 0 },
        },
      };
    }

    // Finalize subject stats averages and clean up lowestScore
    for (const subj of EXAM_SUBJECTS) {
      const stat = subjectStats[subj];
      if (stat.attemptsCount > 0) {
        stat.averageScore = Math.round((stat.averageScore / stat.attemptsCount) * 10) / 10;
        if (stat.lowestScore === 9999) stat.lowestScore = 0;
      } else {
        stat.lowestScore = 0;
      }
    }

    if (lowestScore === 999999) lowestScore = 0;

    return {
      examId,
      examTitle: resolvedExamTitle,
      totalSubmissions,
      averagePercentage: Math.round((sumPercentages / totalSubmissions) * 10) / 10,
      highestScore: Math.round(highestScore * 100) / 100,
      lowestScore: Math.round(lowestScore * 100) / 100,
      subjectStats,
    };
  } catch (error) {
    console.error('Error fetching exam subject analytics:', error);
    return null;
  }
}
