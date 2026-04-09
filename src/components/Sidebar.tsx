import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Trophy, Activity, User, ShieldCheck, LogOut, Users } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const { logout, profile, isAdmin } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Subjects', icon: BookOpen, path: '/subjects' },
    { name: 'Quizzes', icon: Trophy, path: '/quizzes' },
    { name: 'Progress', icon: Activity, path: '/progress' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  if (isAdmin) {
    menuItems.push({ name: 'Admin Panel', icon: ShieldCheck, path: '/admin' });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 hidden lg:flex flex-col z-50">
      <div className="p-8">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Navigation</h2>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group",
              isActive(item.path)
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <item.icon size={20} className={cn("transition-colors", isActive(item.path) ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600")} />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black">
              {profile?.displayName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{profile?.displayName}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Free Plan</p>
            </div>
          </div>
          <button className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors">
            Upgrade
          </button>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
          Logout
        </button>
      </div>
    </aside>
  );
}
