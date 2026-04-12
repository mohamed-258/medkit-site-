import { useLocation, Link, useParams } from 'react-router-dom';
import { Trophy, CheckCircle2, XCircle, ArrowLeft, RefreshCw, BookOpen, Star, Zap, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabase';
import { QuizResult } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Result() {
  const { state } = useLocation();
  const { resultId } = useParams<{ resultId: string }>();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(!state?.result);
  const [fetchedResult, setFetchedResult] = useState<QuizResult | null>(state?.result || null);
  const [showWrongOnly, setShowWrongOnly] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      if (state?.result || !resultId) return;
      
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('id', resultId)
          .single();
        
        if (data) {
          setFetchedResult({
            id: data.id,
            userId: data.user_id,
            subjectId: data.subject_id,
            sectionId: data.section_id,
            score: data.score,
            totalQuestions: data.total_questions,
            timestamp: data.timestamp,
            questions: data.questions,
            selectedAnswers: data.selected_answers
          } as QuizResult);
        }
      } catch (err) {
        console.error("Error fetching result:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId, state?.result]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Loading Result...</p>
        </div>
      </div>
    );
  }

  if (!fetchedResult) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-6">
          <XCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Result Not Found</h2>
        <p className="text-slate-500 mb-8">We couldn't find the details for this quiz attempt.</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const result = fetchedResult;
  const questions = result.questions || state?.questions || [];
  const selectedAnswers = result.selectedAnswers || state?.selectedAnswers || {};
  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Score Card */}
      <div
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 lg:p-16 shadow-xl shadow-slate-200/50 dark:shadow-none text-center mb-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 soft-glow"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        
        <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto mb-8 shadow-inner">
          <Trophy size={48} />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Well Done!</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg">You have successfully completed the exam. Here is your performance summary:</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Degree</p>
            <p className="text-3xl font-black text-blue-600">{result.score} / {result.totalQuestions}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Correct Answers</p>
            <p className="text-3xl font-black text-emerald-600">{result.score} / {result.totalQuestions}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={`/quiz/${result.subjectId}`} className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
            <RefreshCw size={20} />
            Retake Quiz
          </Link>
          <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
            Back to Dashboard
            <ArrowLeft size={20} />
          </Link>
        </div>
      </div>

      {/* Detailed Review */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex-1 flex items-center gap-3">
            <BookOpen size={24} className="text-blue-600" />
            مراجعة الإجابات
          </h2>
          <button
            onClick={() => setShowWrongOnly(!showWrongOnly)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              showWrongOnly 
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' 
                : 'bg-red-50 text-red-600 dark:bg-red-900/20'
            }`}
          >
            {showWrongOnly ? '📋 كل الأسئلة' : '❌ الغلط فقط'}
            {showWrongOnly ? '' : ` (${questions.filter((_: any, i: number) => 
              selectedAnswers[i] !== questions[i]?.correctAnswer).length})`}
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((q: any, i: number) => {
            const isCorrect = selectedAnswers[i] === q.correctAnswer;
            if (showWrongOnly && isCorrect) return null;
            
            const isExpanded = expandedIdx === i;

            return (
              <div
                key={q.id}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-3xl border transition-all overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500",
                  isCorrect ? "border-emerald-100 dark:border-emerald-900/30" : "border-red-100 dark:border-red-900/30"
                )}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full text-left p-6 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isCorrect ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-red-50 dark:bg-red-900/20 text-red-600"
                    )}>
                      {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </div>
                    <div>
                      <div className="prose dark:prose-invert max-w-none font-bold text-slate-900 dark:text-white leading-relaxed" dangerouslySetInnerHTML={{ __html: q.title }} />
                      {q.imageUrl && <img src={q.imageUrl} alt="Question" loading="lazy" className="mt-2 max-h-32 rounded-lg object-contain" />}
                      <span className="text-xs font-bold text-slate-400 mt-1 block">1 Mark</span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-8 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {q.options.map((opt: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          className={cn(
                            "p-4 rounded-xl border text-sm font-medium flex items-start gap-3",
                            optIdx === q.correctAnswer ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" :
                            optIdx === selectedAnswers[i] ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" :
                            "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 shrink-0 rounded flex items-center justify-center text-[10px] font-bold mt-0.5",
                            optIdx === q.correctAnswer ? "bg-emerald-600 text-white" :
                            optIdx === selectedAnswers[i] ? "bg-red-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                          )}>
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="break-words flex-1">{opt}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm mb-3">
                        <Zap size={16} />
                        Explanation:
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
