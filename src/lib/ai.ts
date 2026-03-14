import { supabase } from '@/integrations/supabase/client';
import { getCurrentLanguage, getLanguageInstruction } from '@/utils/language';

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-ai`;

export async function analyzeSymptoms(data: {
  symptoms: string[];
  vitals: Record<string, string>;
  history: Record<string, any>;
  age: number;
  gender: string;
}) {
  const lang = getCurrentLanguage();
  const langInstruction = getLanguageInstruction(lang);
  const { data: result, error } = await supabase.functions.invoke('medical-ai', {
    body: { type: 'analyze_symptoms', data: { ...data, languageInstruction: langInstruction } },
  });
  if (error) throw error;
  return result.result;
}

export async function streamHealthAssistant({
  messages,
  language,
  languageInstruction,
  onDelta,
  onDone,
}: {
  messages: { role: string; content: string }[];
  language?: string;
  languageInstruction?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const lang = language || getCurrentLanguage();
  const langInstr = languageInstruction || getLanguageInstruction(lang);

  const resp = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ type: 'health_assistant', messages, data: { language: lang, languageInstruction: langInstr } }),
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({ error: 'AI error' }));
    throw new Error(err.error || 'Failed to connect to AI');
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial */ }
    }
  }
  onDone();
}

export async function decodePrescription(text: string) {
  const lang = getCurrentLanguage();
  const langInstruction = getLanguageInstruction(lang);
  const { data: result, error } = await supabase.functions.invoke('medical-ai', {
    body: { type: 'decode_prescription', data: { text, languageInstruction: langInstruction } },
  });
  if (error) throw error;
  return result.result;
}

export async function generateWellnessPlan(data: {
  age: number;
  gender: string;
  conditions: string;
  goal: string;
  language?: string;
}) {
  const lang = getCurrentLanguage();
  const langInstruction = getLanguageInstruction(lang);
  const { data: result, error } = await supabase.functions.invoke('medical-ai', {
    body: { type: 'wellness_plan', data: { ...data, languageInstruction: langInstruction } },
  });
  if (error) throw error;
  return result.result;
}

export async function assessMentalHealth(data: {
  answers: Record<string, string>;
  language?: string;
}) {
  const lang = getCurrentLanguage();
  const langInstruction = getLanguageInstruction(lang);
  const { data: result, error } = await supabase.functions.invoke('medical-ai', {
    body: { type: 'mental_health', data: { ...data, languageInstruction: langInstruction } },
  });
  if (error) throw error;
  return result.result;
}

export async function generateReportAnalysis(data: any) {
  const lang = getCurrentLanguage();
  const langInstruction = getLanguageInstruction(lang);
  const { data: result, error } = await supabase.functions.invoke('medical-ai', {
    body: { type: 'report_analysis', data: { ...data, languageInstruction: langInstruction } },
  });
  if (error) throw error;
  return result.result;
}

export async function checkDrugInteraction(medicines: string[]) {
  const lang = getCurrentLanguage();
  const langInstruction = getLanguageInstruction(lang);
  const { data: result, error } = await supabase.functions.invoke('medical-ai', {
    body: { type: 'drug_interaction', data: { medicines, languageInstruction: langInstruction } },
  });
  if (error) throw error;
  return result.result;
}
