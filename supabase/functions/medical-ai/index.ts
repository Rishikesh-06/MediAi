import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  analyze_symptoms: `You are a medical AI assistant for rural India. Analyze the patient data and return ONLY valid JSON (no markdown, no code blocks):
{
  "risk_score": number (0-100),
  "triage": "emergency" | "urgent" | "routine",
  "predicted_condition": string,
  "reasons": string[] (max 4, simple language),
  "first_aid": string (if emergency, else null),
  "recommendations": string[],
  "specialist_needed": string
}
Be accurate. Simple English. Life depends on it.`,

  health_assistant: `You are MediAI, a friendly health assistant for rural India. Answer health questions in simple language. Always recommend doctor for serious issues. Be warm and caring like a family member. Never diagnose definitively. Always say consult a doctor to confirm. Keep responses concise (2-3 paragraphs max).`,

  decode_prescription: `You are a medical prescription reader for rural India.

Your job is to carefully read EXACTLY what is written on the prescription image.

CRITICAL RULES:
- Do NOT guess or assume any medicines.
- Do NOT add medicines that are not visible in the image.
- Read the handwriting carefully.
- If a word is unclear, write exactly what you can see and mark it as [unclear].
- Only decode what is actually written.
- Never invent diagnoses or medicines.
- If you cannot read the prescription at all, say so honestly.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "patient_name": "as written or null",
  "age": "as written or null",
  "diagnosis": "as written or null",
  "doctor_name": "as written or null",
  "date": "as written or null",
  "medicines": [
    {
      "name": "exactly as written on prescription",
      "dosage": "as written or [unclear]",
      "frequency": "as written or [unclear]",
      "duration": "as written or [unclear]",
      "timing": "before/after food if written",
      "generic_name": "real generic salt name",
      "purpose": "what this medicine treats",
      "how_it_works": "simple 1 line explanation",
      "side_effects": ["real side effects"],
      "precautions": ["precautions"],
      "generic_alternative": "cheaper generic option",
      "price_branded": "approx price like ₹85",
      "price_generic": "approx price like ₹25"
    }
  ],
  "special_instructions": "as written or null",
  "follow_up": "as written or null",
  "total_estimated_cost": "total for branded",
  "total_generic_cost": "total for generic",
  "savings": "amount saved",
  "reading_confidence": "high" | "medium" | "low",
  "unreadable_parts": "description of parts that could not be read"
}

Be honest. If you cannot read the prescription clearly, say so in the unreadable_parts field.`,

  decode_prescription_full: `You are a medical prescription reader for rural India.

Your job is to carefully read EXACTLY what is written on the prescription image.

CRITICAL RULES:
- Do NOT guess or assume any medicines.
- Do NOT add medicines that are not visible in the image.
- Read the handwriting carefully.
- If a word is unclear, write exactly what you can see and mark it as [unclear].
- Only decode what is actually written.
- Never invent diagnoses or medicines.
- If you cannot read the prescription at all, say so honestly.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "patient_name": "as written or null",
  "age": "as written or null",
  "diagnosis": "as written or null",
  "doctor_name": "as written or null",
  "date": "as written or null",
  "medicines": [
    {
      "name": "exactly as written on prescription",
      "dosage": "as written or [unclear]",
      "frequency": "as written or [unclear]",
      "duration": "as written or [unclear]",
      "timing": "before/after food if written",
      "generic_name": "real generic salt name",
      "purpose": "what this medicine treats",
      "how_it_works": "simple 1 line explanation",
      "side_effects": ["real side effects"],
      "precautions": ["precautions"],
      "generic_alternative": "cheaper generic option",
      "price_branded": "approx price like ₹85",
      "price_generic": "approx price like ₹25"
    }
  ],
  "special_instructions": "as written or null",
  "follow_up": "as written or null",
  "total_estimated_cost": "total for branded",
  "total_generic_cost": "total for generic",
  "savings": "amount saved",
  "reading_confidence": "high" | "medium" | "low",
  "unreadable_parts": "description of parts that could not be read"
}

Be honest. If you cannot read the prescription clearly, say so in the unreadable_parts field.`,

  wellness_plan: `Create a personalized Indian wellness plan. Return ONLY valid JSON (no markdown, no code blocks):
{
  "diet": {
    "breakfast": string,
    "lunch": string,
    "dinner": string,
    "snacks": string,
    "avoid": string[],
    "why": string
  },
  "exercise": [{"name": string, "duration": string, "instructions": string, "level": string}],
  "water_intake": string,
  "sleep_tips": string,
  "home_remedies": string[],
  "weekly_challenge": string
}
Use local Indian foods (ragi, jowar, dal etc).`,

  mental_health: `Assess mental health from questionnaire. Return ONLY valid JSON (no markdown, no code blocks):
{
  "stress_level": "low"|"medium"|"high",
  "risk_level": "low"|"medium"|"high",
  "condition_likely": string,
  "explanation": string (simple, empathetic),
  "recommendations": string[],
  "should_see_counselor": boolean,
  "crisis": boolean
}
Be empathetic. Never alarming unnecessarily.`,

  report_analysis: `Analyze monthly health data. Return ONLY valid JSON (no markdown, no code blocks):
{
  "grade": "A"|"B"|"C"|"D",
  "summary": string,
  "improved": string[],
  "needs_attention": string[],
  "recommendations": string[],
  "doctor_note": string
}
Simple encouraging language.`,

  drug_interaction: `Check if these medicines are safe to take together. Return ONLY valid JSON (no markdown, no code blocks):
{
  "safe": boolean,
  "warning": string or null,
  "details": string
}`
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, messages, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract language instruction from data if provided
    const langInstruction = data?.languageInstruction || "";
    
    let baseSystemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.health_assistant;
    
    // For ALL types, prepend language instruction to system prompt
    const systemPrompt = langInstruction 
      ? `${langInstruction}\n\n${baseSystemPrompt}` 
      : baseSystemPrompt;
    
    let userMessage: string | any[] = "";
    let useVisionModel = false;
    
    if (type === "analyze_symptoms") {
      userMessage = `Patient: Age ${data.age}, Gender ${data.gender}
Symptoms: ${JSON.stringify(data.symptoms)}
Vitals: ${JSON.stringify(data.vitals)}
History: ${JSON.stringify(data.history)}
Analyze and return JSON. All text fields (reasons, first_aid, recommendations, predicted_condition) must be in the language specified in the system instructions above.`;
    } else if (type === "health_assistant") {
      // Messages array passed directly
    } else if (type === "decode_prescription" || type === "decode_prescription_full") {
      // Check if we have an image (base64)
      if (data.image && data.image.startsWith("data:image")) {
        useVisionModel = true;
        userMessage = [
          {
            type: "text",
            text: `Read this prescription image carefully.

Tell me exactly what medicines are written.

For each medicine you can actually see:
- Write the name exactly as written
- Read the dosage written next to it
- Read the frequency (like 1-0-1 or TDS)
- Read the duration if written

If you cannot read something clearly, say "unclear handwriting" for that field.
Do NOT guess brand names.
Do NOT add medicines not in the image.

For each medicine you identify, also provide:
- generic_name: the actual salt/generic name
- purpose: what condition it treats
- side_effects: real side effects
- generic_alternative: cheaper generic option with price
- price_branded: approximate price
- price_generic: approximate generic price

Return the JSON as specified in the system prompt.
All text fields must be in the language specified in the system instructions above.`
          },
          {
            type: "image_url",
            image_url: {
              url: data.image
            }
          }
        ];
      } else {
        // Text-based prescription
        userMessage = `Read this prescription text carefully:

${data.text}

Tell me exactly what medicines are written.
For each medicine:
- Write the name exactly as written
- Read the dosage written next to it
- Read the frequency (like 1-0-1 or TDS)
- Read the duration if written

If you cannot read something clearly, say "unclear" for that field.
Do NOT guess brand names.
Do NOT add medicines not mentioned.

For each medicine you identify, also provide:
- generic_name: the actual salt/generic name
- purpose: what condition it treats
- side_effects: real side effects
- generic_alternative: cheaper generic option with price
- price_branded: approximate price
- price_generic: approximate generic price

Return the JSON as specified in the system prompt.
All text fields must be in the language specified in the system instructions above.`;
      }
    } else if (type === "wellness_plan") {
      userMessage = `Create wellness plan for: Age ${data.age}, Gender ${data.gender}, Conditions: ${data.conditions}, Goal: ${data.goal}. All text must be in the language specified in the system instructions above.`;
    } else if (type === "mental_health") {
      userMessage = `Assess mental health. Answers: ${JSON.stringify(data.answers)}. All text fields (explanation, recommendations, condition_likely) must be in the language specified in the system instructions above.`;
    } else if (type === "report_analysis") {
      userMessage = `Analyze health data: ${JSON.stringify(data)}. All text must be in the language specified in the system instructions above.`;
    } else if (type === "drug_interaction") {
      userMessage = `Check interactions between: ${data.medicines.join(", ")}. Respond in the language specified in the system instructions above.`;
    }

    const apiMessages = type === "health_assistant" && messages
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }];

    // Choose model based on whether we need vision
    const model = useVisionModel ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    // For non-streaming (structured output)
    if (type !== "health_assistant") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "";
      
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : content;
      } catch {
        parsed = content;
      }

      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming for health assistant
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("medical-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
