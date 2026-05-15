import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { LogIn, Mail, Lock, ShieldCheck, ArrowLeft, Chrome } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('تم إغلاق نافذة تسجيل الدخول. يرجى التأكد من السماح بالنوافذ المنبثقة. إذا كنت تواجه مشكلة، جرب فتح التطبيق في علامة تبويب جديدة من الأعلى.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('هذا النطاق غير مصرح له. يرجى إضافة النطاق في إعدادات Firebase.');
      } else {
        setError(err.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'email-not-verified') {
        setError('يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب قبل تسجيل الدخول.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled. Please enable it in your Firebase Console.');
      } else {
        setError(err.message || 'An error occurred during login.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 lg:p-12 animate-in zoom-in-95 duration-300"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400">Login to continue with MedKit</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0"></span>
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <Chrome size={20} className="text-blue-600" />
            {loading ? 'Loading...' : 'Login with Google'}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Or via Email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                placeholder="Email Address (البريد الإلكتروني)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                placeholder="Password (كلمة المرور)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>

        <p className="mt-10 text-center text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">Create New Account</Link>
        </p>

        <Link to="/" className="mt-8 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
