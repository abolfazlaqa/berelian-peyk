/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RuleEditor } from './components/RuleEditor';
import { Simulator } from './components/Simulator';
import { AndroidCodeViewer } from './components/AndroidCodeViewer';
import { NoCodeGuide } from './components/NoCodeGuide';
import { LogsView } from './components/LogsView';
import { SecurityGuide } from './components/SecurityGuide';
import { ForwardRule, ForwardLog } from './types/forwarder';
import { downloadAndroidProjectZip } from './utils/androidCodeGenerator';
import logoImg from './assets/images/berelian_peyk_icon_1790420267578.jpg';
import { Sparkles, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

const STORAGE_RULE_KEY = 'berelian_peyk_rule_v1';
const STORAGE_LOGS_KEY = 'berelian_peyk_logs_v1';

const DEFAULT_RULE: ForwardRule = {
  id: 'rule-berelian-1',
  name: 'هدایت خودکار پیامک برلیان پیک',
  enabled: true,
  senderNumber: '982000400',
  senderMatchMode: 'contains',
  destinationNumber: '09121234567',
  textFilterMode: 'contains_phrase',
  customFilterText: 'واریز',
  keywords: ['واریز'],
  matchCase: false,
  forwardMode: 'full_message',
  customTemplate: 'پیامک دریافتی از {SENDER}:\n{BODY}',
  otpPattern: 'digits_4_8',
  customRegex: '',
  createdAt: new Date().toISOString(),
  forwardCount: 5,
};

const INITIAL_LOGS: ForwardLog[] = [
  {
    id: 'log-seed-1',
    timestamp: '14:28:10',
    sender: '982000400',
    destination: '09121234567',
    incomingText: 'بانک ملت\nواریز به حساب: 12345678\nمبلغ: 15,000,000 ریال\nمانده: 42,500,000 ریال',
    outgoingText: 'بانک ملت\nواریز به حساب: 12345678\nمبلغ: 15,000,000 ریال\nمانده: 42,500,000 ریال',
    status: 'forwarded',
    reason: 'تطابق فرستنده (982000400) و متن دلخواه «واریز»',
    ruleName: 'برلیان پیک - هدایت خودکار پیامک',
  },
  {
    id: 'log-seed-2',
    timestamp: '12:15:44',
    sender: '3000670',
    destination: '09121234567',
    incomingText: 'سفارش شما با کد پیگیری #94820 ثبت شد و تحویل پیک گردید.',
    outgoingText: 'سفارش شما با کد پیگیری #94820 ثبت شد و تحویل پیک گردید.',
    status: 'forwarded',
    reason: 'تطابق متن دلخواه تعریف‌شده',
    ruleName: 'برلیان پیک - هدایت خودکار پیامک',
  },
  {
    id: 'log-seed-3',
    timestamp: '11:02:19',
    sender: '+9810008542',
    destination: '09121234567',
    incomingText: 'تخفیف شگفت‌انگیز پاییزه فروشگاه، خرید با ۵۰٪ تخفیف بدون قرعه‌کشی.',
    outgoingText: '(بدون ارسال)',
    status: 'filtered_out',
    reason: 'فاقد متن دلخواه تعیین‌شده و عدم تطابق فرستنده',
    ruleName: 'برلیان پیک - هدایت خودکار پیامک',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'rules_simulator' | 'android_code' | 'no_code' | 'logs' | 'security'>('rules_simulator');
  const [rule, setRule] = useState<ForwardRule>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RULE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_RULE;
  });

  const [logs, setLogs] = useState<ForwardLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_LOGS;
  });

  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Sync rule with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RULE_KEY, JSON.stringify(rule));
    } catch {
      // ignore
    }
  }, [rule]);

  // Sync logs with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
    } catch {
      // ignore
    }
  }, [logs]);

  const handleAddLog = (newLog: ForwardLog) => {
    setLogs((prev) => [newLog, ...prev]);
    if (newLog.status === 'forwarded') {
      setRule((prev) => ({
        ...prev,
        forwardCount: prev.forwardCount + 1,
      }));
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadAndroidProjectZip(rule);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0717] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Background silk & glow effects */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-purple-900/40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-10 w-80 h-80 bg-indigo-900/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
        activeRuleCount={rule.enabled ? 1 : 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Intro Hero Strip styled with Berelian Peyk Branding */}
        <section className="bg-gradient-to-br from-[#160d2e] via-[#1d123d] to-[#120a26] border border-[#3b2469] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Subtle golden corner accent */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-radial from-amber-500/15 via-transparent to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-5 justify-between">
            <div className="flex items-center gap-4">
              {/* App Logo Display with Golden Frame */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 shadow-lg shadow-amber-500/20">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-[#0c0817]">
                    <img
                      src={logoImg}
                      alt="برلیان پیک"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono">
                    خانواده برلیان · پیمان · پلن · پیک
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>برلیان پیک</span>
                  <span className="text-xs font-normal text-amber-300/80">(Berelian Peyk)</span>
                </h1>
                <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed max-w-2xl">
                  سامانه و اپلیکیشن هوشمند هدایت خودکار پیامک بر اساس <strong className="text-amber-300">متن دلخواه شما</strong>؛ پیام‌های دریافتی از خط فرستنده را به صورت فوری و بی‌درنگ به خط گیرنده مقصد SMS می‌کند.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isDownloading}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>دریافت سورس کامل اندروید استودیو</span>
              </button>
            </div>
          </div>

          {/* Quick Flow Indicator */}
          <div className="mt-5 pt-4 border-t border-[#34205f] flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-purple-300/70">فرستنده مبدأ:</span>
              <span className="font-mono px-2 py-0.5 rounded bg-[#0d071c] border border-purple-800/80 text-amber-300">
                {rule.senderNumber || 'همه فرستنده‌ها'}
              </span>
            </div>

            <span className="text-amber-500/60 font-mono">──▶</span>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-purple-300/70">شرط متن دلخواه:</span>
              <span className="font-mono px-2 py-0.5 rounded bg-[#0d071c] border border-purple-800/80 text-amber-300 font-semibold">
                {rule.textFilterMode === 'any_message'
                  ? 'بدون شرط (ارسال همه)'
                  : rule.customFilterText ? `شامل «${rule.customFilterText}»` : 'بدون شرط'}
              </span>
            </div>

            <span className="text-amber-500/60 font-mono">──▶</span>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-purple-300/70">پیک مستقیم به گیرنده:</span>
              <span className="font-mono px-2 py-0.5 rounded bg-[#0d071c] border border-cyan-500/50 text-cyan-300 font-bold">
                {rule.destinationNumber || '(وارد نشده)'}
              </span>
            </div>
          </div>
        </section>

        {/* Dynamic Tab Views */}
        {activeTab === 'rules_simulator' && (
          <div className="space-y-6">
            <RuleEditor rule={rule} onChange={setRule} />
            <Simulator rule={rule} onAddLog={handleAddLog} />
          </div>
        )}

        {activeTab === 'android_code' && (
          <div className="space-y-6">
            <AndroidCodeViewer rule={rule} />
          </div>
        )}

        {activeTab === 'no_code' && (
          <div className="space-y-6">
            <NoCodeGuide rule={rule} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <LogsView logs={logs} onClearLogs={handleClearLogs} />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <SecurityGuide />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d1d52] bg-[#0d081c] py-5 text-center text-xs text-purple-300/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">برلیان پیک</span>
            <span>· عضو خانواده نرم‌افزارهای برلیان (برلیان پیمان · برلیان پلن · برلیان پیک)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-purple-300/70">
            <span>سازگار با اندروید ۸ تا ۱۵</span>
            <span>۱۰۰٪ آفلاین و بدون نیاز به اینترنت</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
