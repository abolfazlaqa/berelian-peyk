import React, { useState } from 'react';
import { ForwardLog } from '../types/forwarder';
import { Trash2, Search, CheckCircle, XCircle } from 'lucide-react';

interface LogsViewProps {
  logs: ForwardLog[];
  onClearLogs: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs, onClearLogs }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'forwarded' | 'filtered_out'>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      log.sender.toLowerCase().includes(query) ||
      log.destination.toLowerCase().includes(query) ||
      log.incomingText.toLowerCase().includes(query) ||
      log.outgoingText.toLowerCase().includes(query) ||
      log.reason.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-[#140c29] border border-[#2f2054] rounded-2xl p-5 shadow-lg space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2d1d52]">
        <div>
          <h2 className="text-base font-bold text-white">تاریخچه رویدادهای برلیان پیک</h2>
          <p className="text-xs text-purple-200/70 mt-0.5">
            ثبت تمامی پیامک‌های دریافتی، فیلترشده و پیامک‌های پیک‌شده به خط مقصد
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="px-3 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاک‌سازی تاریخچه</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در پیامک‌ها..."
            className="w-full pr-8 pl-3 py-1.5 bg-[#0d071d] border border-[#2d1d52] rounded-xl text-purple-100 placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0d071d] border border-[#2d1d52] rounded-xl">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                : 'text-purple-200/70 hover:text-white'
            }`}
          >
            همه رویدادها ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('forwarded')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'forwarded'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold'
                : 'text-purple-200/70 hover:text-white'
            }`}
          >
            پیک‌شده به مقصد ({logs.filter((l) => l.status === 'forwarded').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('filtered_out')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'filtered_out'
                ? 'bg-[#22163e] text-purple-200 font-bold border border-purple-700'
                : 'text-purple-200/70 hover:text-white'
            }`}
          >
            ردشده / بدون تطابق ({logs.filter((l) => l.status === 'filtered_out').length})
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center bg-[#0d071d]/60 border border-[#281b49] rounded-xl space-y-2">
          <div className="text-purple-300/60 text-sm">هیچ گزارشی برای نمایش وجود ندارد.</div>
          <p className="text-xs text-purple-300/40 max-w-sm mx-auto">
            در بخش شبیه‌ساز روی دکمه «پیک آزمایشی پیامک» کلیک کنید تا فرآیند پردازش و ارسال در اینجا ثبت شود.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#2d1d52] bg-[#0d071d]">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-[#2d1d52] bg-[#160d2e] text-purple-200">
                <th className="py-2.5 px-3 font-semibold">زمان</th>
                <th className="py-2.5 px-3 font-semibold">وضعیت پیک</th>
                <th className="py-2.5 px-3 font-semibold">فرستنده مبدأ</th>
                <th className="py-2.5 px-3 font-semibold">گیرنده مقصد</th>
                <th className="py-2.5 px-3 font-semibold">پیامک ارسالی</th>
                <th className="py-2.5 px-3 font-semibold">دلیل / توضیح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22153f] font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-purple-300 tabular-nums">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3">
                    {log.status === 'forwarded' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>پیک شد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-purple-300/60">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رد شد</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-300" dir="ltr">
                    {log.sender}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold" dir="ltr">
                    {log.destination}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-100 max-w-xs truncate" title={log.outgoingText}>
                    {log.outgoingText}
                  </td>
                  <td className="py-2.5 px-3 text-purple-200/70 text-[11px] max-w-xs truncate" title={log.reason}>
                    {log.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
