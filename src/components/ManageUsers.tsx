import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Shield, 
  ShieldOff, 
  MoreHorizontal, 
  X, 
  Check, 
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface User {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string;
  role: 'student' | 'admin';
  joinDate: string;
  avatar?: string;
}

interface Subject {
  id: string;
  name: string;
}

// --- Mock Data ---

const MOCK_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Anatomy' },
  { id: 'sub2', name: 'Physiology' },
  { id: 'sub3', name: 'Biochemistry' },
  { id: 'sub4', name: 'Pathology' },
];

const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Ahmed Hassan', 
    email: 'ahmed.h@example.com', 
    dateOfBirth: '1995-05-15', 
    role: 'admin', 
    joinDate: '2023-01-10',
    avatar: 'https://picsum.photos/seed/u1/100/100'
  },
  { 
    id: 'u2', 
    name: 'Sara Mahmoud', 
    email: 'sara.m@example.com', 
    dateOfBirth: '1998-08-22', 
    role: 'student', 
    joinDate: '2023-03-12' 
  },
  { 
    id: 'u3', 
    name: 'Omar Khalid', 
    email: 'omar.k@example.com', 
    dateOfBirth: '1997-11-30', 
    role: 'student', 
    joinDate: '2023-05-20' 
  },
  { 
    id: 'u4', 
    name: 'Nour Ali', 
    email: 'nour.a@example.com', 
    dateOfBirth: '1996-02-14', 
    role: 'admin', 
    joinDate: '2023-02-05' 
  },
  { 
    id: 'u5', 
    name: 'Laila Youssef', 
    email: 'laila.y@example.com', 
    dateOfBirth: '1999-09-09', 
    role: 'student', 
    joinDate: '2023-06-15' 
  },
];

const INITIAL_ACCESS: Record<string, string[]> = {
  'u1': ['sub1', 'sub2', 'sub3', 'sub4'],
  'u2': ['sub1', 'sub2'],
  'u3': ['sub3'],
  'u4': ['sub1', 'sub4'],
  'u5': ['sub2'],
};

// --- ManageUsers Component ---

export default function ManageUsers() {
  // State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [subjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [userAccess, setUserAccess] = useState<Record<string, string[]>>(INITIAL_ACCESS);
  const [search, setSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Mock current user ID (Ahmed Hassan)
  const currentUserId = 'u1';

  // --- Functions ---

  const toggleRole = (userId: string) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          role: user.role === 'admin' ? 'student' : 'admin'
        };
      }
      return user;
    }));
  };

  const toggleAccess = (userId: string, subjectId: string) => {
    setUserAccess(prev => {
      const current = prev[userId] || [];
      if (current.includes(subjectId)) {
        return { ...prev, [userId]: current.filter(id => id !== subjectId) };
      } else {
        return { ...prev, [userId]: [...current, subjectId] };
      }
    });
  };

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [users, search]);

  const expandedUser = users.find(u => u.id === expandedUserId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Manage Users</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Total {users.length} registered users in the system
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">DOB</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden lg:table-cell">Joined</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Access</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                >
                  {/* User Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* DOB Column */}
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                    {user.dateOfBirth}
                  </td>

                  {/* Joined Column */}
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-slate-600 dark:text-slate-400">
                    {user.joinDate}
                  </td>

                  {/* Role Column */}
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.role === 'admin' 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  {/* Access Column */}
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setExpandedUserId(user.id)}
                      className="text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      {(userAccess[user.id] || []).length}/{subjects.length} subjects
                      <ChevronRight size={14} />
                    </button>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 text-right">
                    {user.id !== currentUserId && (
                      <button 
                        onClick={() => toggleRole(user.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          user.role === 'admin'
                            ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                            : 'text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <>
                            <ShieldOff size={14} />
                            Demote
                          </>
                        ) : (
                          <>
                            <Shield size={14} />
                            Promote
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No users found</h3>
            <p className="text-slate-500 dark:text-slate-400">Try adjusting your search query</p>
          </div>
        )}
      </div>

      {/* Subject Access Modal */}
      <AnimatePresence>
        {expandedUserId && expandedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedUserId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Subject Access</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Manage access for {expandedUser.name}</p>
                </div>
                <button 
                  onClick={() => setExpandedUserId(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {subjects.map((subject) => {
                  const hasAccess = (userAccess[expandedUserId] || []).includes(subject.id);
                  return (
                    <div 
                      key={subject.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">{subject.name}</span>
                      
                      {/* Custom Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={hasAccess}
                          onChange={() => toggleAccess(expandedUserId, subject.id)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setExpandedUserId(null)}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
