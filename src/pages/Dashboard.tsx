import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Subject, UserProfile, QuizResult } from '../types';
import { motion } from 'motion/react';
import { BookOpen, Trophy, Zap, Clock, ArrowLeft, Search, Star, GraduationCap, ChevronLeft, Lock, Unlock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch subjects
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, manualId: data.id, id: doc.id } as Subject & { manualId?: string };
      }));
      setLoading(false);
    });

    const unsubSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
      setSections(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => {
      unsubSubjects();
      unsubSections();
    };
  }, []);

  useEffect(() => {
    // Fetch leaderboard
    const leaderboardQuery = query(collection(db, 'users'), orderBy('points', 'desc'), limit(5));
    const unsubLeaderboard = onSnapshot(leaderboardQuery, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    // Fetch recent results for current user
    let unsubResults: () => void;
    if (profile?.uid) {
      const resultsQuery = query(
        collection(db, 'quizResults'),
        orderBy('timestamp', 'desc'),
        limit(3)
      );
      unsubResults = onSnapshot(resultsQuery, (snapshot) => {
        setRecentResults(snapshot.docs
          .map(doc => doc.data() as QuizResult)
          .filter(r => r.userId === profile.uid)
        );
      });
    }
    
    return () => {
      unsubLeaderboard();
      if (unsubResults) unsubResults();
    };
  }, [profile?.uid]);

  const filteredSubjects = subjects.filter(s => {
    if (isAdmin) return true;
    return (profile?.allowedSubjects || []).includes(s.id);
  }).filter(s => 
    (s.nameAr && s.nameAr.includes(searchQuery)) || (s.nameEn && s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Welcome, {profile?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Ready for a new challenge today? Choose a subject and start studying.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-600/10 dark:bg-blue-900/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Star size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Current Points</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{profile?.points}</p>
            </div>
          </div>
          <div className="bg-emerald-600/10 dark:bg-emerald-900/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Completed Quizzes</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{profile?.completedQuizzes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Search & Subjects */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Study Subjects</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search for a subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all w-48 sm:w-64"
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : filteredSubjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSubjects.map((subject) => {
                  const subjectPoints = Object.entries(profile?.sectionPoints || {}).reduce((acc, [key, val]) => {
                    if (key === `${subject.id}_all` || sections.find(s => s.id === key && s.subjectId === subject.id)) {
                      return acc + val;
                    }
                    return acc;
                  }, 0);

                  return (
                  <motion.div
                    key={subject.id}
                    whileHover={{ y: -4 }}
                    className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all"
                  >
                    {subject.isLocked && !(profile?.allowedSubjects || []).includes(subject.id) && profile?.role !== 'admin' ? (
                      <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                            <Lock size={28} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{subject.nameEn || subject.nameAr || 'Unnamed Category'}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Locked</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link to={`/quiz/${subject.id}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {subject.isLocked ? <Lock size={28} /> : <BookOpen size={28} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{subject.nameEn || subject.nameAr || 'Unnamed Category'}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-slate-500 dark:text-slate-400">{subject.nameEn && subject.nameAr ? subject.nameAr : ''}</p>
                              {subjectPoints > 0 && (
                                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                                  <Star size={12} fill="currentColor" />
                                  {subjectPoints} pts
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                          <ChevronLeft size={20} className="rotate-180" />
                        </div>
                      </Link>
                    )}
                  </motion.div>
                )})}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No subjects found matching your search.</p>
              </div>
            )}
          </section>

          {/* Recent Activity */}
          {recentResults.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Recent Quizzes</h2>
              <div className="space-y-4">
                {recentResults.map((result) => (
                  <div key={result.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600">
                        <Trophy size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {subjects.find(s => s.id === result.subjectId)?.nameEn || subjects.find(s => s.id === result.subjectId)?.nameAr || 'Medical Subject'}
                        </h4>
                        {result.sectionId && (
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {sections.find(s => s.id === result.sectionId)?.nameEn || sections.find(s => s.id === result.sectionId)?.nameAr}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(result.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-600">{Math.round((result.score / result.totalQuestions) * 100)}%</p>
                      <p className="text-xs text-slate-400">{result.score} out of {result.totalQuestions} correct</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
          {/* Leaderboard */}
          {profile?.role === 'admin' && (
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                    <Trophy size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leaderboard</h2>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Refresh Leaderboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {leaderboard.map((user, i) => (
                  <div key={user.uid} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        i === 0 ? "bg-amber-500 text-white" : 
                        i === 1 ? "bg-slate-300 text-slate-700" :
                        i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{user.displayName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.completedQuizzes} Quizzes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-600">{user.points}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Points</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="#" className="mt-8 block text-center py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                View Full Leaderboard
              </Link>
            </section>
          )}

          {/* Quick Tips */}
          <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="relative z-10">
              <GraduationCap size={32} className="mb-4 opacity-80" />
              <h3 className="text-xl font-bold mb-2">Tip of the Day</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                "Consistent studying for short periods is much better than intensive one-time studying. Try solving 10 questions daily."
              </p>
              <button className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-bold transition-colors">
                Explore More
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
