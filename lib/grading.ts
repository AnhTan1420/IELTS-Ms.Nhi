import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GradingFeedback } from "@/lib/types";

const SYSTEM_PROMPT = `You are an official IELTS Writing examiner. Grade the given essay strictly against
the official IELTS Writing band descriptors. The essay may contain a Task 1 section, a Task 2 section, or both —
grade only the task(s) that are actually present and set the other task field to null.

Respond ONLY with a JSON object, no markdown fences, no preamble, matching EXACTLY this shape:
{
  "overall_band": number,          // overall band, 0-9, in 0.5 steps
  "examiner_summary": string,      // 2-4 sentence overall examiner comment
  "task1": {                       // null if there is no Task 1 content
    "band": number,
    "TA": number,                  // Task Achievement
    "CC": number,                  // Coherence and Cohesion
    "LR": number,                  // Lexical Resource
    "GRA": number                  // Grammatical Range and Accuracy
  } | null,
  "task2": {                       // null if there is no Task 2 content
    "band": number,
    "TR": number,                  // Task Response
    "CC": number,                  // Coherence and Cohesion
    "LR": number,                  // Lexical Resource
    "GRA": number                  // Grammatical Range and Accuracy
  } | null,
  "corrections": [                 // notable grammar/vocabulary mistakes found in the essay
    {
      "original": string,          // the exact original sentence/phrase, quoted from the essay
      "corrected": string,         // the corrected version
      "explanation": string        // brief explanation of the error and fix, in Vietnamese
    }
  ]
}`;

async function gradeWithOpenAI(content: string, testPrompt: string): Promise<GradingFeedback> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Prompt: ${testPrompt}\n\nEssay: ${content}` },
    ],
  });
  return JSON.parse(completion.choices[0]?.message.content || "{}");
}

async function gradeWithGemini(content: string, testPrompt: string): Promise<GradingFeedback> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(`Prompt: ${testPrompt}\n\nEssay: ${content}`);
  return JSON.parse(result.response.text());
}

/**
 * Grades an essay, trying OpenAI first and falling back to Gemini.
 * Throws if both providers fail.
 */
export async function gradeSubmission(content: string, testPrompt: string): Promise<GradingFeedback> {
  try {
    return await gradeWithOpenAI(content, testPrompt);
  } catch (openAiError) {
    console.warn("OpenAI grading failed, falling back to Gemini:", openAiError);
    return await gradeWithGemini(content, testPrompt);
  }
}
