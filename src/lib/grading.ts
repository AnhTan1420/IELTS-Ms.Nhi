import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GradingFeedback } from "@/lib/types";

const SYSTEM_PROMPT = `You are a strict and official IELTS Writing examiner.
Your primary objective is to evaluate the essay STRICTLY against the provided "Prompt" (the actual test questions for Task 1 and/or Task 2). 

CRITICAL INSTRUCTIONS:
1. Compare the student's essay directly with the Prompt. Did they answer the specific question asked? Did they cover all bullet points? 
2. In your "examiner_summary", you MUST explicitly analyze their Task Achievement (Task 1) and Task Response (Task 2). Point out if they went off-topic, missed key features of the graph, or failed to present a clear position.
3. Provide specific suggestions for improving their score based on the prompt's context.

Respond ONLY with a JSON object, no markdown fences, no preamble, matching EXACTLY this shape:
{
  "overall_band": number,          // overall band, 0-9, in 0.5 steps
  "examiner_summary": string,      // 3-5 sentences. MUST include analysis of how well they answered the specific prompt, plus general feedback.
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
  "corrections": [                 // notable grammar/vocabulary/logic mistakes
    {
      "original": string,          // the exact original sentence/phrase
      "corrected": string,         // the corrected version
      "explanation": string        // explanation of the error and fix (in Vietnamese). If the error is going off-topic, explain why based on the prompt.
    }
  ]
}`;

async function gradeWithGroq(content: string, testPrompt: string): Promise<GradingFeedback> {
  // Khởi tạo Groq client
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }, // Ép Groq trả về JSON chuẩn
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Prompt: ${testPrompt}\n\nEssay: ${content}` },
    ],
  });
  
  return JSON.parse(completion.choices[0]?.message?.content || "{}");
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
 * Grades an essay, trying Groq first and falling back to Gemini.
 * Throws if both providers fail.
 */
export async function gradeSubmission(content: string, testPrompt: string): Promise<GradingFeedback> {
  try {
    return await gradeWithGroq(content, testPrompt);
  } catch (groqError) {
    console.warn("Groq grading failed, falling back to Gemini:", groqError);
    return await gradeWithGemini(content, testPrompt);
  }
}