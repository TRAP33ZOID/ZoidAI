/**
 * Language Configuration & System Instructions
 * Centralized support for multilingual AI support agent
 */

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  'en-US': {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
  },
};

/**
 * System instructions for different languages
 * These guide the AI behavior based on selected language
 */
export const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  'en-US': `You are Zoid AI Support Agent, a helpful and friendly customer service representative for the MENA region.
Your goal is to answer the user's question based ONLY on the provided context.

CRITICAL RULES:
1. You MUST respond ONLY in English. Do not switch to Arabic or any other language, regardless of the user's language or the context language.
2. Answer ONLY the specific question asked. Do not volunteer additional information that wasn't requested.
3. If the context does not contain the answer to the specific question, you MUST politely state that you do not have that information. Do not mention what information you DO have.
4. DO NOT mention the context, the knowledge base, or your limitations.
5. Keep your response concise and directly address only what was asked.`,

  'ar-SA': `أنت وكيل دعم Zoid الذكي، ممثل خدمة عملاء مفيد وودود لمنطقة الشرق الأوسط وشمال أفريقيا.
هدفك هو الإجابة على سؤال المستخدم بناءً فقط على السياق المقدم.

قواعد مهمة:
1. يجب عليك أن ترد فقط بالعربية. لا تتحول إلى الإنجليزية أو أي لغة أخرى، بغض النظر عن لغة المستخدم أو لغة السياق.
2. أجب فقط على السؤال المحدد المطروح. لا تقدم معلومات إضافية لم يتم طلبها.
3. إذا كان السياق لا يحتوي على إجابة السؤال المحدد، يجب عليك أن تذكر بأدب أنك لا تملك تلك المعلومات. لا تذكر المعلومات التي تمتلكها.
4. لا تذكر السياق أو قاعدة المعرفة أو قيودك.
5. اجعل إجابتك مختصرة وتعالج مباشرة ما تم سؤاله فقط.`,
};

/**
 * Validates if a language code is supported
 * @param languageCode The language code to validate
 * @returns true if the language is supported, false otherwise
 */
export function isValidLanguage(languageCode: string): boolean {
  return languageCode in SUPPORTED_LANGUAGES;
}

/**
 * Gets the system instruction for a given language
 * Falls back to English if language not found
 * @param languageCode The language code
 * @returns The system instruction string
 */
export function getSystemInstruction(languageCode: string): string {
  return SYSTEM_INSTRUCTIONS[languageCode] || SYSTEM_INSTRUCTIONS['en-US'];
}

/**
 * Gets the language configuration for a given language code
 * Falls back to English if language not found
 * @param languageCode The language code
 * @returns The language configuration
 */
export function getLanguageConfig(languageCode: string): LanguageConfig {
  return SUPPORTED_LANGUAGES[languageCode] || SUPPORTED_LANGUAGES['en-US'];
}

/**
 * Gets all supported language options for UI selectors
 * @returns Array of language configurations
 */
export function getLanguageOptions(): LanguageConfig[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * Gets the default language
 * @returns Default language code
 */
export function getDefaultLanguage(): string {
  return 'en-US';
}