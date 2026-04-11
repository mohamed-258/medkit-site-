import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { QuizResult, Question, UserProfile, Subject } from '../../types';
import { Download, Users, Target, Clock, Activity, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
        const [resSnap, usersSnap, qSnap, subSnap] = await Promise.all([
          getCountFromServer(collection(db, 'quizResults')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'questions')),
          getDocs(collection(db, 'subjects'))
        ]);

        setCounts({
          totalQuizzes: resSnap.data().count,
          totalUsers: usersSnap.data().count,
          totalQuestions: qSnap.data().count
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
        <p className="text-slate-500 dark:text-slate-400">Basic platform overview (Optimized for low resource usage)</p>
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

      <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-2xl border border-amber-100 dark:border-amber-800 text-center">
        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">Resource Saving Mode Active</h3>
        <p className="text-amber-700 dark:text-amber-300">Detailed performance charts and per-student analytics have been disabled to ensure your daily Firestore limits are not exceeded.</p>
      </div>
    </div>
  );
}
