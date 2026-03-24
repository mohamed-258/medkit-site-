import { Link } from 'react-router-dom';
import { BookOpen, Lock, PlayCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  status: string;
  progress: number;
  questionCount: number;
  isLocked: boolean;
  onUnlock: () => void;
  index: number;
}

const colorThemes = [
  { light: 'bg-blue-50', dark: 'dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', solid: 'bg-blue-600', shadow: 'shadow-blue-500/25' },
  { light: 'bg-indigo-50', dark: 'dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', solid: 'bg-indigo-600', shadow: 'shadow-indigo-500/25' },
  { light: 'bg-violet-50', dark: 'dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', solid: 'bg-violet-600', shadow: 'shadow-violet-500/25' },
  { light: 'bg-emerald-50', dark: 'dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', solid: 'bg-emerald-600', shadow: 'shadow-emerald-500/25' },
  { light: 'bg-rose-50', dark: 'dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', solid: 'bg-rose-600', shadow: 'shadow-rose-500/25' },
  { light: 'bg-amber-50', dark: 'dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', solid: 'bg-amber-600', shadow: 'shadow-amber-500/25' },
];

export default function SubjectCard({ subject, status, progress, questionCount, isLocked, onUnlock, index }: SubjectCardProps) {
  // Generate consistent color based on subject ID
  const colorIndex = subject.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorThemes.length;
  const theme = colorThemes[colorIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={cn(
        "group relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 transition-all duration-300 overflow-hidden",
        `hover:shadow-2xl hover:${theme.shadow}`
      )}
    >
      {/* Background decorative blob */}
      <div className={cn("absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500", theme.solid)} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-8">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner group-hover:scale-110 group-hover:rotate-3",
            theme.light, theme.dark, theme.text
          )}>
            <BookOpen size={32} strokeWidth={1.5} />
          </div>
          
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-sm",
            status === 'Completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
            status === 'In Progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          )}>
            {status}
          </div>
        </div>

        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-all">
          {subject.nameEn || subject.nameAr}
        </h3>
        
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", theme.solid)} />
          {questionCount} Questions Available
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Progress</span>
            <span className={cn("text-lg font-black", theme.text)}>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className={cn("h-full rounded-full relative overflow-hidden", theme.solid)}
            >
              {/* Shimmer effect on progress bar */}
              <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
        </div>

        {isLocked ? (
          <button 
            onClick={onUnlock}
            className="w-full py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Lock size={20} />
            Unlock Subject
          </button>
        ) : (
          <Link 
            to={`/quiz/${subject.id}`}
            className={cn(
              "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all duration-300 shadow-sm group/btn relative overflow-hidden",
              theme.light, theme.dark, theme.text,
              `hover:${theme.solid} hover:text-white hover:shadow-lg hover:${theme.shadow}`
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {progress === 100 ? <CheckCircle2 size={20} /> : <PlayCircle size={20} />}
              {progress > 0 && progress < 100 ? 'Continue Learning' : progress === 100 ? 'Review Material' : 'Start Learning'}
              <ArrowRight size={18} className="opacity-0 -ml-4 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all duration-300" />
            </span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
