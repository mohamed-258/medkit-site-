import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Zap, Users, Star, ArrowRight, CheckCircle2, LayoutDashboard, GraduationCap, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="overflow-hidden bg-white dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.15),transparent_70%)]"></div>
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold mb-8 border border-blue-100 dark:border-blue-800/50">
                <Star size={16} className="fill-current" />
                <span>The #1 Platform for Medical Students</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tight">
                Master Medical Exams with <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Smart MCQs
                </span>
              </h1>
              
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed max-w-xl">
                Practice thousands of questions, track your progress, and improve your score daily with our advanced analytics platform.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link 
                  to="/register" 
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
                >
                  Start Solving Now
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/subjects" 
                  className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  Browse Subjects
                </Link>
              </div>
              
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/32/32`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <p><span className="font-bold text-slate-900 dark:text-white">5,000+</span> students already joined</p>
              </div>
            </div>
            
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="relative z-10 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Browser Chrome */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="flex-1 max-w-md mx-auto bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full text-[11px] text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    medkit.app/dashboard
                  </div>
                </div>
                
                {/* Mock Dashboard Content */}
                <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 mb-3"></div>
                        <div className="h-2 w-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-2"></div>
                        <div className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                      <div className="h-4 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                            <div className="h-2 w-2/3 bg-slate-50 dark:bg-slate-800 rounded-full"></div>
                          </div>
                          <div className="h-6 w-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Floating Elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Active Students", value: "5,000+", icon: <Users className="text-blue-600" size={24} /> },
              { label: "Medical Questions", value: "10,000+", icon: <BookOpen className="text-indigo-600" size={24} /> },
              { label: "Exams Completed", value: "20,000+", icon: <CheckCircle2 className="text-emerald-600" size={24} /> },
              { label: "Subjects", value: "15", icon: <GraduationCap className="text-amber-600" size={24} /> }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                  {stat.icon}
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Why Choose MedKit?</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              We provide the most advanced tools to help you succeed in your medical career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <LayoutDashboard className="text-blue-600" size={32} />,
                title: "Smart Analytics",
                desc: "Track your performance in real-time and identify your weak points automatically."
              },
              {
                icon: <Zap className="text-amber-500" size={32} />,
                title: "Mock Exams",
                desc: "Simulate real exam environments with timed tests and instant feedback."
              },
              {
                icon: <Trophy className="text-emerald-500" size={32} />,
                title: "Gamified Learning",
                desc: "Earn points, unlock badges, and compete with your colleagues on the leaderboard."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-white dark:bg-slate-900 p-10 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-8 border border-emerald-100 dark:border-emerald-800/50">
            <CheckCircle2 size={16} />
            <span>Join 5,000+ students today</span>
          </div>
          
          <h2 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-8">Start your journey today</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12">
            Join thousands of medical students improving daily with our smart question bank.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <Link 
              to="/register" 
              className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xl shadow-2xl shadow-blue-500/30 transition-all hover:-translate-y-1 flex items-center gap-3"
            >
              Start Solving Now
              <ArrowRight size={24} />
            </Link>
            <p className="text-sm text-slate-400 font-medium">Free – No credit card required</p>
          </div>
        </div>
      </section>
    </div>
  );
}
