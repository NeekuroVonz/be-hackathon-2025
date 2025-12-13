import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LlmService {
  private readonly geminiApiKey = process.env.GEMINI_API_KEY;

  /**
   * Analyze short-term disaster risk based on current weather data.
   *
   * - Prompt is always in English.
   * - "lang" can be any code: vi, en, ja, ko, zh, etc.
   * - possibleDisasters: names of the 5 base disaster types,
   *   translated into the requested language.
   * - explanation + recommendedActions: also in the requested language (best-effort).
   *
   * This is DEMO MODE: it will always output at least one disaster.
   */
  async analyzeDisasterRisk(
    locationName: string,
    weatherData: any,
    lang: string = 'en',
  ) {
    // Map some common language codes to human-friendly names for the prompt
    const languageNameMap: Record<string, string> = {
      vi: 'Vietnamese',
      en: 'English',
      ja: 'Japanese',
      jp: 'Japanese',
      ko: 'Korean',
      kr: 'Korean',
      zh: 'Chinese',
      'zh-cn': 'Simplified Chinese',
      'zh-tw': 'Traditional Chinese',
      fr: 'French',
      de: 'German',
      es: 'Spanish',
      pt: 'Portuguese',
    };
    const langLower = lang?.toLowerCase() || 'en';
    const targetLanguageName =
      languageNameMap[langLower] || 'the user\'s language';

    const prompt = `
      You are an assistant that predicts short-term natural disaster risk based on current weather data.
      This is for DEMO ONLY, not for real-world safety decisions.
      
      BASE DISASTER TYPES (in English, conceptual categories):
      1. Flooding
      2. Thunderstorm / heavy rain
      3. Tropical storm / typhoon / hurricane
      4. Landslide
      5. Poor air quality / pollution
      
      TARGET LANGUAGE:
      - The user selected lang = "${lang}".
      - Write all human-readable text in ${targetLanguageName}.
      - Translate the disaster type names into ${targetLanguageName} as well.
      - Do NOT mix multiple languages in the output.
      
      DEMO REQUIREMENTS:
      - Always choose AT LEAST ONE plausible disaster type based on the weather,
        even if the real risk would be low.
      - When the weather looks mostly normal, choose a mild risk ("LOW" or "MEDIUM")
        with a realistic explanation.
      - You may choose multiple disaster types if they make sense together.
        (For example, heavy rain near mountains -> thunderstorm + landslide risk.)
      
      RESPONSE FORMAT (VERY IMPORTANT):
      - You MUST return a PURE JSON object ONLY (no extra text, no markdown, no \`\`\`).
      - The JSON MUST follow this schema:
      
      {
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
        "possibleDisasters": [
          // array of strings, each string is the NAME of one of the 5 base types,
          // translated into ${targetLanguageName}.
          // Example (if language is Vietnamese):
          // ["Lũ lụt", "Mưa dông"]
          // Example (if language is Japanese):
          // ["洪水", "雷雨"]
        ],
        "explanation": "Short human-friendly explanation (max 3 sentences) in ${targetLanguageName}. Mention that this is a simulation/demo, not a real warning.",
        "recommendedActions": [
          "Short, action-oriented suggestions in ${targetLanguageName}.",
          "Each item is one sentence."
        ]
      }
      
      Location: ${locationName}
      
      Weather data (WeatherAPI current.json):
      
      ${JSON.stringify(weatherData, null, 2)}
    `;

    const res = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        params: { key: this.geminiApiKey },
      },
    );

    const rawText =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Try to extract JSON block from the response in case the model wraps it with extra text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : rawText;

    try {
      const parsed = JSON.parse(jsonText);

      // Ensure possibleDisasters is a non-empty array for demo purposes
      if (
        !parsed.possibleDisasters ||
        !Array.isArray(parsed.possibleDisasters) ||
        parsed.possibleDisasters.length === 0
      ) {
        // We don't know the translation here, so we just put a generic label.
        // In practice this path should be rare if the model follows instructions.
        parsed.possibleDisasters = ['Demo disaster'];
        if (!parsed.riskLevel) {
          parsed.riskLevel = 'LOW';
        }
      }

      return parsed;
    } catch {
      // Fallback if JSON parsing fails
      return {
        riskLevel: 'LOW',
        possibleDisasters: ['Demo disaster'],
        explanation:
          targetLanguageName === 'Vietnamese'
            ? 'Đây là mô phỏng demo. Phản hồi của mô hình không thể phân tích được JSON nên sử dụng rủi ro mặc định.'
            : 'This is a demo simulation. The model response could not be parsed as JSON, so a default mild risk is used.',
        recommendedActions:
          targetLanguageName === 'Vietnamese'
            ? ['Theo dõi thêm thông tin thời tiết và chăm sóc sức khỏe khi trời oi bức.']
            : ['Monitor local weather updates and take care of your health in hot and humid conditions.'],
      };
    }
  }

  async generateJson(prompt: string) {
    const res = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      { contents: [{ parts: [{ text: prompt }] }] },
      { params: { key: this.geminiApiKey } },
    );

    const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : rawText;

    return JSON.parse(jsonText);
  }
}
