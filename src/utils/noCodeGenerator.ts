import { ForwardRule } from '../types/forwarder';

export interface NoCodeOption {
  id: string;
  name: string;
  tagline: string;
  difficulty: 'آسان (۲ دقیقه)' | 'متوسط (۵ دقیقه)' | 'حرفه‌ای';
  description: string;
  features: string[];
  steps: string[];
  exportConfig?: string;
  exportFileName?: string;
  downloadLabel?: string;
}

export function generateNoCodeSolutions(rule: ForwardRule): NoCodeOption[] {
  const sender = rule.senderNumber ? rule.senderNumber : 'هر شماره‌ای (یا سرشماره بانک)';
  const target = rule.destinationNumber ? rule.destinationNumber : 'شماره همراه مقصد شما';
  const customText = rule.customFilterText
    ? rule.customFilterText
    : (rule.keywords.length > 0 ? rule.keywords.join(' یا ') : 'بدون شرط (ارسال همه پیام‌ها)');

  // Tasker XML profile snippet
  const taskerXml = `<TaskerData sr="" dvi="1" tv="6.2.22">
  <Profile sr="prof1" ve="2">
    <cdate>1710000000000</cdate>
    <edate>1710000000000</edate>
    <id>1001</id>
    <mid0>2001</mid0>
    <n>هدایت خودکار پیامک بر اساس متن دلخواه</n>
    <Event sr="con0" ve="2">
      <code>7</code>
      <pri>0</pri>
      <Int sr="arg0" val="0"/>
      <Str sr="arg1" ve="3">${rule.senderNumber || '*'}</Str>
      <Str sr="arg2" ve="3">${rule.customFilterText ? `*${rule.customFilterText}*` : '*'}</Str>
      <Int sr="arg3" val="0"/>
      <Int sr="arg4" val="0"/>
    </Event>
  </Profile>
  <Task sr="task2001">
    <cdate>1710000000000</cdate>
    <edate>1710000000000</edate>
    <id>2001</id>
    <n>ارسال به مقصد</n>
    <Action sr="act0" ve="7">
      <code>67</code>
      <Str sr="arg0" ve="3">${rule.destinationNumber || ''}</Str>
      <Str sr="arg1" ve="3">%SMSRB</Str>
      <Int sr="arg2" val="0"/>
      <Str sr="arg3" ve="3"/>
    </Action>
  </Task>
</TaskerData>`;

  return [
    {
      id: 'macrodroid',
      name: 'MacroDroid (پیشنهادی - بدون نیاز به برنامه‌نویسی)',
      tagline: 'سریع‌ترین و پایدارترین روش در کمتر از ۲ دقیقه',
      difficulty: 'آسان (۲ دقیقه)',
      description: 'نرم‌افزار رایگان MacroDroid از گوگل‌پلی یا بازار. این برنامه نیازی به کدنویسی ندارد و در پس‌زمینه بدون مصرف باتری پیامک‌های خاص را فیلتر و بازفوروارد می‌کند.',
      features: [
        'پایداری بالا حتی در حالت بسته بودن صفحه گوشی',
        'تطابق دقیق با هر متن دلخواه شما (کلمات، ارقام، جملات)',
        'امکان ارسال تمامی پیام‌ها بدون شرط متنی',
      ],
      steps: [
        'نرم‌افزار MacroDroid را از Google Play یا بازار نصب کنید.',
        'روی گزینه "افزودن ماکرو (Add Macro)" کلیک کنید.',
        `در بخش محرک‌ها (Triggers) گزینه Connectivity / Messaging -> SMS Received را انتخاب کنید.`,
        `در شرط فرستنده: شماره فرستنده را روی [${sender}] قرار دهید (یا گزینه Any Contact را بگذارید).`,
        rule.customFilterText
          ? `در فیلتر متن پیامک: گزینه Contains را انتخاب کرده و عبارت دلخواه [${customText}] را وارد نمایید.`
          : 'در فیلتر متن: گزینه Any Content را انتخاب کنید تا تمامی پیامک‌های این فرستنده بدون شرط متنی ارسال شوند.',
        `در بخش اکشن‌ها (Actions): گزینه Messaging -> Send SMS را انتخاب کرده و شماره گیرنده را برابر با [${target}] بگذارید.`,
        'در متن پیام ارسالی: متغیر {sms_message} (کل پیام) یا کدهای استخراج‌شده را انتخاب کنید.',
        'ماکرو را با یک نام دلخواه ذخیره کنید و دسترسی SMS را در تنظیمات گوشی تأیید کنید.',
      ],
      exportFileName: 'MacroDroid_Custom_SMS_Forwarder.txt',
      exportConfig: `Trigger: SMS Received from [${sender}] matching [${customText}] -> Action: Send SMS to [${target}] with body {sms_message}`,
      downloadLabel: 'کپی خلاصه دستور ماکرو',
    },
    {
      id: 'tasker',
      name: 'Tasker (قدرتمند و پیشرفته)',
      tagline: 'مناسب کاربران حرفه‌ای اندروید با قابلیت ایمپورت فایل XML',
      difficulty: 'متوسط (۵ دقیقه)',
      description: 'پادشاه اتوماسیون اندروید. فایل XML تولید شده زیر را در تسکر Import کنید تا قانون فوروارد با متن دلخواه شما فعال شود.',
      features: [
        'امکان نوشتن هرگونه عبارت متنی، کلمه یا Regular Expression',
        'کنترل فوق‌العاده روی شروط و زمان‌بندی',
        'قابلیت ایمپورت و اکسپورت تک‌کلیک',
      ],
      steps: [
        'برنامه Tasker را در گوشی باز کنید.',
        'فایل کانفیگ XML زیر را دانلود کرده و در پوشه Tasker/profiles در حافظه گوشی ذخیره کنید.',
        'روی تب Profiles انگشت خود را نگه دارید و گزینه Import Profile را بزنید.',
        'فایل را انتخاب کنید. شرط متنی دلخواه و شماره‌ها به طور خودکار تنظیم خواهد شد.',
        'تیک بالای صفحه را بزنید تا پروفایل فعال شود.',
      ],
      exportConfig: taskerXml,
      exportFileName: 'CustomText_SmsForwarder_Tasker.xml',
      downloadLabel: 'دانلود فایل پروفایل Tasker (XML)',
    },
    {
      id: 'sms_forwarder_fdroid',
      name: 'SMS Forwarder (اپ متن‌باز F-Droid)',
      tagline: 'نرم‌افزار اختصاصی و سبک اپن‌سورس برای هدایت پیامک',
      difficulty: 'آسان (۲ دقیقه)',
      description: 'یک پروژه اوپن‌سورس عالی در گیت‌هاب و F-Droid که بدون تبلیغات پیامک‌های با متن دلخواه شما را فوروارد می‌کند.',
      features: [
        '۱۰۰٪ امن و بدون تبلیغات با دسترسی مستقیم',
        'پشتیبانی از فوروارد به شماره تلفن دیگر، تلگرام، وب‌هوک یا ایمیل',
        'امکان تعریف چندین قانون مجزا با متن‌های متفاوت',
      ],
      steps: [
        'عبارت "SMS Forwarder" را در F-Droid یا GitHub جستجو و نصب کنید (پروژه pppshh یا lanlin).',
        'وارد بخش Filters شوید و یک Rule جدید بسازید.',
        `فیلد Sender Number را برابر با [${sender}] بگذارید.`,
        `در قسمت Content Rule، شرط متنی [${customText}] را وارد کنید (یا خالی بگذارید برای تمام پیام‌ها).`,
        `در تب Sender Channels، گزینه SMS را انتخاب کرده و شماره گیرنده مقصد [${target}] را وارد کنید.`,
        'برنامه را در لیست Always Allowed باتری گوشی قرار دهید.',
      ],
      exportConfig: `Rule Type: SMS Forwarder\nSource Sender: ${sender}\nDestination: ${target}\nMatch Condition: ${customText}\nEnabled: Yes`,
      exportFileName: 'CustomSmsForwarder_Rule.json',
      downloadLabel: 'دانلود راهنما و کانفیگ',
    },
  ];
}
