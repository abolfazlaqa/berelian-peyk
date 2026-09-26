import React, { useState } from 'react';
import { ForwardRule } from '../types/forwarder';
import { generateNoCodeSolutions, NoCodeOption } from '../utils/noCodeGenerator';
import { Smartphone, Zap, Copy, Check, Download, ShieldCheck } from 'lucide-react';

interface NoCodeGuideProps {
  rule: ForwardRule;
}

export const NoCodeGuide: React.FC<NoCodeGuideProps> = ({ rule }) => {
  const options = generateNoCodeSolutions(rule);
  const [activeTabId, setActiveTabId] = useState<string>(options[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeOption = options.find((o) => o.id === activeTabId) || options[0];

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadConfig = (option: NoCodeOption) => {
    if (!option.exportConfig || !option.exportFileName) return;
    const blob = new Blob([option.exportConfig], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = option.exportFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#140c29] border border-[#2f2054] rounded-2xl p-5 shadow-lg space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2d1d52]">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              راهکارهای فوری بدون کدنویسی (راه‌اندازی در ۲ دقیقه روی گوشی)
            </h2>
          </div>
          <p className="text-xs text-purple-200/70 mt-1">
            اگر نمی‌خواهید از اندروید استودیو استفاده کنید، این اپلیکیشن‌های آماده رایگان عملکرد برلیان پیک را با قوانین شما اجرا می‌کنند.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setActiveTabId(option.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTabId === option.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                : 'bg-[#0d071d] border border-[#2c1c4e] text-purple-200/70 hover:text-white hover:border-purple-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{option.name}</span>
            <span className="text-[10px] opacity-80 font-normal">({option.difficulty})</span>
          </button>
        ))}
      </div>

      {/* Active Option Card */}
      <div className="bg-[#0d071d] border border-[#2c1c4e] rounded-xl p-4 sm:p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{activeOption.name}</h3>
            <span className="text-xs text-amber-400 font-medium">{activeOption.tagline}</span>
          </div>
          <p className="text-xs text-purple-200/70 mt-1.5 leading-relaxed">
            {activeOption.description}
          </p>
        </div>

        {/* Feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {activeOption.features.map((feat, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] text-xs text-purple-200 flex items-start gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{feat}</span>
            </div>
          ))}
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-amber-300">
            مراحل تنظیم روی گوشی با شماره‌های شما:
          </h4>
          <ol className="space-y-2 text-xs text-purple-200">
            {activeOption.steps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#160d2f]/70 border border-[#2d1d52]"
              >
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Export / Config download */}
        {activeOption.exportConfig && (
          <div className="pt-3 border-t border-[#2d1d52] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-purple-200 font-semibold">
                فایل تنظیمات یا خلاصه دستور برای ایمپورت:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(activeOption.exportConfig!, activeOption.id)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-[#1f133b] hover:bg-[#2b1b4f] text-amber-300 border border-[#392562] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === activeOption.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>کپی متن</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadConfig(activeOption)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3 h-3" />
                  <span>{activeOption.downloadLabel || 'دانلود فایل کانفیگ'}</span>
                </button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto p-3 bg-[#0a0515] border border-[#2b1b4d] rounded-lg font-mono text-xs text-purple-200 whitespace-pre-wrap leading-relaxed" dir="ltr">
              {activeOption.exportConfig}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
