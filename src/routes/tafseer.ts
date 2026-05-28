import { Router } from "express";
import { GetAiTafseerBody } from "../lib/api-zod";
import { logger } from "../lib/logger";

const router = Router();

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  english: "Respond entirely in English.",
  urdu: "Respond entirely in Urdu (اردو). Use clear, classical Urdu suitable for Islamic scholarship.",
  arabic: "Respond entirely in Arabic (العربية). Use formal Modern Standard Arabic suitable for Islamic scholarship.",
  french: "Respond entirely in French (Français). Use clear, formal French.",
  german: "Respond entirely in German (Deutsch). Use formal German.",
  spanish: "Respond entirely in Spanish (Español). Use clear, formal Spanish.",
  turkish: "Respond entirely in Turkish (Türkçe). Use formal Turkish.",
  hindi: "Respond entirely in Hindi (हिन्दी). Use clear, formal Hindi.",
  bengali: "Respond entirely in Bengali (বাংলা). Use formal Bengali.",
  indonesian: "Respond entirely in Indonesian (Bahasa Indonesia). Use formal Indonesian.",
  russian: "Respond entirely in Russian (Русский). Use formal Russian.",
  chinese: "Respond entirely in Simplified Chinese (中文). Use clear, formal Mandarin Chinese.",
  persian: "Respond entirely in Persian/Farsi (فارسی). Use formal Persian.",
  malay: "Respond entirely in Malay (Bahasa Melayu). Use formal Malay.",
  swahili: "Respond entirely in Swahili (Kiswahili). Use clear, formal Swahili.",
};

router.post("/tafseer/explain", async (req, res): Promise<void> => {
  const parsed = GetAiTafseerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { surahId, verseId, arabicText, translation, mode, language } = parsed.data;
  const lang = (language ?? "english") as string;
  const langInstruction = LANGUAGE_INSTRUCTIONS[lang] ?? LANGUAGE_INSTRUCTIONS.english;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const modeInstructions = {
        beginner: "Explain in simple terms suitable for someone new to the Quran. Use plain language.",
        student: "Provide a balanced explanation with some scholarly context, suitable for an intermediate learner.",
        advanced: "Provide deep scholarly tafseer with classical references and linguistic analysis.",
      };
      const instruction = modeInstructions[mode as keyof typeof modeInstructions] ?? modeInstructions.beginner;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `You are an Islamic scholar providing Quranic tafseer. ${instruction} ${langInstruction} Respond in JSON with fields: explanation, historicalContext, lessons (array of 3 strings), practicalApplication, scholarlyInsights. All field values must be in the requested language.`,
          }, {
            role: "user",
            content: `Explain Surah ${surahId}, Verse ${verseId}: "${arabicText}" (Translation: "${translation}")`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 1000,
        }),
      });
      const data = await response.json() as any;
      const content = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      res.json({
        explanation: content.explanation ?? "",
        historicalContext: content.historicalContext ?? "",
        lessons: content.lessons ?? [],
        practicalApplication: content.practicalApplication ?? "",
        scholarlyInsights: content.scholarlyInsights ?? "",
      });
      return;
    } catch (err) {
      logger.warn({ err }, "OpenAI call failed, using fallback");
    }
  }

  // Fallback tafseer (English only for fallback)
  const fallbackTafseer: Record<number, any> = {
    1: {
      explanation: "Al-Fatihah is the opening chapter of the Quran and serves as a comprehensive prayer. It establishes the fundamental relationship between the Creator and His creation.",
      historicalContext: "This surah was revealed in Mecca and is recited in every unit of the Islamic prayer (Salah). The Prophet Muhammad called it 'Umm al-Quran' (the Mother of the Quran).",
      lessons: ["Turn to Allah alone for guidance", "Seek the straight path in all matters", "Remember that all praise belongs to Allah"],
      practicalApplication: "Recite Al-Fatihah with full understanding in your prayers to strengthen your connection with Allah.",
      scholarlyInsights: "Classical scholars note that this surah contains the essence of the entire Quran in summary form.",
    },
  };

  const surahFallback = fallbackTafseer[surahId];
  if (surahFallback) { res.json(surahFallback); return; }

  res.json({
    explanation: `This verse (Surah ${surahId}:${verseId}) carries profound guidance for believers. The Arabic text "${arabicText}" (${translation}) reveals important teachings about faith, practice, and the relationship with Allah.`,
    historicalContext: `This verse was revealed in the context of early Islamic history, providing guidance to the Prophet Muhammad and his companions during a critical period of the faith's development.`,
    lessons: [
      "Reflect deeply on the meaning of this verse in your daily life",
      "Apply the teachings to strengthen your relationship with Allah",
      "Share this wisdom with your family and community",
    ],
    practicalApplication: `Consider how the message of "${translation}" can be applied in your current life situation. Take one concrete action based on this verse today.`,
    scholarlyInsights: "Classical tafseer scholars emphasized the importance of contextual understanding when interpreting Quranic verses.",
  });
});

