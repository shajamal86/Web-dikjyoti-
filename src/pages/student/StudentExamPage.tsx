import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ExamDocument,
  QuestionItem,
  MediumType,
  SubjectType,
  OptionKey,
  StudentExamSession,
  EXAM_SUBJECTS,
  SUBJECT_LABELS,
  MEDIUM_LABELS,
} from '../../types';
import { getExam } from '../../services/examService';
import {
  checkStudentExamCompleted,
  initializeOrRestoreSession,
  syncSessionState,
  submitExamPaper,
  submitExamToFirebase,
  fetchStrippedExamQuestions,
} from '../../services/studentExamService';
import { useExamAntiCheat } from '../../hooks/useExamAntiCheat';
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Send,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Menu,
  X,
  EyeOff,
} from 'lucide-react';

export const StudentExamPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const medium = (searchParams.get('medium') || 'hindi') as MediumType;
  const navigate = useNavigate();
  const { user } = useAuth();

  // Master exam and questions state
  const [exam, setExam] = useState<ExamDocument | null>(null);
  const [questionSets, setQuestionSets] = useState<Record<SubjectType, QuestionItem[]>>({
    math: [],
    reasoning: [],
    hindi: [],
    gk: [],
  });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Active student session
  const [session, setSession] = useState<StudentExamSession | null>(null);
  const [currentSubject, setCurrentSubject] = useState<SubjectType>('math');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // Countdown timer in seconds for current active subject
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Sync and UI state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaletteMobile, setShowPaletteMobile] = useState(false);

  // Modals
  const [showEarlyFinishModal, setShowEarlyFinishModal] = useState(false);
  const [showFinalSubmitModal, setShowFinalSubmitModal] = useState(false);
  const [showSecurityWarningModal, setShowSecurityWarningModal] = useState<boolean>(false);
  const [securityWarningReason, setSecurityWarningReason] = useState<string>('');
  const [isAutoSubmittedDueToViolation, setIsAutoSubmittedDueToViolation] = useState<boolean>(false);

  // Refs for background intervals, listeners, and dirty state
  const dirtyRef = useRef<boolean>(false);
  const sessionRef = useRef<StudentExamSession | null>(null);
  sessionRef.current = session;

  const currentSubjectRef = useRef<SubjectType>(currentSubject);
  currentSubjectRef.current = currentSubject;

  const answersRef = useRef<Record<string, OptionKey>>(answers);
  answersRef.current = answers;

  const examRef = useRef<ExamDocument | null>(exam);
  examRef.current = exam;

  const isSubmittingRef = useRef<boolean>(isSubmitting);
  isSubmittingRef.current = isSubmitting;

  // Handle automatic submission to Firebase on second violation (Strike 2)
  const handleAutoSubmitOnSecondViolation = useCallback(
    async (violationReason: string) => {
      if (isSubmittingRef.current || !examRef.current || !user?.uid) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setIsAutoSubmittedDueToViolation(true);
      setShowSecurityWarningModal(false);

      try {
        // Automatically trigger a call to a Firebase function to submit the exam result as 'submitted'
        const response = await submitExamToFirebase({
          examId: examRef.current.id,
          studentId: user.uid,
          studentName: user.displayName || 'Student',
          studentEmail: user.email || '',
          medium,
          answers: answersRef.current,
          status: 'submitted',
          submissionReason:
            violationReason ||
            'Second instance of tab switching / window blur proctor violation',
        });

        // Navigate the user to the completion screen
        navigate(`/student/result/${response.resultId}`, { replace: true });
      } catch (err) {
        console.error('Auto submission to Firebase on violation failed:', err);
        const fallbackResultId = `result_${examRef.current.id}_${user.uid}_${Date.now()}`;
        navigate(`/student/result/${fallbackResultId}`, { replace: true });
      }
    },
    [user, medium, navigate]
  );

  // Custom hook that listens for visibilitychange (tab switching) and blur events
  // - On the first instance: triggers prominent warning toast & alert
  // - On the second instance: triggers auto submit to Firebase and navigates to completion screen
  const {
    violationCount,
    isWindowBlurred,
    warningToast,
    dismissWarningToast,
    triggerManualViolation,
  } = useExamAntiCheat({
    enabled: Boolean(exam && !loading && !isSubmitting),
    maxViolations: 2,
    debounceMs: 2500,
    onFirstWarning: ({ reason }) => {
      setSecurityWarningReason(reason);
      setShowSecurityWarningModal(true);
    },
    onSecondViolation: async ({ reason }) => {
      setSecurityWarningReason(reason);
      await handleAutoSubmitOnSecondViolation(reason);
    },
  });

  // Final auto submit function (e.g. when timer expires)
  const handleFinalAutoSubmit = useCallback(
    async (examDoc: ExamDocument, finalAnswers: Record<string, OptionKey>) => {
      if (!user?.uid || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        const res = await submitExamToFirebase({
          examId: examDoc.id,
          studentId: user.uid,
          studentName: user.displayName || 'Student',
          studentEmail: user.email || '',
          medium,
          answers: finalAnswers,
          status: 'submitted',
          submissionReason: 'session_time_expired',
        });
        navigate(`/student/result/${res.resultId}`, { replace: true });
      } catch (err) {
        console.error('Auto submission error:', err);
      }
    },
    [user, medium, navigate]
  );

  // 1. Initial Load: Check if already completed, fetch questions and restore session
  useEffect(() => {
    if (!examId || !user?.uid) return;

    let isMounted = true;

    const initExam = async () => {
      setLoading(true);
      setPageError(null);

      try {
        // A. Check if student already submitted this exam
        const existingResult = await checkStudentExamCompleted(user.uid, examId);
        if (existingResult) {
          navigate(`/student/result/${existingResult.id}`, { replace: true });
          return;
        }

        // B. Fetch master exam document
        const examDoc = await getExam(examId);
        if (!examDoc) {
          setPageError('Examination not found or has been removed.');
          setLoading(false);
          return;
        }

        if (examDoc.status !== 'live' && !examDoc.isLive) {
          setPageError('This examination is not currently live.');
          setLoading(false);
          return;
        }

        // C. Fetch question sets for this medium (array documents with correctOption stripped)
        const setsMap = await fetchStrippedExamQuestions(examId, medium);

        if (!isMounted) return;
        setExam(examDoc);
        setQuestionSets(setsMap as Record<SubjectType, QuestionItem[]>);

        // D. Initialize or restore session anchored to real elapsed time
        const { session: activeSession, isExpired } = await initializeOrRestoreSession(
          user.uid,
          user.displayName || 'Student',
          examDoc,
          medium
        );

        if (isExpired) {
          // All subjects expired while away -> auto-submit immediately!
          await handleFinalAutoSubmit(examDoc, activeSession.answers);
          return;
        }

        setSession(activeSession);
        setCurrentSubject(activeSession.currentSubject);
        setAnswers(activeSession.answers || {});
        setMarkedForReview(activeSession.markedForReview || {});

        // Compute remaining seconds for current subject
        const startTime = activeSession.subjectStartTimes[activeSession.currentSubject] || Date.now();
        const durationMins = examDoc.subjectDurations[activeSession.currentSubject] || 15;
        const totalSecs = durationMins * 60;
        const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
        const remSecs = Math.max(0, totalSecs - elapsedSecs);
        setRemainingSeconds(remSecs);

      } catch (err: any) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setPageError(err.message || 'Failed to initialize examination session.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initExam();

    return () => {
      isMounted = false;
    };
  }, [examId, user?.uid, medium, navigate, handleFinalAutoSubmit]);

  // 2. Real-Time Elapsed Wall-Clock Countdown Timer
  useEffect(() => {
    if (!session || !exam || isSubmitting) return;

    const timer = setInterval(() => {
      const activeSubj = currentSubjectRef.current;
      const startTime = sessionRef.current?.subjectStartTimes[activeSubj];
      if (!startTime) return;

      const durationMins = exam.subjectDurations[activeSubj] || 15;
      const totalSecs = durationMins * 60;
      const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
      const remSecs = Math.max(0, totalSecs - elapsedSecs);

      setRemainingSeconds(remSecs);

      // When current subject time expires
      if (remSecs <= 0) {
        handleSubjectTimeExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, exam, isSubmitting]);

  // 3. Batched background synchronization (every 20 seconds if dirty)
  useEffect(() => {
    if (!session) return;

    const syncInterval = setInterval(async () => {
      if (dirtyRef.current && sessionRef.current) {
        setIsSyncing(true);
        try {
          await syncSessionState(sessionRef.current);
          dirtyRef.current = false;
        } catch (e) {
          console.warn('Batched sync error:', e);
        } finally {
          setIsSyncing(false);
        }
      }
    }, 20000);

    return () => clearInterval(syncInterval);
  }, [session]);

  // 4. Additional Anti-Cheat & Screen Protection Listeners (Tab close, Screenshot keys, Devtools, Copy/Paste)
  useEffect(() => {
    if (!exam || isSubmitting || loading) return;

    // A. Intercept tab closing or browser navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Live examination in progress! Leaving or closing this tab will cause automatic submission.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // B. Anti-Screenshot & Keyboard shortcuts interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        try {
          navigator.clipboard?.writeText('');
        } catch {}
        triggerManualViolation('Screenshot attempt (PrintScreen key detected)');
        return;
      }

      // F12 developer tools
      if (e.key === 'F12') {
        e.preventDefault();
        triggerManualViolation('Developer inspection tools (F12) are blocked');
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'x', 'v', 'u', 's', 'p'].includes(key)) {
          e.preventDefault();
          if (key === 'c' || key === 'x') {
            triggerManualViolation('Copy / Cut action blocked');
          } else if (key === 'p') {
            triggerManualViolation('Print / PDF export action blocked');
          }
          return;
        }
        if (e.shiftKey && ['i', 'j', 'c'].includes(key)) {
          e.preventDefault();
          triggerManualViolation('Developer inspection tools are blocked');
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // C. Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // D. Prevent copy, cut, paste, and drag
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      try {
        e.clipboardData?.setData('text/plain', '');
      } catch {}
    };
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [exam, isSubmitting, loading, triggerManualViolation]);

  // Subject expiration handler: lock current subject and advance to next
  const handleSubjectTimeExpired = useCallback(async () => {
    const currentSubj = currentSubjectRef.current;
    const sess = sessionRef.current;
    if (!sess || !exam) return;

    // Lock current subject
    const updatedCompleted = [...sess.completedSubjects];
    if (!updatedCompleted.includes(currentSubj)) {
      updatedCompleted.push(currentSubj);
    }

    const currentIndex = EXAM_SUBJECTS.indexOf(currentSubj);
    const nextIndex = currentIndex + 1;

    if (nextIndex < EXAM_SUBJECTS.length) {
      // Advance to next subject with its own full configured duration starting NOW
      const nextSubj = EXAM_SUBJECTS[nextIndex];
      const now = Date.now();

      const updatedSession: StudentExamSession = {
        ...sess,
        currentSubject: nextSubj,
        completedSubjects: updatedCompleted,
        subjectStartTimes: {
          ...sess.subjectStartTimes,
          [nextSubj]: now,
        },
        lastSavedAt: now,
      };

      setSession(updatedSession);
      setCurrentSubject(nextSubj);
      setCurrentQuestionIndex(0);

      const nextDuration = (exam.subjectDurations[nextSubj] || 15) * 60;
      setRemainingSeconds(nextDuration);

      dirtyRef.current = false;
      await syncSessionState(updatedSession);
    } else {
      // Last subject (GK) expired -> Auto-submit final paper!
      await handleFinalAutoSubmit(exam, sess.answers);
    }
  }, [exam, handleFinalAutoSubmit]);

  // Early finish handler for current subject
  const handleEarlyFinishSubject = async () => {
    if (!session || !exam) return;
    setShowEarlyFinishModal(false);

    const updatedCompleted = [...session.completedSubjects];
    if (!updatedCompleted.includes(currentSubject)) {
      updatedCompleted.push(currentSubject);
    }

    const currentIndex = EXAM_SUBJECTS.indexOf(currentSubject);
    const nextIndex = currentIndex + 1;

    if (nextIndex < EXAM_SUBJECTS.length) {
      const nextSubj = EXAM_SUBJECTS[nextIndex];
      const now = Date.now();

      // Next subject gets its own full configured duration (NO carryover!)
      const updatedSession: StudentExamSession = {
        ...session,
        currentSubject: nextSubj,
        completedSubjects: updatedCompleted,
        subjectStartTimes: {
          ...session.subjectStartTimes,
          [nextSubj]: now,
        },
        lastSavedAt: now,
      };

      setSession(updatedSession);
      setCurrentSubject(nextSubj);
      setCurrentQuestionIndex(0);

      const nextDuration = (exam.subjectDurations[nextSubj] || 15) * 60;
      setRemainingSeconds(nextDuration);

      dirtyRef.current = false;
      await syncSessionState(updatedSession);
    } else {
      // Was on GK and chose to finish early -> Final submission prompt
      setShowFinalSubmitModal(true);
    }
  };

  // Answer selection: instant in-memory update + instant localStorage backup
  const handleSelectOption = (questionId: string, option: OptionKey) => {
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    dirtyRef.current = true;

    if (session) {
      const updated = {
        ...session,
        answers: newAnswers,
        lastSavedAt: Date.now(),
      };
      setSession(updated);

      try {
        localStorage.setItem(
          `dikjyoti_exam_session_${session.studentId}_${session.examId}_${session.medium}`,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore
      }
    }
  };

  // Clear answer selection for current question
  const handleClearOption = (questionId: string) => {
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    setAnswers(newAnswers);
    dirtyRef.current = true;

    if (session) {
      const updated = {
        ...session,
        answers: newAnswers,
        lastSavedAt: Date.now(),
      };
      setSession(updated);

      try {
        localStorage.setItem(
          `dikjyoti_exam_session_${session.studentId}_${session.examId}_${session.medium}`,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore
      }
    }
  };

  // Toggle mark for review
  const handleToggleReview = (questionId: string) => {
    const newReview = { ...markedForReview, [questionId]: !markedForReview[questionId] };
    setMarkedForReview(newReview);
    dirtyRef.current = true;

    if (session) {
      const updated = {
        ...session,
        markedForReview: newReview,
        lastSavedAt: Date.now(),
      };
      setSession(updated);
    }
  };

  // Final submission action
  const handleFinalSubmit = async () => {
    if (!exam || !user?.uid || isSubmitting) return;
    setIsSubmitting(true);
    setShowFinalSubmitModal(false);

    try {
      const res = await submitExamToFirebase({
        examId: exam.id,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        studentEmail: user.email || '',
        medium,
        answers,
        status: 'submitted',
        submissionReason: 'user_submitted',
      });

      // Navigate immediately to Result screen
      navigate(`/student/result/${res.resultId}`, { replace: true });
    } catch (err: any) {
      console.error('Final submission error:', err);
      alert(`Submission error: ${err.message || 'Please try submitting again.'}`);
      setIsSubmitting(false);
    }
  };

  // Formatting helper for MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Active question items for current subject
  const currentQuestions = questionSets[currentSubject] || [];
  const currentQuestion = currentQuestions[currentQuestionIndex];

  // Palette stats for current subject
  const answeredInSubj = currentQuestions.filter((q) => Boolean(answers[q.id])).length;
  const reviewInSubj = currentQuestions.filter((q) => Boolean(markedForReview[q.id])).length;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#5B2E9E]" />
        <h2 className="text-lg font-bold text-[#241748]">
          Loading Examination Portal...
        </h2>
        <p className="text-xs text-[#6B5E82]">Restoring timed session & syncing question papers</p>
      </div>
    );
  }

  if (pageError || !exam) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#241748]">
          Unable to Access Examination
        </h2>
        <p className="text-xs sm:text-sm text-[#6B5E82] leading-relaxed">{pageError}</p>
        <div className="pt-4">
          <button
            onClick={() => navigate('/student/home')}
            className="px-5 py-2.5 bg-[#3E2072] text-white text-xs font-bold rounded-xl hover:bg-[#341b60] transition-colors shadow-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isLastSubject = currentSubject === 'gk';
  const isTimeLow = remainingSeconds < 120; // less than 2 mins
  const isTimeCritical = remainingSeconds < 60; // less than 1 min

  return (
    <div className="min-h-screen bg-[#F3EFFA] flex flex-col exam-secure-shield relative select-none">
      {/* PROMINENT WARNING TOAST (Instance 1: Tab Switching / Window Blur) */}
      {warningToast && warningToast.visible && (
        <div
          id="exam-security-warning-toast"
          role="alert"
          aria-live="assertive"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-xl pointer-events-auto transition-all duration-300"
        >
          <div className="bg-[#1A1033] text-white border-2 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/80 flex items-start gap-3.5 backdrop-blur-md">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-[#1A1033] shadow-xs">
                  ⚠️ Strike {warningToast.strikeNumber} of 2
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-300">
                  Tab Switch / Window Blur Detected
                </span>
              </div>

              <h4 className="text-sm font-extrabold text-white tracking-tight">
                {warningToast.title}
              </h4>

              <p className="text-xs text-[#E3DAF7] mt-1 leading-relaxed">
                {warningToast.message}
              </p>

              <div className="mt-2.5 p-2.5 bg-amber-500/15 border border-amber-400/40 rounded-xl text-[11px] text-amber-200 leading-relaxed">
                <strong>Attention:</strong> If you switch tabs, minimize the browser, or unfocus this window a <strong>second time</strong>, your examination will be <strong>automatically submitted immediately to Firebase</strong>.
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  id="acknowledge-warning-toast-btn"
                  onClick={dismissWarningToast}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1A1033] text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  I Understand & Acknowledge
                </button>
              </div>
            </div>

            <button
              type="button"
              id="dismiss-warning-toast-btn"
              onClick={dismissWarningToast}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss warning notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Security Watermark (Candidate Name & ID Diagonal Grid) */}
      <div
        className="fixed inset-0 pointer-events-none select-none z-10 overflow-hidden flex flex-wrap items-center justify-around gap-20 opacity-[0.03] text-xs font-mono font-bold uppercase rotate-[-22deg] text-[#241748]"
        aria-hidden="true"
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="whitespace-nowrap">
            DIKJYOTI EXAM • {user?.displayName || 'CANDIDATE'} • {user?.uid?.slice(0, 8)}
          </span>
        ))}
      </div>

      {/* Proctor Screen Shield (Active when window loses focus, Google Circle to Search overlay, or screenshot tools) */}
      {isWindowBlurred && !showSecurityWarningModal && !isAutoSubmittedDueToViolation && (
        <div className="fixed inset-0 z-50 bg-[#241748]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-400 flex items-center justify-center text-red-400 mb-4 animate-pulse">
            <EyeOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">
            Proctor Screen Protection Active
          </h2>
          <p className="text-xs sm:text-sm text-[#F5A8C6] max-w-md leading-relaxed mb-4">
            Examination window lost focus. Google Circle to Search, screen capture overlays, and background apps are strictly blocked.
          </p>
          <div className="px-5 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-white border border-white/20 animate-pulse">
            Click here to return to the active test window
          </div>
        </div>
      )}

      {/* Top Test Header Bar */}
      <header className="sticky top-0 z-40 bg-[#3E2072] text-white border-b border-[#5B2E9E] shadow-sm px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Exam title and medium badge */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
                  {exam.title}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F5A8C6]/20 text-[#F5A8C6] border border-[#F5A8C6]/30">
                  {MEDIUM_LABELS[medium]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#C9B8EE] mt-0.5">
                <span>Subject: <strong className="text-white">{SUBJECT_LABELS[currentSubject]}</strong></span>
                <span>•</span>
                <span>Sequence: Math → Reasoning → Hindi → GK</span>
              </div>
            </div>
          </div>

          {/* Center/Right: Anti-Cheat Status, Timer & Submit Button */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Anti-Cheat Proctor Indicator */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                violationCount > 0
                  ? 'bg-red-500/20 text-red-200 border-red-400'
                  : 'bg-[#5B2E9E] text-[#F5A8C6] border-[#7C4FD1]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>
                {violationCount === 0 ? 'Proctor Active' : `Warning: ${violationCount}/2 Strikes`}
              </span>
            </div>

            {/* Real-Time Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-mono font-bold text-sm sm:text-base transition-colors shadow-inner ${
                isTimeCritical
                  ? 'bg-red-500/20 text-red-300 border-red-400 animate-pulse'
                  : isTimeLow
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                  : 'bg-black/30 text-[#F5A8C6] border-[#F5A8C6]/30'
              }`}
            >
              <Clock className="w-4 h-4 text-[#F5A8C6]" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Final Submit Button */}
            <button
              onClick={() => setShowFinalSubmitModal(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#2C9A5B] hover:bg-[#25824c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Submit Paper</span>
              <span className="sm:hidden">Submit</span>
            </button>

            {/* Mobile Palette Toggle */}
            <button
              onClick={() => setShowPaletteMobile(!showPaletteMobile)}
              className="lg:hidden p-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
              title="Toggle Question Palette"
            >
              {showPaletteMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Subject Sequence Navigation Strip */}
      <div className="bg-white border-b border-[#ECE7F5] px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Subject Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {EXAM_SUBJECTS.map((subj, idx) => {
              const isActive = currentSubject === subj;
              const isDone = session?.completedSubjects.includes(subj);

              return (
                <div
                  key={subj}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#3E2072] text-white shadow-xs'
                      : isDone
                      ? 'bg-[#F3EFFA] text-[#9B93A8] line-through'
                      : 'bg-white text-[#6B5E82] border border-[#ECE7F5]'
                  }`}
                >
                  <span>{idx + 1}. {SUBJECT_LABELS[subj]}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#F5A8C6] animate-pulse"></span>
                  )}
                  {isDone && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2C9A5B]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Early Finish Subject Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowEarlyFinishModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#5B2E9E] hover:text-[#3E2072] font-bold py-1 px-3 rounded-xl border border-[#EDE1FA] bg-[#FAF6FF] transition-colors cursor-pointer"
            >
              <span>{isLastSubject ? 'Finish Exam Early' : `Finish ${SUBJECT_LABELS[currentSubject]} Early`}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#5B2E9E]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Examination Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Center: Question Area (Columns 1-3) */}
        <div className="lg:col-span-3 space-y-4">
          {currentQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#ECE7F5] p-12 text-center shadow-xs">
              <HelpCircle className="w-10 h-10 text-[#9B93A8] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#241748]">
                No questions authored for {SUBJECT_LABELS[currentSubject]} in this medium.
              </h3>
              <p className="text-xs text-[#6B5E82] mt-1">
                You can advance to the next subject using the button above.
              </p>
            </div>
          ) : currentQuestion ? (
            <div className="bg-white rounded-2xl border border-[#ECE7F5] shadow-xs p-6 sm:p-8 space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#F0EDF7]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#5B2E9E] uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF6FF] text-[#5B2E9E] border border-[#EDE1FA]">
                    +{currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                  </span>
                  {currentQuestion.hasNegativeMarking && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                      -{currentQuestion.negativeMarks} Neg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleReview(currentQuestion.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      markedForReview[currentQuestion.id]
                        ? 'bg-[#EDE1FA] text-[#5B2E9E] border border-[#5B2E9E]/40'
                        : 'bg-white text-[#6B5E82] hover:bg-[#FAF6FF] border border-[#ECE7F5]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{markedForReview[currentQuestion.id] ? 'Marked for Review' : 'Mark Review'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <div className="text-base sm:text-lg font-bold text-[#241748] leading-relaxed select-none">
                  {currentQuestion.text}
                </div>

                {/* Optional Question Image */}
                {currentQuestion.imageUrl && (
                  <div className="p-2 border border-[#ECE7F5] rounded-2xl bg-[#FAF6FF] inline-block max-w-full">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question Reference"
                      className="max-h-72 object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* 4 Options — Clean Selected Styling */}
              <div className="space-y-3 pt-2">
                {(['a', 'b', 'c', 'd'] as OptionKey[]).map((optKey) => {
                  const opt = currentQuestion.options[optKey];
                  if (!opt) return null;
                  const isSelected = answers[currentQuestion.id] === optKey;

                  return (
                    <button
                      type="button"
                      key={optKey}
                      onClick={() => handleSelectOption(currentQuestion.id, optKey)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'border-[#5B2E9E] bg-[#FAF6FF] ring-2 ring-[#5B2E9E]/25'
                          : 'border-[#ECE7F5] hover:border-[#5B2E9E]/40 bg-white hover:bg-[#FAF9FD]'
                      }`}
                    >
                      {/* Radio Circle */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-[#5B2E9E] text-white shadow-xs'
                            : 'border border-[#ECE7F5] bg-slate-50 text-[#6B5E82]'
                        }`}
                      >
                        {optKey.toUpperCase()}
                      </div>

                      {/* Option Text and Image */}
                      <div className="flex-1 space-y-2">
                        <div className={`text-xs sm:text-sm leading-relaxed ${isSelected ? 'font-bold text-[#241748]' : 'text-[#6B5E82]'}`}>
                          {opt.text}
                        </div>
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={`Option ${optKey.toUpperCase()}`}
                            className="max-h-36 object-contain rounded-xl border border-[#ECE7F5] bg-white"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Bottom Bar */}
              <div className="pt-4 border-t border-[#F0EDF7] flex flex-wrap items-center justify-between gap-3">
                <div>
                  {answers[currentQuestion.id] && (
                    <button
                      type="button"
                      onClick={() => handleClearOption(currentQuestion.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#9B93A8] hover:text-red-600 font-bold px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear Response</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#ECE7F5] text-xs font-bold text-[#6B5E82] hover:bg-[#FAF6FF] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex < currentQuestions.length - 1) {
                        setCurrentQuestionIndex((prev) => prev + 1);
                      } else {
                        setShowEarlyFinishModal(true);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3E2072] hover:bg-[#341b60] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <span>{currentQuestionIndex < currentQuestions.length - 1 ? 'Save & Next' : 'Finish Subject'}</span>
                    <ChevronRight className="w-4 h-4 text-[#F5A8C6]" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Question Palette / Grid (Column 4) */}
        <div
          onClick={() => setShowPaletteMobile(false)}
          className={`fixed inset-0 z-50 bg-black/50 lg:static lg:bg-transparent lg:z-auto transition-opacity ${
            showPaletteMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] lg:w-full bg-white lg:rounded-2xl border-l lg:border border-[#ECE7F5] p-5 overflow-y-auto space-y-5 shadow-lg lg:shadow-xs"
          >
            {/* Mobile Palette Header */}
            <div className="flex lg:hidden items-center justify-between pb-3 border-b border-[#ECE7F5]">
              <span className="font-extrabold text-sm text-[#241748]">Question Navigator</span>
              <button
                onClick={() => setShowPaletteMobile(false)}
                className="p-1.5 rounded-xl text-[#9B93A8] hover:bg-[#FAF6FF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject Indicator in Palette */}
            <div>
              <div className="text-xs font-extrabold text-[#241748] uppercase tracking-wider">
                {SUBJECT_LABELS[currentSubject]} Palette
              </div>
              <div className="text-xs text-[#6B5E82] mt-0.5 font-medium">
                {answeredInSubj} of {currentQuestions.length} Answered
              </div>
            </div>

            {/* Palette Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6B5E82] p-3 bg-[#FAF6FF] rounded-xl border border-[#EDE1FA]">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[#3E2072]"></span>
                <span className="font-bold">Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-white border border-[#ECE7F5]"></span>
                <span>Unattempted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[#EDE1FA] border border-[#5B2E9E]"></span>
                <span>Marked Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md ring-2 ring-[#F5A8C6] bg-white"></span>
                <span>Current</span>
              </div>
            </div>

            {/* Questions Number Grid */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {currentQuestions.map((q, idx) => {
                const isSelectedAnswer = Boolean(answers[q.id]);
                const isMarkedReview = Boolean(markedForReview[q.id]);
                const isCurrent = currentQuestionIndex === idx;

                let btnStyle = 'bg-white border-[#ECE7F5] text-[#6B5E82] hover:bg-[#FAF6FF]';

                if (isSelectedAnswer && isMarkedReview) {
                  btnStyle = 'bg-[#5B2E9E] text-white border-[#5B2E9E]';
                } else if (isSelectedAnswer) {
                  btnStyle = 'bg-[#3E2072] text-white border-[#3E2072]';
                } else if (isMarkedReview) {
                  btnStyle = 'bg-[#EDE1FA] text-[#5B2E9E] border-[#5B2E9E]';
                }

                return (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowPaletteMobile(false);
                    }}
                    className={`h-9 rounded-xl font-bold text-xs border transition-all flex items-center justify-center relative cursor-pointer ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-[#F5A8C6] ring-offset-1 font-extrabold shadow-xs' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarkedReview && !isSelectedAnswer && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#5B2E9E]"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sync status footer indicator */}
            <div className="pt-4 border-t border-[#F0EDF7] text-[11px] text-[#9B93A8] flex items-center justify-between">
              <span>Sync status:</span>
              <span className="flex items-center gap-1 text-[#2C9A5B] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Syncing...' : 'Encrypted & Saved'}</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* STRIKE 1: Security Warning Modal */}
      {showSecurityWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-red-500 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold uppercase tracking-wider mb-2">
                <span>⚠️ Security Violation: Strike 1 of 2</span>
              </div>
              <h3 className="text-xl font-extrabold text-[#241748]">
                Unauthorized Activity Detected!
              </h3>
              <p className="text-xs text-red-600 font-bold mt-1">
                {securityWarningReason || 'Tab switch / Google Circle to Search / Screen capture overlay'}
              </p>
            </div>

            <div className="p-4 bg-red-50/90 border border-red-200 rounded-xl space-y-2 text-xs text-red-900 leading-relaxed">
              <p className="font-bold">
                Proctor Warning: Leaving this examination window, switching tabs, capturing screenshots, or using Google Circle to Search is strictly prohibited.
              </p>
              <p>
                ⚠️ <strong>THIS IS YOUR FIRST AND FINAL WARNING!</strong> If any other suspicious activity is detected, your exam paper will be <strong>AUTOMATICALLY SUBMITTED IMMEDIATELY</strong> with your current answers.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSecurityWarningModal(false)}
                className="w-full py-3 px-4 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                I Understand — Return to Examination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRIKE 2: Auto-Submit Notice Overlay */}
      {isAutoSubmittedDueToViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-red-600 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-300 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider">
                Strike 2 of 2: Disqualified & Auto-Submitted
              </span>
              <h3 className="text-xl font-extrabold text-[#241748] mt-3">
                Exam Automatically Submitted
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Repeated unauthorized activity was detected (Tab switch / Google Circle to Search / Screen capture overlay).
                As per examination regulations, your paper has been automatically submitted.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#5B2E9E] font-semibold pt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting answers and calculating official scorecard...</span>
            </div>
          </div>
        </div>
      )}

      {/* Early Finish Confirmation Modal */}
      {showEarlyFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ECE7F5] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-[#241748]">
                Finish {SUBJECT_LABELS[currentSubject]} Early?
              </h3>
              <p className="text-xs text-[#6B5E82] mt-2 leading-relaxed">
                Once confirmed, <strong>{SUBJECT_LABELS[currentSubject]} will be permanently locked</strong> and you cannot return to modify any answers.
              </p>
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                Important: Leftover time will <strong>NOT</strong> carry over. The next subject will start with its own full configured duration.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEarlyFinishModal(false)}
                className="px-4 py-2 text-xs font-bold text-[#6B5E82] hover:text-[#241748] rounded-xl hover:bg-[#FAF6FF]"
              >
                Keep Answering
              </button>
              <button
                type="button"
                onClick={handleEarlyFinishSubject}
                className="px-5 py-2 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Yes, Lock & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Paper Submit Confirmation Modal */}
      {showFinalSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ECE7F5] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-[#241748]">
                Final Examination Submission
              </h3>
              <p className="text-xs text-[#6B5E82] mt-1 leading-relaxed">
                Are you ready to submit your test paper? Your answers will be securely scored by the server and your official scorecard will be displayed immediately.
              </p>
            </div>

            {/* Quick Answer Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-[#FAF6FF] rounded-xl border border-[#EDE1FA]">
              <div className="text-[#6B5E82]">
                Total Answered: <strong className="text-emerald-700">{Object.keys(answers).length}</strong>
              </div>
              <div className="text-[#6B5E82]">
                Marked for Review: <strong className="text-[#5B2E9E]">{Object.keys(markedForReview).filter((k) => markedForReview[k]).length}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-[#6B5E82] hover:text-[#241748] rounded-xl hover:bg-[#FAF6FF]"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C9A5B] hover:bg-[#25824c] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scoring Paper...</span>
                  </>
                ) : (
                  <span>Confirm & View Result</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
