export const SUPPORTED_LANGS = ['en', 'hi', 'te'] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const getCurrentLanguage = (): SupportedLang => {
  const stored = localStorage.getItem('mediai_language');
  if (stored && SUPPORTED_LANGS.includes(stored as SupportedLang)) {
    return stored as SupportedLang;
  }
  return 'en';
};

export const getLanguageInstruction = (code: string): string => {
  if (code === 'hi') {
    return `!!MANDATORY RULE!!
आप एक भारतीय ग्रामीण स्वास्थ्य सहायक हैं।
आपको केवल और केवल हिंदी में जवाब देना है।
एक भी अंग्रेजी शब्द मत लिखो।
सिर्फ दवाइयों के नाम और नंबर अंग्रेजी में लिख सकते हो।
बाकी सब हिंदी में।
सरल हिंदी में लिखो जो गाँव का इंसान समझे।`;
  }
  if (code === 'te') {
    return `!!తప్పనిసరి నియమం!!
మీరు భారతీయ గ్రామీణ ఆరోగ్య సహాయకుడు.
మీరు తప్పనిసరిగా తెలుగులో మాత్రమే సమాధానం ఇవ్వాలి.
ఒక్క ఆంగ్ల పదం కూడా రాయకండి.
మందుల పేర్లు మరియు సంఖ్యలు మాత్రమే ఆంగ్లంలో రాయవచ్చు.
మిగతా అన్నీ తెలుగులో రాయండి.
గ్రామీణ వ్యక్తికి అర్థమయ్యే సరళమైన తెలుగు వాడండి.`;
  }
  return `Respond in simple English only. Use words a village person understands.`;
};

export const getGreeting = (code: string, name: string): string => {
  if (code === 'hi') {
    return `नमस्ते ${name}! 🙏 मैं आपका MediAI स्वास्थ्य सहायक हूँ। आज मैं आपकी कैसे मदद करूँ?`;
  }
  if (code === 'te') {
    return `నమస్తే ${name}! 🙏 నేను మీ MediAI ఆరోగ్య సహాయకుడిని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?`;
  }
  return `Hello ${name}! 🙏 I am your MediAI health assistant. How can I help you today?`;
};

export const getPlaceholder = (code: string): string => {
  if (code === 'hi') return 'अपना स्वास्थ्य सवाल हिंदी में लिखें...';
  if (code === 'te') return 'మీ ఆరోగ్య ప్రశ్న తెలుగులో టైప్ చేయండి...';
  return 'Type your health question...';
};

export const getSpeechLang = (code: string): string => {
  const map: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
  };
  return map[code] || 'en-IN';
};
