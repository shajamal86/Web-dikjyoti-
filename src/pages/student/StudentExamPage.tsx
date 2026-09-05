import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ExamDocument,
  QuestionSetDocument,
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
  fetchStrippedExamQuestions,
} from '../../services/studentExamService';
import {
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Send,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
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

  // Countdown timer in seconds for the current active subject
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Sync and UI state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaletteMobile, setShowPaletteMobile] = useState(false);

  // Modals
  const [showEarlyFinishModal, setShowEarlyFinishModal] = useState(false);
  const [showFinalSubmitModal, setShowFinalSubmitModal] = useState(false);

  // Refs for background intervals and dirty state
  const dirtyRef = useRef<boolean>(false);
  const sessionRef = useRef<StudentExamSession | null>(null);
  sessionRef.current = session;

  const currentSubjectRef = useRef<SubjectType>(currentSubject);
  currentSubjectRef.current = currentSubject;

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
  }, [examId, user?.uid, medium, navigate]);

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
  }, [exam]);

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

      // Instant local persistence
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
      const res = await submitExamPaper({
        examId: exam.id,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        studentEmail: user.email || '',
        medium,
        answers,
      });

      // Navigate immediately to Result screen
      navigate(`/student/result/${res.result.id}`, { replace: true });
    } catch (err: any) {
      console.error('Final submission error:', err);
      alert(`Submission error: ${err.message || 'Please try submitting again.'}`);
      setIsSubmitting(false);
    }
  };

  // Final auto submit when time expires across all subjects
  const handleFinalAutoSubmit = async (examDoc: ExamDocument, finalAnswers: Record<string, OptionKey>) => {
    if (!user?.uid) return;
    setIsSubmitting(true);
    try {
      const res = await submitExamPaper({
        examId: examDoc.id,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        studentEmail: user.email || '',
        medium,
        answers: finalAnswers,
      });
      navigate(`/student/result/${res.result.id}`, { replace: true });
    } catch (err) {
      console.error('Auto submission error:', err);
    }
  };

  // Formatting helper for MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Active question items for the current subject
  const currentQuestions = questionSets[currentSubject] || [];
  const currentQuestion = currentQuestions[currentQuestionIndex];

  // Palette stats for current subject
  const answeredInSubj = currentQuestions.filter((q) => Boolean(answers[q.id])).length;
  const reviewInSubj = currentQuestions.filter((q) => Boolean(markedForReview[q.id])).length;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <h2 className="text-lg font-serif-heading font-bold text-[#1B2A4A]">
          Loading Examination Portal...
        </h2>
        <p className="text-xs text-slate-500">Restoring timed session & syncing question papers</p>
      </div>
    );
  }

  if (pageError || !exam) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold font-serif-heading text-[#1B2A4A]">
          Unable to Access Examination
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">{pageError}</p>
        <div className="pt-4">
          <button
            onClick={() => navigate('/student/home')}
            className="px-5 py-2.5 bg-[#1B2A4A] text-white text-xs font-semibold rounded-lg hover:bg-[#253963] transition-colors"
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
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col selection:bg-[#D4AF37]/20">
      {/* Top Test Header Bar */}
      <header className="sticky top-0 z-40 bg-[#1B2A4A] text-white border-b border-[#253963] shadow-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Exam title and medium badge */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-heading font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
                  {exam.title}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  {MEDIUM_LABELS[medium]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
                <span>Subject: <strong className="text-white">{SUBJECT_LABELS[currentSubject]}</strong></span>
                <span>•</span>
                <span>Order: Math → Reasoning → Hindi → GK</span>
              </div>
            </div>
          </div>

          {/* Center/Right: Timer & Submit Button */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Real-Time Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border font-mono font-bold text-sm sm:text-base transition-colors shadow-inner ${
                isTimeCritical
                  ? 'bg-red-500/20 text-red-300 border-red-400 animate-pulse'
                  : isTimeLow
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                  : 'bg-black/30 text-[#D4AF37] border-[#D4AF37]/40'
              }`}
            >
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Final Submit Button */}
            <button
              onClick={() => setShowFinalSubmitModal(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
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
              className="lg:hidden p-2 rounded-lg bg-white/10 text-white hover:bg-white/15"
              title="Toggle Question Palette"
            >
              {showPaletteMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Subject Sequence Navigation Strip */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Subject Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {EXAM_SUBJECTS.map((subj, idx) => {
              const isActive = currentSubject === subj;
              const isDone = session?.completedSubjects.includes(subj);
              const isLocked = isDone || EXAM_SUBJECTS.indexOf(currentSubject) < idx;

              return (
                <div
                  key={subj}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#1B2A4A] text-white shadow-xs'
                      : isDone
                      ? 'bg-slate-100 text-slate-400 line-through'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span>{idx + 1}. {SUBJECT_LABELS[subj]}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                  {isDone && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
              className="inline-flex items-center gap-1.5 text-xs text-[#1B2A4A] hover:text-[#253963] font-semibold py-1 px-2.5 rounded-md border border-slate-300 hover:border-slate-400 transition-colors bg-slate-50"
            >
              <span>{isLastSubject ? 'Finish Exam Early' : `Finish ${SUBJECT_LABELS[currentSubject]} Early`}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Examination Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Center: Question Area (Columns 1-3) */}
        <div className="lg:col-span-3 space-y-4">
          {currentQuestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                No questions authored for {SUBJECT_LABELS[currentSubject]} in this medium.
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You can advance to the next subject using the button above.
              </p>
            </div>
          ) : currentQuestion ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                    +{currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                  </span>
                  {currentQuestion.hasNegativeMarking && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                      -{currentQuestion.negativeMarks} Neg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleReview(currentQuestion.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      markedForReview[currentQuestion.id]
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{markedForReview[currentQuestion.id] ? 'Marked for Review' : 'Mark Review'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <div className="text-base sm:text-lg font-medium text-[#1B2A4A] leading-relaxed select-none">
                  {currentQuestion.text}
                </div>

                {/* Optional Question Image */}
                {currentQuestion.imageUrl && (
                  <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 inline-block max-w-full">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question Reference"
                      className="max-h-72 object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* 4 Options — Neutral Selected Styling (No Right/Wrong Clues) */}
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
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 ring-2 ring-[#1B2A4A]/25'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Radio Circle */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-[#1B2A4A] text-white'
                            : 'border border-slate-300 text-slate-500'
                        }`}
                      >
                        {optKey.toUpperCase()}
                      </div>

                      {/* Option Text and Image */}
                      <div className="flex-1 space-y-2">
                        <div className={`text-sm sm:text-base leading-snug ${isSelected ? 'font-semibold text-[#1B2A4A]' : 'text-slate-800'}`}>
                          {opt.text}
                        </div>
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={`Option ${optKey.toUpperCase()}`}
                            className="max-h-36 object-contain rounded border border-slate-200 bg-white"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Bottom Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {answers[currentQuestion.id] && (
                    <button
                      type="button"
                      onClick={() => handleClearOption(currentQuestion.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 font-semibold px-2.5 py-1.5 rounded hover:bg-slate-100 transition-colors"
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
                        // At the last question of current subject
                        setShowEarlyFinishModal(true);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <span>{currentQuestionIndex < currentQuestions.length - 1 ? 'Save & Next' : 'Finish Subject'}</span>
                    <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Question Palette / Grid (Column 4) */}
        <div
          className={`fixed inset-0 z-50 bg-black/50 lg:static lg:bg-transparent lg:z-auto transition-opacity ${
            showPaletteMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="absolute right-0 top-0 bottom-0 w-80 lg:w-full bg-white lg:rounded-2xl border-l lg:border border-slate-200 p-5 overflow-y-auto space-y-5 shadow-lg lg:shadow-xs">
            {/* Mobile Palette Header */}
            <div className="flex lg:hidden items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-sm text-[#1B2A4A]">Question Navigator</span>
              <button
                onClick={() => setShowPaletteMobile(false)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject Indicator in Palette */}
            <div>
              <div className="text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                {SUBJECT_LABELS[currentSubject]} Palette
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {answeredInSubj} of {currentQuestions.length} Answered
              </div>
            </div>

            {/* Palette Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[#1B2A4A]"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300"></span>
                <span>Unattempted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-purple-200 border border-purple-400"></span>
                <span>Marked Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded ring-2 ring-[#D4AF37] bg-white"></span>
                <span>Current</span>
              </div>
            </div>

            {/* Questions Number Grid */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {currentQuestions.map((q, idx) => {
                const isSelectedAnswer = Boolean(answers[q.id]);
                const isMarkedReview = Boolean(markedForReview[q.id]);
                const isCurrent = currentQuestionIndex === idx;

                let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

                if (isSelectedAnswer && isMarkedReview) {
                  btnStyle = 'bg-purple-800 text-white border-purple-900';
                } else if (isSelectedAnswer) {
                  btnStyle = 'bg-[#1B2A4A] text-white border-[#1B2A4A]';
                } else if (isMarkedReview) {
                  btnStyle = 'bg-purple-100 text-purple-900 border-purple-300';
                }

                return (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowPaletteMobile(false);
                    }}
                    className={`h-9 rounded-lg font-bold text-xs border transition-all flex items-center justify-center relative ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-[#D4AF37] ring-offset-1 font-extrabold' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarkedReview && !isSelectedAnswer && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sync status footer indicator */}
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Sync status:</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Syncing...' : 'Encrypted & Saved'}</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Early Finish Confirmation Modal */}
      {showEarlyFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold font-serif-heading text-[#1B2A4A]">
                Finish {SUBJECT_LABELS[currentSubject]} Early?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                Keep Answering
              </button>
              <button
                type="button"
                onClick={handleEarlyFinishSubject}
                className="px-5 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg shadow-xs"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold font-serif-heading text-[#1B2A4A]">
                Final Examination Submission
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you ready to submit your test paper? Your answers will be securely scored by the server and your official scorecard will be displayed immediately.
              </p>
            </div>

            {/* Quick Answer Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-600">
                Total Answered: <strong className="text-emerald-700">{Object.keys(answers).length}</strong>
              </div>
              <div className="text-slate-600">
                Marked for Review: <strong className="text-purple-700">{Object.keys(markedForReview).filter((k) => markedForReview[k]).length}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs"
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
