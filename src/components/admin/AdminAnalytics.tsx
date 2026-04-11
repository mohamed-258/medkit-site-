import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { QuizResult, Question, UserProfile, Subject } from '../../types';
import { Download, Users, Target, Clock, Activity, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AdminAnalytics() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    totalQuizzes: 0,
    totalUsers: 0,
    totalQuestions: 0
  });
  const [fullDataLoaded, setFullDataLoaded] = useState(false);

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
        setSubjects(subSnap.docs.map(d => ({ ...d.data(), id: d.id } as Subject)));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching counts:", err);
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const loadFullData = async () => {
    if (fullDataLoaded) return;
    setLoading(true);
    try {
      const [resSnap, usersSnap, qSnap] = await Promise.all([
        getDocs(collection(db, 'quizResults')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'questions'))
      ]);

      setResults(resSnap.docs.map(d => ({ ...d.data(), id: d.id } as QuizResult)));
      setUsers(usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
      setQuestions(qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Question)));
      setFullDataLoaded(true);
      setLoading(false);
    } catch (err) {
      console.error("Error loading full data:", err);
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!results.length) return null;

    const totalQuizzes = results.length;
    const totalScore = results.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0);
    const avgScore = Math.round((totalScore / totalQuizzes) * 100);
    
    // Time analytics (assuming we have a way to calculate time, or just using completion count)
    // For now, let's just use total quizzes as engagement
    const activeUsers = new Set(results.map(r => r.userId)).size;
    const totalUsers = users.length;
    const inactiveUsers = totalUsers - activeUsers;

    const completionRateData = [
      { name: 'Active (Completed ≥1 Quiz)', value: activeUsers },
      { name: 'Inactive', value: inactiveUsers > 0 ? inactiveUsers : 0 }
    ];

    // Time analytics (proxy: total questions answered * 1 min)
    const totalTimeSpentMinutes = results.reduce((acc, r) => acc + r.totalQuestions, 0);
    const avgTimePerUser = activeUsers > 0 ? Math.round(totalTimeSpentMinutes / activeUsers) : 0;
    const avgQuizzesPerUser = activeUsers > 0 ? (totalQuizzes / activeUsers).toFixed(1) : '0';

    // Quizzes over time (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const quizzesByDate = results.reduce((acc: any, r) => {
      const date = new Date(r.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const engagementData = last7Days.map(date => ({
      date: date.substring(5), // MM-DD
      quizzes: quizzesByDate[date] || 0
    }));

    // Most difficult questions
    const questionStats: Record<string, { correct: number, total: number }> = {};
    results.forEach(r => {
      if (r.questions && r.selectedAnswers) {
        r.questions.forEach((q, i) => {
          if (!questionStats[q.id]) questionStats[q.id] = { correct: 0, total: 0 };
          questionStats[q.id].total++;
          if (r.selectedAnswers[i] === q.correctAnswer) {
            questionStats[q.id].correct++;
          }
        });
      }
    });

    const difficultQuestions = Object.entries(questionStats)
      .map(([id, stat]) => ({
        id,
        accuracy: (stat.correct / stat.total) * 100,
        totalAttempts: stat.total,
        question: questions.find(q => q.id === id)?.title || 'Unknown Question'
      }))
      .filter(q => q.totalAttempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Subject Performance
    const subjectStats: Record<string, { score: number, total: number }> = {};
    results.forEach(r => {
      if (!subjectStats[r.subjectId]) subjectStats[r.subjectId] = { score: 0, total: 0 };
      subjectStats[r.subjectId].score += (r.score / r.totalQuestions) * 100;
      subjectStats[r.subjectId].total++;
    });

    const subjectPerformance = Object.entries(subjectStats).map(([id, stat]) => ({
      subject: subjects.find(s => s.id === id)?.nameEn || 'Unknown',
      avgScore: Math.round(stat.score / stat.total)
    }));

    return {
      totalQuizzes,
      avgScore,
      activeUsers,
      totalUsers,
      completionRateData,
      totalTimeSpentMinutes,
      avgTimePerUser,
      avgQuizzesPerUser,
      engagementData,
      difficultQuestions,
      subjectPerformance
    };
  }, [results, questions, subjects, users]);

  const exportToExcel = async () => {
    if (!fullDataLoaded) {
      await loadFullData();
    }
    if (!stats) return;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Overview Sheet
    const overviewData = [
      ['Metric', 'Value'],
      ['Total Quizzes Taken', stats.totalQuizzes],
      ['Average Score', `${stats.avgScore}%`],
      ['Active Students', stats.activeUsers]
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

    // Difficult Questions Sheet
    const difficultData = stats.difficultQuestions.map(q => ({
      Question: q.question.replace(/<[^>]*>?/gm, ''), // strip HTML
      'Accuracy (%)': q.accuracy.toFixed(1),
      'Total Attempts': q.totalAttempts
    }));
    const wsDifficult = XLSX.utils.json_to_sheet(difficultData);
    XLSX.utils.book_append_sheet(wb, wsDifficult, 'Difficult Questions');

    // Subject Performance Sheet
    const wsSubjects = XLSX.utils.json_to_sheet(stats.subjectPerformance);
    XLSX.utils.book_append_sheet(wb, wsSubjects, 'Subject Performance');

    // Save
    XLSX.writeFile(wb, 'Medkit_Admin_Report.xlsx');
  };

  const exportToPDF = async () => {
    if (!fullDataLoaded) {
      await loadFullData();
    }
    if (!stats) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Medkit Admin Analytics Report', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

    // Overview
    doc.setFontSize(16);
    doc.text('Overview', 14, 45);
    (doc as any).autoTable({
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Quizzes Taken', stats.totalQuizzes],
        ['Average Score', `${stats.avgScore}%`],
        ['Active Students', stats.activeUsers]
      ],
    });

    // Difficult Questions
    doc.text('Most Difficult Questions', 14, (doc as any).lastAutoTable.finalY + 15);
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Question', 'Accuracy', 'Attempts']],
      body: stats.difficultQuestions.map(q => [
        q.question.replace(/<[^>]*>?/gm, '').substring(0, 50) + '...',
        `${q.accuracy.toFixed(1)}%`,
        q.totalAttempts
      ]),
    });

    doc.save('Medkit_Admin_Report.pdf');
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400">Comprehensive overview of platform performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl font-bold transition-colors">
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold transition-colors">
            <FileText size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Total Quizzes</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{counts.totalQuizzes}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl flex items-center justify-center">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Average Score</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.avgScore || 0}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Active Students</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.activeUsers || 0} / {counts.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Quizzes/User</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.avgQuizzesPerUser || 0}</p>
          </div>
        </div>
      </div>

      {!fullDataLoaded && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Detailed Analytics Available</h3>
          <p className="text-blue-700 dark:text-blue-300 mb-6">Load detailed performance data, charts, and difficult questions analysis.</p>
          <button 
            onClick={loadFullData}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
          >
            Load Detailed Analytics
          </button>
        </div>
      )}

      {fullDataLoaded && (
        <>
          {/* Most Difficult Questions */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Most Difficult Questions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Question</th>
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Accuracy</th>
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.difficultQuestions.map((q, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2" dangerouslySetInnerHTML={{ __html: q.question }} />
                  </td>
                  <td className="py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {q.accuracy.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 text-right text-sm font-bold text-slate-500">
                    {q.totalAttempts}
                  </td>
                </tr>
              ))}
              {stats.difficultQuestions.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 text-sm">No data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
