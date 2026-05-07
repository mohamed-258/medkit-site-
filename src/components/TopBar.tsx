import { useState } from 'react';
import { Search, Bell, Plus, Menu, X, ShieldCheck, LayoutDashboard, BookOpen, Trophy, Activity, User, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TopBar() {
  const { profile, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <>
      <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 fixed top-0 right-0 left-0 lg:left-64 z-40 px-4 sm:px-8 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search subjects or quizzes..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 pr-3 sm:pr-6 border-r border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-xl shadow-blue-500/20 border-2 border-white dark:border-slate-800 group-hover:scale-105 transition-all duration-300">
                {profile?.displayName?.charAt(0) || 'S'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none group-hover:text-blue-600 transition-colors">{profile?.displayName || 'User'}</p>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5">
                  {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'owner' ? 'System Owner' : 'Medical Student'}
                </p>
              </div>
            </div>

            <button className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors relative group">
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
          </div>

          <Link to="/" className="flex items-center gap-3 group ml-2">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white hidden xs:block">
              Medkit
            </span>
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
              <ShieldCheck size={24} />
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile Vertical Menu */}
      <div 
        className={cn(
          "lg:hidden fixed top-20 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-30 overflow-hidden transition-all duration-300 ease-in-out shadow-xl",
          isMobileMenuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="p-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
                isActive(item.path)
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => { logout(); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
