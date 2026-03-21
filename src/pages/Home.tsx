import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, ShieldCheck, Zap, Users, Star, ArrowLeft } from 'lucide-react';

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8 border border-blue-100 dark:border-blue-800">
              <Star size={16} fill="currentColor" />
              MedKit: The #1 Educational Platform for Minia Medical Students
            </span>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1]">
              Your Path to Excellence in <br />
              <span className="text-blue-600">Medical School</span> Starts Here
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Join thousands of students and prepare for your exams smartly. We provide a comprehensive question bank, mock exams, and accurate analytics of your academic level.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                Start Studying Now
                <ArrowLeft size={20} className="rotate-180" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
                Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Why Choose MedKit?</h2>
            <p className="text-slate-500 dark:text-slate-400">We provide the tools you need to succeed in your medical career</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BookOpen className="text-blue-600" size={32} />,
                title: "Comprehensive Question Bank",
                desc: "Thousands of questions organized by subjects and topics, with detailed explanations for every answer."
              },
              {
                icon: <Zap className="text-amber-500" size={32} />,
                title: "Mock Exams",
                desc: "Simulate real exam environments with a timer and an instant evaluation system for your level."
              },
              {
                icon: <Trophy className="text-emerald-500" size={32} />,
                title: "Progress Tracking",
                desc: "Monitor your academic progress through accurate statistics and an integrated dashboard."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: "Active Students", value: "+5,000" },
                { label: "Medical Questions", value: "+10,000" },
                { label: "Exams Completed", value: "+20,000" },
                { label: "Subjects", value: "15" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-4xl lg:text-5xl font-black text-white mb-2">{stat.value}</div>
                  <div className="text-blue-100 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Ready to Excel?</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12">
            Join your colleagues at Minia Medical School and start your success journey with MedKit today.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-blue-500/30 transition-all hover:-translate-y-1">
            Register for Free Now
            <ArrowLeft size={24} className="rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
