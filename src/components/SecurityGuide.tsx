import React from 'react';
import { ShieldCheck, BatteryCharging, Lock, Cpu, CheckCircle } from 'lucide-react';

export const SecurityGuide: React.FC = () => {
  return (
    <div className="bg-[#140c29] border border-[#2f2054] rounded-2xl p-5 shadow-lg space-y-6">
      <div className="pb-4 border-b border-[#2d1d52]">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <span>راهنمای فنی: پایداری در پس‌زمینه و ماندگاری دائمی برلیان پیک</span>
        </h2>
        <p className="text-xs text-purple-200/70 mt-1">
          برای اینکه برلیان پیک روی گوشی شما حتی بعد از قفل شدن صفحه یا ساعت‌ها عدم استفاده به خواب نرود و همیشه پیامک‌ها را فوروارد کند:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Battery Optimization & Xiaomi/Samsung kill issues */}
        <div className="p-4 bg-[#0d071d] border border-[#2b1c4e] rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              تنظیمات ضد بسته شدن برنامه (Battery Optimization)
            </h3>
          </div>
          <p className="text-xs text-purple-200/70 leading-relaxed">
            اندروید به‌صورت پیش‌فرض برای کاهش مصرف باتری، برنامه‌های پس‌زمینه را می‌بندد (Doze Mode). برای جلوگیری از این مشکل:
          </p>

          <div className="space-y-2 text-xs text-purple-200">
            <div className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] space-y-1">
              <strong className="text-amber-300">گوشی‌های شیائومی (Xiaomi / Poco / Redmi):</strong>
              <p className="text-purple-200/70 text-[11px] leading-relaxed">
                انگشت خود را روی آیکون برنامه نگه دارید &gt; <strong>App info</strong> &gt; گزینه{' '}
                <strong>Autostart</strong> را روشن کنید. سپس در بخش <strong>Battery saver</strong> آن را روی{' '}
                <strong>No restrictions</strong> بگذارید.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] space-y-1">
              <strong className="text-amber-300">گوشی‌های سامسونگ (Samsung One UI):</strong>
              <p className="text-purple-200/70 text-[11px] leading-relaxed">
                به مسیر <strong>Settings &gt; Battery &gt; Background usage limits</strong> رفته و در قسمت{' '}
                <strong>Never sleeping apps</strong> برنامه برلیان پیک را اضافه نمایید.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] space-y-1">
              <strong className="text-amber-300">سایر گوشی‌های اندروید:</strong>
              <p className="text-purple-200/70 text-[11px] leading-relaxed">
                در تنظیمات برنامه، <strong>Pause app activity if unused</strong> را خاموش کنید و در بخش باتری گزینه <strong>Unrestricted</strong> را انتخاب نمایید.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Security & Privacy */}
        <div className="p-4 bg-[#0d071d] border border-[#2b1c4e] rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              اصول امنیتی، حریم خصوصی و عدم نیاز به اینترنت
            </h3>
          </div>
          <p className="text-xs text-purple-200/70 leading-relaxed">
            برلیان پیک به گونه‌ای مهندسی شده که نهایت امنیت اطلاعات شخصی شما رعایت شود:
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">۱۰۰٪ آفلاین و محلی (Offline):</strong>
                <p className="text-purple-200/70 text-[11px] mt-0.5">
                  کد تولیدشده هیچ‌گونه اتصال اینترنتی یا ارسال به سرور خارجی ندارد و تمام عملیات مستقیماً از طریق سیم‌کارت و تراشه پیامک گوشی شما (SmsManager) انجام می‌شود.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">بررسی مجدد شماره گیرنده مقصد:</strong>
                <p className="text-purple-200/70 text-[11px] mt-0.5">
                  قبل از فعال‌سازی، شماره موبایل مقصد را مجدداً چک کنید تا از ارسال دقیق پیام‌ها به خط مورد نظر خود مطمئن باشید.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#160d2f] border border-[#311f58] flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">یکپارچگی با خانواده برلیان:</strong>
                <p className="text-purple-200/70 text-[11px] mt-0.5">
                  برلیان پیک در هماهنگی کامل با برلیان پیمان و برلیان پلن طراحی شده و ساختار نرم‌افزاری سبکی دارد.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Foreground Service Notice */}
      <div className="p-3.5 bg-gradient-to-r from-[#1d1139] to-[#170e30] border border-amber-500/40 rounded-xl flex items-start gap-3 text-xs">
        <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-300">سرویس ماندگار پیش‌زمینه (Foreground Service)</div>
          <p className="text-purple-200/80 leading-relaxed text-[11px]">
            کد کاتلین برلیان پیک شامل یک <code className="text-amber-300 font-mono">ForegroundService</code> با نوتیفیکیشن دائم است تا تضمین کند سیستم‌عامل اندروید در سخت‌ترین شرایط مدیریت حافظه نیز فرآیند گوش‌به‌زنگ پیامک‌ها را نبندد.
          </p>
        </div>
      </div>
    </div>
  );
};
