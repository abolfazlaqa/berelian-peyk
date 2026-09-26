import React, { useState } from 'react';
import { ForwardRule } from '../types/forwarder';
import { Plus, X, Sparkles, CheckCircle2, Sliders, Type } from 'lucide-react';

interface RuleEditorProps {
  rule: ForwardRule;
  onChange: (updated: ForwardRule) => void;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onChange }) => {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const clean = newKeyword.trim();
    if (!rule.keywords.includes(clean)) {
      onChange({
        ...rule,
        keywords: [...rule.keywords, clean],
      });
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    onChange({
      ...rule,
      keywords: rule.keywords.filter((k) => k !== kw),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const applyCustomPreset = (
    name: string,
    sender: string,
    customText: string,
    mode: ForwardRule['textFilterMode']
  ) => {
    onChange({
      ...rule,
      name,
      senderNumber: sender,
      customFilterText: customText,
      textFilterMode: mode,
      keywords: customText ? [customText] : [],
    });
  };

  return (
    <div className="bg-[#140c29] border border-[#2f2054] rounded-2xl p-5 shadow-lg space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2d1d52]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>پیکربندی قوانین برلیان پیک</span>
              <span className="text-amber-400 font-normal text-xs">(تنظیم فرستنده و گیرنده)</span>
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono ${
                rule.enabled
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/80'
                  : 'bg-[#21163d] text-slate-400 border border-slate-700'
              }`}
            >
              {rule.enabled ? 'پیک فعال است' : 'غیرفعال'}
            </span>
          </div>
          <p className="text-xs text-purple-200/70 mt-1">
            شماره‌ها و عبارت دلخواه خود را تعیین کنید تا هر پیامک تطابق‌یافته بی‌درنگ به گیرنده دوم فرستاده شود.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              rule.enabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                : 'bg-[#231742] hover:bg-[#2e1f57] text-slate-300 border border-[#392769]'
            }`}
          >
            {rule.enabled ? 'خاموش کردن پیک' : 'روشن کردن برلیان پیک'}
          </button>
        </div>
      </div>

      {/* Preset buttons */}
      <div>
        <div className="text-xs text-amber-300 mb-2 flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>الگوهای آماده برای متن‌های دلخواه متداول:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyCustomPreset('هدایت پیامک‌های واریز به حساب', '982000400', 'واریز', 'contains_phrase')}
            className="px-2.5 py-1 bg-[#1e133d] hover:bg-[#2a1a54] border border-[#3f296f] text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            متن «واریز» به حساب
          </button>
          <button
            type="button"
            onClick={() => applyCustomPreset('پیامک‌های تایید سفارش و خرید', '', 'سفارش', 'contains_phrase')}
            className="px-2.5 py-1 bg-[#1e133d] hover:bg-[#2a1a54] border border-[#3f296f] text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            متن «سفارش» یا «فاکتور»
          </button>
          <button
            type="button"
            onClick={() => applyCustomPreset('رمز و کدهای تایید', '', 'کد تایید', 'contains_phrase')}
            className="px-2.5 py-1 bg-[#1e133d] hover:bg-[#2a1a54] border border-[#3f296f] text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            کلمات «کد تایید» یا رمز
          </button>
          <button
            type="button"
            onClick={() => applyCustomPreset('همه پیامک‌های فرستنده خاص', '982000400', '', 'any_message')}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg transition-colors cursor-pointer font-medium"
          >
            بدون شرط متنی (تمام پیام‌های فرستنده)
          </button>
        </div>
      </div>

      {/* Main Grid: Sender & Destination Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Origin / Sender Number */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200">
            ۱. شماره یا سرشماره فرستنده پیامک (مبدأ)
          </label>
          <div className="relative">
            <input
              type="text"
              value={rule.senderNumber}
              onChange={(e) => onChange({ ...rule, senderNumber: e.target.value })}
              placeholder="مثال: +982000400 یا 9820000 (خالی = همه فرستنده‌ها)"
              className="w-full px-3.5 py-2.5 text-sm bg-[#0d071d] border border-[#35235e] rounded-xl text-slate-100 placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400 font-mono"
              dir="ltr"
            />
          </div>
          <p className="text-[11px] text-purple-300/70 leading-relaxed">
            سرشماره‌ای که پیامک از آن می‌آید (بانک، سرویس، یا شخص). اگر خالی بگذارید، پیامک با متن دلخواه شما از هر شماره‌ای دریافت و ارسال می‌شود.
          </p>
        </div>

        {/* Destination / Receiver Number */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-amber-300 flex items-center justify-between">
            <span>۲. شماره گیرنده مقصد (SMS به این شماره فرستاده شود)</span>
            <span className="text-[10px] text-cyan-300 font-normal">ضروری برای پیک</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={rule.destinationNumber}
              onChange={(e) => onChange({ ...rule, destinationNumber: e.target.value })}
              placeholder="مثال: 09123456789 یا +989123456789"
              className="w-full px-3.5 py-2.5 text-sm bg-[#0d071d] border border-amber-500/50 rounded-xl text-slate-100 placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400 font-mono shadow-inner shadow-amber-500/5"
              dir="ltr"
            />
          </div>
          <p className="text-[11px] text-purple-300/70 leading-relaxed">
            شماره موبایل گیرنده‌ای که مایلید پیامک‌ها بلافاصله به آن فوروارد شوند.
          </p>
        </div>
      </div>

      {/* Custom Text Filter Section */}
      <div className="space-y-3 p-4 bg-[#0e0721] border border-amber-500/30 rounded-xl shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="block text-xs font-bold text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-400" />
            <span>۳. تعریف متن یا عبارت شرطی دلخواه شما</span>
          </label>

          {/* Text filter mode selector */}
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => onChange({ ...rule, textFilterMode: 'contains_phrase' })}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                rule.textFilterMode === 'contains_phrase'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#1e133d] text-purple-200/80 hover:text-white'
              }`}
            >
              شامل متن دلخواه
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...rule, textFilterMode: 'starts_with' })}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                rule.textFilterMode === 'starts_with'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#1e133d] text-purple-200/80 hover:text-white'
              }`}
            >
              شروع با این متن
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...rule, textFilterMode: 'contains_any' })}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                rule.textFilterMode === 'contains_any'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#1e133d] text-purple-200/80 hover:text-white'
              }`}
            >
              کلمات متعدد
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...rule, textFilterMode: 'any_message', customFilterText: '' })}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                rule.textFilterMode === 'any_message'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#1e133d] text-purple-200/80 hover:text-white'
              }`}
            >
              همه پیام‌ها (بدون شرط)
            </button>
          </div>
        </div>

        {rule.textFilterMode !== 'any_message' ? (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={rule.customFilterText}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...rule,
                    customFilterText: val,
                    keywords: val.split(/[,،\n]/).map((k) => k.trim()).filter(Boolean),
                  });
                }}
                placeholder="متن دلخواه خود را اینجا بنویسید (مثلاً: واریز، خرید موفق، تایید، فاکتور، یا هر متن دلخواه)"
                className="w-full px-3.5 py-2.5 text-sm bg-[#160d2f] border border-[#3b2767] rounded-xl text-slate-100 placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-purple-200/70 gap-2">
              <span>
                وضعیت:{' '}
                {rule.textFilterMode === 'contains_phrase' && (
                  <strong className="text-amber-300">هر پیامکی که شامل عبارت «{rule.customFilterText || '...'}» باشد</strong>
                )}
                {rule.textFilterMode === 'starts_with' && (
                  <strong className="text-amber-300">هر پیامکی که با عبارت «{rule.customFilterText || '...'}» شروع شود</strong>
                )}
                {rule.textFilterMode === 'contains_any' && (
                  <strong className="text-amber-300">هر پیامکی که شامل یکی از کلمات تعریف‌شده باشد</strong>
                )}
                ، بی‌درنگ توسط برلیان پیک ارسال می‌شود.
              </span>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rule.matchCase}
                  onChange={(e) => onChange({ ...rule, matchCase: e.target.checked })}
                  className="rounded bg-[#1a0f37] border-purple-700 text-amber-500 focus:ring-0"
                />
                <span>حساسیت به حروف انگلیسی</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-700/60 text-cyan-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              فیلتر متنی غیرفعال است: تمام پیامک‌های دریافتی از این فرستنده بدون نیاز به وجود کلمه خاصی مستقیماً به گیرنده فرستاده می‌شوند.
            </span>
          </div>
        )}
      </div>

      {/* Forwarding Mode & Output Format */}
      <div className="space-y-3 pt-2 border-t border-[#2d1d52]">
        <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>۴. نحوه ساخت پیامک ارسالی به گیرنده دوم</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => onChange({ ...rule, forwardMode: 'full_message' })}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              rule.forwardMode === 'full_message'
                ? 'bg-gradient-to-b from-[#25174a] to-[#1a1036] border-amber-500/80 text-white shadow-md'
                : 'bg-[#0d071d] border-[#2c1d50] text-purple-200/60 hover:border-purple-600'
            }`}
          >
            <div className="font-semibold text-amber-300 mb-1">ارسال عین پیامک اصلی</div>
            <div className="text-[11px] text-purple-200/70 leading-tight">
              کل متن دریافت شده بدون هیچ تغییری به گیرنده پیامک می‌شود.
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...rule, forwardMode: 'otp_only' })}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              rule.forwardMode === 'otp_only'
                ? 'bg-gradient-to-b from-[#25174a] to-[#1a1036] border-amber-500/80 text-white shadow-md'
                : 'bg-[#0d071d] border-[#2c1d50] text-purple-200/60 hover:border-purple-600'
            }`}
          >
            <div className="font-semibold text-amber-300 mb-1">استخراج فقط ارقام/کد پیام</div>
            <div className="text-[11px] text-purple-200/70 leading-tight">
              اگر در پیامک کد یا شماره پیگیری باشد، فقط آن کد ارسال می‌شود.
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...rule, forwardMode: 'custom_template' })}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
              rule.forwardMode === 'custom_template'
                ? 'bg-gradient-to-b from-[#25174a] to-[#1a1036] border-amber-500/80 text-white shadow-md'
                : 'bg-[#0d071d] border-[#2c1d50] text-purple-200/60 hover:border-purple-600'
            }`}
          >
            <div className="font-semibold text-amber-300 mb-1">قالب سفارشی (Template)</div>
            <div className="text-[11px] text-purple-200/70 leading-tight">
              تعیین متن اختصاصی با متغیرهای کد، فرستنده و متن.
            </div>
          </button>
        </div>

        {/* Custom Template Editor */}
        {rule.forwardMode === 'custom_template' && (
          <div className="mt-3 p-3 bg-[#0d071d] border border-[#2d1d52] rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-200 font-medium">متن الگوی اختصاصی:</span>
              <span className="text-[11px] text-amber-400 font-mono">
                متغیرها: {'{BODY}'} ، {'{SENDER}'} ، {'{OTP}'}
              </span>
            </div>
            <textarea
              rows={2}
              value={rule.customTemplate}
              onChange={(e) => onChange({ ...rule, customTemplate: e.target.value })}
              className="w-full p-2.5 text-xs bg-[#160e2f] border border-[#382562] rounded-lg text-slate-100 placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400"
              placeholder="پیامک جدید از {SENDER}: {BODY}"
            />
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="p-3.5 bg-[#0d071d] border border-[#2f2054] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-purple-200/90">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            مسیر فعال:{' '}
            <strong className="text-white font-mono">{rule.senderNumber || '(همه فرستنده‌ها)'}</strong>
            {' ──[بررسی متن: '}{' '}
            <strong className="text-amber-300 font-mono">
              {rule.textFilterMode === 'any_message' ? 'بدون شرط (همه)' : `«${rule.customFilterText || 'تعریف نشده'}»`}
            </strong>
            {']──▶ '}
            <strong className="text-cyan-400 font-mono">{rule.destinationNumber || '(مقصد تعیین نشده)'}</strong>
          </span>
        </div>
        <div className="text-purple-300/60 text-[11px]">
          هدایت‌های موفق برلیان پیک: <span className="font-mono text-amber-300 font-bold">{rule.forwardCount}</span>
        </div>
      </div>
    </div>
  );
};
