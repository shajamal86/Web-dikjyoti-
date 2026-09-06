import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createExamDraft,
  getExam,
  listTeacherExams,
  setMediumPassword,
  updateSubjectDurations,
  getQuestionSet,
  appendQuestionToQuestionSet,
  deleteQuestionFromQuestionSet,
  markSubjectAsComplete,
  publishExam,
} from '../../services/examService';
import {
  ExamDocument,
  QuestionSetDocument,
  QuestionItem,
  MediumType,
  SubjectType,
  EXAM_SUBJECTS,
  SUBJECT_LABELS,
  EXAM_MEDIUMS,
  MEDIUM_LABELS,
  OptionKey,
} from '../../types';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  PlusCircle,
  Save,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  Globe,
  BookOpen,
  ArrowRight,
  RotateCcw,
  CheckCheck,
  Send,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { BulkUploadModal } from '../../components/teacher/BulkUploadModal';
import { ExportCsvModal } from '../../components/teacher/ExportCsvModal';

export const TeacherCreateExamPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlExamId = searchParams.get('examId');
  const urlMedium = searchParams.get('medium') as MediumType | null;
  const urlSubject = searchParams.get('subject') as SubjectType | null;

  // Master Exam State
  const [exam, setExam] = useState<ExamDocument | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [existingDrafts, setExistingDrafts] = useState<ExamDocument[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDescription, setNewExamDescription] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);
  const [createExamError, setCreateExamError] = useState<string | null>(null);

  // Step 1: Medium & Password state
  const [selectedMedium, setSelectedMedium] = useState<MediumType>(urlMedium || 'hindi');
  const [mediumPasswordInput, setMediumPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Step 2: Subject selection
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(urlSubject || null);
  const [subjectCompletionMap, setSubjectCompletionMap] = useState<Record<string, boolean>>({});
  const [subjectQuestionCountMap, setSubjectQuestionCountMap] = useState<Record<string, number>>({});

  // Step 3: Question Entry Form State
  const [currentQuestionSet, setCurrentQuestionSet] = useState<QuestionSetDocument | null>(null);
  const [loadingQuestionSet, setLoadingQuestionSet] = useState(false);

  // Question Form Fields
  const [questionText, setQuestionText] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionAImg, setOptionAImg] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionBImg, setOptionBImg] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionCImg, setOptionCImg] = useState('');
  const [optionD, setOptionD] = useState('');
  const [optionDImg, setOptionDImg] = useState('');
  const [correctOption, setCorrectOption] = useState<OptionKey>('a');
  const [marks, setMarks] = useState<number>(1);
  const [hasNegativeMarking, setHasNegativeMarking] = useState<boolean>(false);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);

  // Local Storage Auto-Save Persistence Keys
  const STORAGE_KEY_EXAM_INIT = 'dikjyoti_exam_form_init_draft';
  const STORAGE_KEY_ACTIVE_SELECTION = 'dikjyoti_exam_active_selection';
  const getQuestionDraftKey = (examId: string, medium: string, subject: string) =>
    `dikjyoti_question_draft_${examId}_${medium}_${subject}`;

  // Auto-Save UI States
  const [isDraftSavedLocally, setIsDraftSavedLocally] = useState<boolean>(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<number | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  // UI helpers
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showQuestionsList, setShowQuestionsList] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Duration editor
  const [durations, setDurations] = useState({
    math: 15,
    reasoning: 15,
    hindi: 15,
    gk: 15,
  });

  // Bulk CSV Upload & Export Modals
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-save & restore new exam initialization draft (modal inputs)
  useEffect(() => {
    try {
      const savedInit = localStorage.getItem(STORAGE_KEY_EXAM_INIT);
      if (savedInit) {
        const parsed = JSON.parse(savedInit);
        if (parsed.title && !newExamTitle) setNewExamTitle(parsed.title);
        if (parsed.description && !newExamDescription) setNewExamDescription(parsed.description);
      }
    } catch (e) {
      console.warn('Could not restore exam init draft', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (newExamTitle.trim() || newExamDescription.trim()) {
        localStorage.setItem(
          STORAGE_KEY_EXAM_INIT,
          JSON.stringify({
            title: newExamTitle,
            description: newExamDescription,
            updatedAt: Date.now(),
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY_EXAM_INIT);
      }
    } catch (e) {}
  }, [newExamTitle, newExamDescription]);

  // Save active exam, medium, and subject selection so page refresh remembers location
  useEffect(() => {
    if (exam?.id) {
      try {
        localStorage.setItem(
          STORAGE_KEY_ACTIVE_SELECTION,
          JSON.stringify({
            examId: exam.id,
            medium: selectedMedium,
            subject: selectedSubject,
            updatedAt: Date.now(),
          })
        );
      } catch (e) {}
    }
  }, [exam?.id, selectedMedium, selectedSubject]);

  // 1. Initial Load: load exam from URL param or saved local selection or fetch teacher's active drafts
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      setLoadingExam(true);
      try {
        let targetExamId = urlExamId;
        let savedActive: any = null;
        try {
          const rawActive = localStorage.getItem(STORAGE_KEY_ACTIVE_SELECTION);
          if (rawActive) {
            savedActive = JSON.parse(rawActive);
          }
        } catch (e) {}

        if (!targetExamId && savedActive?.examId) {
          targetExamId = savedActive.examId;
        }

        if (targetExamId) {
          const loaded = await getExam(targetExamId);
          if (loaded) {
            setExam(loaded);
            setDurations(loaded.subjectDurations || { math: 15, reasoning: 15, hindi: 15, gk: 15 });
            if (!urlExamId) {
              setSearchParams({ examId: loaded.id });
            }
            if (!urlMedium && savedActive?.medium && (savedActive.medium === 'hindi' || savedActive.medium === 'assamese')) {
              setSelectedMedium(savedActive.medium);
            }
            if (!urlSubject && savedActive?.subject && EXAM_SUBJECTS.includes(savedActive.subject)) {
              setSelectedSubject(savedActive.subject);
            }
          } else {
            // Exam ID in url not found, fetch list of drafts
            const teacherExams = await listTeacherExams(user.uid);
            setExistingDrafts(teacherExams.filter((e) => e.status === 'draft'));
          }
        } else {
          // No examId specified in URL, check if teacher has existing drafts
          const teacherExams = await listTeacherExams(user.uid);
          const drafts = teacherExams.filter((e) => e.status === 'draft');
          setExistingDrafts(drafts);
          if (drafts.length > 0) {
            // Auto load the most recent draft
            const latest = drafts[0];
            setExam(latest);
            setDurations(latest.subjectDurations || { math: 15, reasoning: 15, hindi: 15, gk: 15 });
            setSearchParams({ examId: latest.id });
          }
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoadingExam(false);
      }
    };

    init();
  }, [user, urlExamId]);

  // Sync medium and subject with URL params
  useEffect(() => {
    if (urlMedium && (urlMedium === 'hindi' || urlMedium === 'assamese')) {
      setSelectedMedium(urlMedium);
    }
    if (urlSubject && EXAM_SUBJECTS.includes(urlSubject)) {
      setSelectedSubject(urlSubject);
    }
  }, [urlMedium, urlSubject]);

  // 2. Refresh Subject Completion and Question Count status for current exam and medium
  const refreshSubjectStatuses = async () => {
    if (!exam) return;

    const compMap: Record<string, boolean> = {};
    const countMap: Record<string, number> = {};

    const currentMediumConfig = exam.mediums[selectedMedium];
    const completedList = currentMediumConfig?.completedSubjects || [];

    for (const subj of EXAM_SUBJECTS) {
      compMap[subj] = completedList.includes(subj);
      try {
        const qSet = await getQuestionSet(exam.id, selectedMedium, subj);
        if (qSet) {
          countMap[subj] = qSet.questions?.length || 0;
          if (qSet.isCompleted) {
            compMap[subj] = true;
          }
        } else {
          countMap[subj] = 0;
        }
      } catch (e) {
        countMap[subj] = 0;
      }
    }

    setSubjectCompletionMap(compMap);
    setSubjectQuestionCountMap(countMap);
  };

  useEffect(() => {
    if (exam) {
      refreshSubjectStatuses();
    }
  }, [exam, selectedMedium]);

  // 3. Load question set for currently selected (exam, medium, subject)
  useEffect(() => {
    if (!exam || !selectedSubject) {
      setCurrentQuestionSet(null);
      return;
    }

    const loadQSet = async () => {
      setLoadingQuestionSet(true);
      try {
        const qSet = await getQuestionSet(exam.id, selectedMedium, selectedSubject);
        setCurrentQuestionSet(qSet);
      } catch (err) {
        console.error('Error fetching question set:', err);
      } finally {
        setLoadingQuestionSet(false);
      }
    };

    loadQSet();
  }, [exam, selectedMedium, selectedSubject]);

  // Auto-Save: Restore question inputs from localStorage when subject or medium changes
  useEffect(() => {
    if (!exam?.id || !selectedSubject) {
      setIsDraftSavedLocally(false);
      setHasRestoredDraft(false);
      setLastSavedDraftTime(null);
      return;
    }

    const key = getQuestionDraftKey(exam.id, selectedMedium, selectedSubject);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw);
        if (
          draft &&
          (draft.questionText ||
            draft.optionA ||
            draft.optionB ||
            draft.optionC ||
            draft.optionD ||
            draft.questionImageUrl ||
            draft.optionAImg ||
            draft.optionBImg ||
            draft.optionCImg ||
            draft.optionDImg)
        ) {
          setQuestionText(draft.questionText || '');
          setQuestionImageUrl(draft.questionImageUrl || '');
          setOptionA(draft.optionA || '');
          setOptionAImg(draft.optionAImg || '');
          setOptionB(draft.optionB || '');
          setOptionBImg(draft.optionBImg || '');
          setOptionC(draft.optionC || '');
          setOptionCImg(draft.optionCImg || '');
          setOptionD(draft.optionD || '');
          setOptionDImg(draft.optionDImg || '');
          if (draft.correctOption) setCorrectOption(draft.correctOption);
          if (typeof draft.marks === 'number') setMarks(draft.marks);
          if (typeof draft.hasNegativeMarking === 'boolean')
            setHasNegativeMarking(draft.hasNegativeMarking);
          if (typeof draft.negativeMarks === 'number') setNegativeMarks(draft.negativeMarks);
          setLastSavedDraftTime(draft.updatedAt || Date.now());
          setIsDraftSavedLocally(true);
          setHasRestoredDraft(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not restore question draft from localStorage', e);
    }

    // If no draft exists for this section, clear inputs
    setIsDraftSavedLocally(false);
    setHasRestoredDraft(false);
    setLastSavedDraftTime(null);
  }, [exam?.id, selectedMedium, selectedSubject]);

  // Auto-Save: Persist question inputs to localStorage as teacher types
  useEffect(() => {
    if (!exam?.id || !selectedSubject) return;

    const key = getQuestionDraftKey(exam.id, selectedMedium, selectedSubject);
    const hasContent = Boolean(
      questionText.trim() ||
        questionImageUrl.trim() ||
        optionA.trim() ||
        optionAImg.trim() ||
        optionB.trim() ||
        optionBImg.trim() ||
        optionC.trim() ||
        optionCImg.trim() ||
        optionD.trim() ||
        optionDImg.trim()
    );

    if (hasContent) {
      const draftPayload = {
        questionText,
        questionImageUrl,
        optionA,
        optionAImg,
        optionB,
        optionBImg,
        optionC,
        optionCImg,
        optionD,
        optionDImg,
        correctOption,
        marks,
        hasNegativeMarking,
        negativeMarks,
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(draftPayload));
        setIsDraftSavedLocally(true);
        setLastSavedDraftTime(draftPayload.updatedAt);
      } catch (e) {
        console.warn('Failed to auto-save question draft to localStorage', e);
      }
    } else {
      try {
        localStorage.removeItem(key);
        setIsDraftSavedLocally(false);
        setLastSavedDraftTime(null);
      } catch (e) {}
    }
  }, [
    exam?.id,
    selectedMedium,
    selectedSubject,
    questionText,
    questionImageUrl,
    optionA,
    optionAImg,
    optionB,
    optionBImg,
    optionC,
    optionCImg,
    optionD,
    optionDImg,
    correctOption,
    marks,
    hasNegativeMarking,
    negativeMarks,
  ]);

  // Helper to discard unsaved question inputs from localStorage
  const handleClearQuestionDraft = () => {
    if (
      questionText.trim() ||
      optionA.trim() ||
      optionB.trim() ||
      optionC.trim() ||
      optionD.trim() ||
      questionImageUrl.trim()
    ) {
      const confirmDiscard = window.confirm(
        'Are you sure you want to discard unsaved inputs for this question?'
      );
      if (!confirmDiscard) return;
    }

    setQuestionText('');
    setQuestionImageUrl('');
    setOptionA('');
    setOptionAImg('');
    setOptionB('');
    setOptionBImg('');
    setOptionC('');
    setOptionCImg('');
    setOptionD('');
    setOptionDImg('');
    setCorrectOption('a');

    if (exam?.id && selectedSubject) {
      try {
        localStorage.removeItem(getQuestionDraftKey(exam.id, selectedMedium, selectedSubject));
      } catch (e) {}
    }
    setIsDraftSavedLocally(false);
    setHasRestoredDraft(false);
    setLastSavedDraftTime(null);
    triggerToast('Unsaved draft inputs cleared.');
  };

  // Helper to show temporary notification toast
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Helper: Create brand new exam draft
  const handleCreateNewExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newExamTitle.trim()) {
      setCreateExamError('Please enter an examination title.');
      return;
    }

    setCreatingExam(true);
    setCreateExamError(null);

    try {
      const created = await createExamDraft(
        user.uid,
        user.displayName || 'Faculty Member',
        newExamTitle,
        newExamDescription,
        durations
      );
      setExam(created);
      setShowCreateModal(false);
      setNewExamTitle('');
      setNewExamDescription('');
      try {
        localStorage.removeItem(STORAGE_KEY_EXAM_INIT);
      } catch (e) {}
      setCreateExamError(null);
      setSelectedSubject(null);
      setSearchParams({ examId: created.id });
      triggerToast('Exam draft initialized successfully!');
    } catch (err: any) {
      console.error('Error creating exam:', err);
      const isPermissionDenied =
        err?.message?.includes('permission') ||
        err?.message?.includes('PERMISSION_DENIED') ||
        err?.code === 'permission-denied';

      if (isPermissionDenied) {
        setCreateExamError(
          'Firebase Permission Denied: Firebase Firestore rules is write ko block kar rahi hain. Agar aapne Firestore ko Test Mode me rakha tha to 30-din ki testing limit expire ho sakti hai. Firebase Console > Firestore Database > Rules me jakar rules update karein.'
        );
      } else {
        setCreateExamError(`Error creating exam: ${err.message || 'Unknown Firestore error'}`);
      }
    } finally {
      setCreatingExam(false);
    }
  };

  // Step 1: Medium Selection & Password Check
  const handleSelectMedium = (med: MediumType) => {
    setSelectedMedium(med);
    const medConfig = exam?.mediums[med];
    if (!medConfig?.password) {
      // Prompt to set password
      setMediumPasswordInput('');
      setShowPasswordModal(true);
    }
    setSearchParams({
      examId: exam!.id,
      medium: med,
      ...(selectedSubject ? { subject: selectedSubject } : {}),
    });
  };

  // Save Medium Password
  const handleSaveMediumPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    if (!mediumPasswordInput.trim()) {
      alert('Please enter a secure password for this medium.');
      return;
    }

    setSavingPassword(true);
    try {
      await setMediumPassword(exam.id, selectedMedium, mediumPasswordInput);
      // Update local exam state
      setExam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mediums: {
            ...prev.mediums,
            [selectedMedium]: {
              ...(prev.mediums[selectedMedium] || { completedSubjects: [], totalQuestions: 0 }),
              enabled: true,
              password: mediumPasswordInput.trim(),
            },
          },
        };
      });
      setShowPasswordModal(false);
      triggerToast(`Password set for ${MEDIUM_LABELS[selectedMedium]}!`);
    } catch (err: any) {
      alert(`Error setting password: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  // Step 2: Subject Selection
  const handleSelectSubject = (subj: SubjectType) => {
    if (!exam) return;

    // Check if medium password is set
    const medConfig = exam.mediums[selectedMedium];
    if (!medConfig?.password) {
      setShowPasswordModal(true);
      return;
    }

    setSelectedSubject(subj);
    setSearchParams({
      examId: exam.id,
      medium: selectedMedium,
      subject: subj,
    });
    // Focus question input
    setTimeout(() => {
      questionInputRef.current?.focus();
    }, 150);
  };

  // Step 3: Save & Next Continuous Question Entry Loop
  const handleSaveAndNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!exam || !selectedSubject) return;

    if (!questionText.trim()) {
      setFormError('Please enter the question text.');
      questionInputRef.current?.focus();
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setFormError('Please provide all four options (A, B, C, and D).');
      return;
    }
    if (marks <= 0) {
      setFormError('Marks must be greater than 0.');
      return;
    }
    if (hasNegativeMarking && negativeMarks < 0) {
      setFormError('Negative marks penalty cannot be negative.');
      return;
    }

    setSavingQuestion(true);
    try {
      const nextIndex = (currentQuestionSet?.questions?.length || 0) + 1;
      const questionItem: QuestionItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        questionIndex: nextIndex,
        text: questionText.trim(),
        options: {
          a: { text: optionA.trim() },
          b: { text: optionB.trim() },
          c: { text: optionC.trim() },
          d: { text: optionD.trim() },
        },
        correctOption,
        marks: Number(marks),
        hasNegativeMarking,
        negativeMarks: hasNegativeMarking ? Number(negativeMarks) : 0,
        createdAt: new Date().toISOString(),
      };

      // Only attach imageUrl properties if a valid non-empty URL string was supplied
      if (questionImageUrl.trim()) {
        questionItem.imageUrl = questionImageUrl.trim();
      }
      if (optionAImg.trim()) {
        questionItem.options.a.imageUrl = optionAImg.trim();
      }
      if (optionBImg.trim()) {
        questionItem.options.b.imageUrl = optionBImg.trim();
      }
      if (optionCImg.trim()) {
        questionItem.options.c.imageUrl = optionCImg.trim();
      }
      if (optionDImg.trim()) {
        questionItem.options.d.imageUrl = optionDImg.trim();
      }

      // Appends question to the single document array in Firestore
      const result = await appendQuestionToQuestionSet(
        exam.id,
        selectedMedium,
        selectedSubject,
        questionItem
      );

      // Update local question set state immediately
      setCurrentQuestionSet((prev) => {
        if (!prev) {
          return {
            id: `${selectedMedium}_${selectedSubject}`,
            examId: exam.id,
            medium: selectedMedium,
            subject: selectedSubject,
            isCompleted: false,
            questionsCount: 1,
            questions: [questionItem],
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...prev,
          questionsCount: result.questionsCount,
          questions: [...(prev.questions || []), questionItem],
          updatedAt: new Date().toISOString(),
        };
      });

      // Update question counts map
      setSubjectQuestionCountMap((prev) => ({
        ...prev,
        [selectedSubject]: result.questionsCount,
      }));

      // Reset form fields for continuous entry
      setQuestionText('');
      setQuestionImageUrl('');
      setOptionA('');
      setOptionAImg('');
      setOptionB('');
      setOptionBImg('');
      setOptionC('');
      setOptionCImg('');
      setOptionD('');
      setOptionDImg('');
      setCorrectOption('a');

      // Clear auto-saved question draft from localStorage on successful question submission
      if (exam?.id && selectedSubject) {
        try {
          localStorage.removeItem(getQuestionDraftKey(exam.id, selectedMedium, selectedSubject));
        } catch (e) {}
      }
      setIsDraftSavedLocally(false);
      setHasRestoredDraft(false);
      setLastSavedDraftTime(null);

      // keep marks and negative marking preference as convenient defaults for the subject
      triggerToast(`Saved Question #${result.questionsCount}! Ready for next question.`);

      // Re-focus question text for fast keyboard/paste entry
      setTimeout(() => {
        questionInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      console.error('Error saving question:', err);
      const isPermissionDenied =
        err?.message?.includes('permission') ||
        err?.message?.includes('PERMISSION_DENIED') ||
        err?.code === 'permission-denied';

      if (isPermissionDenied) {
        setFormError(
          'Firebase Permission Denied: Question save nahi ho paya. Firebase Firestore rules write ko block kar rahi hain. Firebase Console > Firestore Database > Rules me jakar rules update/publish karein.'
        );
      } else {
        setFormError(`Failed to save question: ${err.message || 'Unknown Firestore write error'}`);
      }
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete an individual question from the saved array in Firestore
  const handleDeleteSavedQuestion = async (qId: string) => {
    if (!exam || !selectedSubject) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this question?');
    if (!confirmDelete) return;

    try {
      const result = await deleteQuestionFromQuestionSet(
        exam.id,
        selectedMedium,
        selectedSubject,
        qId
      );

      setCurrentQuestionSet((prev) => {
        if (!prev) return prev;
        const updatedList = (prev.questions || []).filter((q) => q.id !== qId);
        return {
          ...prev,
          questions: updatedList,
          questionsCount: result.questionsCount,
        };
      });

      setSubjectQuestionCountMap((prev) => ({
        ...prev,
        [selectedSubject]: result.questionsCount,
      }));

      triggerToast('Question deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting question:', err);
      setFormError(`Failed to delete question: ${err.message}`);
    }
  };

  // Step 4: Mark Subject as Complete
  const handleMarkSubjectComplete = async () => {
    if (!exam || !selectedSubject) return;

    const count = currentQuestionSet?.questions?.length || 0;
    if (count === 0) {
      const confirmZero = window.confirm(
        'No questions have been added to this subject yet. Are you sure you want to mark it as complete?'
      );
      if (!confirmZero) return;
    }

    try {
      await markSubjectAsComplete(exam.id, selectedMedium, selectedSubject);

      // Update state
      setSubjectCompletionMap((prev) => ({ ...prev, [selectedSubject]: true }));
      setCurrentQuestionSet((prev) => (prev ? { ...prev, isCompleted: true } : prev));
      setExam((prev) => {
        if (!prev) return prev;
        const currentMed = prev.mediums[selectedMedium] || {
          completedSubjects: [],
          totalQuestions: 0,
          enabled: true,
        };
        const updatedCompleted = Array.from(new Set([...currentMed.completedSubjects, selectedSubject]));
        return {
          ...prev,
          mediums: {
            ...prev.mediums,
            [selectedMedium]: {
              ...currentMed,
              completedSubjects: updatedCompleted,
            },
          },
        };
      });

      triggerToast(
        `${SUBJECT_LABELS[selectedSubject]} marked as Complete (${count} questions saved)!`
      );

      // Return to Step 2 so teacher can proceed to next subject in order
      setSelectedSubject(null);
      setSearchParams({
        examId: exam.id,
        medium: selectedMedium,
      });
    } catch (err: any) {
      alert(`Failed to mark complete: ${err.message}`);
    }
  };

  // Duration editor save
  const handleSaveDurations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    try {
      await updateSubjectDurations(exam.id, durations);
      setExam((prev) => (prev ? { ...prev, subjectDurations: durations } : prev));
      setShowDurationModal(false);
      triggerToast('Subject durations updated!');
    } catch (err: any) {
      alert(`Error updating durations: ${err.message}`);
    }
  };

  // Publish Exam (Make Live)
  const handlePublishExam = async () => {
    if (!exam) return;
    setPublishError(null);
    setPublishing(true);

    try {
      const res = await publishExam(exam.id);
      triggerToast('Exam successfully published! It is now live.');
      setTimeout(() => {
        navigate('/teacher/home');
      }, 1000);
    } catch (err: any) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Handler after bulk CSV import completes
  const handleBulkUploadSuccess = async () => {
    if (!exam) return;
    try {
      const refreshedExam = await getExam(exam.id);
      if (refreshedExam) setExam(refreshedExam);
      await refreshSubjectStatuses();
      if (selectedSubject) {
        const qSet = await getQuestionSet(exam.id, selectedMedium, selectedSubject);
        setCurrentQuestionSet(qSet);
      }
      triggerToast('Bulk questions successfully imported into exam!');
    } catch (e) {
      console.error('Error refreshing post-import:', e);
    }
  };

  // Current medium config
  const currentMediumConfig = exam?.mediums[selectedMedium];
  const hasPassword = Boolean(currentMediumConfig?.password);
  const totalQuestionsInSubject = currentQuestionSet?.questions?.length || 0;

  // Render initial loading
  if (loadingExam) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-3 border-[#EEF1F6] border-t-[#2F6FED] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-bold text-[#1F2A44]">
          Loading Exam Creation Suite...
        </p>
      </div>
    );
  }

  // If no exam selected or created yet: show starter view with drafts list or create button
  if (!exam) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 min-w-0">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF1F6] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#2F6FED] mb-1">
              <Link to="/teacher/home" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2A44] tracking-tight">
              Create Examination Paper
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6478] mt-1">
              Configure bilingual papers, customize subject timers, and input questions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-98 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create New Exam Paper</span>
          </button>
        </div>

        {/* Quick Launch Card */}
        <div className="bg-gradient-to-r from-[#EAF1FF] via-[#F1F6FF] to-[#F7FAFF] rounded-2xl p-6 border border-[#D5E3FF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#2F6FED] uppercase tracking-wider bg-[#E8F0FE] px-2.5 py-1 rounded-full">
              Standardized Blueprint
            </span>
            <h3 className="text-base font-bold text-[#1F2A44] pt-1">
              Automated 4-Part Structure
            </h3>
            <p className="text-xs text-[#5A6478] max-w-xl">
              Every paper automatically integrates <strong>Part 1: Mathematics</strong>, <strong>Part 2: Reasoning</strong>, <strong>Part 3: Hindi Language</strong>, and <strong>Part 4: General Knowledge</strong> with independent bilingual question banks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-white hover:bg-[#F5F7FB] text-[#2F6FED] border border-[#2F6FED]/30 text-xs font-bold rounded-xl shadow-2xs transition-all shrink-0"
          >
            Start New Paper
          </button>
        </div>

        {/* Existing Drafts List */}
        <div className="bg-white rounded-2xl border border-[#EEF1F6] shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1F2A44]">
              Your Active Drafts (Auto-Saved)
            </h2>
            <span className="text-xs text-[#8A94A6]">
              {existingDrafts.length} draft{existingDrafts.length === 1 ? '' : 's'} available
            </span>
          </div>

          {existingDrafts.length === 0 ? (
            <div className="text-center py-12 text-[#8A94A6]">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F7FB] text-[#8A94A6] flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#1F2A44]">No active drafts found</p>
              <p className="text-xs text-[#5A6478] mt-1">
                Tap "+ Create New Exam Paper" above to start authoring your first test.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF1F6]">
              {existingDrafts.map((d) => (
                <div key={d.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F7FB]/50 rounded-xl px-2 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#1F2A44]">{d.title}</h3>
                      <span className="text-[10px] font-bold bg-[#FFF4E0] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 rounded">
                        Draft
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#5A6478] mt-1.5">
                      <span className="bg-[#F5F7FB] px-2 py-0.5 rounded font-medium text-[#1F2A44]">
                        Hindi: {d.mediums?.hindi?.completedSubjects?.length || 0}/4 parts
                      </span>
                      <span>•</span>
                      <span className="bg-[#F5F7FB] px-2 py-0.5 rounded font-medium text-[#1F2A44]">
                        Assamese: {d.mediums?.assamese?.completedSubjects?.length || 0}/4 parts
                      </span>
                      <span>•</span>
                      <span>Created {new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExam(d);
                      setDurations(d.subjectDurations || { math: 15, reasoning: 15, hindi: 15, gk: 15 });
                      setSearchParams({ examId: d.id });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 self-start sm:self-auto"
                  >
                    <span>Resume Paper</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Exam Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 border border-[#EEF1F6] shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1F2A44]">
                      Initialize Examination Paper
                    </h3>
                    <p className="text-xs text-[#5A6478]">
                      Enter paper details to begin question formulation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-lg text-[#8A94A6] hover:text-[#1F2A44] hover:bg-[#F5F7FB] flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {createExamError && (
                <div className="p-3 bg-[#FDE8EE] border border-[#FBCFE8] rounded-xl text-xs text-[#EF4477] flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error: </span>
                    {createExamError}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateNewExam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    placeholder="e.g. Dikjyoti Mock Test Series — Paper 05"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                    Description & Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newExamDescription}
                    onChange={(e) => setNewExamDescription(e.target.value)}
                    placeholder="Target candidates, syllabus coverage, or special instructions..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                  />
                </div>

                <div className="p-3.5 bg-[#F5F7FB] border border-[#EEF1F6] rounded-xl text-xs text-[#5A6478] leading-relaxed">
                  <div className="font-bold text-[#1F2A44] mb-0.5">Automated Subject Configuration:</div>
                  Every exam includes the 4 standard subjects: <strong>Math, Reasoning, Hindi, GK</strong> (15 mins each by default). You can customize individual timers in the authoring toolbar.
                </div>

                {Boolean(newExamTitle || newExamDescription) && (
                  <div className="text-[11px] text-[#16A34A] flex items-center gap-1.5 font-medium px-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>Inputs auto-saved to local draft — protected against reload</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-[#5A6478] hover:text-[#1F2A44] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingExam}
                    className="px-5 py-2.5 bg-[#2F6FED] hover:bg-[#1D4FC4] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-98"
                  >
                    {creatingExam && (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    )}
                    <span>{creatingExam ? 'Initializing...' : 'Launch Wizard'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1F2A44] text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Masthead & Exam Controls */}
      <div className="bg-white rounded-2xl p-6 border border-[#EEF1F6] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-[#5A6478] mb-1.5">
            <Link
              to="/teacher/home"
              className="hover:underline flex items-center gap-1 text-[#2F6FED]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span>•</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                exam.status === 'live'
                  ? 'bg-[#E6F9F0] text-[#16A34A] border border-[#BBF7D0]'
                  : 'bg-[#FFF4E0] text-[#D97706] border border-[#FDE68A]'
              }`}
            >
              {exam.status === 'live' ? 'LIVE EXAM' : 'DRAFT (AUTO-SAVED)'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2A44] tracking-tight">
            {exam.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A6478] mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E8F0FE] text-[#2F6FED] rounded-lg font-bold">
              <Clock className="w-3.5 h-3.5" />
              {(exam.subjectDurations.math || 15) +
                (exam.subjectDurations.reasoning || 15) +
                (exam.subjectDurations.hindi || 15) +
                (exam.subjectDurations.gk || 15)}{' '}
              mins total
            </span>
            <span className="text-[#8A94A6]">
              (Math: {exam.subjectDurations.math}m • Reasoning: {exam.subjectDurations.reasoning}m • Hindi: {exam.subjectDurations.hindi}m • GK: {exam.subjectDurations.gk}m)
            </span>
          </div>
        </div>

        {/* Executive Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E8F0FE] hover:bg-[#D5E3FF] text-[#2F6FED] text-xs font-bold rounded-xl transition-all shadow-2xs"
            title="Bulk import questions from CSV file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk CSV Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F5F7FB] text-[#1F2A44] text-xs font-bold rounded-xl border border-[#EEF1F6] transition-all shadow-2xs"
            title="Export examination questions to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#2F6FED]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDurationModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F5F7FB] text-[#1F2A44] text-xs font-bold rounded-xl border border-[#EEF1F6] transition-all shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-[#2F6FED]" />
            <span>Edit Durations</span>
          </button>

          <button
            type="button"
            onClick={handlePublishExam}
            disabled={publishing}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all active:scale-98 disabled:opacity-60"
            title="Publish when all 4 subjects for at least one medium are marked complete"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish Exam (Make Live)'}</span>
          </button>
        </div>
      </div>

      {publishError && (
        <div className="p-4 bg-[#FDE8EE] border border-[#FBCFE8] rounded-2xl text-[#EF4477] text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed whitespace-pre-line font-medium">{publishError}</div>
        </div>
      )}

      {/* Wizard Step Progression Nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Step 1 indicator */}
        <div
          onClick={() => setSelectedSubject(null)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            !selectedSubject
              ? 'bg-white border-[#2F6FED] ring-2 ring-[#2F6FED]/20 shadow-xs'
              : 'bg-white text-[#5A6478] border-[#EEF1F6] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#2F6FED]">
              Step 1: Medium
            </span>
            {hasPassword && <Check className="w-3.5 h-3.5 text-[#16A34A]" />}
          </div>
          <div className="font-bold text-sm text-[#1F2A44] mt-1">
            {MEDIUM_LABELS[selectedMedium]}{' '}
            <span className="text-xs font-normal text-[#5A6478]">
              {hasPassword ? '(Secured)' : '(Password Needed)'}
            </span>
          </div>
        </div>

        {/* Step 2 indicator */}
        <div
          onClick={() => setSelectedSubject(null)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedSubject
              ? 'bg-white border-[#2F6FED] ring-2 ring-[#2F6FED]/20 shadow-xs'
              : 'bg-white text-[#5A6478] border-[#EEF1F6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#2F6FED]">
              Step 2: Subject
            </span>
            {selectedSubject && <Check className="w-3.5 h-3.5 text-[#16A34A]" />}
          </div>
          <div className="font-bold text-sm text-[#1F2A44] mt-1">
            {selectedSubject ? SUBJECT_LABELS[selectedSubject] : 'Choose Subject'}
          </div>
        </div>

        {/* Step 3 indicator */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            selectedSubject
              ? 'bg-[#E8F0FE]/40 border-[#2F6FED] text-[#1F2A44]'
              : 'bg-white border-[#EEF1F6] text-[#8A94A6]'
          }`}
        >
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#5A6478]">
            Step 3: Question Entry
          </span>
          <div className="font-bold text-sm text-[#1F2A44] mt-1">
            {selectedSubject ? `${totalQuestionsInSubject} Questions Added` : 'Select a Subject'}
          </div>
        </div>

        {/* Step 4 indicator */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            selectedSubject && subjectCompletionMap[selectedSubject]
              ? 'bg-[#E6F9F0] border-[#BBF7D0] text-[#16A34A]'
              : 'bg-white border-[#EEF1F6] text-[#8A94A6]'
          }`}
        >
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#5A6478]">
            Step 4: Completion
          </span>
          <div className="font-bold text-sm mt-1 flex items-center gap-1.5">
            {selectedSubject && subjectCompletionMap[selectedSubject] ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span className="text-[#16A34A]">Part Complete</span>
              </>
            ) : (
              <span className="text-[#8A94A6]">In Progress</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CHOOSE MEDIUM SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF1F6] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6FED] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
              Step 1
            </span>
            <h2 className="text-lg font-bold text-[#1F2A44] mt-1">
              Select Examination Medium
            </h2>
            <p className="text-xs text-[#5A6478]">
              Hindi and Assamese support independent question sets and their own secure access password.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPassword ? (
              <button
                type="button"
                onClick={() => {
                  setMediumPasswordInput(currentMediumConfig?.password || '');
                  setShowPasswordModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F2A44] bg-[#F5F7FB] hover:bg-[#EEF1F6] px-3 py-2 rounded-xl border border-[#EEF1F6] transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#2F6FED]" />
                <span>Change Password ({currentMediumConfig?.password})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMediumPasswordInput('');
                  setShowPasswordModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97706] bg-[#FFF4E0] hover:bg-[#FEE685] px-3 py-2 rounded-xl border border-[#FDE68A] transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Set {MEDIUM_LABELS[selectedMedium]} Password</span>
              </button>
            )}
          </div>
        </div>

        {/* Medium Selection Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXAM_MEDIUMS.map((med) => {
            const isSel = selectedMedium === med;
            const medConf = exam.mediums[med];
            const hasPass = Boolean(medConf?.password);
            const compCount = medConf?.completedSubjects?.length || 0;

            return (
              <div
                key={med}
                onClick={() => handleSelectMedium(med)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between ${
                  isSel
                    ? 'border-[#2F6FED] bg-[#E8F0FE]/30 shadow-xs'
                    : 'border-[#EEF1F6] hover:border-[#D5E3FF] bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSel ? 'bg-[#2F6FED] text-white' : 'bg-[#F5F7FB] text-[#5A6478]'}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-base font-bold text-[#1F2A44]">
                      {MEDIUM_LABELS[med]}
                    </span>
                    {isSel && (
                      <span className="text-[10px] bg-[#2F6FED] text-white px-2 py-0.5 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5A6478] mt-2">
                    {hasPass ? (
                      <span className="text-[#16A34A] font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Password protected • {compCount}/4 parts complete
                      </span>
                    ) : (
                      <span className="text-[#D97706] font-medium">
                        Password not set (Prompted upon selection)
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-[#1F2A44] bg-white px-2.5 py-1 rounded-lg border border-[#EEF1F6]">
                    {medConf?.totalQuestions || 0} Qs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: CHOOSE SUBJECT (FIXED ORDER: Math, Reasoning, Hindi, GK) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6FED] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
              Step 2
            </span>
            <h2 className="text-lg font-bold text-[#1F2A44] mt-1">
              Select Subject for {MEDIUM_LABELS[selectedMedium]}
            </h2>
            <p className="text-xs text-[#5A6478]">
              Standardized 4-subject progression. Select a subject below to formulate questions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXAM_SUBJECTS.map((subj, idx) => {
            const isSelected = selectedSubject === subj;
            const isCompleted = subjectCompletionMap[subj];
            const qCount = subjectQuestionCountMap[subj] || 0;
            const durationMins = exam.subjectDurations[subj] || 15;

            return (
              <div
                key={subj}
                onClick={() => handleSelectSubject(subj)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#2F6FED] bg-[#2F6FED] text-white shadow-md'
                    : isCompleted
                    ? 'border-[#BBF7D0] bg-[#E6F9F0]/40 hover:border-[#86EFAC]'
                    : 'border-[#EEF1F6] hover:border-[#D5E3FF] bg-[#F5F7FB]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-[#5A6478] border border-[#EEF1F6]'
                      }`}
                    >
                      Part {idx + 1}
                    </span>

                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#16A34A] bg-[#E6F9F0] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </span>
                    ) : qCount > 0 ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-amber-400 text-[#1F2A44]' : 'bg-[#FFF4E0] text-[#D97706]'}`}>
                        In Progress
                      </span>
                    ) : (
                      <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#8A94A6]'}`}>
                        Not Started
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-base font-bold ${
                      isSelected ? 'text-white' : 'text-[#1F2A44]'
                    }`}
                  >
                    {SUBJECT_LABELS[subj]}
                  </h3>

                  <div
                    className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                      isSelected ? 'text-white/80' : 'text-[#5A6478]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 opacity-80" />
                    <span>{durationMins} mins timer</span>
                  </div>
                </div>

                <div
                  className={`mt-4 pt-3 border-t text-xs flex items-center justify-between ${
                    isSelected ? 'border-white/20 text-white' : 'border-[#EEF1F6] text-[#1F2A44]'
                  }`}
                >
                  <span className="font-bold">{qCount} Questions Added</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 3 & STEP 4: CONTINUOUS QUESTION ENTRY LOOP */}
      {/* ========================================================================= */}
      {selectedSubject && (
        <div className="bg-white rounded-2xl border border-[#EEF1F6] shadow-xs p-6 sm:p-7 space-y-6">
          {/* Header Banner for Subject Entry */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF1F6] pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5A6478]">
                <span className="text-[#2F6FED] font-bold bg-[#E8F0FE] px-2.5 py-0.5 rounded-full text-[10px]">
                  Step 3: Question Form
                </span>
                <span>Medium: <strong>{MEDIUM_LABELS[selectedMedium]}</strong></span>
                <span>•</span>
                <span>Subject: <strong>{SUBJECT_LABELS[selectedSubject]}</strong></span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1F2A44] mt-1.5 flex flex-wrap items-center gap-2">
                <span>Entering Question #{totalQuestionsInSubject + 1}</span>
                <span className="text-xs font-semibold text-[#8A94A6] bg-[#F5F7FB] px-2.5 py-1 rounded-lg">
                  {totalQuestionsInSubject} saved in bank
                </span>
              </h2>
            </div>

            {/* STEP 4: Action buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-[#E8F0FE] hover:bg-[#D5E3FF] text-[#2F6FED] rounded-xl transition-all shadow-2xs"
                title="Upload multiple questions for this exam using CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQuestionsList(!showQuestionsList)}
                className="text-xs font-bold px-3.5 py-2 bg-[#F5F7FB] hover:bg-[#EEF1F6] text-[#1F2A44] border border-[#EEF1F6] rounded-xl transition-all"
              >
                {showQuestionsList
                  ? 'Hide Saved Questions'
                  : `Review Saved (${totalQuestionsInSubject})`}
              </button>

              <button
                type="button"
                onClick={handleMarkSubjectComplete}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-98"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark Part as Complete</span>
              </button>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3.5 bg-[#FDE8EE] border border-[#FBCFE8] text-[#EF4477] text-xs font-medium rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Continuous Single Question Form */}
          <form onSubmit={handleSaveAndNext} className="space-y-6">
            {/* Real-Time Local Storage Auto-Save Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-[#F5F7FB] border border-[#EEF1F6] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${
                    isDraftSavedLocally ? 'bg-[#16A34A] animate-pulse' : 'bg-[#8A94A6]'
                  }`}
                />
                <div className="flex flex-wrap items-center gap-1.5 text-[#1F2A44] font-medium">
                  <Save className="w-3.5 h-3.5 text-[#2F6FED]" />
                  {isDraftSavedLocally ? (
                    <span>
                      <strong className="font-bold text-[#16A34A]">Auto-saved in browser:</strong> Form inputs will not be lost on refresh
                      {lastSavedDraftTime ? (
                        <span className="text-[#8A94A6] text-[11px] ml-1">
                          (
                          {new Date(lastSavedDraftTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                          )
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-[#5A6478]">
                      <strong className="font-semibold text-[#1F2A44]">Auto-save active:</strong> Current inputs are stored locally in real-time
                    </span>
                  )}
                </div>
                {hasRestoredDraft && (
                  <span className="text-[10px] font-bold bg-[#E8F0FE] text-[#2F6FED] px-2 py-0.5 rounded-full border border-[#D5E3FF]">
                    Restored from Draft
                  </span>
                )}
              </div>

              {(questionText || optionA || optionB || optionC || optionD || questionImageUrl) && (
                <button
                  type="button"
                  onClick={handleClearQuestionDraft}
                  className="text-[11px] font-bold text-[#EF4477] hover:underline transition-colors ml-auto flex items-center gap-1"
                  title="Discard unsaved local inputs for this question"
                >
                  <Trash2 className="w-3 h-3 text-[#EF4477]" />
                  <span>Clear Unsaved Inputs</span>
                </button>
              )}
            </div>

            {/* Question Text Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1F2A44]">
                  Question Statement * <span className="text-[#8A94A6] font-normal">(Unicode text supported)</span>
                </label>
                <span className="text-[11px] font-bold text-[#2F6FED] bg-[#E8F0FE] px-2 py-0.5 rounded">
                  Q#{totalQuestionsInSubject + 1}
                </span>
              </div>
              <textarea
                ref={questionInputRef}
                required
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type or paste the complete question statement here..."
                className="w-full px-3.5 py-3 text-xs sm:text-sm bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all font-sans"
              />
            </div>

            {/* Optional Question Image URL */}
            <div>
              <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                Diagram or Equation Image URL (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A94A6]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={questionImageUrl}
                  onChange={(e) => setQuestionImageUrl(e.target.value)}
                  placeholder="https://example.com/diagram.png"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                />
              </div>
              {questionImageUrl && (
                <div className="mt-2.5 p-3 bg-[#F5F7FB] border border-[#EEF1F6] rounded-xl max-w-sm">
                  <p className="text-[10px] font-bold text-[#5A6478] mb-1">Image Preview:</p>
                  <img
                    src={questionImageUrl}
                    alt="Question Diagram"
                    referrerPolicy="no-referrer"
                    className="max-h-36 object-contain rounded-lg border border-[#EEF1F6] bg-white"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                </div>
              )}
            </div>

            {/* 4 Options: A, B, C, D */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F2A44]">
                  Multiple Choice Options * <span className="text-[#8A94A6] font-normal">(Select radio button for Official Answer)</span>
                </label>
                <span className="text-xs text-[#16A34A] font-bold bg-[#E6F9F0] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                  Official Key: Option {correctOption.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    correctOption === 'a'
                      ? 'border-[#2F6FED] bg-[#E8F0FE]/25 ring-1 ring-[#2F6FED]/20'
                      : 'border-[#EEF1F6] bg-[#F5F7FB]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'a'}
                        onChange={() => setCorrectOption('a')}
                        className="w-4 h-4 text-[#2F6FED] focus:ring-[#2F6FED]"
                      />
                      <span className="font-bold text-xs text-[#1F2A44]">Option A</span>
                    </label>
                    {correctOption === 'a' && (
                      <span className="text-[10px] bg-[#E6F9F0] text-[#16A34A] border border-[#BBF7D0] font-bold px-2 py-0.5 rounded-full">
                        Official Answer Key
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Enter Option A statement..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                  />
                  <input
                    type="url"
                    value={optionAImg}
                    onChange={(e) => setOptionAImg(e.target.value)}
                    placeholder="Option A diagram URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-[#EEF1F6] rounded-lg text-[#5A6478]"
                  />
                </div>

                {/* Option B */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    correctOption === 'b'
                      ? 'border-[#2F6FED] bg-[#E8F0FE]/25 ring-1 ring-[#2F6FED]/20'
                      : 'border-[#EEF1F6] bg-[#F5F7FB]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'b'}
                        onChange={() => setCorrectOption('b')}
                        className="w-4 h-4 text-[#2F6FED] focus:ring-[#2F6FED]"
                      />
                      <span className="font-bold text-xs text-[#1F2A44]">Option B</span>
                    </label>
                    {correctOption === 'b' && (
                      <span className="text-[10px] bg-[#E6F9F0] text-[#16A34A] border border-[#BBF7D0] font-bold px-2 py-0.5 rounded-full">
                        Official Answer Key
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Enter Option B statement..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                  />
                  <input
                    type="url"
                    value={optionBImg}
                    onChange={(e) => setOptionBImg(e.target.value)}
                    placeholder="Option B diagram URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-[#EEF1F6] rounded-lg text-[#5A6478]"
                  />
                </div>

                {/* Option C */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    correctOption === 'c'
                      ? 'border-[#2F6FED] bg-[#E8F0FE]/25 ring-1 ring-[#2F6FED]/20'
                      : 'border-[#EEF1F6] bg-[#F5F7FB]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'c'}
                        onChange={() => setCorrectOption('c')}
                        className="w-4 h-4 text-[#2F6FED] focus:ring-[#2F6FED]"
                      />
                      <span className="font-bold text-xs text-[#1F2A44]">Option C</span>
                    </label>
                    {correctOption === 'c' && (
                      <span className="text-[10px] bg-[#E6F9F0] text-[#16A34A] border border-[#BBF7D0] font-bold px-2 py-0.5 rounded-full">
                        Official Answer Key
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="Enter Option C statement..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                  />
                  <input
                    type="url"
                    value={optionCImg}
                    onChange={(e) => setOptionCImg(e.target.value)}
                    placeholder="Option C diagram URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-[#EEF1F6] rounded-lg text-[#5A6478]"
                  />
                </div>

                {/* Option D */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    correctOption === 'd'
                      ? 'border-[#2F6FED] bg-[#E8F0FE]/25 ring-1 ring-[#2F6FED]/20'
                      : 'border-[#EEF1F6] bg-[#F5F7FB]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'd'}
                        onChange={() => setCorrectOption('d')}
                        className="w-4 h-4 text-[#2F6FED] focus:ring-[#2F6FED]"
                      />
                      <span className="font-bold text-xs text-[#1F2A44]">Option D</span>
                    </label>
                    {correctOption === 'd' && (
                      <span className="text-[10px] bg-[#E6F9F0] text-[#16A34A] border border-[#BBF7D0] font-bold px-2 py-0.5 rounded-full">
                        Official Answer Key
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="Enter Option D statement..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                  />
                  <input
                    type="url"
                    value={optionDImg}
                    onChange={(e) => setOptionDImg(e.target.value)}
                    placeholder="Option D diagram URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-[#EEF1F6] rounded-lg text-[#5A6478]"
                  />
                </div>
              </div>
            </div>

            {/* Marks & Negative Marking Settings for this specific question */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#F5F7FB] border border-[#EEF1F6]">
              <div>
                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                  Marks Awarded (Correct Answer) *
                </label>
                <input
                  type="number"
                  required
                  min={0.5}
                  step={0.5}
                  value={marks}
                  onChange={(e) => setMarks(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1F2A44] flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNegativeMarking}
                      onChange={(e) => setHasNegativeMarking(e.target.checked)}
                      className="w-4 h-4 text-[#2F6FED] rounded focus:ring-[#2F6FED]"
                    />
                    <span>Negative Marking for Incorrect Response</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasNegativeMarking ? 'bg-[#FDE8EE] text-[#EF4477]' : 'bg-slate-200 text-slate-600'}`}>
                    {hasNegativeMarking ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {hasNegativeMarking ? (
                  <div className="mt-1">
                    <input
                      type="number"
                      required
                      min={0.05}
                      step={0.05}
                      value={negativeMarks}
                      onChange={(e) => setNegativeMarks(parseFloat(e.target.value) || 0.25)}
                      placeholder="e.g. 0.25"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-rose-300 rounded-xl text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <p className="text-[10px] text-[#EF4477] font-medium mt-1">
                      -{negativeMarks} mark will be deducted per incorrect response.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#8A94A6] mt-2">
                    No deduction applied for incorrect attempts on this question.
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions: Save & Next vs Complete Subject */}
            <div className="pt-4 border-t border-[#EEF1F6] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-[#5A6478] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Auto-saved to local browser storage & committed to cloud on submit.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-60"
                >
                  {savingQuestion ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Save & Next Question</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Collapsible List of Already Saved Questions in this Subject */}
          {showQuestionsList && (
            <div className="mt-6 pt-6 border-t border-[#EEF1F6] space-y-3">
              <h3 className="text-base font-bold text-[#1F2A44]">
                Questions Saved in {SUBJECT_LABELS[selectedSubject]} ({totalQuestionsInSubject})
              </h3>
              {totalQuestionsInSubject === 0 ? (
                <p className="text-xs text-[#8A94A6]">No questions saved yet in this subject.</p>
              ) : (
                <div className="space-y-3">
                  {currentQuestionSet?.questions?.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 bg-[#F5F7FB] border border-[#EEF1F6] rounded-xl text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-[#1F2A44] flex-1">
                          Q{idx + 1}. {q.text}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-[#2F6FED] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
                            {q.marks} Mark{q.marks === 1 ? '' : 's'} {q.hasNegativeMarking ? `(-${q.negativeMarks})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedQuestion(q.id)}
                            className="p-1 rounded-lg text-[#8A94A6] hover:text-[#EF4477] hover:bg-[#FDE8EE] transition-colors"
                            title="Delete this question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {q.imageUrl && (
                        <div className="my-1">
                          <img
                            src={q.imageUrl}
                            alt="Question Diagram"
                            referrerPolicy="no-referrer"
                            className="h-24 object-contain rounded-lg border border-[#EEF1F6] bg-white p-1"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5A6478]">
                        <div className={`p-2 rounded-lg border ${q.correctOption === 'a' ? 'font-bold text-[#16A34A] bg-[#E6F9F0] border-[#BBF7D0]' : 'bg-white border-[#EEF1F6]'}`}>
                          A: {q.options?.a?.text} {q.correctOption === 'a' ? '✓ (Official Answer)' : ''}
                        </div>
                        <div className={`p-2 rounded-lg border ${q.correctOption === 'b' ? 'font-bold text-[#16A34A] bg-[#E6F9F0] border-[#BBF7D0]' : 'bg-white border-[#EEF1F6]'}`}>
                          B: {q.options?.b?.text} {q.correctOption === 'b' ? '✓ (Official Answer)' : ''}
                        </div>
                        <div className={`p-2 rounded-lg border ${q.correctOption === 'c' ? 'font-bold text-[#16A34A] bg-[#E6F9F0] border-[#BBF7D0]' : 'bg-white border-[#EEF1F6]'}`}>
                          C: {q.options?.c?.text} {q.correctOption === 'c' ? '✓ (Official Answer)' : ''}
                        </div>
                        <div className={`p-2 rounded-lg border ${q.correctOption === 'd' ? 'font-bold text-[#16A34A] bg-[#E6F9F0] border-[#BBF7D0]' : 'bg-white border-[#EEF1F6]'}`}>
                          D: {q.options?.d?.text} {q.correctOption === 'd' ? '✓ (Official Answer)' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Password setting for medium */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#EEF1F6] shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1F2A44]">
                  Set {MEDIUM_LABELS[selectedMedium]} Password
                </h3>
                <p className="text-xs text-[#5A6478]">
                  Candidates must enter this password to unlock this medium
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMediumPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                  Access Password *
                </label>
                <input
                  type="text"
                  required
                  value={mediumPasswordInput}
                  onChange={(e) => setMediumPasswordInput(e.target.value)}
                  placeholder="e.g. hindi@dikjyoti26"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2F6FED] font-mono transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#5A6478] hover:text-[#1F2A44] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
                >
                  {savingPassword ? 'Saving...' : 'Save Password & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Duration customizer */}
      {showDurationModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#EEF1F6] shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1F2A44]">
                  Customize Subject Durations
                </h3>
                <p className="text-xs text-[#5A6478]">
                  Standard timer is 15 minutes per section.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDurations} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#1F2A44] mb-1.5">Math (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.math}
                    onChange={(e) =>
                      setDurations({ ...durations, math: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1F2A44] mb-1.5">Reasoning (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.reasoning}
                    onChange={(e) =>
                      setDurations({ ...durations, reasoning: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1F2A44] mb-1.5">Hindi (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.hindi}
                    onChange={(e) =>
                      setDurations({ ...durations, hindi: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1F2A44] mb-1.5">GK (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.gk}
                    onChange={(e) =>
                      setDurations({ ...durations, gk: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5E3FF] rounded-xl text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDurationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#5A6478] hover:text-[#1F2A44] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Save Durations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && exam && (
        <BulkUploadModal
          exam={exam}
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      )}

      {/* Export CSV Modal */}
      {showExportModal && exam && (
        <ExportCsvModal
          exam={exam}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
