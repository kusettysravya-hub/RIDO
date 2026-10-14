import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  Server,
  RefreshCw,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { AuditLog } from '../types';
import { useNotification } from '../context/NotificationContext';

export const AdminDashboard: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const { showToast } = useNotification();

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get('/api/analytics/audit-logs'),
        api.get('/api/analytics/dashboard'),
      ]);
      setAuditLogs(logsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to refresh audit trail', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator & Dean Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            RIDO Mission Control & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Security audit logs, system-wide dispatch metrics, user compliance, and institutional transit oversight.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="btn-secondary self-start sm:self-auto shrink-0 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh System Logs</span>
        </button>
      </div>

      {/* System Health & Prototype Summary */}
      <div className="surface-card p-6 sm:p-7 rounded-2xl border-2 border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                RIDO Core Infrastructure Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                FastAPI backend + SQLite relational models + React TypeScript UI with zero external cloud dependencies.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
              ALL SYSTEMS NOMINAL
            </span>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="surface-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">System Audit & Security Trail</h3>
          </div>
          <span className="badge-purple font-mono font-bold">
            {auditLogs.length} events logged
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Loading secure audit trail...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
            No audit records registered in current session.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Resource</th>
                  <th className="px-5 py-3.5">Details</th>
                  <th className="px-5 py-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-purple-700 dark:text-purple-300">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {log.resource_type}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-sans text-xs">
                      {log.details || 'System event'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
