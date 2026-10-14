import React, { useState } from 'react';
import { UserCheck, Wallet, ShieldCheck, Leaf, Award, Plus, LogOut, CheckCircle2, IndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, verifyCollege, topupWallet, refreshUser, logout } = useAuth();
  const { showToast } = useNotification();

  const [collegeId, setCollegeId] = useState(user?.college_id || 'BTECH-CS-2024-042');
  const [dept, setDept] = useState(user?.department || 'Computer Science & Engineering');
  const [roleType, setRoleType] = useState('STUDENT');
  const [verifying, setVerifying] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);

  React.useEffect(() => {
    if (user?.college_id) setCollegeId(user.college_id);
    if (user?.department) setDept(user.department);
  }, [user?.college_id, user?.department]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await verifyCollege(collegeId, dept, roleType);
    } finally {
      setVerifying(false);
    }
  };

  const handleTopup = async (amount: number) => {
    setToppingUp(true);
    try {
      await topupWallet(amount);
    } finally {
      setToppingUp(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-cyan-400 text-xs font-bold mb-2">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Account & Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Profile & Institutional Credentials
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Manage your verified campus status, department affiliation, and simulated RIDO digital wallet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: User Card & Wallet */}
        <div className="md:col-span-5 space-y-6">
          <div className="surface-card p-6 sm:p-7 rounded-2xl text-center border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-2xl font-black mx-auto mb-3.5 shadow-md shadow-blue-500/20">
              {user?.full_name.charAt(0)}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user?.full_name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{user?.email}</p>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 mt-3.5">
              <span>Role: {user?.role.replace(/_/g, ' ')}</span>
            </div>

            {user?.is_verified && (
              <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Campus Member</span>
              </div>
            )}
          </div>

          {/* Wallet Balance Card */}
          <div className="surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold uppercase tracking-wider">RIDO Wallet Balance</span>
              <Wallet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                ₹{user?.wallet_balance.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Simulated sandbox funds</p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">Quick Top-Up (Simulation):</p>
              <div className="grid grid-cols-3 gap-2">
                {[100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleTopup(amt)}
                    disabled={toppingUp}
                    className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-cyan-500/40 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {toppingUp ? '...' : `+₹${amt}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: College Verification Form */}
        <div className="md:col-span-7">
          <div className="surface-card p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Institutional Verification</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                University Student & Faculty Badge
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Institutional credentials boost matching priority and enable trusted peer rides across university departments.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">University Roll / Employee ID</label>
                <input
                  type="text"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  placeholder="e.g. BTECH-CS-2024-042"
                  className="input-field font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Academic Department</label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Affiliation Role</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  className="input-field"
                >
                  <option value="STUDENT">Enrolled Student</option>
                  <option value="FACULTY">Faculty / Professor</option>
                  <option value="STAFF">University Administrative Staff</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full btn-primary !py-3 flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{verifying ? 'Verifying Credentials...' : 'Save & Verify Institutional Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
