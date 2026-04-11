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
    setLoading(false);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Advanced Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400">Deep dive into your learning progress</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 p-10 rounded-[2.5rem] border border-amber-100 dark:border-amber-800 text-center">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-800 rounded-3xl flex items-center justify-center text-amber-600 mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h3 className="text-2xl font-black text-amber-900 dark:text-amber-100 mb-4">Analytics Currently Disabled</h3>
        <p className="text-amber-700 dark:text-amber-300 max-w-md mx-auto leading-relaxed">
          To ensure the platform remains available for everyone within our daily resource limits, detailed analytics have been temporarily disabled. You can still take quizzes and see your results immediately after finishing.
        </p>
      </div>
    </div>
  );
}
