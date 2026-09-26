export interface ForwardRule {
  id: string;
  name: string;
  enabled: boolean;
  senderNumber: string; // e.g. "+982000400" or empty for all
  senderMatchMode: 'exact' | 'contains' | 'any';
  destinationNumber: string; // e.g. "+989123456789"
  textFilterMode: 'contains_phrase' | 'contains_any' | 'contains_all' | 'starts_with' | 'any_message' | 'regex';
  customFilterText: string; // متن دلخواه کاربر (مانند "واریز", "کد ورود", یا هر متن سفارشی)
  keywords: string[]; // کلمات یا عبارات تفکیک شده
  matchCase: boolean;
  forwardMode: 'full_message' | 'otp_only' | 'custom_template';
  customTemplate: string; // e.g. "متن ارسالی: {BODY}"
  otpPattern: 'digits_4_8' | 'digits_4' | 'digits_5' | 'digits_6' | 'alphanumeric' | 'custom_regex';
  customRegex: string;
  createdAt: string;
  forwardCount: number;
}

export interface SimulationResult {
  matched: boolean;
  matchedSender: boolean;
  matchedKeywords: string[];
  extractedCode: string | null;
  outgoingMessage: string | null;
  targetNumber: string | null;
  reasons: string[];
  timestamp: string;
}

export interface ForwardLog {
  id: string;
  timestamp: string;
  sender: string;
  destination: string;
  incomingText: string;
  outgoingText: string;
  status: 'forwarded' | 'filtered_out' | 'error';
  reason: string;
  ruleName: string;
}

export interface SampleSms {
  id: string;
  title: string;
  sender: string;
  body: string;
  category: 'bank' | 'google' | 'service' | 'irrelevant';
}
