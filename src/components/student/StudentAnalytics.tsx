import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../App';
import { QuizResult, Subject } from '../../types';
import { Target, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StudentAnalytics() {
  const { profile } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const q = query(collection(db, 'quizResults'), where('userId', '==', profile.uid));
      const [resSnap, subSnap] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, 'subjects'))
      ]);

      setResults(resSnap.docs.map(d => ({ ...d.data(), id: d.id } as QuizResult)));
      setSubjects(subSnap.docs.map(d => ({ ...d.data(), id: d.id } as Subject)));
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const stats = useMemo(() => {
    if (!results.length) return null;

    // Performance over time
    const sortedResults = [...results].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const performanceData = sortedResults.map(r => ({
      date: new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Math.round((r.score / r.totalQuestions) * 100)
    }));

    // Subject Strengths/Weaknesses (Radar Chart)
    const subjectStats: Record<string, { score: number, total: number, timeSpent: number }> = {};
    results.forEach(r => {
      if (!subjectStats[r.subjectId]) subjectStats[r.subjectId] = { score: 0, total: 0, timeSpent: 0 };
      subjectStats[r.subjectId].score += (r.score / r.totalQuestions) * 100;
      subjectStats[r.subjectId].total++;
      // Assuming 1 minute per question if time isn't tracked explicitly
      subjectStats[r.subjectId].timeSpent += r.totalQuestions; 
    });

    const radarData = Object.entries(subjectStats).map(([id, stat]) => ({
      subject: subjects.find(s => s.id === id)?.nameEn?.substring(0, 10) || 'Unknown',
      accuracy: Math.round(stat.score / stat.total),
      fullMark: 100
    }));

    // Time spent per subject
    const timeData = Object.entries(subjectStats).map(([id, stat]) => ({
      subject: subjects.find(s => s.id === id)?.nameEn?.substring(0, 15) || 'Unknown',
      minutes: stat.timeSpent
    }));

    // Predicted Score (Simple Moving Average of last 5)
    const recentScores = sortedResults.slice(-5).map(r => (r.score / r.totalQuestions) * 100);
    const predictedScore = recentScores.length > 0 
      ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
      : 0;

    // Recommendations
    const weakestSubject = radarData.length > 0 
      ? radarData.reduce((prev, curr) => prev.accuracy < curr.accuracy ? prev : curr)
      : null;

    const recommendations = [];
    if (weakestSubject && weakestSubject.accuracy < 70) {
      recommendations.push(`Focus more on ${weakestSubject.subject}. Your accuracy is currently at ${weakestSubject.accuracy}%.`);
    }
    if (predictedScore > 80) {
      recommendations.push("You're doing great! Keep maintaining your current study schedule.");
    } else if (predictedScore < 50) {
      recommendations.push("Consider reviewing fundamental concepts before taking more quizzes.");
    }

    return {
      performanceData,
      radarData,
      timeData,
      predictedScore,
      recommendations,
      weakestSubject
    };
  }, [results, subjects]);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Not Enough Data</h2>
        <p className="text-slate-500 max-w-md mx-auto">Take a few quizzes to unlock your personalized analytics dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Advanced Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400">Deep dive into your learning progress</p>
        </div>
      </div>

      {/* AI Insights & Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Target size={24} />
              </div>
              <div>
                <h3 className="font-black text-lg">Predicted Score</h3>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Next Exam Estimate</p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-6xl font-black">{stats.predictedScore}%</span>
              <span className="text-blue-200 font-medium mb-2">Based on recent performance</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white">Study Recommendations</h3>
          </div>
          <ul className="space-y-4">
            {stats.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                {rec}
              </li>
            ))}
            {stats.recommendations.length === 0 && (
              <li className="text-slate-500 italic">Keep taking quizzes to get personalized recommendations.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
