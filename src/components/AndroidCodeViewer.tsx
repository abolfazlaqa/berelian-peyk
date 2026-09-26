import React, { useState } from 'react';
import { ForwardRule } from '../types/forwarder';
import { generateAndroidProjectFiles, downloadAndroidProjectZip, AndroidFile } from '../utils/androidCodeGenerator';
import { Copy, Check, Download, FileCode, Terminal } from 'lucide-react';

interface AndroidCodeViewerProps {
  rule: ForwardRule;
}

export const AndroidCodeViewer: React.FC<AndroidCodeViewerProps> = ({ rule }) => {
  const files = generateAndroidProjectFiles(rule);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const activeFile: AndroidFile = files[selectedFileIndex] || files[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
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
    <div className="bg-[#140c29] border border-[#2f2054] rounded-2xl p-5 shadow-lg space-y-6">
      {/* Header and download CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2d1d52]">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              سورس‌کد کامل پروژه اندروید استودیو «برلیان پیک» (Kotlin + Jetpack Compose)
            </h2>
          </div>
          <p className="text-xs text-purple-200/70 mt-1">
            کدهای استاندارد اندروید با سرویس پیش‌زمینه پایدار، فیلتر متن دلخواه و ارسال مستقیم به گیرنده
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 active:scale-98 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'در حال آماده‌سازی ZIP...' : 'دانلود کل پروژه برلیان پیک (ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0d071d] border border-[#2c1c4e] rounded-xl">
        {files.map((file, idx) => (
          <button
            key={file.name}
            type="button"
            onClick={() => {
              setSelectedFileIndex(idx);
              setCopied(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all font-mono cursor-pointer ${
              selectedFileIndex === idx
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                : 'text-purple-200/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* File Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0d071d] border border-[#2b1b4d] rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-mono text-amber-300 font-medium">{activeFile.path}</span>
          <span className="text-purple-400/40">·</span>
          <span className="text-purple-200/70">{activeFile.description}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-[#22153f] hover:bg-[#2e1d55] text-amber-300 border border-[#3b2767] transition-colors cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">کپی شد!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>کپی محتوای فایل</span>
            </>
          )}
        </button>
      </div>

      {/* Code Editor Preview */}
      <div className="relative rounded-xl border border-[#2e1d52] bg-[#090514] overflow-hidden shadow-inner">
        <div className="max-h-[500px] overflow-y-auto p-4 text-xs font-mono text-purple-100/90 leading-relaxed selection:bg-amber-400 selection:text-slate-950" dir="ltr">
          <pre>{activeFile.content}</pre>
        </div>
      </div>

      {/* Step-by-Step Build Guide for the user */}
      <div className="p-5 bg-[#0d071d] border border-[#2b1c4e] rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#291a4c] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>راهنمای گام‌به‌گام پوش به گیت‌هاب و بیلد خودکار Debug APK (بدون Keystore)</span>
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 font-mono">
            حالت Debug · بدون نیاز به Keystore
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#150d2e] border border-[#2e1c53] space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 text-center font-mono leading-5">۱</span>
              <span>دانلود فایل ZIP</span>
            </div>
            <p className="text-purple-200/70 leading-relaxed text-[11px]">
              روی دکمه «دانلود کل پروژه برلیان پیک» بالا کلیک کرده و فایل را در یک پوشه به نام <code className="text-amber-300 font-mono">berelian-peyk</code> اکسترکت کنید.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#150d2e] border border-[#2e1c53] space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 text-center font-mono leading-5">۲</span>
              <span>ساخت ریپازیتوری در گیت‌هاب</span>
            </div>
            <p className="text-purple-200/70 leading-relaxed text-[11px]">
              در اکانت GitHub خود یک مخزن جدید به نام <code className="text-white font-mono">berelian-peyk</code> بسازید (گزینه‌های README یا .gitignore تیک نخورند).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#150d2e] border border-[#2e1c53] space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 text-center font-mono leading-5">۳</span>
              <span>پوش کردن کدها با Git</span>
            </div>
            <p className="text-purple-200/70 leading-relaxed text-[11px]">
              ترمینال را در پوشه پروژه باز کنید و دستورات زیر را برای پوش وارد کنید تا به گیت‌هاب ارسال شوند.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#150d2e] border border-[#2e1c53] space-y-1.5">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-300 text-center font-mono leading-5">۴</span>
              <span>دانلود فایل APK آماده</span>
            </div>
            <p className="text-purple-200/70 leading-relaxed text-[11px]">
              در صفحه گیت‌هاب به تب <strong className="text-white">Actions</strong> بروید. پس از ۲ دقیقه، بیلد سبز شده و فایل <strong className="text-amber-300 font-mono">Berelian-Peyk-Debug-APK</strong> آماده دانلود و نصب است!
            </p>
          </div>
        </div>

        {/* Git command terminal box */}
        <div className="p-3.5 bg-[#090514] border border-[#261747] rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between text-purple-300/80">
            <span className="font-mono text-[11px]">دستورات ترمینال برای ارسال اولیه (Push):</span>
            <span className="text-[11px] text-amber-400">آدرس YOUR_USERNAME/YOUR_REPO را جایگزین کنید</span>
          </div>
          <pre className="font-mono text-xs text-amber-200/90 leading-relaxed overflow-x-auto p-2.5 bg-black/40 rounded-lg select-all" dir="ltr">
{`git init
git add .
git commit -m "Initial commit for Berelian Peyk"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main`}
          </pre>
        </div>
      </div>
    </div>
  );
};
