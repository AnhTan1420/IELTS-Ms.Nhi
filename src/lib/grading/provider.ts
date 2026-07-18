import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import type { GradingFeedback } from "@/lib/types";
import type { TaskType } from "./prompt";
import { buildSystemPrompt } from "./prompt";
import { buildGradingJsonSchema } from "./schema";
import { extractJson, isFallbackWorthyError } from "./parse";

// ─────────────────────────────────────────────────────────────
// Provider: Groq — thử lần lượt 70b (chất lượng cao) rồi 8b (TPM rộng hơn)
// Groq (OpenAI-compatible) chỉ hỗ trợ response_format:"json_object"
// (ép JSON hợp lệ về cú pháp), KHÔNG hỗ trợ schema chi tiết như Gemini.
// => model yếu (8b) dùng prompt "compact" + maxTokens cao hơn để tránh cắt cụt JSON.
// ─────────────────────────────────────────────────────────────

const GROQ_MODEL_CHAIN: Array<{ model: string; maxTokens: number; compact: boolean }> = [
  { model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile", maxTokens: 3500, compact: false },
  { model: "llama-3.1-8b-instant", maxTokens: 4096, compact: true },
];

async function gradeWithGroq(
  content: string,
  testPrompt: string,
  taskType: TaskType,
): Promise<GradingFeedback> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const userContent = `Prompt:\n${testPrompt}\n\nEssay:\n${content}`;

  let lastError: any;

  for (const { model, maxTokens, compact } of GROQ_MODEL_CHAIN) {
    try {
      const systemPrompt = buildSystemPrompt(taskType, { compact });
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      return extractJson(raw, taskType);
    } catch (err: any) {
      lastError = err;
      if (!isFallbackWorthyError(err)) throw err; // lỗi thật (vd 400) → không che giấu
      console.warn(
        `⚠️ [groq] model ${model} thất bại (${err?.status ?? (err?.name === "JsonExtractionError" ? "invalid_json" : "?")}), thử model kế tiếp...`,
      );
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Provider: Gemini — thử Flash (chất lượng cao) rồi Flash-Lite (TPM/RPD rộng hơn)
// Gemini hỗ trợ responseMimeType + responseSchema => ép cấu trúc JSON THẬT SỰ ở
// tầng API, không chỉ dựa vào lời văn trong prompt.
// ─────────────────────────────────────────────────────────────

const GEMINI_MODEL_CHAIN: Array<{ model: string; maxOutputTokens: number; compact: boolean }> = [
  { model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash", maxOutputTokens: 4096, compact: false },
  { model: "gemini-3.1-flash-lite", maxOutputTokens: 4096, compact: true },
];

async function gradeWithGemini(
  content: string,
  testPrompt: string,
  taskType: TaskType,
): Promise<GradingFeedback> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
  const userContent = `Prompt:\n${testPrompt}\n\nEssay:\n${content}`;
  const jsonSchema = buildGradingJsonSchema(taskType);

  let lastError: any;

  for (const { model, maxOutputTokens, compact } of GEMINI_MODEL_CHAIN) {
    try {
      const systemPrompt = buildSystemPrompt(taskType, { compact });
      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: jsonSchema,
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ] as any,
        },
      });

      return extractJson(response.text || "", taskType);
    } catch (err: any) {
      lastError = err;
      if (!isFallbackWorthyError(err)) throw err; // lỗi thật (vd prompt bị block, input sai) → không che giấu
      console.warn(
        `⚠️ [gemini] model ${model} thất bại (${err?.status ?? err?.code ?? (err?.name === "JsonExtractionError" ? "invalid_json" : "?")}), thử model kế tiếp...`,
      );
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Public API — Gemini (Flash → Flash-Lite) trước,
// rớt xuống Groq (70b → 8b) nếu cả 2 model Gemini đều fail
// ─────────────────────────────────────────────────────────────
export async function gradeSubmission(
  content: string,
  testPrompt: string,
  taskType: TaskType = "task2",
): Promise<GradingFeedback> {
  try {
    return await gradeWithGemini(content, testPrompt, taskType);
  } catch (geminiError) {
    console.warn("⚠️ [grader] Gemini failed. Lỗi chi tiết:", geminiError);

    try {
      return await gradeWithGroq(content, testPrompt, taskType);
    } catch (groqError) {
      console.error("❌ [grader] Groq also failed. Lỗi chi tiết:", groqError);

      const geminiMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      const groqMsg = groqError instanceof Error ? groqError.message : String(groqError);

      throw new Error(`All AI providers failed! \nChi tiết lỗi Gemini: ${geminiMsg} \nChi tiết lỗi Groq: ${groqMsg}`);
    }
  }
}