import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { UserPlus, Mail, Lock, ArrowLeft, Chrome, User, Calendar } from 'lucide-react';

export default function Register() {
  const { signInWithGoogle, registerWithEmail } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    dateOfBirth: '',
    email: '',
    password: ''
  });

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('Registration window was closed before completion. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Firebase Authentication. Please add your Netlify domain in the Firebase Console.');
      } else {
        setError(err.message || 'An error occurred during registration. Please try again.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.fatherName || !formData.dateOfBirth || !formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await registerWithEmail(formData.email, formData.password, {
        firstName: formData.firstName,
        fatherName: formData.fatherName,
        dateOfBirth: formData.dateOfBirth
      });
      setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى مراجعة بريدك الإلكتروني (Inbox أو Spam) للضغط على رابط التفعيل قبل تسجيل الدخول.');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled. Please enable it in your Firebase Console.');
      } else {
        setError(err.message || 'An error occurred during registration.');
        console.error(err);
      }
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
            <UserPlus size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Create New Account</h1>
          <p className="text-slate-500 dark:text-slate-400">Join MedKit and start your excellence journey</p>
        </div>

        {successMsg ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Check your email</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {successMsg}
            </p>
            <Link 
              to="/login"
              className="inline-block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0"></span>
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGoogleRegister}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                <Chrome size={20} className="text-blue-600" />
                {loading ? 'Loading...' : 'Register with Google'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Or via Email</span>
                </div>
              </div>

              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="First Name (الاسم الأول)"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Father's Name (اسم الوالد)"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="date"
                    placeholder="Date of Birth (تاريخ الميلاد)"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    placeholder="Email Address (البريد الإلكتروني)"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="password"
                    placeholder="Password (كلمة المرور)"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    required
                    minLength={6}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>

            <p className="mt-10 text-center text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">Login</Link>
            </p>
          </>
        )}

        <Link to="/" className="mt-8 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
