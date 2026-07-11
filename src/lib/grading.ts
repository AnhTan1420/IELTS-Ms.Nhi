import OpenAI from "openai";
import type { GradingFeedback } from "@/lib/types";

const SYSTEM_PROMPT = `You are an official IELTS Writing examiner. Grade the given essay strictly against
the official IELTS Writing band descriptors (Task Response/Achievement, Coherence and Cohesion,
Lexical Resource, Grammatical Range and Accuracy). Respond ONLY with a JSON object matching this shape:
{
  "band_score": number, // overall band, 0-9, in 0.5 steps
  "mistakes": [{ "original": string, "correction": string, "explanation": string }],
  "notable_vocabulary": [{ "word": string, "context": string, "meaning": string }],
  "criteria_feedback": {
    "task_response": string,
    "coherence_and_cohesion": string,
    "lexical_resource": string,
    "grammatical_range_and_accuracy": string
  },
  "examiner_summary": string
}`;

const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: "https://api.groq.com/openai/v1" 
});

export async function gradeSubmission(content: string, testPrompt: string): Promise<GradingFeedback> {
  try {
    const completion = await groq.chat.completions.create({
      // Đổi sang model mới nhất của Meta trên Groq
      model: "llama-3.3-70b-versatile", 
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Prompt: ${testPrompt}\n\nEssay: ${content}` },
      ],
    });

    // Lấy chuỗi văn bản AI trả về
    let responseText = completion.choices[0]?.message.content || "{}";
    
    // "Tẩy rửa" chuỗi nếu AI lỡ chèn thêm Markdown (rất hay gây lỗi parse)
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Dịch nó thành Object JSON
    return JSON.parse(responseText);

  } catch (error) {
    // In chi tiết lỗi màu đỏ ra Terminal để bạn dễ bắt bệnh
    console.error("🔴 LỖI CHI TIẾT TỪ GROQ:", error);
    throw new Error("Không thể chấm điểm lúc này, vui lòng xem terminal để biết chi tiết lỗi.");
  }
}