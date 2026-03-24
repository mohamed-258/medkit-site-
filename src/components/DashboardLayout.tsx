import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 selection:bg-blue-100 selection:text-blue-900">
      <Sidebar />
      
      <div className="lg:pl-64 transition-all duration-300">
        <TopBar />
        <main className="pt-24 pb-12 px-4 sm:px-8 lg:px-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
