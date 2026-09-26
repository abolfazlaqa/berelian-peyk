import React, { useState } from 'react';
import { ForwardRule, ForwardLog, SampleSms } from '../types/forwarder';
import { evaluateSmsRule, SAMPLE_SMS_LIST } from '../utils/smsEngine';
import { RotateCcw, Check, X, Send, MessageSquareText } from 'lucide-react';

interface SimulatorProps {
  rule: ForwardRule;
  onAddLog: (log: ForwardLog) => void;
}

export const Simulator: React.FC<SimulatorProps> = ({ rule, onAddLog }) => {
  const [incomingSender, setIncomingSender] = useState<string>('982000400');
  const [incomingBody, setIncomingBody] = useState<string>(
    'بانک ملت\nواریز به حساب: 12345678\nمبلغ: 15,000,000 ریال\nمانده: 42,500,000 ریال\n1405/01/10-14:20'
  );
  const [lastForwardedNotification, setLastForwardedNotification] = useState<string | null>(null);

  // Evaluate live
  const evalResult = evaluateSmsRule(incomingSender, incomingBody, rule);

  const handleSelectSample = (sample: SampleSms) => {
    setIncomingSender(sample.sender);
    setIncomingBody(sample.body);
    setLastForwardedNotification(null);
  };

  const handleSimulateForward = () => {
    const isSuccess = evalResult.matched && Boolean(evalResult.targetNumber);
    
    const newLog: ForwardLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      sender: incomingSender,
      destination: evalResult.targetNumber || rule.destinationNumber || '(نامشخص)',
      incomingText: incomingBody,
      outgoingText: evalResult.outgoingMessage || '(بدون ارسال)',
      status: isSuccess ? 'forwarded' : 'filtered_out',
      reason: evalResult.reasons.join(' | '),
      ruleName: 'برلیان پیک',
    };

    onAddLog(newLog);

    if (isSuccess) {
      setLastForwardedNotification(
        `برلیان پیک پیامک را با موفقیت به شماره ${evalResult.targetNumber} ارسال کرد!`
      );
    } else {
      setLastForwardedNotification('پیامک طبق شروط متنی یا فرستنده فیلتر شد و ارسال نشد.');
    }

    setTimeout(() => {
      setLastForwardedNotification(null);
    }, 4500);
  };

  return (
    <div className="bg-[#140c29] border border-[#2f2054] rounded-2xl p-5 shadow-lg space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2d1d52]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-amber-400" />
            <span>شبیه‌ساز زنده برلیان پیک (Live SMS Test Bench)</span>
          </h2>
          <p className="text-xs text-purple-200/70 mt-0.5">
            متن پیامک ورودی را بنویسید یا تغییر دهید تا عملکرد هوشمند فیلتر و بازفرستادن آن به خط دوم را به صورت زنده تست کنید.
          </p>
        </div>

        {/* Sample selector buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-purple-300/60 text-[11px] ml-1">تست سریع با نمونه:</span>
          {SAMPLE_SMS_LIST.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="px-2.5 py-1 bg-[#1e133d] hover:bg-[#2c1b57] text-purple-200 border border-[#3b2767] rounded-lg text-xs transition-colors cursor-pointer"
            >
              {sample.title.split(' ')[0]} {sample.title.split(' ')[1] || ''}
            </button>
          ))}
        </div>
      </div>

      {/* Two columns: Simulated Incoming Phone vs Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Col 1: Simulated Incoming SMS Box */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              ۱. پیامک ورودی به گوشی شما (Incoming SMS)
            </span>
            <button
              type="button"
              onClick={() => {
                setIncomingSender('');
                setIncomingBody('');
              }}
              className="text-[11px] text-purple-300/70 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>پاک کردن</span>
            </button>
          </div>

          <div className="space-y-2 bg-[#0d071d] p-3.5 rounded-xl border border-[#2b1c4e]">
            <div>
              <label className="block text-[11px] text-purple-300/70 mb-1">
                سرشماره یا نام فرستنده ورودی:
              </label>
              <input
                type="text"
                value={incomingSender}
                onChange={(e) => setIncomingSender(e.target.value)}
                placeholder="مثال: 982000400 یا Google"
                className="w-full px-3 py-2 text-xs bg-[#160d2f] border border-[#392565] rounded-lg text-slate-100 font-mono focus:outline-hidden focus:border-amber-400"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-[11px] text-purple-300/70 mb-1">
                متن کامل پیامک دریافت شده:
              </label>
              <textarea
                rows={5}
                value={incomingBody}
                onChange={(e) => setIncomingBody(e.target.value)}
                placeholder="متن پیامک دریافتی را اینجا بنویسید یا ویرایش کنید..."
                className="w-full p-2.5 text-xs bg-[#160d2f] border border-[#392565] rounded-lg text-slate-100 placeholder-purple-300/40 focus:outline-hidden focus:border-amber-400 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>

        {/* Right/Col 2: Live Analysis & Forwarding Preview */}
        <div className="lg:col-span-6 space-y-3">
          <span className="text-xs font-semibold text-amber-300">
            ۲. ارزیابی شرط‌ها و پیش‌نمایش خروجی توسط برلیان پیک
          </span>

          <div className="bg-[#0d071d] p-3.5 rounded-xl border border-[#2b1c4e] space-y-3">
            {/* Condition checks checklist */}
            <div className="space-y-2 text-xs">
              {/* Check 1: Sender match */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#160d2f] border border-[#311f58]">
                <span className="text-purple-200">تطابق شماره فرستنده مبدأ:</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  {evalResult.matchedSender ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      تطابق دارد
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      عدم تطابق
                    </span>
                  )}
                </span>
              </div>

              {/* Check 2: Custom Text Condition check */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#160d2f] border border-[#311f58]">
                <span className="text-purple-200">
                  {rule.textFilterMode === 'any_message'
                    ? 'وضعیت فیلتر متنی:'
                    : `شرط متن دلخواه (${rule.customFilterText ? `«${rule.customFilterText}»` : 'بدون شرط'}):`}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  {evalResult.matchedKeywords.length > 0 ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-sans">
                      <Check className="w-3.5 h-3.5" />
                      {evalResult.matchedKeywords.join(', ')}
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 font-sans">
                      <X className="w-3.5 h-3.5" />
                      متن دلخواه یافت نشد
                    </span>
                  )}
                </span>
              </div>

              {/* Check 3: Extracted Code */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#160d2f] border border-[#311f58]">
                <span className="text-purple-200">کد عددی استخراج‌شده (در صورت نیاز):</span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {evalResult.extractedCode ? evalResult.extractedCode : '---'}
                </span>
              </div>
            </div>

            {/* Outgoing Message Preview */}
            <div className="pt-2 border-t border-[#2a1b4b]">
              <div className="flex items-center justify-between text-xs text-purple-300/70 mb-1">
                <span>پیامک ارسالی نهایی به خط گیرنده مقصد:</span>
                <span className="font-mono text-cyan-300 text-[11px] font-bold">
                  {rule.destinationNumber || '(شماره گیرنده مقصد وارد نشده!)'}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs font-mono whitespace-pre-wrap leading-relaxed ${
                  evalResult.matched
                    ? 'bg-[#191035] border-amber-500/40 text-purple-100 shadow-inner'
                    : 'bg-[#120a26] border-[#291a4c] text-purple-300/40 italic'
                }`}
              >
                {evalResult.matched
                  ? evalResult.outgoingMessage
                  : 'پیامک ارسال نمی‌شود چون شروط فرستنده یا متن دلخواه شما برقرار نیست.'}
              </div>
            </div>

            {/* Action trigger button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulateForward}
                disabled={!evalResult.matched || !rule.destinationNumber}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 active:scale-98 disabled:from-[#231742] disabled:to-[#1a1033] disabled:text-purple-300/30 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>پیک آزمایشی پیامک به گیرنده مقصد (ثبت در گزارش)</span>
              </button>
            </div>

            {lastForwardedNotification && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-fadeIn shadow-md">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lastForwardedNotification}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
