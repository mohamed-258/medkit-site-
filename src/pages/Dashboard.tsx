import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../App';
import { Subject, UserProfile, QuizResult } from '../types';
import { 
  BookOpen, Trophy, Activity, Star, Zap, Search, 
  ChevronRight, Lock, Award, Clock, CheckCircle2, 
  Circle, PlayCircle, TrendingUp, Calendar, 
  ArrowUpRight, MoreHorizontal, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import SubjectCard from '../components/SubjectCard';
import StudentAnalytics from '../components/student/StudentAnalytics';

export default function Dashboard() {
  const { profile } = useAuth();
  const location = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  const handleDeleteResult = async (resultId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف نتيجة هذا الاختبار؟')) return;
    try {
      const { error } = await supabase.from('quiz_results').delete().eq('id', resultId);
      if (error) throw error;
      setRecentResults(prev => prev.filter(r => r.id !== resultId));
    } catch (err) {
      console.error("Error deleting result:", err);
      alert("حدث خطأ أثناء حذف النتيجة.");
    }
  };

  const currentTab = useMemo(() => {
    if (location.pathname.includes('subjects')) return 'subjects';
    if (location.pathname.includes('quizzes')) return 'quizzes';
    if (location.pathname.includes('progress')) return 'progress';
    if (location.pathname.includes('profile')) return 'profile';
    return 'dashboard';
  }, [location.pathname]);

  useEffect(() => {
    if (!profile) return;

    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase.from('subjects').select('*');
        if (error) throw error;
        
        const subjectsData = data.map(doc => ({ 
          id: doc.id,
          nameAr: doc.name_ar,
          nameEn: doc.name_en,
          icon: doc.icon,
          isLocked: doc.is_locked
        } as Subject));
        setSubjects(subjectsData);
        
        const counts: Record<string, number> = {};
        await Promise.all(subjectsData.map(async (subject) => {
          const { count, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subject.id);
          if (!countError) {
            counts[subject.id] = count || 0;
          }
        }));
        setSubjectQuestionCounts(counts);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    const fetchRecentResults = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', profile.uid)
          .order('timestamp', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        const results = data.map(doc => ({
          id: doc.id,
          userId: doc.user_id,
          subjectId: doc.subject_id,
          sectionId: doc.section_id,
          score: doc.score,
          totalQuestions: doc.total_questions,
          timestamp: doc.timestamp,
          questions: doc.questions,
          selectedAnswers: doc.selected_answers
        } as QuizResult));
        setRecentResults(results);
      } catch (error) {
        console.error("Error fetching recent results:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubjects(), fetchRecentResults()]);
      setLoading(false);
    };

    loadData();
  }, [profile?.uid]);

  // Duplicate handleDeleteResult removed

  const stats = useMemo(() => {
    const totalQuestions = profile?.totalQuestionsAnswered || 0;
    const totalCorrect = profile?.totalCorrectAnswers || 0;
    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Calculate level based on points
    const points = profile?.points || 0;
    let level = 'Beginner';
    if (points > 1000) level = 'Advanced';
    else if (points > 500) level = 'Intermediate';
    
    return {
      points,
      avgScore: averageScore,
      completed: profile?.completedQuizzes || 0,
      totalAnswered: totalQuestions,
      level
    };
  }, [profile]);

  const getSubjectProgress = (subjectId: string) => {
    // Simplified progress since we're not fetching all results to save resources
    return 0;
  };

  const getSubjectStatus = (subjectId: string) => {
    const progress = getSubjectProgress(subjectId);
    if (progress === 0) return 'Not Started';
    if (progress === 100) return 'Completed';
    return 'In Progress';
  };

  const renderDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] p-10 lg:p-16 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden soft-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">
              <Star size={14} className="fill-current" />
              Level: {stats.level}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              Ready to study today, <br />
              <span className="text-blue-600">{profile?.displayName?.split(' ')[0]}?</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md text-lg">
              You're doing great! Keep up the momentum and reach your daily goal.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              to="/subjects" 
              className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-bold text-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <PlayCircle size={24} />
              Start Quiz Now
            </Link>
            {recentResults.length > 0 && (
              <Link 
                to={`/quiz/${recentResults[0].subjectId}`}
                className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3"
              >
                Continue Last Quiz
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Current Points', value: stats.points, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Completed Quizzes', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Accuracy', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Questions Answered', value: stats.totalAnswered, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, "dark:bg-opacity-10")}>
                <stat.icon size={28} className={stat.color} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", stat.color.replace('text', 'bg'))} style={{ width: '70%' }}></div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Subjects Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Your Subjects</h2>
            <Link to="/subjects" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
              View All <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {subjects.slice(0, 4).map((subject, i) => {
              const status = getSubjectStatus(subject.id);
              const progress = getSubjectProgress(subject.id);
              const isLocked = subject.isLocked && !(profile?.allowedSubjects || []).includes(subject.id) && profile?.role !== 'admin' && profile?.role !== 'owner';
              
              return (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  status={status}
                  progress={progress}
                  questionCount={subjectQuestionCounts[subject.id] || 0}
                  isLocked={isLocked}
                  onUnlock={() => setShowLockedModal(true)}
                  index={i}
                />
              );
            })}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Recent Activity</h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {recentResults.length > 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {recentResults.map((result, i) => {
                  const subject = subjects.find(s => s.id === result.subjectId);
                  const scorePercent = Math.round((result.score / result.totalQuestions) * 100);
                  
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                            scorePercent >= 80 ? "bg-emerald-50 text-emerald-600" : 
                            scorePercent >= 50 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                          )}>
                            <Award size={24} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">
                              {subject?.nameEn || 'Quiz Result'}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {new Date(result.timestamp).toLocaleDateString()} • {result.totalQuestions} Questions
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className={cn(
                              "text-lg font-black",
                              scorePercent >= 80 ? "text-emerald-600" : 
                              scorePercent >= 50 ? "text-blue-600" : "text-red-600"
                            )}>
                              {scorePercent}%
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteResult(result.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="حذف النتيجة"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
                  <Clock size={32} />
                </div>
                <p className="text-slate-500 font-medium">No recent activity yet.</p>
                <Link to="/subjects" className="text-sm font-bold text-blue-600 hover:underline inline-block">Start your first quiz</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubjects = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Subjects</h1>
          <p className="text-sm text-slate-500">Browse and practice medical subjects</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search subjects..."
            className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject, i) => {
          const status = getSubjectStatus(subject.id);
          const progress = getSubjectProgress(subject.id);
          const isLocked = subject.isLocked && !(profile?.allowedSubjects || []).includes(subject.id) && profile?.role !== 'admin' && profile?.role !== 'owner';
          
          return (
            <SubjectCard
              key={subject.id}
              subject={subject}
              status={status}
              progress={progress}
              questionCount={subjectQuestionCounts[subject.id] || 0}
              isLocked={isLocked}
              onUnlock={() => setShowLockedModal(true)}
              index={i}
            />
          );
        })}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-blue-500/30 border-4 border-white dark:border-slate-800">
            {profile?.displayName?.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">{profile?.displayName}</h2>
              <p className="text-blue-600 font-bold mt-1">{profile?.email}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Award size={16} className={profile?.role === 'owner' ? "text-amber-500" : profile?.role === 'admin' ? "text-purple-500" : "text-slate-400"} />
                <span className={cn(
                  "text-sm font-bold capitalize",
                  profile?.role === 'owner' ? "text-amber-600 dark:text-amber-400" : 
                  profile?.role === 'admin' ? "text-purple-600 dark:text-purple-400" : 
                  "text-slate-700 dark:text-slate-300"
                )}>{profile?.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold mb-6">Personal Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
              <p className="font-bold text-slate-900 dark:text-white">{profile?.displayName}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date of Birth</label>
              <p className="font-bold text-slate-900 dark:text-white">{profile?.dateOfBirth || 'Not specified'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold mb-6">Account Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">Total Points</span>
              <span className="font-bold text-blue-600">{profile?.points}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">Quizzes Completed</span>
              <span className="font-bold text-emerald-600">{profile?.completedQuizzes}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500">Registered Devices</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {(profile?.registeredDevices || []).length} / {profile?.allowedDevices || 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {currentTab === 'dashboard' && renderDashboard()}
      {currentTab === 'subjects' && renderSubjects()}
      {currentTab === 'profile' && renderProfile()}
      {currentTab === 'progress' && <StudentAnalytics />}
      {currentTab === 'quizzes' && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600">
            <Activity size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Coming Soon</h2>
          <p className="text-slate-500 max-w-md">We're working hard to bring you advanced progress tracking and quiz management features.</p>
          <Link to="/dashboard" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">Back to Dashboard</Link>
        </div>
      )}

      <AnimatePresence>
        {showLockedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border border-slate-100 dark:border-slate-800 relative"
            >
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto mb-8 shadow-inner">
                <Lock size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Subject Locked</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                Premium subjects are exclusive to our members. Contact <a href="http://t.me/MEDKIT01" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-black hover:underline">@MEDKIT01</a> on Telegram to unlock.
              </p>
              <button 
                onClick={() => setShowLockedModal(false)}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/25 active:scale-95"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
