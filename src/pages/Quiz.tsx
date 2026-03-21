import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../App';
import { Question, Subject, QuizResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Trophy, Zap, Star, LayoutGrid, Flag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
  const [submitting, setSubmitting] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [pendingSectionId, setPendingSectionId] = useState<string | undefined>(undefined);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (questions.length > 0) {
      setVisitedQuestions(prev => new Set(prev).add(currentIdx));
    }
  }, [currentIdx, questions.length]);

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;
      
      try {
        // Fetch subject
        const subjectDoc = await getDocs(query(collection(db, 'subjects'), where('id', '==', subjectId)));
        let currentSubject: Subject | null = null;
        
        if (!subjectDoc.empty) {
          currentSubject = { ...subjectDoc.docs[0].data(), id: subjectDoc.docs[0].id } as Subject;
        } else {
          // Try fetching by Firestore ID directly if manual ID query fails
          try {
            const directDoc = await getDocs(query(collection(db, 'subjects')));
            const found = directDoc.docs.find(d => d.id === subjectId);
            if (found) {
              currentSubject = { ...found.data(), id: found.id } as Subject;
            }
          } catch (e) {
            console.error("Direct fetch failed", e);
          }
        }
        
        if (currentSubject) {
          setSubject(currentSubject);
          
          // Fetch sections
          const sectionsSnap = await getDocs(query(collection(db, 'sections'), where('subjectId', '==', currentSubject.id)));
          const sectionsList = sectionsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          setSections(sectionsList);
          
          if (sectionsList.length > 0) {
            setShowSectionSelection(true);
            setLoading(false);
            return;
          }
        }

        // Check for saved progress if no sections
        const key = `medkit_quiz_${profile?.uid}_${subjectId}_all`;
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSavedProgress(parsed);
            setPendingSectionId(undefined);
            setShowResumeModal(true);
            setLoading(false);
            return;
          } catch (e) {
            localStorage.removeItem(key);
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
      
      if (sectionId) {
        const qSnap = await getDocs(query(collection(db, 'questions'), where('sectionId', '==', sectionId)));
        qList = qSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
      } else {
        // Fetch questions - try both manual ID and Firestore ID for subjectId
        const qSnapManual = await getDocs(query(collection(db, 'questions'), where('subjectId', '==', sId)));
        qList = qSnapManual.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
        
        // If no questions found, it might be because subjectId in questions is the Firestore ID
        if (qList.length === 0 && firestoreId) {
           const qSnapFirestore = await getDocs(query(collection(db, 'questions'), where('subjectId', '==', firestoreId)));
           qList = qSnapFirestore.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
        }
      }
      
      // Shuffle questions
      const shuffled = qList.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      
      // Set timer (1 minute per question)
      setTimeLeft(shuffled.length * 60);
      setLoading(false);
      setShowSectionSelection(false);
    } catch (err: any) {
      handleFirestoreError(err, 'get', 'questions');
      setLoading(false);
    }
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      }
    };
    console.error(`Firestore Error [${operation}]:`, JSON.stringify(errInfo));
    // Check for permission error
    if (errInfo.error.includes('permission-denied') || errInfo.error.includes('Missing or insufficient permissions')) {
      setMessage('You are not authorized to access these questions.');
    } else {
      setMessage(`Error: ${error?.message || 'Unknown error'}`);
    }
  };
  const [message, setMessage] = useState<string | null>(null);

  const handleStartQuiz = (sectionId?: string) => {
    setSelectedSectionId(sectionId || '');
    
    const key = `medkit_quiz_${profile?.uid}_${subjectId}_${sectionId || 'all'}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedProgress(parsed);
        setPendingSectionId(sectionId);
        setShowResumeModal(true);
        return;
      } catch (e) {
        localStorage.removeItem(key);
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
      setShowSectionSelection(false);
      setShowResumeModal(false);
      setLoading(false);
    }
  };

  const startNewQuiz = () => {
    const key = `medkit_quiz_${profile?.uid}_${subjectId}_${pendingSectionId || 'all'}`;
    localStorage.removeItem(key);
    setShowResumeModal(false);
    fetchQuestions(subjectId!, subject?.id, pendingSectionId);
  };

  useEffect(() => {
    if (!subjectId || questions.length === 0 || isFinished || loading || showResumeModal) return;
    const key = `medkit_quiz_${profile?.uid}_${subjectId}_${selectedSectionId || 'all'}`;
    const progress = {
      currentIdx,
      selectedAnswers,
      timeLeft,
      flaggedQuestions: Array.from(flaggedQuestions),
      visitedQuestions: Array.from(visitedQuestions),
      questions,
      timestamp: new Date().getTime()
    };
    localStorage.setItem(key, JSON.stringify(progress));
  }, [currentIdx, selectedAnswers, timeLeft, flaggedQuestions, visitedQuestions, questions, isFinished, loading, showResumeModal, subjectId, selectedSectionId, profile?.uid]);

  useEffect(() => {
    if (timeLeft > 0 && !isFinished && !loading) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isFinished, loading]);

  const handleAnswer = (optionIdx: number) => {
    if (isFinished) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const toggleFlag = (idx: number) => {
    if (isFinished) return;
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting || isFinished) return;
    setSubmitting(true);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Clear saved progress
    const key = `medkit_quiz_${profile?.uid}_${subjectId}_${selectedSectionId || 'all'}`;
    localStorage.removeItem(key);

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
    };

    try {
      // Save result
      await addDoc(collection(db, 'quizResults'), resultData);
      
      // Update user profile
      const userRef = doc(db, 'users', profile!.uid);
      const sectionKey = selectedSectionId || `${subjectId}_all`;
      const currentSectionPoints = profile!.sectionPoints?.[sectionKey] || 0;
      const newPoints = score * 10;
      
      const updates: any = {
        completedQuizzes: increment(1)
      };

      let pointsEarned = 0;
      if (newPoints > currentSectionPoints) {
        pointsEarned = newPoints - currentSectionPoints;
        updates.points = increment(pointsEarned);
        updates[`sectionPoints.${sectionKey}`] = newPoints;
      }

      await updateDoc(userRef, updates);

      navigate(`/result/${resultId}`, { state: { result: resultData, questions, selectedAnswers, pointsEarned } });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

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
          You have an unfinished quiz in progress. Would you like to resume where you left off or start a new one?
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => handleStartQuiz()}
          className="p-8 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-500/20 text-left group transition-all"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <LayoutGrid size={24} />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold">All Sections</h3>
            {profile?.sectionPoints?.[`${subjectId}_all`] !== undefined && (
              <div className="flex items-center gap-1 text-sm font-bold text-blue-200 bg-blue-500/50 px-2 py-1 rounded-lg">
                <Star size={14} fill="currentColor" />
                {profile.sectionPoints[`${subjectId}_all`]}
              </div>
            )}
          </div>
          <p className="text-blue-100 text-sm">Test your knowledge across the entire subject.</p>
        </motion.button>

        {sections.map((section) => (
          <motion.button
            key={section.id}
            whileHover={{ y: -4 }}
            onClick={() => handleStartQuiz(section.id)}
            className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 text-left group transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <BookOpen size={24} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{section.nameEn || section.nameAr}</h3>
              {profile?.sectionPoints?.[section.id] !== undefined && (
                <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                  <Star size={14} fill="currentColor" />
                  {profile.sectionPoints[section.id]}
                </div>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{section.nameEn && section.nameAr ? section.nameAr : 'Practice this section specifically.'}</p>
          </motion.button>
        ))}
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

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Quiz Content */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">{subject?.nameEn || subject?.nameAr || 'Unnamed Category'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Question {currentIdx + 1}
                  </span>
                  <span className="text-[10px] text-slate-400">of {questions.length}</span>
                </div>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg border-2 transition-colors",
              timeLeft < 60 ? "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-800 animate-pulse" : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-800"
            )}>
              <Clock size={20} />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-12 overflow-hidden">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 lg:p-12 shadow-sm mb-8"
            >
              <div className="mb-10 flex items-start justify-between gap-4">
                <div>
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-4 inline-block",
                    currentQuestion.difficulty === 'easy' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" :
                    currentQuestion.difficulty === 'medium' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600" :
                    "bg-red-50 dark:bg-red-900/20 text-red-600"
                  )}>
                    {currentQuestion.difficulty === 'easy' ? 'Easy' : currentQuestion.difficulty === 'medium' ? 'Medium' : 'Hard'}
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentQuestion.title}
                  </h2>
                </div>
                <button
                  onClick={() => toggleFlag(currentIdx)}
                  className={cn(
                    "p-3 rounded-2xl border-2 transition-all shrink-0",
                    flaggedQuestions.has(currentIdx)
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-500"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-amber-200"
                  )}
                  title="Flag for later"
                >
                  <Flag size={20} fill={flaggedQuestions.has(currentIdx) ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={cn(
                      "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center justify-between group",
                      selectedAnswers[currentIdx] === i 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-600 text-blue-600" 
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-200 dark:hover:border-blue-900"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                        selectedAnswers[currentIdx] === i ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-lg font-medium">{option}</span>
                    </div>
                    {selectedAnswers[currentIdx] === i && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={20} />
              Previous
            </button>

            {currentIdx === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(selectedAnswers).length < questions.length}
                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Finish Quiz'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1"
              >
                Next Question
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar - Question Navigation Grid */}
        <div className="hidden lg:block">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <LayoutGrid size={20} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Question List</h3>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all relative",
                    currentIdx === i 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110 z-10" 
                      : selectedAnswers[i] !== undefined
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800"
                        : visitedQuestions.has(i)
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-800"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900"
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
  );
}
