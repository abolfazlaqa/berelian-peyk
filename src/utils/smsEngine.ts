import { ForwardRule, SimulationResult, SampleSms } from '../types/forwarder';

// Normalize Persian/Arabic numerals to standard English digits
export function normalizeDigits(str: string): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persianDigits[i], String(i));
    res = res.replaceAll(arabicDigits[i], String(i));
  }
  return res;
}

// Clean phone numbers for comparison (+98912... -> 0912...)
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  cleaned = normalizeDigits(cleaned);
  
  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('98') && cleaned.length >= 10) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

// Check if sender matches rule
export function isSenderMatch(
  incomingSender: string,
  ruleSender: string,
  mode: 'exact' | 'contains' | 'any'
): boolean {
  if (mode === 'any' || !ruleSender.trim()) {
    return true;
  }
  
  const normIncoming = normalizePhoneNumber(incomingSender);
  const normRule = normalizePhoneNumber(ruleSender);

  if (mode === 'exact') {
    return normIncoming === normRule || incomingSender.trim() === ruleSender.trim();
  }

  if (mode === 'contains') {
    return (
      normIncoming.includes(normRule) ||
      incomingSender.includes(ruleSender.trim())
    );
  }

  return true;
}

// Extract OTP code from SMS body
export function extractOtp(body: string, patternType: string, customRegex?: string): string | null {
  if (!body) return null;
  const normalizedText = normalizeDigits(body);

  if (patternType === 'custom_regex' && customRegex) {
    try {
      const rx = new RegExp(customRegex, 'i');
      const match = rx.exec(normalizedText);
      if (match && match[1]) return match[1];
      if (match && match[0]) return match[0];
    } catch {
      // fallback to standard if invalid regex
    }
  }

  // 1. Try finding context-aware OTP (e.g., "کد تایید: 123456", "رمز یکبار مصرف: 84920", "code: 583921", "opt is 482910")
  const contextPatterns = [
    /(?:کد|رمز|رمز\s*یکبار\s*مصرف|کد\s*تایید|کد\s*فعالسازی|otp|opt|code|pin|verification\s*code)[^\d\n\r]{0,15}?(\d{4,8})/i,
    /(\d{4,8})[^\d\n\r]{0,10}?(?:کد\s*تایید|رمز\s*پویا|otp|opt)/i,
  ];

  for (const rx of contextPatterns) {
    const match = rx.exec(normalizedText);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 2. Pattern based fallback
  let regex: RegExp;
  switch (patternType) {
    case 'digits_4':
      regex = /(?:\D|^)(\d{4})(?:\D|$)/;
      break;
    case 'digits_5':
      regex = /(?:\D|^)(\d{5})(?:\D|$)/;
      break;
    case 'digits_6':
      regex = /(?:\D|^)(\d{6})(?:\D|$)/;
      break;
    case 'alphanumeric':
      regex = /(?:\b)([A-Za-z0-9]{5,8})(?:\b)/;
      break;
    case 'digits_4_8':
    default:
      // Find stand-alone numbers between 4 and 8 digits
      regex = /(?:\D|^)(\d{4,8})(?:\D|$)/;
      break;
  }

  const match = regex.exec(normalizedText);
  return match ? match[1] : null;
}

// Evaluate an SMS against a rule
export function evaluateSmsRule(
  incomingSender: string,
  incomingBody: string,
  rule: ForwardRule
): SimulationResult {
  const reasons: string[] = [];
  const normalizedBody = normalizeDigits(incomingBody);

  if (!rule.enabled) {
    return {
      matched: false,
      matchedSender: false,
      matchedKeywords: [],
      extractedCode: null,
      outgoingMessage: null,
      targetNumber: null,
      reasons: ['قانون غیرفعال است (Disabled).'],
      timestamp: new Date().toLocaleTimeString('fa-IR'),
    };
  }

  // 1. Check sender
  const senderMatched = isSenderMatch(incomingSender, rule.senderNumber, rule.senderMatchMode);
  if (!senderMatched) {
    reasons.push(`شماره فرستنده (${incomingSender}) با شرط قانون (${rule.senderNumber || 'همه'}) تطابق ندارد.`);
  } else {
    reasons.push(`شماره فرستنده (${incomingSender}) تطابق دارد.`);
  }

  // 2. Check Custom Text Filter
  const matchedKeywords: string[] = [];
  let textMatched = false;

  const checkText = rule.matchCase ? incomingBody : incomingBody.toLowerCase();
  const filterTextClean = rule.customFilterText?.trim() || '';

  if (rule.textFilterMode === 'any_message' || (!filterTextClean && rule.keywords.length === 0)) {
    textMatched = true;
    matchedKeywords.push('تمام پیامک‌ها (بدون فیلتر متنی)');
    reasons.push('فیلتر متنی خاموش است؛ تمامی پیامک‌های این فرستنده هدایت می‌شوند.');
  } else if (rule.textFilterMode === 'contains_phrase') {
    const targetPhrase = rule.matchCase ? filterTextClean : filterTextClean.toLowerCase();
    if (checkText.includes(targetPhrase)) {
      textMatched = true;
      matchedKeywords.push(filterTextClean);
      reasons.push(`متن دلخواه «${filterTextClean}» در پیامک پیدا شد.`);
    } else {
      reasons.push(`متن دلخواه «${filterTextClean}» در پیامک یافت نشد.`);
    }
  } else if (rule.textFilterMode === 'starts_with') {
    const targetPhrase = rule.matchCase ? filterTextClean : filterTextClean.toLowerCase();
    if (checkText.trim().startsWith(targetPhrase)) {
      textMatched = true;
      matchedKeywords.push(filterTextClean);
      reasons.push(`پیامک با متن دلخواه «${filterTextClean}» شروع شده است.`);
    } else {
      reasons.push(`پیامک با متن دلخواه «${filterTextClean}» شروع نشده است.`);
    }
  } else if (rule.textFilterMode === 'regex') {
    try {
      const rx = new RegExp(filterTextClean, rule.matchCase ? '' : 'i');
      if (rx.test(checkText)) {
        textMatched = true;
        matchedKeywords.push(`Regex: ${filterTextClean}`);
        reasons.push(`الگوی رگولار اکسپرشن «${filterTextClean}» مطابقت دارد.`);
      } else {
        reasons.push(`الگوی رگولار اکسپرشن «${filterTextClean}» مطابقت نداشت.`);
      }
    } catch (e) {
      reasons.push(`خطا در فرمت Regex وارد شده: ${(e as Error).message}`);
    }
  } else {
    // contains_any or default keywords
    const activeKeywords = rule.keywords.length > 0
      ? rule.keywords
      : filterTextClean.split(/[,،\n]/).map(k => k.trim()).filter(Boolean);

    for (const kw of activeKeywords) {
      const cleanKw = kw.trim();
      if (!cleanKw) continue;
      const targetKw = rule.matchCase ? cleanKw : cleanKw.toLowerCase();

      if (checkText.includes(targetKw) || normalizedBody.toLowerCase().includes(targetKw)) {
        matchedKeywords.push(cleanKw);
      }
    }

    if (matchedKeywords.length > 0) {
      textMatched = true;
      reasons.push(`کلمات/عبارات دلخواه یافت شدند: [${matchedKeywords.join(', ')}]`);
    } else {
      reasons.push(`هیچ‌یک از کلمات/عبارات تعریف‌شده (${activeKeywords.join('، ')}) در متن پیامک یافت نشد.`);
    }
  }

  const isMatched = senderMatched && textMatched;

  if (!isMatched) {
    return {
      matched: false,
      matchedSender: senderMatched,
      matchedKeywords,
      extractedCode: null,
      outgoingMessage: null,
      targetNumber: null,
      reasons,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
    };
  }

  // Extract OTP or Code (if any)
  const extractedOtpCode = extractOtp(incomingBody, rule.otpPattern, rule.customRegex);
  if (extractedOtpCode) {
    reasons.push(`کد عددی در صورت نیاز استخراج شد: ${extractedOtpCode}`);
  }

  // Construct outgoing message
  let outgoingMessage = '';
  if (rule.forwardMode === 'full_message') {
    outgoingMessage = incomingBody;
  } else if (rule.forwardMode === 'otp_only') {
    outgoingMessage = extractedOtpCode ? extractedOtpCode : incomingBody;
  } else if (rule.forwardMode === 'custom_template') {
    const template = rule.customTemplate || 'متن ارسالی: {BODY}';
    const timeStr = new Date().toLocaleTimeString('fa-IR');
    outgoingMessage = template
      .replaceAll('{OTP}', extractedOtpCode || '---')
      .replaceAll('{CODE}', extractedOtpCode || '---')
      .replaceAll('{SENDER}', incomingSender)
      .replaceAll('{BODY}', incomingBody)
      .replaceAll('{TIME}', timeStr);
  }

  return {
    matched: true,
    matchedSender: true,
    matchedKeywords,
    extractedCode: extractedOtpCode,
    outgoingMessage,
    targetNumber: rule.destinationNumber,
    reasons,
    timestamp: new Date().toLocaleTimeString('fa-IR'),
  };
}

export const SAMPLE_SMS_LIST: SampleSms[] = [
  {
    id: 'sample-custom-1',
    title: 'پیامک واریز به حساب بانکی',
    sender: '982000400',
    body: 'بانک ملت\nواریز به حساب: 12345678\nمبلغ: 15,000,000 ریال\nمانده: 42,500,000 ریال\n1405/01/10-14:20',
    category: 'bank',
  },
  {
    id: 'sample-custom-2',
    title: 'پیامک تایید سفارش و فاکتور',
    sender: '3000670',
    body: 'سفارش شما با کد پیگیری #94820 ثبت شد و تحویل پیک گردید.',
    category: 'service',
  },
  {
    id: 'sample-1',
    title: 'رمز پویای بانکی (OTP)',
    sender: '982000400',
    body: 'رمز پویا: 729481\nبانک ملت\nمبلغ: 2,500,000 ریال\nکارت: 6104****1234\nاعتبار: 120 ثانیه',
    category: 'bank',
  },
  {
    id: 'sample-2',
    title: 'کد تایید ورود گوگل',
    sender: 'Google',
    body: 'G-839210 is your Google verification code.',
    category: 'google',
  },
  {
    id: 'sample-4',
    title: 'پیامک متفرقه تبلیغاتی',
    sender: '+9810008542',
    body: 'تخفیف ویژه آخر فصل! خرید پوشاک با ۵۰ درصد تخفیف فقط تا امشب.',
    category: 'irrelevant',
  },
];