const CHAT_SYSTEM_PROMPT = (mode: string, langInstruction: string) => {
  const depth = {
    beginner: "You are a friendly Islamic assistant. Use simple, clear language. Keep answers concise and easy to understand for someone new to Islam.",
    student: "You are a knowledgeable Islamic assistant with scholarly depth. Provide balanced answers with references to Quran and Hadith where relevant.",
    scholar: "You are an advanced Islamic scholar. Provide in-depth analysis with classical references, Arabic terms, and multiple scholarly perspectives.",
  }[mode] ?? "You are a friendly Islamic assistant.";
  return `${depth} ${langInstruction}

You can help with:
- Explaining Quranic verses and their tafseer
- Explaining Hadith and their context
- Answering general Islamic questions (fiqh, aqeedah, seerah, etc.)
- Suggesting memorization strategies and study plans
- Generating quiz questions on Islamic knowledge

Always be respectful, accurate, and base answers on authentic Islamic sources. If unsure, say so. Keep responses focused and not excessively long.`;
};

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, history = [], mode = "beginner", language = "english" } = req.body as {
    message: string; history: Array<{ role: string; content: string }>; mode?: string; language?: string;
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required." }); return;
  }

  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS.english;
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const messages = [
        { role: "system", content: CHAT_SYSTEM_PROMPT(mode, langInstruction) },
        ...history.slice(-10).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user" as const, content: message },
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 800 }),
      });
      const data = await response.json() as any;
      const reply = data.choices?.[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
      res.json({ reply }); return;
    } catch (err) {
      logger.warn({ err }, "OpenAI chat call failed, using fallback");
    }
  }

  // Fallback responses when no OpenAI key
  const q = message.toLowerCase();
  let reply = "SubhanAllah! That's a wonderful question. ";
  if (q.includes("salah") || q.includes("prayer") || q.includes("namaz")) {
    reply += "Salah (prayer) is the second pillar of Islam. Muslims pray five times daily: Fajr (dawn), Dhuhr (midday), Asr (afternoon), Maghrib (sunset), and Isha (night). Each prayer is a direct connection with Allah.";
  } else if (q.includes("quran") || q.includes("surah") || q.includes("verse") || q.includes("ayah")) {
    reply += "The Quran is the word of Allah revealed to Prophet Muhammad ﷺ over 23 years. It contains 114 surahs and 6,236 verses. Reading it with understanding and reflection is highly recommended.";
  } else if (q.includes("hadith") || q.includes("sunnah") || q.includes("prophet")) {
    reply += "Hadith are the recorded sayings, actions, and approvals of Prophet Muhammad ﷺ. They are the second source of Islamic law after the Quran. The most authentic collections are Sahih Bukhari and Sahih Muslim.";
  } else if (q.includes("ramadan") || q.includes("fasting") || q.includes("sawm")) {
    reply += "Ramadan is the ninth month of the Islamic calendar and a time of fasting, increased worship, and reflection. Muslims fast from Fajr to Maghrib, abstaining from food, drink, and other things that break the fast.";
  } else if (q.includes("hajj") || q.includes("pilgrimage") || q.includes("mecca")) {
    reply += "Hajj is the fifth pillar of Islam — a pilgrimage to Mecca that every Muslim who is physically and financially able must perform at least once in their lifetime. It takes place in the month of Dhul Hijjah.";
  } else if (q.includes("zakat") || q.includes("charity") || q.includes("sadaqah")) {
    reply += "Zakat is the third pillar of Islam — obligatory charity of 2.5% of one's savings above the nisab (minimum threshold) held for a lunar year. Sadaqah refers to any voluntary charity given for the sake of Allah.";
  } else if (q.includes("tawhid") || q.includes("iman") || q.includes("belief") || q.includes("faith")) {
    reply += "Tawhid — the oneness of Allah — is the fundamental concept of Islam. Iman (faith) has six pillars: belief in Allah, His angels, His books, His messengers, the Last Day, and divine decree (qadar).";
  } else {
    reply += `You asked: "${message.slice(0, 80)}". To get a full AI-powered answer in your preferred language, the OpenAI API key needs to be configured. In the meantime, I can help you find relevant verses in the Quran Reader or hadiths in the Hadith Library.`;
  }

  res.json({ reply });
});

export default router;
