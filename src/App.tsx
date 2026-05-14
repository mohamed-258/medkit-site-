import { useState, useEffect, useRef, createContext, useContext, ReactNode, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { handleSupabaseError, OperationType } from './lib/supabase-errors';

// Error Boundary Component
import React, { Component, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong. Please try refreshing the page.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          displayMessage = `Database Error (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error
        if (this.state.error?.message.includes('auth/network-request-failed')) {
          displayMessage = "Network error: Unable to reach authentication servers. Please check your internet connection or try again later.";
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Application Error</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {displayMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import { UserProfile, Notification } from './types';
import { LogOut, LayoutDashboard, BookOpen, Trophy, Settings, Menu, X, Moon, Sun, Home as HomeIcon, LogIn, UserPlus, ShieldCheck, Bell } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Auth Context
interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, data: { firstName: string, fatherName: string, dateOfBirth: string }) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// Components
const HomePage = lazy(() => import('./pages/Home'));
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const QuizPage = lazy(() => import('./pages/Quiz'));
const ResultPage = lazy(() => import('./pages/Result'));
const AdminPage = lazy(() => import('./pages/Admin'));

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const getDeviceId = () => {
    try {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (e) {
      console.warn("LocalStorage is not accessible. Device registration may be unreliable.");
      return "temp_device_" + Math.random().toString(36).substring(2, 7);
    }
  };

  const mapUserToProfile = (data: any): UserProfile => {
    let finalDisplayName = data.display_name;
    if (data.first_name) {
      finalDisplayName = `${data.first_name} ${data.father_name || ''}`.trim();
    } else if (!finalDisplayName || finalDisplayName === 'Student' || finalDisplayName === 'User') {
      finalDisplayName = data.email ? data.email.split('@')[0] : 'User';
    }

    return {
      uid: data.uid,
      email: data.email,
      displayName: finalDisplayName,
      firstName: data.first_name,
      fatherName: data.father_name,
      dateOfBirth: data.date_of_birth,
      role: data.role,
      points: data.points,
      completedQuizzes: data.completed_quizzes,
      totalQuestionsAnswered: data.total_questions_answered,
      totalCorrectAnswers: data.total_correct_answers,
      sectionPoints: data.section_points,
      allowedSubjects: data.allowed_subjects,
      allowedDevices: data.allowed_devices,
      registeredDevices: data.registered_devices,
      createdAt: data.created_at,
    };
  };

  const userRef = useRef<any>(null);
  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
  }, [user, profile]);

  const fetchProfile = async (sessionUser: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', sessionUser.uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        // If it's a network error and we already have a profile, don't block the app
        if (error.message.includes('Failed to fetch') && profileRef.current) {
          console.warn("Network error while refreshing profile, keeping current profile.");
          return;
        }
        throw error;
      }

      if (data) {
        let mappedData = mapUserToProfile(data);

        // Auto-upgrade owner by email
        if (sessionUser.email === 'mhsn68503@gmail.com' && mappedData.role !== 'owner') {
          await supabase.from('users').update({ role: 'owner' }).eq('uid', sessionUser.uid);
          mappedData.role = 'owner';
        }

        // Device restriction check - only for student role
        if (sessionUser.email !== 'mhsn68503@gmail.com' && mappedData.role !== 'owner' && mappedData.role !== 'admin') {
          const deviceId = getDeviceId();
          const allowed = mappedData.allowedDevices || 1;
          const registered = mappedData.registeredDevices || [];

          if (!registered.includes(deviceId)) {
            if (registered.length < allowed) {
              const newRegistered = [...registered, deviceId];
              await supabase.from('users').update({ registered_devices: newRegistered }).eq('uid', sessionUser.uid);
              mappedData.registeredDevices = newRegistered;
            } else {
              setAuthError('عذراً، هذا الحساب مسجل على الحد الأقصى من الأجهزة المسموح بها. يرجى التواصل مع الإدارة.');
              await signOut(auth);
              setProfile(null);
              setUser(null);
              setLoading(false);
              return;
            }
          }
        }

        setAuthError(null);
        setProfile(mappedData);
      } else {
        // Create new profile if not exists
        const deviceId = getDeviceId();
        const newProfile = {
          uid: sessionUser.uid,
          email: sessionUser.email || '',
          display_name: sessionUser.displayName || 'User',
          role: sessionUser.email === 'mhsn68503@gmail.com' ? 'owner' : 'student',
          points: 0,
          completed_quizzes: 0,
          allowed_devices: 1,
          registered_devices: [deviceId],
          created_at: new Date().toISOString(),
        };
        
        const { error: upsertError } = await supabase.from('users').upsert(newProfile, { onConflict: 'email' });
        if (upsertError) {
           console.error("Error creating profile:", upsertError);
        }
        setProfile(mapUserToProfile(newProfile));
      }

    } catch (err: any) {
      console.error("Error fetching profile:", err);
      if (err.message?.includes('Failed to fetch') && profileRef.current) {
         return; 
      }
      setAuthError(err.message || "حدث خطأ أثناء جلب بيانات المستخدم. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let profileSubscription: any;

    const testConnection = async () => {
      try {
        const { testSupabaseConnection } = await import('./supabase');
        const result = await testSupabaseConnection();
        if (!result.ok) {
          console.error("Supabase Connection Critical Error:", result.error);
        }
      } catch (e) {
        console.error("Failed to import or test Supabase connection", e);
      }
    };

    testConnection();

    // Check for redirect errors
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect login error:", err);
      if (err.code === 'auth/unauthorized-domain') {
         setAuthError('هذا النطاق غير مصرح به في Firebase. يرجى إضافته.');
      } else {
         setAuthError('حدث خطأ أثناء تسجيل الدخول عبر Google. حاول مرة أخرى.');
      }
    });

    // Cleanup function for subscription
    const cleanupSubscription = () => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
        profileSubscription = null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (sessionUser) => {
      console.log("Auth State Transition:", sessionUser ? "User Logged In" : "User Logged Out");
      if (sessionUser) {
        const isSameUser = userRef.current?.uid === sessionUser.uid;
        const hasProfile = !!profileRef.current;
        
        if (!isSameUser || !hasProfile) {
          setUser(sessionUser);
          fetchProfile(sessionUser);
        } else {
          setUser(sessionUser);
        }

        // Setup/Refresh realtime subscription
        cleanupSubscription();
        profileSubscription = supabase.channel(`public:users:uid=eq.${sessionUser.uid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${sessionUser.uid}` }, payload => {
            if (payload.new) {
              setProfile(mapUserToProfile(payload.new));
            }
          })
          .subscribe();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        setAuthError(null);
        cleanupSubscription();
      }
    });

    return () => {
      unsubscribe();
      cleanupSubscription();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIframe = window !== window.parent;
      
      if (isMobile && !isIframe) {
         // Mobile standalone (not in AI Studio iframe) prefers redirect to avoid popup blockers
         await signInWithRedirect(auth, googleProvider);
      } else {
         // Desktop or iframe prefers popup
         await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error("Google login error:", err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error("Email login error:", err);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, data: { firstName: string, fatherName: string, dateOfBirth: string }) => {
    try {
      const { user: authUser } = await createUserWithEmailAndPassword(auth, email, pass);
      
      if (authUser) {
        const newProfile = {
          uid: authUser.uid,
          email: authUser.email || '',
          display_name: `${data.firstName} ${data.fatherName}`,
          first_name: data.firstName,
          father_name: data.fatherName,
          date_of_birth: data.dateOfBirth,
          role: authUser.email === 'mhsn68503@gmail.com' ? 'owner' : 'student',
          points: 0,
          completed_quizzes: 0,
        };
        await supabase.from('users').upsert(newProfile, { onConflict: 'email' });
      }
      await signOut(auth);
    } catch (err) {
      console.error("Registration error:", err);
      throw err;
    }
  };

  const reloadProfile = async () => {
    if (user) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('uid', user.uid).single();
        if (data && !error) {
           setProfile(mapUserToProfile(data));
        }
      } catch (err) {
        console.error("Error reloading profile:", err);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || user?.email === 'mhsn68503@gmail.com';

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">تم رفض الوصول</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {authError}
          </p>
          <button 
            onClick={() => {
              setAuthError(null);
              window.location.href = '/';
            }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, loading, isAdmin, signInWithGoogle, loginWithEmail, registerWithEmail, logout, reloadProfile }}>
        {children}
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

import NotificationsDropdown from './components/NotificationsDropdown';

function Navbar() {
  const { user, profile, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const isActive = (path: string) => location.pathname === path;
  const linkClass = (path: string) => cn(
    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
    isActive(path) 
      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" 
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600"
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          {/* Desktop Menu - Left Side */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/" className={linkClass('/')}>Home</Link>
            {user ? (
              <>
                <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
                {isAdmin && (
                  <Link to="/admin" className={linkClass('/admin')}>Admin Panel</Link>
                )}
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Login</Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-black text-sm shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 active:scale-95">Start Now</Link>
              </div>
            )}
          </div>

          {/* Right Side - Logo and Theme Toggle */}
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user && (
              <NotificationsDropdown />
            )}

            {user && (
              <div className="hidden md:flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-slate-800">
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{profile?.displayName}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{profile?.points} Points</p>
                </div>
                <button onClick={logout} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            )}

            <Link to="/" className="flex items-center gap-3 group">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white hidden xs:block">
                Medkit
              </span>
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
                <ShieldCheck size={24} />
              </div>
            </Link>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600 dark:text-slate-300">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={cn(
          "md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-transparent"
        )}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          <Link to="/" onClick={() => setIsOpen(false)} className={cn("block px-3 py-2 rounded-lg transition-colors", isActive('/') ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>Home</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setIsOpen(false)} className={cn("block px-3 py-2 rounded-lg transition-colors", isActive('/dashboard') ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>Dashboard</Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setIsOpen(false)} className={cn("block px-3 py-2 rounded-lg transition-colors", isActive('/admin') ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800")}>Admin Panel</Link>
              )}
              <button onClick={() => { logout(); setIsOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Login</Link>
              <Link to="/register" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg bg-blue-600 text-white text-center font-medium">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <ShieldCheck size={24} />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Medkit</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-md">
              A specialized medical team from the Faculty of Medicine, Minia University. We aim to provide the best educational experience for medical students by organizing and facilitating question solving and exams.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Quick Links</h3>
            <ul className="space-y-4 text-sm font-bold text-slate-500 dark:text-slate-400">
              <li><Link to="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
              <li><Link to="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link></li>
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">Login</Link></li>
              <li><Link to="/register" className="hover:text-blue-600 transition-colors">Register</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Contact Us</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
              Minia University, Faculty of Medicine<br />
              Minia, Egypt<br />
              <span className="text-blue-600 mt-4 block">@MEDKIT01 on Telegram</span>
            </p>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Medkit Team. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;

  return <>{children}</>;
}

import DashboardLayout from './components/DashboardLayout';

function AppContent() {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/subjects') || 
                          location.pathname.startsWith('/quizzes') || 
                          location.pathname.startsWith('/progress') || 
                          location.pathname.startsWith('/profile') ||
                          location.pathname.startsWith('/admin');

  if (isDashboardRoute) {
    return (
      <div dir="ltr" className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 transition-colors">
        <DashboardLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/subjects" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/quizzes" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/progress" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Suspense>
        </DashboardLayout>
      </div>
    );
  }

  return (
    <div dir="ltr" className="min-h-screen bg-white dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="pt-16 min-h-[calc(100vh-300px)]">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/quiz/:subjectId" 
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/result/:resultId" 
              element={
                <ProtectedRoute>
                  <ResultPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
