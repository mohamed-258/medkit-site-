import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Zap, Users, Star, ArrowRight, CheckCircle2, LayoutDashboard, GraduationCap, ShieldCheck, Activity, HeartPulse, Dna } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="overflow-hidden bg-white dark:bg-slate-950 selection:bg-blue-100 selection:text-blue-900">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-48 overflow-hidden">
        {/* Enhanced Background Gradients */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] opacity-30 dark:opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-indigo-500 to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-400 to-transparent blur-3xl"></div>
          
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4xKSIvPjwvc3ZnPg==')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold mb-8 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm shadow-sm">
                <Star size={16} className="fill-current" />
                <span>The #1 Platform for Medical Students Only</span>
              </motion.div>
              
              <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tight">
                Master Medical Exams with <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                  Smart MCQs
                </span>
              </motion.h1>
              
              <motion.p variants={itemVariants} className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                Practice thousands of questions, track your progress, and improve your score daily with our advanced analytics platform.
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
                <Link 
                  to="/register" 
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-1 hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] flex items-center justify-center gap-2 group"
                >
                  Start Solving Now
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/subjects" 
                  className="w-full sm:w-auto px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  Browse Subjects
                </Link>
              </motion.div>
              
              <motion.div variants={itemVariants} className="mt-10 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-sm">
                      <img src={`https://picsum.photos/seed/user${i}/40/40`} alt="User" loading="lazy" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <p><span className="font-bold text-slate-900 dark:text-white">5,000+</span> medical students already joined</p>
              </motion.div>
            </motion.div>
            
            {/* Right Content - Mockup & Particles */}
            <div className="relative lg:h-[600px] flex items-center justify-center">
              {/* Floating Particles */}
              <motion.div 
                animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }} 
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-10 text-blue-500/40 dark:text-blue-400/30 z-20 hidden md:block"
              >
                <Activity size={48} />
              </motion.div>
              <motion.div 
                animate={{ y: [0, 25, 0], rotate: [0, -15, 15, 0] }} 
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-20 -left-10 text-indigo-500/40 dark:text-indigo-400/30 z-20 hidden md:block"
              >
                <HeartPulse size={64} />
              </motion.div>
              <motion.div 
                animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }} 
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/2 -right-12 text-purple-500/40 dark:text-purple-400/30 z-20 hidden md:block"
              >
                <Dna size={56} />
              </motion.div>

              {/* Main Floating Mockup */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0, y: [-10, 10, -10] }}
                transition={{ 
                  opacity: { duration: 0.8 },
                  scale: { duration: 0.8 },
                  rotateY: { duration: 0.8 },
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative z-10 w-full max-w-lg mx-auto perspective-1000"
              >
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-700/50 shadow-[0_32px_64px_-16px_rgba(37,99,235,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
                  {/* Browser Chrome */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4 flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm"></div>
                    </div>
                    <div className="flex-1 max-w-xs mx-auto bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full text-[11px] text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 shadow-inner">
                      <ShieldCheck size={12} className="text-emerald-500" />
                      medkit.app/dashboard
                    </div>
                  </div>
                  
                  {/* Mock Dashboard Content */}
                  <div className="p-6 bg-slate-50/30 dark:bg-slate-950/30">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 mb-3 flex items-center justify-center">
                            {i === 1 && <Trophy size={16} className="text-blue-500" />}
                            {i === 2 && <Activity size={16} className="text-indigo-500" />}
                            {i === 3 && <Star size={16} className="text-purple-500" />}
                          </div>
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
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                              <CheckCircle2 size={16} className="text-emerald-500 opacity-50" />
                            </div>
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
              </motion.div>
              
              {/* Decorative Glow behind mockup */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Glassmorphism Stats Section (Overlapping) */}
      <section className="relative z-20 -mt-16 mb-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 lg:p-10 rounded-[2.5rem] border border-white/40 dark:border-slate-700/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 divide-x-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
            {[
              { label: "Active Students", value: "5,000+", icon: <Users className="text-blue-500" size={28} /> },
              { label: "Medical Questions", value: "10,000+", icon: <BookOpen className="text-indigo-500" size={28} /> },
              { label: "Exams Completed", value: "20,000+", icon: <CheckCircle2 className="text-emerald-500" size={28} /> },
              { label: "Subjects", value: "15", icon: <GraduationCap className="text-amber-500" size={28} /> }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center lg:px-4">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                  {stat.icon}
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24">
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group bg-white dark:bg-slate-900 p-10 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-8 border border-emerald-100 dark:border-emerald-800/50"
          >
            <CheckCircle2 size={16} />
            <span>Join 5,000+ medical students today</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-extrabold text-slate-900 dark:text-white mb-8"
          >
            Start your journey today
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 dark:text-slate-400 mb-12"
          >
            Join thousands of medical students improving daily with our smart question bank.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-6"
          >
            <Link 
              to="/register" 
              className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xl shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-1 hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] flex items-center gap-3"
            >
              Start Solving Now
              <ArrowRight size={24} />
            </Link>
            <p className="text-sm text-slate-400 font-medium pb-2">Free – No credit card required</p>

            <a 
              href="https://t.me/+J0ek16XWiFhjMDI0"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-3 px-8 py-4 bg-[#0088cc] hover:bg-[#007AB8] text-white rounded-full font-bold text-lg shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl group"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.32.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Join Our Telegram
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
