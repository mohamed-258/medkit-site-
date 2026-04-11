import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  MonitorSmartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  User as UserIcon,
  Star,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

// --- Types ---

export type UserRole = 'admin' | 'student' | 'owner';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  dateOfBirth?: string;
  role: UserRole;
  points: number;
  allowedSubjects?: string[];
  allowedDevices?: number;
  registeredDevices?: string[];
  createdAt?: string;
}

export interface Subject { 
  id: string; 
  nameAr?: string; 
  nameEn?: string; 
}

interface ManageUsersPanelProps {
  users: UserProfile[];
  subjects: Subject[];
  loading: boolean;
  onToggleRole: (user: UserProfile) => Promise<void>;
  onToggleSubjectAccess: (user: UserProfile, subjectId: string) => Promise<void>;
  onUpdateAllowedDevices: (user: UserProfile, count: number) => Promise<void>;
  onClearDevices: (user: UserProfile) => Promise<void>;
  onRefreshPoints: (userId: string) => Promise<void>;
}

// --- Utility ---

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// --- Component ---

export const ManageUsersPanel: React.FC<ManageUsersPanelProps> = ({
  users,
  subjects,
  loading,
  onToggleRole,
  onToggleSubjectAccess,
  onUpdateAllowedDevices,
  onClearDevices,
  onRefreshPoints
}) => {
  const [search, setSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // De-duplicate users by email and filter by search
  const filteredUsers = useMemo(() => {
    const uniqueUsersMap = new Map<string, UserProfile>();
    users.forEach(user => {
      if (!uniqueUsersMap.has(user.email)) {
        uniqueUsersMap.set(user.email, user);
      }
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());

    if (!search.trim()) return uniqueUsers;

    const query = search.toLowerCase();
    return uniqueUsers.filter(user => 
      user.displayName.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [users, search]);

  const handleToggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const handleAction = async (e: React.MouseEvent, action: () => Promise<void>, id: string) => {
    e.stopPropagation();
    setUpdatingId(id);
    try {
      await action();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Manage Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total of {filteredUsers.length} users registered in the system
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Points</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Birth Date</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined On</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Role</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Devices</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject Access</th>
                <th className="py-3 px-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 font-medium">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                        <UserIcon size={24} />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">No users found matching your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isExpanded = expandedUserId === user.uid;
                  const allowedCount = user.allowedSubjects?.length || 0;
                  const totalSubjects = subjects.length;
                  const progress = totalSubjects > 0 ? (allowedCount / totalSubjects) * 100 : 0;

                  return (
                    <React.Fragment key={user.uid}>
                      <tr 
                        onClick={() => handleToggleExpand(user.uid)}
                        className={cn(
                          "border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer group",
                          isExpanded && "bg-blue-50/30 dark:bg-blue-900/5"
                        )}
                      >
                        {/* User Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                  {user.displayName}
                                </span>
                                {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Points */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{user.points}</span>
                          </div>
                        </td>

                        {/* Birth Date */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Calendar size={14} />
                            <span className="text-xs font-medium">{user.dateOfBirth || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Joined On */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Clock size={14} />
                            <span className="text-xs font-medium">{formatDate(user.createdAt)}</span>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            user.role === 'owner' ? "bg-amber-100 text-amber-700 ring-1 ring-amber-500/30" :
                            user.role === 'admin' ? "bg-purple-100 text-purple-700" :
                            "bg-blue-50 text-blue-700"
                          )}>
                            {user.role}
                          </span>
                        </td>

                        {/* Devices */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <MonitorSmartphone size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {(user.registeredDevices || []).length} / {user.allowedDevices || 1}
                            </span>
                          </div>
                        </td>

                        {/* Subject Access Progress */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span>{allowedCount} / {totalSubjects} Subjects</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full max-w-[80px] overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleAction(e, () => onRefreshPoints(user.uid), user.uid)}
                              disabled={updatingId === user.uid}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Refresh User Points"
                            >
                              <RefreshCw size={16} className={cn(updatingId === user.uid && "animate-spin")} />
                            </button>
                            {user.role !== 'owner' && (
                              <button
                                onClick={(e) => handleAction(e, () => onToggleRole(user), user.uid)}
                                disabled={updatingId === user.uid}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                  user.role === 'admin' 
                                    ? "bg-amber-50 text-amber-600 hover:bg-amber-100" 
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                )}
                              >
                                {user.role === 'admin' ? 'Demote' : 'Promote'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30 dark:bg-slate-800/10">
                          <td colSpan={8} className="p-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Subject Access Control */}
                                <div className="space-y-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                        <Lock size={18} />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Subject Access Control</h4>
                                        <p className="text-xs text-slate-500">{allowedCount} Subjects Allowed</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {subjects.map((subject) => {
                                      const isAllowed = user.allowedSubjects?.includes(subject.id);
                                      return (
                                        <div 
                                          key={subject.id}
                                          className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border transition-all",
                                            isAllowed 
                                              ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800" 
                                              : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50"
                                          )}
                                        >
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {subject.nameEn || subject.nameAr}
                                          </span>
                                          
                                          {/* Custom Toggle Switch */}
                                          <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                              type="checkbox" 
                                              className="sr-only peer"
                                              checked={isAllowed}
                                              onChange={() => onToggleSubjectAccess(user, subject.id)}
                                            />
                                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Device Management */}
                                <div className="space-y-6 lg:border-l lg:pl-8 border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                      <MonitorSmartphone size={18} />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Device Management</h4>
                                      <p className="text-xs text-slate-500">Control login limits and active sessions</p>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Allowed Devices</label>
                                      <input 
                                        type="number" 
                                        min="1"
                                        defaultValue={user.allowedDevices || 1}
                                        onBlur={(e) => onUpdateAllowedDevices(user, parseInt(e.target.value) || 1)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold"
                                      />
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="size-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800">
                                            <MonitorSmartphone size={20} />
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                              {(user.registeredDevices || []).length} Devices Registered
                                            </p>
                                            <p className="text-[10px] text-slate-500">Currently active sessions</p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => onClearDevices(user)}
                                          className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg transition-all"
                                          title="Clear all registered devices"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageUsersPanel;
