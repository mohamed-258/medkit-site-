import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, Users, Target } from 'lucide-react';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    totalQuizzes: 0,
    totalUsers: 0,
    totalQuestions: 0
  });

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      try {
        const [resSnap, usersSnap, qSnap] = await Promise.all([
          supabase.from('quiz_results').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('questions').select('*', { count: 'exact', head: true })
        ]);

        setCounts({
          totalQuizzes: resSnap.count || 0,
          totalUsers: usersSnap.count || 0,
          totalQuestions: qSnap.count || 0
        });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching counts:", err);
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Analytics Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400">Basic platform overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Total Quizzes Taken</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.totalQuizzes}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Total Registered Users</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Total Questions</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.totalQuestions}</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Platform Performance</h3>
        <p className="text-blue-700 dark:text-blue-300">Supabase provides efficient real-time analytics and data management for your medical platform.</p>
      </div>
    </div>
  );
}
