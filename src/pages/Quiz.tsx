import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError, OperationType } from '../lib/supabase-errors';
import { useAuth } from '../App';
import { Question, Subject, QuizResult, Section } from '../types';
import { BookOpen, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Trophy, Zap, Star, LayoutGrid, Flag, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Quiz() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showSectionSelection, setShowSectionSelection] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sectionQuestionCounts, setSectionQuestionCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [pendingSectionId, setPendingSectionId] = useState<string | undefined>(undefined);
  const [feedbackMode, setFeedbackMode] = useState<'instant' | 'end'>('end');
  const [quizStarted, setQuizStarted] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (isFinished) return;
    if (feedbackMode === 'instant' && selectedAnswers[currentIdx] !== undefined) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }));
  }, [currentIdx, isFinished, feedbackMode, selectedAnswers]);

  const toggleFlag = useCallback((idx: number) => {
    if (isFinished) return;
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [isFinished]);

  const handleSubmit = useCallback(async () => {
    if (submitting || isFinished) return;
    setSubmitting(true);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Clear saved progress
    if (subjectId) {
      const progressKey = `quiz_progress_${subjectId}_${selectedSectionId || 'all'}`;
      localStorage.removeItem(progressKey);
    }

    let score = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) {
        score++;
      }
    });

    const resultId = Math.random().toString(36).substring(7);
    const resultData: QuizResult = {
      id: resultId,
      userId: profile!.uid,
      subjectId: subjectId!,
      sectionId: selectedSectionId || undefined,
      score,
      totalQuestions: questions.length,
      timestamp: new Date().toISOString(),
      questions,
      selectedAnswers,
    };

    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6']
      });

      // Save result
      await supabase.from('quiz_results').insert({
        id: resultId,
        user_id: profile!.uid,
        subject_id: subjectId!,
        section_id: selectedSectionId || null,
        score,
        total_questions: questions.length,
        timestamp: new Date().toISOString(),
        questions,
        selected_answers: selectedAnswers,
      });
      
      // Update user profile
      const sectionKey = selectedSectionId || `${subjectId}_all`;
      const currentSectionPoints = profile!.sectionPoints?.[sectionKey] || 0;
      const newPoints = score;
      
      const updates: any = {
        completed_quizzes: (profile!.completedQuizzes || 0) + 1,
        total_questions_answered: (profile!.totalQuestionsAnswered || 0) + questions.length,
        total_correct_answers: (profile!.totalCorrectAnswers || 0) + score
      };

      let pointsEarned = 0;
      if (newPoints > currentSectionPoints) {
        pointsEarned = newPoints - currentSectionPoints;
        updates.points = (profile!.points || 0) + pointsEarned;
        updates.section_points = { ...(profile!.sectionPoints || {}), [sectionKey]: newPoints };
      }

      await supabase.from('users').update(updates).eq('uid', profile!.uid);

      navigate(`/result/${resultId}`, { state: { result: resultData, questions, selectedAnswers, pointsEarned } });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }, [profile, subjectId, selectedSectionId, questions, selectedAnswers, submitting, isFinished, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || showResumeModal || showSectionSelection || loading || questions.length === 0) return;

      // Number keys 1-4 for options
      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key) - 1;
        const currentQuestion = questions[currentIdx];
        if (currentQuestion && index < currentQuestion.options.length) {
          handleAnswer(index);
        }
      }

      // Space or Right Arrow for Next
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(prev => prev + 1);
        }
      }

      // Left Arrow for Previous
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) {
          setCurrentIdx(prev => prev - 1);
        }
      }
      
      // 'F' or 'B' for Flag/Bookmark
      if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleFlag(currentIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions, isFinished, showResumeModal, showSectionSelection, loading, handleAnswer, toggleFlag]);

  useEffect(() => {
    if (questions.length > 0) {
      setVisitedQuestions(prev => new Set(prev).add(currentIdx));
    }
  }, [currentIdx, questions.length]);

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;
      
      try {
        let currentSubject: Subject | null = null;
        
        const { data: subjectData } = await supabase.from('subjects').select('*').eq('id', subjectId).single();
        
        if (subjectData) {
          currentSubject = {
            id: subjectData.id,
            nameAr: subjectData.name_ar,
            nameEn: subjectData.name_en,
            icon: subjectData.icon,
            isLocked: subjectData.is_locked
          } as Subject;
        }
        
        if (currentSubject) {
          setSubject(currentSubject);
          
          const { data: sectionsData } = await supabase.from('sections').select('*').eq('subject_id', currentSubject.id);
          const sectionsList = (sectionsData || []).map(doc => ({
            id: doc.id,
            subjectId: doc.subject_id,
            parentId: doc.parent_id,
            nameAr: doc.name_ar,
            nameEn: doc.name_en,
            order: doc.order
          } as Section));
          setSections(sectionsList);

          const counts: Record<string, number> = {};
          
          const { count: allCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('subject_id', currentSubject.id);
          counts['all'] = allCount || 0;
          
          await Promise.all(sectionsList.map(async (section) => {
            const { count: sectionCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('section_id', section.id);
            counts[section.id] = sectionCount || 0;
          }));
          setSectionQuestionCounts(counts);

          if (profile?.uid) {
            const { data: resultsData } = await supabase.from('quiz_results').select('*').eq('user_id', profile.uid).eq('subject_id', subjectId);
            const mistakes = new Set<string>();
            (resultsData || []).forEach(doc => {
              const result = {
                questions: doc.questions,
                selectedAnswers: doc.selected_answers
              } as any;
              result.questions.forEach((q: any, idx: number) => {
                if (result.selectedAnswers[idx] !== q.correctAnswer) {
                  mistakes.add(q.id);
                }
              });
            });
            counts['mistakes'] = mistakes.size;
          }
          
          if (sectionsList.length > 0 || counts['mistakes'] > 0) {
            setShowSectionSelection(true);
            setLoading(false);
            return;
          }
        }

        if (subjectId) {
          const progressKey = `quiz_progress_${subjectId}_all`;
          const savedStr = localStorage.getItem(progressKey);
          if (savedStr) {
            try {
              const parsed = JSON.parse(savedStr);
              setSavedProgress(parsed);
              setPendingSectionId(undefined);
              setShowResumeModal(true);
              setLoading(false);
              return;
            } catch (e) {
              console.error("Error parsing saved progress:", e);
            }
          }
        }

        await fetchQuestions(subjectId, currentSubject?.id);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId, profile?.uid]);

  const fetchQuestions = async (sId: string, firestoreId?: string, sectionId?: string) => {
    setLoading(true);
    try {
      let qList: Question[] = [];
      
      const mapQuestion = (doc: any): Question => ({
        id: doc.id,
        subjectId: doc.subject_id,
        sectionId: doc.section_id,
        title: doc.title,
        imageUrl: doc.image_url,
        options: doc.options,
        correctAnswer: doc.correct_answer,
        explanation: doc.explanation,
        difficulty: doc.difficulty,
        order: doc.order
      });

      if (sectionId === 'mistakes') {
        const { data: resultsData } = await supabase.from('quiz_results').select('*').eq('user_id', profile!.uid).eq('subject_id', sId);
        const mistakeIds = new Set<string>();
        (resultsData || []).forEach(doc => {
          const result = {
            questions: doc.questions,
            selectedAnswers: doc.selected_answers
          } as any;
          result.questions.forEach((q: any, idx: number) => {
            if (result.selectedAnswers[idx] !== q.correctAnswer) {
              mistakeIds.add(q.id);
            }
          });
        });

        if (mistakeIds.size > 0) {
          const { data: qData } = await supabase.from('questions').select('*').eq('subject_id', sId);
          let allQList = (qData || []).map(mapQuestion);
          qList = allQList.filter(q => mistakeIds.has(q.id));
        }
      } else if (sectionId) {
        const subSections = sections.filter(s => s.parentId === sectionId);
        if (subSections.length > 0) {
          const sectionIds = [sectionId, ...subSections.map(s => s.id)];
          const { data: qData } = await supabase.from('questions').select('*').eq('subject_id', sId);
          let allQList = (qData || []).map(mapQuestion);
          qList = allQList.filter(q => sectionIds.includes(q.sectionId || ''));
        } else {
          const { data: qData } = await supabase.from('questions').select('*').eq('section_id', sectionId);
          qList = (qData || []).map(mapQuestion);
        }
      } else {
        const { data: qData } = await supabase.from('questions').select('*').eq('subject_id', sId);
        qList = (qData || []).map(mapQuestion);
      }
      
      const shuffled = qList.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      
      setTimeLeft(shuffled.length * 60);
      setLoading(false);
      setShowSectionSelection(false);
    } catch (err: any) {
      try {
        handleSupabaseError(err, OperationType.GET, 'questions');
      } catch (firestoreErr: any) {
        setMessage(firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.');
      } finally {
        setLoading(false);
      }
    }
  };

  const [message, setMessage] = useState<string | null>(null);

  const handleStartQuiz = async (sectionId?: string) => {
    setSelectedSectionId(sectionId || '');
    
    if (subjectId) {
      const progressKey = `quiz_progress_${subjectId}_${sectionId || 'all'}`;
      const savedStr = localStorage.getItem(progressKey);
      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          setSavedProgress(parsed);
          setPendingSectionId(sectionId);
          setShowResumeModal(true);
          return;
        } catch (e) {
          console.error("Error parsing saved progress:", e);
        }
      }
    }
    
    fetchQuestions(subjectId!, subject?.id, sectionId);
  };

  const resumeQuiz = () => {
    if (savedProgress) {
      setQuestions(savedProgress.questions);
      setCurrentIdx(savedProgress.currentIdx);
      setSelectedAnswers(savedProgress.selectedAnswers);
      setTimeLeft(savedProgress.timeLeft);
      setFlaggedQuestions(new Set(savedProgress.flaggedQuestions));
      setVisitedQuestions(new Set(savedProgress.visitedQuestions));
      setFeedbackMode(savedProgress.feedbackMode || 'end');
      setSelectedSectionId(savedProgress.sectionId === 'all' ? '' : savedProgress.sectionId);
      setShowSectionSelection(false);
      setShowResumeModal(false);
      setLoading(false);
      setQuizStarted(true);
    }
  };

  const startNewQuiz = () => {
    if (subjectId) {
      const progressKey = `quiz_progress_${subjectId}_${pendingSectionId || 'all'}`;
      localStorage.removeItem(progressKey);
    }
    setShowResumeModal(false);
    
    if (selectedSectionId === null && (sections.length > 0 || sectionQuestionCounts['mistakes'] > 0)) {
      setShowSectionSelection(true);
      return;
    }
    
    fetchQuestions(subjectId!, subject?.id, pendingSectionId);
  };

  // Save progress logic
  const latestProgressRef = useRef<any>(null);

  useEffect(() => {
    if (!subjectId || questions.length === 0 || isFinished || loading || showResumeModal || !quizStarted) return;
    
    const currentSectionId = selectedSectionId || 'all';
    const progressKey = `quiz_progress_${subjectId}_${currentSectionId}`;
    const progress = {
      currentIdx,
      selectedAnswers,
      timeLeft,
      flaggedQuestions: Array.from(flaggedQuestions),
      visitedQuestions: Array.from(visitedQuestions),
      questions,
      feedbackMode,
      sectionId: currentSectionId,
      timestamp: new Date().getTime()
    };
    
    latestProgressRef.current = { key: progressKey, data: progress };
  }, [currentIdx, selectedAnswers, timeLeft, flaggedQuestions, visitedQuestions, questions, isFinished, loading, showResumeModal, subjectId, selectedSectionId, feedbackMode, quizStarted]);

  useEffect(() => {
    // Periodic save every 2 seconds to avoid excessive localStorage calls
    const saveInterval = setInterval(() => {
      if (latestProgressRef.current && !isFinished && quizStarted) {
        try {
          localStorage.setItem(latestProgressRef.current.key, JSON.stringify(latestProgressRef.current.data));
        } catch (err) {
          console.error("Error saving progress to localStorage:", err);
        }
      }
    }, 2000);

    return () => {
      clearInterval(saveInterval);
      // Ensure we save one last time when component unmounts in a SPA navigation
      if (latestProgressRef.current && !isFinished) {
        try {
          localStorage.setItem(latestProgressRef.current.key, JSON.stringify(latestProgressRef.current.data));
        } catch (e) {}
      }
    };
  }, [isFinished, quizStarted]);

  // Save on exit / tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latestProgressRef.current && !isFinished) {
        try {
          localStorage.setItem(latestProgressRef.current.key, JSON.stringify(latestProgressRef.current.data));
        } catch (err) {
          console.error("Error saving progress on exit:", err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && latestProgressRef.current && !isFinished) {
        try {
          localStorage.setItem(latestProgressRef.current.key, JSON.stringify(latestProgressRef.current.data));
        } catch (err) {
          console.error("Error saving progress on visibility change:", err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFinished]);

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (isFinished || loading || !quizStarted) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFinished, loading, quizStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-bold">Preparing Questions...</p>
      </div>
    </div>
  );

  if (message) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{message}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  if (showResumeModal) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-slate-100 dark:border-slate-700">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6">
          <Clock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Resume Quiz?</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          You have an unfinished quiz in progress {pendingSectionId && pendingSectionId !== 'all' ? (
            <span className="font-bold text-slate-700 dark:text-slate-200">({sections.find(s => s.id === pendingSectionId)?.nameEn || sections.find(s => s.id === pendingSectionId)?.nameAr || 'Section'})</span>
          ) : (
            <span className="font-bold text-slate-700 dark:text-slate-200">(All Sections)</span>
          )}. Would you like to resume where you left off or start a new one?
        </p>
        <div className="space-y-3">
          <button
            onClick={resumeQuiz}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Resume Quiz
          </button>
          <button
            onClick={startNewQuiz}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
          >
            Start New Quiz
          </button>
        </div>
      </div>
    </div>
  );

  if (showSectionSelection) return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Choose a Section</h2>
        <p className="text-slate-500 dark:text-slate-400">Select a specific section to focus on, or take a quiz on all sections.</p>
      </div>
      
      <div className="flex flex-col gap-4">
        <button
          onClick={() => handleStartQuiz()}
          className="p-6 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 text-left group transition-all duration-300 hover:-translate-y-1 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">All Sections</h3>
              <p className="text-blue-100 text-sm">Test your knowledge across the entire subject.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-blue-200 bg-blue-500/50 px-3 py-1.5 rounded-lg">
              {sectionQuestionCounts['all'] || 0} Questions
            </div>
            {profile?.sectionPoints?.[`${subjectId}_all`] !== undefined && (
              <div className="flex items-center gap-1 text-sm font-bold text-blue-200 bg-blue-500/50 px-3 py-1.5 rounded-lg">
                <Star size={14} fill="currentColor" />
                {profile.sectionPoints[`${subjectId}_all`]}
              </div>
            )}
          </div>
        </button>

        {sectionQuestionCounts['mistakes'] > 0 && (
          <button 
            onClick={() => handleStartQuiz('mistakes')}
            className="p-6 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-500/20 text-left group transition-all duration-300 hover:-translate-y-1 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Review Mistakes</h3>
                <p className="text-rose-100 text-sm">Practice questions you previously answered incorrectly.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-rose-200 bg-rose-500/50 px-3 py-1.5 rounded-lg">
                {sectionQuestionCounts['mistakes']} Questions
              </div>
            </div>
          </button>
        )}

        {sections.filter(s => !s.parentId).map((section) => {
          const subSections = sections.filter(sub => sub.parentId === section.id);
          const hasSubSections = subSections.length > 0;
          const isExpanded = expandedSection === section.id;
          
          // Calculate total questions for parent section including its subsections
          const totalQuestions = hasSubSections 
            ? subSections.reduce((acc, sub) => acc + (sectionQuestionCounts[sub.id] || 0), sectionQuestionCounts[section.id] || 0)
            : (sectionQuestionCounts[section.id] || 0);

          return (
            <div key={section.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
              <button
                onClick={() => hasSubSections ? setExpandedSection(isExpanded ? null : section.id) : handleStartQuiz(section.id)}
                className="w-full p-5 text-left group flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {hasSubSections ? (
                    <div className={cn("text-slate-400 transition-transform duration-300", isExpanded && "rotate-90 text-blue-600")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600">
                      <BookOpen size={16} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{section.nameEn || section.nameAr}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{section.nameEn && section.nameAr ? section.nameAr : 'Practice this section specifically.'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    {hasSubSections ? `${subSections.length} Sub-sections` : `${totalQuestions} Questions`}
                  </div>
                  {profile?.sectionPoints?.[section.id] !== undefined && !hasSubSections && (
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                      <Star size={14} fill="currentColor" />
                      {profile.sectionPoints[section.id]}
                    </div>
                  )}
                </div>
              </button>
              
              {hasSubSections && isExpanded && (
                <div className="px-5 pb-5 pt-2 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-300 pl-14">
                  {subSections.sort((a, b) => (a.order || 0) - (b.order || 0)).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleStartQuiz(sub.id)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-700 rounded-xl text-left transition-all flex items-center justify-between group/sub shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-50 group-hover/sub:opacity-100 transition-opacity" />
                        <span className="font-bold text-slate-700 dark:text-slate-300 group-hover/sub:text-blue-600 dark:group-hover/sub:text-blue-400">{sub.nameEn || sub.nameAr}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg">
                          {sectionQuestionCounts[sub.id] || 0} Questions
                        </div>
                        {profile?.sectionPoints?.[sub.id] !== undefined && (
                          <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                            <Star size={14} fill="currentColor" />
                            {profile.sectionPoints[sub.id]}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-6">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">No Questions Available</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Sorry, no questions have been added to this subject yet.</p>
      <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold">
        <ArrowLeft size={20} />
        Back to Dashboard
      </Link>
    </div>
  );

  if (!quizStarted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-700">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 text-center">Quiz Settings</h2>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={() => setFeedbackMode('end')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all",
              feedbackMode === 'end' 
                ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
            )}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", feedbackMode === 'end' ? "border-blue-600" : "border-slate-400")}>
                {feedbackMode === 'end' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <span className="font-bold text-slate-900 dark:text-white">End of Quiz Feedback</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 pl-7">Show answers and explanations only after finishing the entire quiz.</p>
          </button>

          <button
            onClick={() => setFeedbackMode('instant')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 text-left transition-all",
              feedbackMode === 'instant' 
                ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
            )}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", feedbackMode === 'instant' ? "border-blue-600" : "border-slate-400")}>
                {feedbackMode === 'instant' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Instant Feedback</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 pl-7">Show the correct answer and explanation immediately after answering each question.</p>
          </button>
        </div>

        <button
          onClick={() => setQuizStarted(true)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Fixed Progress Bar at Top */}
      <div className="fixed top-0 left-0 w-full h-2 bg-slate-200 dark:bg-slate-800 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Quiz Content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Zap size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white line-clamp-1">{subject?.nameEn || subject?.nameAr || 'Unnamed Category'}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono font-bold text-lg border-2 transition-colors shadow-sm",
                  timeLeft < 60 ? "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800 animate-pulse" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                )}>
                  <Clock size={20} className={timeLeft < 60 ? "animate-bounce" : ""} />
                  {formatTime(timeLeft)}
                </div>
                <button
                  onClick={() => {
                    // Force a save right now
                    const currentSectionId = selectedSectionId || 'all';
                    const progressKey = `quiz_progress_${subjectId}_${currentSectionId}`;
                    const progress = {
                      currentIdx,
                      selectedAnswers,
                      timeLeft,
                      flaggedQuestions: Array.from(flaggedQuestions),
                      visitedQuestions: Array.from(visitedQuestions),
                      questions,
                      feedbackMode,
                      sectionId: currentSectionId,
                      timestamp: new Date().getTime()
                    };
                    try {
                      localStorage.setItem(progressKey, JSON.stringify(progress));
                    } catch (err) {
                      console.error("Error saving progress to localStorage:", err);
                    }
                    navigate('/dashboard');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                >
                  <ArrowLeft size={18} />
                  <span className="hidden sm:inline">Save & Exit</span>
                </button>
              </div>
            </div>

            {/* Question Card */}
            <div
              key={currentIdx}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 sm:p-8 lg:p-12 shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 soft-glow relative"
            >
              {/* Keyboard Shortcuts Hint */}
              <div className="absolute top-6 right-6 hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">1-4</kbd> to answer
              </div>

              <div className="mb-8 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-4 inline-block",
                    currentQuestion.difficulty === 'easy' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" :
                    currentQuestion.difficulty === 'medium' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600" :
                    "bg-red-50 dark:bg-red-900/20 text-red-600"
                  )}>
                    {currentQuestion.difficulty === 'easy' ? 'Easy' : currentQuestion.difficulty === 'medium' ? 'Medium' : 'Hard'}
                  </span>
                  <div className="prose dark:prose-invert max-w-none text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed break-words overflow-wrap-anywhere overflow-x-auto" dangerouslySetInnerHTML={{ __html: currentQuestion.title }} />
                  {currentQuestion.imageUrl && (
                    <img src={currentQuestion.imageUrl} alt="Question" loading="lazy" className="mt-6 max-h-72 rounded-2xl object-contain border border-slate-100 dark:border-slate-800 shadow-sm" />
                  )}
                </div>
                <button
                  onClick={() => toggleFlag(currentIdx)}
                  className={cn(
                    "p-3 sm:p-4 rounded-2xl border-2 transition-all shrink-0 flex flex-col items-center gap-1 group",
                    flaggedQuestions.has(currentIdx)
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-500 shadow-inner"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-amber-300 hover:text-amber-500"
                  )}
                  title="Bookmark this question (Shortcut: F)"
                >
                  <Flag size={24} fill={flaggedQuestions.has(currentIdx) ? "currentColor" : "none"} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:block">Bookmark</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {currentQuestion.options.map((option, i) => {
                  const isSelected = selectedAnswers[currentIdx] === i;
                  const isAnswered = selectedAnswers[currentIdx] !== undefined;
                  const showInstantFeedback = feedbackMode === 'instant' && isAnswered;
                  const isCorrect = i === currentQuestion.correctAnswer;
                  
                  let buttonClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/80";
                  let iconClass = "bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400";
                  
                  if (showInstantFeedback) {
                    if (isCorrect) {
                      buttonClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm";
                      iconClass = "bg-emerald-500 text-white shadow-md shadow-emerald-500/30";
                    } else if (isSelected) {
                      buttonClass = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400 shadow-sm";
                      iconClass = "bg-red-500 text-white shadow-md shadow-red-500/30";
                    } else {
                      buttonClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-50";
                      iconClass = "bg-slate-100 dark:bg-slate-700 text-slate-400";
                    }
                  } else if (isSelected) {
                    buttonClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-600 text-blue-700 dark:text-blue-400 shadow-sm";
                    iconClass = "bg-blue-600 text-white shadow-md shadow-blue-500/30";
                  }

                  return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={showInstantFeedback}
                    className={cn(
                      "w-full text-left p-4 sm:p-6 rounded-2xl border-2 transition-all flex items-start sm:items-center justify-between gap-4 group relative overflow-hidden",
                      buttonClass
                    )}
                  >
                    {isSelected && !showInstantFeedback && (
                      <div className="absolute inset-0 bg-blue-600/5 dark:bg-blue-400/5" />
                    )}
                    <div className="flex items-start sm:items-center gap-4 relative z-10 flex-1 min-w-0">
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base transition-colors mt-0.5 sm:mt-0",
                        iconClass
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-base sm:text-lg font-medium break-words flex-1">{option}</span>
                    </div>
                    {isSelected && !showInstantFeedback && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm relative z-10 animate-in zoom-in duration-200 mt-1 sm:mt-0">
                        <CheckCircle2 size={16} className="sm:w-5 sm:h-5" />
                      </div>
                    )}
                    {showInstantFeedback && isCorrect && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm relative z-10 animate-in zoom-in duration-200 mt-1 sm:mt-0">
                        <CheckCircle2 size={16} className="sm:w-5 sm:h-5" />
                      </div>
                    )}
                    {showInstantFeedback && isSelected && !isCorrect && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 bg-red-500 rounded-full flex items-center justify-center text-white shadow-sm relative z-10 animate-in zoom-in duration-200 mt-1 sm:mt-0">
                        <XCircle size={16} className="sm:w-5 sm:h-5" />
                      </div>
                    )}
                  </button>
                )})}
              </div>

              {feedbackMode === 'instant' && selectedAnswers[currentIdx] !== undefined && currentQuestion.explanation && (
                <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-4">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <BookOpen size={18} />
                    Explanation
                  </h4>
                  <div className="prose dark:prose-invert max-w-none text-sm text-blue-800 dark:text-blue-200 break-words overflow-wrap-anywhere overflow-x-auto" dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }} />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 group"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">Space</kbd> to next
              </div>

              {currentIdx === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(selectedAnswers).length < questions.length}
                  className="px-6 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : 'Finish Quiz'}
                  {!submitting && <CheckCircle2 size={20} />}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 group"
                >
                  <span className="hidden sm:inline">Next Question</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>

        {/* Sidebar - Question Navigation Grid */}
        <div className="block">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <LayoutGrid size={20} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Question List</h3>
            </div>
            
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all relative",
                    currentIdx === i 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110 z-10" 
                      : flaggedQuestions.has(i)
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border border-amber-200 dark:border-amber-800"
                        : selectedAnswers[i] !== undefined
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800"
                          : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                  )}
                >
                  {i + 1}
                  {flaggedQuestions.has(i) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Answered</span>
                <span className="font-bold text-emerald-600">{Object.keys(selectedAnswers).length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Remaining</span>
                <span className="font-bold text-slate-400">{questions.length - Object.keys(selectedAnswers).length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Flagged</span>
                <span className="font-bold text-amber-500">{flaggedQuestions.size}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
