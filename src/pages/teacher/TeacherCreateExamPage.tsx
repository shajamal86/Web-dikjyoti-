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

  // 1. Initial Load: load exam from URL param or fetch teacher's active drafts
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      setLoadingExam(true);
      try {
        if (urlExamId) {
          const loaded = await getExam(urlExamId);
          if (loaded) {
            setExam(loaded);
            setDurations(loaded.subjectDurations || { math: 15, reasoning: 15, hindi: 15, gk: 15 });
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
      alert('Please enter an exam title.');
      return;
    }

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
      setSelectedSubject(null);
      setSearchParams({ examId: created.id });
      triggerToast('Exam draft initialized successfully!');
    } catch (err: any) {
      alert(`Error creating exam: ${err.message}`);
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
      // keep marks and negative marking preference as convenient defaults for the subject
      triggerToast(`Saved Question #${result.questionsCount}! Ready for next question.`);

      // Re-focus question text for fast keyboard/paste entry
      setTimeout(() => {
        questionInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      console.error('Error saving question:', err);
      setFormError(`Failed to save question: ${err.message}`);
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
        `✓ ${SUBJECT_LABELS[selectedSubject]} marked as Complete (${count} questions saved)!`
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
        <div className="w-8 h-8 border-3 border-[#1B2A4A]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-[#5A6B82]">
          Loading Exam Creation Wizard...
        </p>
      </div>
    );
  }

  // If no exam selected or created yet: show starter view with drafts list or create button
  if (!exam) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#1B2A4A]">
              Exam Authoring Wizard
            </h1>
            <p className="text-xs text-[#5A6B82] mt-0.5">
              Create a new exam or resume an existing draft
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c4a12f] text-[#1B2A4A] text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Exam Paper</span>
          </button>
        </div>

        {/* Existing Drafts List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h2 className="font-serif-heading text-base font-bold text-[#1B2A4A] mb-3">
            Your Active Drafts (Auto-Saved)
          </h2>

          {existingDrafts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No active drafts found.</p>
              <p className="text-xs text-slate-400 mt-1">
                Tap "Create New Exam Paper" above to formulate an assessment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {existingDrafts.map((d) => (
                <div key={d.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-[#1B2A4A]">{d.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#5A6B82] mt-1">
                      <span>Hindi: {d.mediums?.hindi?.completedSubjects?.length || 0}/4 completed</span>
                      <span>•</span>
                      <span>Assamese: {d.mediums?.assamese?.completedSubjects?.length || 0}/4 completed</span>
                      <span>•</span>
                      <span>Created {new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setExam(d);
                      setDurations(d.subjectDurations || { math: 15, reasoning: 15, hindi: 15, gk: 15 });
                      setSearchParams({ examId: d.id });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <span>Resume Draft</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Exam Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
              <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                Initialize New Examination Paper
              </h3>
              <form onSubmit={handleCreateNewExam} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    placeholder="e.g. Dikjyoti Mock Test Series — Paper 05"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">
                    Optional Description
                  </label>
                  <textarea
                    rows={2}
                    value={newExamDescription}
                    onChange={(e) => setNewExamDescription(e.target.value)}
                    placeholder="Target candidates, syllabus coverage, or special rules..."
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                  />
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                  Every exam includes the 4 standard subjects: <strong>Math, Reasoning, Hindi, GK</strong> (15 mins each by default). You can customize durations in the wizard.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Launch Wizard
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1B2A4A] text-white border border-[#D4AF37] px-4 py-3 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Masthead & Exam Controls */}
      <div className="bg-[#1B2A4A] text-white rounded-xl p-5 sm:p-6 border border-[#253963] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold tracking-wider uppercase mb-1">
            <Link
              to="/teacher/home"
              className="hover:underline flex items-center gap-1 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px]">
              {exam.status === 'live' ? 'LIVE EXAM' : 'DRAFT MODE (AUTO-SAVED)'}
            </span>
          </div>
          <h1 className="font-serif-heading text-xl sm:text-2xl font-bold">{exam.title}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Total Duration:{' '}
            <span className="font-semibold text-white">
              {(exam.subjectDurations.math || 15) +
                (exam.subjectDurations.reasoning || 15) +
                (exam.subjectDurations.hindi || 15) +
                (exam.subjectDurations.gk || 15)}{' '}
              mins
            </span>{' '}
            (Math: {exam.subjectDurations.math}m, Reasoning: {exam.subjectDurations.reasoning}m,
            Hindi: {exam.subjectDurations.hindi}m, GK: {exam.subjectDurations.gk}m)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#253963] hover:bg-[#2e477c] text-white text-xs font-semibold rounded-lg border border-[#D4AF37]/30 transition-colors shadow-xs"
            title="Bulk import questions from CSV / Excel file"
          >
            <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Bulk Upload CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#24375F] hover:bg-[#2e4577] text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            title="Export examination questions to standard CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDurationModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#24375F] hover:bg-[#2e4577] text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Edit Durations</span>
          </button>

          <button
            type="button"
            onClick={handlePublishExam}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] hover:bg-[#c4a12f] text-[#1B2A4A] text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-60"
            title="Publish when all 4 subjects for at least one medium are marked complete"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish Exam (Make Live)'}</span>
          </button>
        </div>
      </div>

      {publishError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed whitespace-pre-line">{publishError}</div>
        </div>
      )}

      {/* Wizard Step Progression Nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
        {/* Step 1 indicator */}
        <div
          onClick={() => setSelectedSubject(null)}
          className={`p-3 rounded-lg border cursor-pointer transition-all ${
            !selectedSubject
              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-xs'
              : 'bg-white text-[#5A6B82] border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#D4AF37]">
              Step 1: Medium
            </span>
            {hasPassword && <Check className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <div className="font-semibold text-sm mt-1">
            {MEDIUM_LABELS[selectedMedium]}{' '}
            {hasPassword ? '✓' : '(Password Needed)'}
          </div>
        </div>

        {/* Step 2 indicator */}
        <div
          onClick={() => setSelectedSubject(null)}
          className={`p-3 rounded-lg border cursor-pointer transition-all ${
            selectedSubject
              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-xs'
              : 'bg-white text-[#5A6B82] border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#D4AF37]">
              Step 2: Subject
            </span>
            {selectedSubject && <Check className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <div className="font-semibold text-sm mt-1">
            {selectedSubject ? SUBJECT_LABELS[selectedSubject] : 'Choose Subject'}
          </div>
        </div>

        {/* Step 3 indicator */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            selectedSubject
              ? 'bg-[#F8F7F4] border-[#D4AF37] text-[#1B2A4A]'
              : 'bg-white/60 border-slate-200 text-slate-400'
          }`}
        >
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#5A6B82]">
            Step 3: Question Entry
          </span>
          <div className="font-semibold text-sm mt-1">
            {selectedSubject ? `${totalQuestionsInSubject} Questions Added` : 'Select a Subject'}
          </div>
        </div>

        {/* Step 4 indicator */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            selectedSubject && subjectCompletionMap[selectedSubject]
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-white/60 border-slate-200 text-slate-400'
          }`}
        >
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#5A6B82]">
            Step 4: Completion
          </span>
          <div className="font-semibold text-sm mt-1 flex items-center gap-1.5">
            {selectedSubject && subjectCompletionMap[selectedSubject] ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Subject Complete</span>
              </>
            ) : (
              <span>Mark Complete</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CHOOSE MEDIUM SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#1B2A4A] px-2 py-0.5 rounded">
              Step 1
            </span>
            <h2 className="font-serif-heading text-lg font-bold text-[#1B2A4A] mt-1">
              Select Examination Medium
            </h2>
            <p className="text-xs text-[#5A6B82]">
              Hindi and Assamese support independent question sets and their own secure access password.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPassword ? (
              <button
                onClick={() => {
                  setMediumPasswordInput(currentMediumConfig?.password || '');
                  setShowPasswordModal(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B2A4A] bg-[#F8F7F4] hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Change Password ({currentMediumConfig?.password})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMediumPasswordInput('');
                  setShowPasswordModal(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
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
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between ${
                  isSel
                    ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 ring-1 ring-[#1B2A4A]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className={`w-4 h-4 ${isSel ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                    <span className="font-serif-heading text-base font-bold text-[#1B2A4A]">
                      {MEDIUM_LABELS[med]}
                    </span>
                    {isSel && (
                      <span className="text-[10px] bg-[#1B2A4A] text-white px-2 py-0.5 rounded font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5A6B82] mt-1">
                    {hasPass ? (
                      <span className="text-emerald-700 font-medium">
                        Password protected • {compCount}/4 subjects complete
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        Password not set (Prompted upon selection)
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-[#1B2A4A]">
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#1B2A4A] px-2 py-0.5 rounded">
              Step 2
            </span>
            <h2 className="font-serif-heading text-lg font-bold text-[#1B2A4A] mt-1">
              Select Subject for {MEDIUM_LABELS[selectedMedium]}
            </h2>
            <p className="text-xs text-[#5A6B82]">
              Every exam strictly follows the fixed 4-subject sequence. Tap any subject to enter questions.
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
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white shadow-md'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
                    : 'border-slate-200 hover:border-slate-300 bg-[#F8F7F4]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[#D4AF37] text-[#1B2A4A]'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Part {idx + 1}
                    </span>

                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </span>
                    ) : qCount > 0 ? (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        In Progress
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Not Started</span>
                    )}
                  </div>

                  <h3
                    className={`font-serif-heading text-lg font-bold ${
                      isSelected ? 'text-white' : 'text-[#1B2A4A]'
                    }`}
                  >
                    {SUBJECT_LABELS[subj]}
                  </h3>

                  <div
                    className={`text-xs mt-1 flex items-center gap-2 ${
                      isSelected ? 'text-slate-300' : 'text-[#5A6B82]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{durationMins} mins duration</span>
                  </div>
                </div>

                <div
                  className={`mt-4 pt-3 border-t text-xs flex items-center justify-between ${
                    isSelected ? 'border-white/20 text-[#D4AF37]' : 'border-slate-200 text-[#1B2A4A]'
                  }`}
                >
                  <span className="font-semibold">{qCount} Questions Added</span>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Header Banner for Subject Entry */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5A6B82]">
                <span className="text-[#D4AF37] font-bold bg-[#1B2A4A] px-2 py-0.5 rounded text-[10px]">
                  Step 3 Loop
                </span>
                <span>Medium: <strong>{MEDIUM_LABELS[selectedMedium]}</strong></span>
                <span>•</span>
                <span>Subject: <strong>{SUBJECT_LABELS[selectedSubject]}</strong></span>
              </div>
              <h2 className="font-serif-heading text-xl font-bold text-[#1B2A4A] mt-1 flex items-center gap-2">
                <span>Entering Question #{totalQuestionsInSubject + 1}</span>
                <span className="text-xs font-normal text-[#5A6B82]">
                  ({totalQuestionsInSubject} already saved in single document array)
                </span>
              </h2>
            </div>

            {/* STEP 4: Mark Subject as Complete Button (always visible) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-[#253963] hover:bg-[#2e477c] text-white rounded-lg transition-colors border border-[#D4AF37]/30 shadow-2xs"
                title="Upload multiple questions for this exam using CSV"
              >
                <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Bulk CSV Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQuestionsList(!showQuestionsList)}
                className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#1B2A4A] rounded-lg transition-colors"
              >
                {showQuestionsList
                  ? 'Hide Saved Questions'
                  : `Review Saved (${totalQuestionsInSubject})`}
              </button>

              <button
                type="button"
                onClick={handleMarkSubjectComplete}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark Subject as Complete (Step 4)</span>
              </button>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Continuous Single Question Form */}
          <form onSubmit={handleSaveAndNext} className="space-y-6">
            {/* Question Text Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1B2A4A]">
                  Question Statement * <span className="text-slate-400 font-normal">(Type or paste Unicode text)</span>
                </label>
                <span className="text-[11px] text-slate-400">Question #{totalQuestionsInSubject + 1}</span>
              </div>
              <textarea
                ref={questionInputRef}
                required
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter question text here... (e.g. Find the value of x in 3x + 12 = 45)"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] transition-all font-sans"
              />
            </div>

            {/* Optional Question Image URL */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2A4A] mb-1.5">
                Question Diagram / Image URL (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={questionImageUrl}
                  onChange={(e) => setQuestionImageUrl(e.target.value)}
                  placeholder="https://example.com/diagram.png"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                />
              </div>
              {questionImageUrl && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs">
                  <p className="text-[10px] text-slate-500 mb-1">Image Preview:</p>
                  <img
                    src={questionImageUrl}
                    alt="Question Diagram"
                    referrerPolicy="no-referrer"
                    className="max-h-32 object-contain rounded"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                </div>
              )}
            </div>

            {/* 4 Options: A, B, C, D */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1B2A4A]">
                  Four Answer Options * <span className="text-slate-400 font-normal">(Select radio button for Correct Answer)</span>
                </label>
                <span className="text-xs text-[#D4AF37] font-bold">
                  Correct Option: Option {correctOption.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A */}
                <div
                  className={`p-3.5 rounded-xl border-2 transition-all ${
                    correctOption === 'a'
                      ? 'border-[#D4AF37] bg-amber-50/40 ring-1 ring-[#D4AF37]'
                      : 'border-slate-200 bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'a'}
                        onChange={() => setCorrectOption('a')}
                        className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <span className="font-bold text-xs text-[#1B2A4A]">Option A</span>
                    </label>
                    {correctOption === 'a' && (
                      <span className="text-[10px] bg-[#D4AF37] text-[#1B2A4A] font-bold px-2 py-0.5 rounded">
                        Correct Choice
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Enter Option A text..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                  />
                  <input
                    type="url"
                    value={optionAImg}
                    onChange={(e) => setOptionAImg(e.target.value)}
                    placeholder="Option A image URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded text-slate-600"
                  />
                </div>

                {/* Option B */}
                <div
                  className={`p-3.5 rounded-xl border-2 transition-all ${
                    correctOption === 'b'
                      ? 'border-[#D4AF37] bg-amber-50/40 ring-1 ring-[#D4AF37]'
                      : 'border-slate-200 bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'b'}
                        onChange={() => setCorrectOption('b')}
                        className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <span className="font-bold text-xs text-[#1B2A4A]">Option B</span>
                    </label>
                    {correctOption === 'b' && (
                      <span className="text-[10px] bg-[#D4AF37] text-[#1B2A4A] font-bold px-2 py-0.5 rounded">
                        Correct Choice
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Enter Option B text..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                  />
                  <input
                    type="url"
                    value={optionBImg}
                    onChange={(e) => setOptionBImg(e.target.value)}
                    placeholder="Option B image URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded text-slate-600"
                  />
                </div>

                {/* Option C */}
                <div
                  className={`p-3.5 rounded-xl border-2 transition-all ${
                    correctOption === 'c'
                      ? 'border-[#D4AF37] bg-amber-50/40 ring-1 ring-[#D4AF37]'
                      : 'border-slate-200 bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'c'}
                        onChange={() => setCorrectOption('c')}
                        className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <span className="font-bold text-xs text-[#1B2A4A]">Option C</span>
                    </label>
                    {correctOption === 'c' && (
                      <span className="text-[10px] bg-[#D4AF37] text-[#1B2A4A] font-bold px-2 py-0.5 rounded">
                        Correct Choice
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="Enter Option C text..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                  />
                  <input
                    type="url"
                    value={optionCImg}
                    onChange={(e) => setOptionCImg(e.target.value)}
                    placeholder="Option C image URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded text-slate-600"
                  />
                </div>

                {/* Option D */}
                <div
                  className={`p-3.5 rounded-xl border-2 transition-all ${
                    correctOption === 'd'
                      ? 'border-[#D4AF37] bg-amber-50/40 ring-1 ring-[#D4AF37]'
                      : 'border-slate-200 bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOption === 'd'}
                        onChange={() => setCorrectOption('d')}
                        className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <span className="font-bold text-xs text-[#1B2A4A]">Option D</span>
                    </label>
                    {correctOption === 'd' && (
                      <span className="text-[10px] bg-[#D4AF37] text-[#1B2A4A] font-bold px-2 py-0.5 rounded">
                        Correct Choice
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="Enter Option D text..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                  />
                  <input
                    type="url"
                    value={optionDImg}
                    onChange={(e) => setOptionDImg(e.target.value)}
                    placeholder="Option D image URL (optional)"
                    className="w-full mt-2 px-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Marks & Negative Marking Settings for this specific question */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8F7F4] border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">
                  Marks Awarded (Correct Answer) *
                </label>
                <input
                  type="number"
                  required
                  min={0.5}
                  step={0.5}
                  value={marks}
                  onChange={(e) => setMarks(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#1B2A4A] flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hasNegativeMarking}
                      onChange={(e) => setHasNegativeMarking(e.target.checked)}
                      className="w-4 h-4 text-[#1B2A4A] rounded focus:ring-[#1B2A4A]"
                    />
                    <span>Negative Marking for Wrong Answer</span>
                  </label>
                  <span className="text-[10px] text-[#5A6B82]">
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
                      className="w-full px-3 py-2 text-xs bg-white border border-red-300 rounded-lg text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-[10px] text-red-700 mt-1">
                      -{negativeMarks} mark will be deducted per incorrect response.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-2">
                    No deduction for wrong attempts on this question.
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions: Save & Next vs Complete Subject */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-[#5A6B82]">
                Question will be appended immediately to the single Firestore document array.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-60"
                >
                  {savingQuestion ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Save & Next Question</span>
                      <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Collapsible List of Already Saved Questions in this Subject */}
          {showQuestionsList && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
              <h3 className="font-serif-heading text-base font-bold text-[#1B2A4A]">
                Questions Saved in {SUBJECT_LABELS[selectedSubject]} ({totalQuestionsInSubject})
              </h3>
              {totalQuestionsInSubject === 0 ? (
                <p className="text-xs text-slate-400">No questions saved yet in this subject.</p>
              ) : (
                <div className="space-y-3">
                  {currentQuestionSet?.questions?.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3.5 bg-[#F8F7F4] border border-slate-200 rounded-lg text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[#1B2A4A] flex-1">
                          Q{idx + 1}. {q.text}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-[#1B2A4A] bg-amber-100 px-2 py-0.5 rounded">
                            {q.marks} Marks {q.hasNegativeMarking ? `(-${q.negativeMarks})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedQuestion(q.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                            className="h-20 object-contain rounded border border-slate-200"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className={q.correctOption === 'a' ? 'font-bold text-emerald-700' : ''}>
                          A: {q.options?.a?.text} {q.correctOption === 'a' ? '✓' : ''}
                        </div>
                        <div className={q.correctOption === 'b' ? 'font-bold text-emerald-700' : ''}>
                          B: {q.options?.b?.text} {q.correctOption === 'b' ? '✓' : ''}
                        </div>
                        <div className={q.correctOption === 'c' ? 'font-bold text-emerald-700' : ''}>
                          C: {q.options?.c?.text} {q.correctOption === 'c' ? '✓' : ''}
                        </div>
                        <div className={q.correctOption === 'd' ? 'font-bold text-emerald-700' : ''}>
                          D: {q.options?.d?.text} {q.correctOption === 'd' ? '✓' : ''}
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                Set {MEDIUM_LABELS[selectedMedium]} Password
              </h3>
            </div>
            <p className="text-xs text-[#5A6B82]">
              Students taking the exam in <strong>{MEDIUM_LABELS[selectedMedium]}</strong> must enter
              this password before starting the paper.
            </p>

            <form onSubmit={handleSaveMediumPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">
                  Access Password *
                </label>
                <input
                  type="text"
                  required
                  value={mediumPasswordInput}
                  onChange={(e) => setMediumPasswordInput(e.target.value)}
                  placeholder="e.g. hindi@dikjyoti26"
                  className="w-full px-3 py-2 text-sm bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg shadow-sm"
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                Customize Subject Durations
              </h3>
            </div>
            <p className="text-xs text-[#5A6B82]">
              Default is 15 minutes per subject. You can customize the allocated minutes for each of
              the four subjects.
            </p>

            <form onSubmit={handleSaveDurations} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#1B2A4A] mb-1">Math (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.math}
                    onChange={(e) =>
                      setDurations({ ...durations, math: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-1.5 bg-[#F8F7F4] border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1B2A4A] mb-1">Reasoning (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.reasoning}
                    onChange={(e) =>
                      setDurations({ ...durations, reasoning: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-1.5 bg-[#F8F7F4] border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1B2A4A] mb-1">Hindi (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.hindi}
                    onChange={(e) =>
                      setDurations({ ...durations, hindi: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-1.5 bg-[#F8F7F4] border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1B2A4A] mb-1">GK (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durations.gk}
                    onChange={(e) =>
                      setDurations({ ...durations, gk: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-1.5 bg-[#F8F7F4] border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDurationModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg shadow-sm"
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
