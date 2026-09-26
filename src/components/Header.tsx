import React from 'react';
import { Download } from 'lucide-react';
import logoImg from '../assets/images/berelian_peyk_icon_1790420267578.jpg';

interface HeaderProps {
  activeTab: 'rules_simulator' | 'android_code' | 'no_code' | 'logs' | 'security';
  setActiveTab: (tab: 'rules_simulator' | 'android_code' | 'no_code' | 'logs' | 'security') => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
  activeRuleCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadZip,
  isDownloading,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[#130b26]/95 backdrop-blur-md border-b border-[#2d1f52] text-slate-100 shadow-md">
      {/* Zone 1: Single text element wordmark + Logo Icon */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('rules_simulator');
          }}
          className="flex items-center gap-2.5 group"
        >
          {/* Logo inspired by user's emblem: Golden nib with turquoise gem on royal purple */}
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/40 shadow-sm shadow-amber-500/20 shrink-0 bg-indigo-950">
            <img
              src={logoImg}
              alt="لوگوی برلیان پیک"
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
              <span>برلیان پیک</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono font-medium">
                Peyk
              </span>
            </span>
          </div>
        </a>
        <span className="hidden lg:inline text-xs text-purple-300/60 border-r border-[#342461] pr-3 mr-1">
          خانواده نرم‌افزارهای برلیان (پیمان · پلن · پیک)
        </span>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rules_simulator')}
          className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rules_simulator'
              ? 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          تنظیمات و شبیه‌ساز
        </button>

        <button
          onClick={() => setActiveTab('android_code')}
          className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'android_code'
              ? 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          سورس پروژه اندروید
        </button>

        <button
          onClick={() => setActiveTab('no_code')}
          className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'no_code'
              ? 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          راهکار فوری (MacroDroid/Tasker)
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          تاریخچه و لاگ
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          راهنمای پایداری باتری
        </button>
      </nav>

      {/* Zone 3: Primary action button with gold styling */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDownloadZip}
          disabled={isDownloading}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 active:scale-98 rounded-lg transition-all shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer disabled:opacity-50"
          title="دانلود پروژه کامل اندروید برلیان پیک (ZIP)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isDownloading ? 'در حال ایجاد ZIP...' : 'دانلود سورس برلیان پیک (ZIP)'}</span>
        </button>
      </div>
    </header>
  );
};
