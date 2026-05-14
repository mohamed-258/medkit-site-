import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '../supabase';
import { Notification } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    const read = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    // Migrate old dismissed to read so users aren't suddenly spammed
    const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    const mergedRead = Array.from(new Set([...read, ...dismissed]));
    setReadIds(mergedRead);
    if (read.length === 0 && dismissed.length > 0) {
      localStorage.setItem('read_notifications', JSON.stringify(mergedRead));
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code !== '42P01') console.error("Error fetching notifications:", error);
          return;
        }

        setNotifications(data as Notification[]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();

    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
       supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleOpen = () => {
    const newShow = !showNotifications;
    setShowNotifications(newShow);
    
    if (newShow && notifications.length > 0) {
      // Mark all visible notifications as read when dropdown is opened
      const ids = notifications.map(n => n.id);
      const newRead = Array.from(new Set([...readIds, ...ids]));
      localStorage.setItem('read_notifications', JSON.stringify(newRead));
      setReadIds(newRead);
    }
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <div className="relative">
      <button onClick={handleToggleOpen} className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors relative group border-0 focus:outline-none focus:ring-0 shadow-none">
        <Bell size={20} className="group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
           <span className="absolute flex items-center justify-center top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border border-white dark:border-slate-900 shadow-sm pointer-events-none">
             {unreadCount > 9 ? '+9' : unreadCount}
           </span>
        )}
      </button>
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100]">
           <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">الإشعارات / Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                 <X size={16} />
              </button>
           </div>
           <div className="max-h-[70vh] overflow-y-auto w-full">
              {notifications.length === 0 ? (
                 <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">لا توجد إشعارات جديدة</div>
              ) : (
                 notifications.map(n => {
                    const isNew = !readIds.includes(n.id);
                    return (
                        <div key={n.id} className={cn("p-4 border-b border-slate-50 dark:border-slate-700/50 transition-colors group", isNew ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-700/50")}>
                           <div className="flex justify-between items-start gap-4 flex-row-reverse">
                              <div className="flex items-start gap-2 w-full flex-row-reverse">
                                 {isNew && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                                 <p className={cn("text-sm leading-relaxed whitespace-pre-wrap text-right w-full", isNew ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-600 dark:text-slate-400")} dir="auto">{n.message}</p>
                              </div>
                           </div>
                           <div className="text-[10px] text-slate-400 mt-3 text-right font-medium">
                              {new Date(n.created_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                           </div>
                        </div>
                    );
                 })
              )}
           </div>
        </div>
      )}
    </div>
  );
}
