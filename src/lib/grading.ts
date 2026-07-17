import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import type { GradingFeedback } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Unified prompt builder — một hàm chung cho cả Task 1 & Task 2
// ─────────────────────────────────────────────────────────────

type TaskType = "task1" | "task2";

const TASK_CONFIG = {
  task1: {
    label: "Task 1 (Academic/GT)",
    primaryFocus: "Task Achievement (TA) và Coherence & Cohesion (CC)",
    criterionKey: "TA" as const,
    criterionLabel: "Task Achievement",
    minWords: 150,
    promptAnalysis: `## PHÂN TÍCH ĐỀ (TA Pre-check)
- Xác định đây là Academic Task 1 (report mô tả biểu đồ/bảng/quy trình/bản đồ) hay GT Task 1 (letter — nêu rõ mục đích thư: khiếu nại/xin việc/hỏi thông tin...).
- Nêu ngắn gọn: xu hướng/mục đích chính (bắt buộc có trong overview hoặc phần mở đầu thư).
- Các đặc điểm nổi bật cần so sánh/đề cập, số liệu hoặc yêu cầu (bullet points nếu là GT) không được bỏ sót.`,
    currentBandNote:
      "Overview/đoạn mở có nêu rõ xu hướng chính hoặc mục đích thư không? Các đặc điểm nổi bật đã được chọn lọc & so sánh (không phải chỉ liệt kê số liệu), hoặc với GT: đủ 3 bullet points, đúng tone (formal/informal/semi-formal)?",
  },
  task2: {
    label: "Task 2 (Academic/GT)",
    primaryFocus: "Task Response (TR) và Coherence & Cohesion (CC)",
    criterionKey: "TR" as const,
    criterionLabel: "Task Response",
    minWords: 250,
    promptAnalysis: `## PHÂN TÍCH ĐỀ (TR Pre-check)
Nêu ngắn gọn: chủ đề chính, các phần của câu hỏi cần giải quyết (2 quan điểm/nguyên nhân-giải pháp/đồng ý-không đồng ý...), lập trường cá nhân được yêu cầu.`,
    currentBandNote:
      "Bài đã giải quyết đủ TẤT CẢ các phần câu hỏi chưa? Lập trường có rõ ràng, nhất quán xuyên suốt không? Ý tưởng có được mở rộng bằng ví dụ/giải thích cụ thể hay chỉ khẳng định suông?",
  },
} as const;

function buildSystemPrompt(taskType: TaskType): string {
  const t = TASK_CONFIG[taskType];

  return `Bạn là giám khảo IELTS Writing với 15+ năm kinh nghiệm chấm thi (Cambridge Assessment English). Chấm ${t.label} theo band descriptor chính thức (British Council/IDP, bản 2023). Tập trung vào ${t.primaryFocus}.

QUY TẮC CHÍNH:
1. ${t.currentBandNote}
2. Đếm số từ thực tế của bài. Bài yêu cầu tối thiểu ${t.minWords} từ. Nếu thiếu, PHẢI nêu rõ trong "examiner_summary" và áp dụng mức trừ điểm ${t.criterionLabel}/CC theo band descriptor thật (không bỏ qua lỗi này).

3. RÀ SOÁT LỖI TOÀN DIỆN & SỬA TRIỆT ĐỂ (COMPREHENSIVE ERROR SCAN & FULL CORRECTION):
   - KHÔNG giới hạn số lượng lỗi. Bạn PHẢI đọc bao quát TOÀN BỘ bài viết từng dòng, từng đoạn.
   - Trích xuất và liệt kê TẤT CẢ mọi lỗi sai (dù là nhỏ nhất) vào mảng "corrections" (ngữ pháp, chính tả, dấu câu, thì, hòa hợp chủ-vị, collocation, mạo từ, v.v.). Tuyệt đối không được "lười biếng" chỉ trích xuất vài lỗi đại diện.
   - Trong trường "edited_essay_markdown", hãy trả về TOÀN BỘ bài viết đã được chép lại trọn vẹn từ đầu đến cuối, tích hợp 100% các sửa đổi. Bôi đậm (in đậm) các cụm từ được sửa (ví dụ: **has been done**). Giữ nguyên những đoạn đúng để bảo tồn giọng văn gốc.
   - Chỉ sửa lỗi thật. KHÔNG viết lại câu chỉ vì lý do văn phong nếu câu gốc đã đúng ngữ pháp và tự nhiên.

4. Mọi giải thích trong "corrections" PHẢI bằng TIẾNG VIỆT, nêu rõ TÊN quy tắc ngữ pháp bị vi phạm — cấm câu chung chung như "sửa cho đúng ngữ pháp" mà không giải thích.
   Ví dụ chuẩn:
   - "Lỗi hòa hợp chủ-vị: chủ ngữ số nhiều 'poverty and hunger' cần động từ số nhiều 'remain', không phải 'remains'."
   - "Lỗi thừa định từ (double determiners): không đặt 'our' và 'today's' liền nhau trước danh từ."
5. TUYỆT ĐỐI KHÔNG bịa câu trích dẫn. Mọi câu trong "original" phải là NGUYÊN VĂN xuất hiện trong bài học sinh.
6. Band số nguyên/nửa điểm (1.0–9.0, bước 0.5) cho từng tiêu chí (${t.criterionLabel}/${t.criterionKey}, CC, LR, GRA).
7. Overall Band = trung bình cộng 4 tiêu chí, làm tròn theo quy tắc IELTS thật: phần thập phân .25 → làm tròn lên .5; phần thập phân .75 → làm tròn lên nguyên tiếp theo; .0 và .5 giữ nguyên. (VD: trung bình 6.75 → overall 7.0; trung bình 6.25 → overall 6.5; trung bình 6.5 → giữ 6.5).
8. Chỉ đưa lộ trình lên Band 8.0/9.0 nếu điểm hiện tại đã ≥7.0. Ngược lại chỉ nhắm band kế tiếp (+0.5).
9. Với mỗi mục trong "corrections", gắn đúng 1 giá trị "criterion" thuộc {"CC","GRA","LR","${t.criterionKey}"}.
10. Bảng từ vựng ("vocabulary_suggestions") chỉ liệt kê từ/cụm từ THỰC SỰ xuất hiện trong bài và có vấn đề rõ ràng — không liệt kê tràn lan.
11. Đề xuất 3-5 cấu trúc ngữ pháp/diễn đạt nâng cao ("advanced_structures") phù hợp CHỦ ĐỀ CỤ THỂ của bài luận kèm ví dụ tiếng Anh + giải nghĩa tiếng Việt.
12. TOÀN BỘ phản hồi của bạn CHỈ LÀ MỘT JSON OBJECT DUY NHẤT. KHÔNG CÓ BẤT KỲ TEXT NÀO NGOÀI JSON. KHÔNG DÙNG MARKDOWN CODE FENCE (\`\`\`json).
13. Escape đúng mọi dấu " và ký tự xuống dòng bên trong các giá trị string (dùng \\n).

SCHEMA CHÍNH XÁC (điền đầy đủ mọi trường):

{
  "word_count": number,
  "meets_min_word_count": boolean,
  "overall_band": number,
  "examiner_summary": string,
  "prompt_analysis": string,
  "task1": ${taskType === "task1" ? `{"band": number, "TA": number, "CC": number, "LR": number, "GRA": number}` : "null"},
  "task2": ${taskType === "task2" ? `{"band": number, "TR": number, "CC": number, "LR": number, "GRA": number}` : "null"},
  "band_progression": {
    "current_band": number,
    "why_current": string,
    "why_not_lower": string,
    "why_not_higher": string,
    "roadmap_steps": string[]
  },
  "corrections": [
    {
      "original": string,
      "corrected": string,
      "explanation": string,
      "criterion": "CC" | "GRA" | "LR" | "${t.criterionKey}"
    }
  ],
  "edited_essay_markdown": string,
  "vocabulary_suggestions": [
    { "original_word": string, "better_alternative": string, "reason": string }
  ],
  "advanced_structures": [
    { "structure_name": string, "example_sentence_en": string, "explanation_vi": string }
  ],
  "golden_rule": string
}`;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

class JsonExtractionError extends Error {}

function toHalfBand(x: number): number {
  return Math.round(Math.min(Math.max(x, 1), 9) * 2) / 2;
}

function sanitizeBands(raw: GradingFeedback, taskType: TaskType): GradingFeedback {
  if (taskType === "task1" && !raw.task1 && raw.task2) {
    raw.task1 = raw.task2 as any;
    raw.task2 = null;
  } else if (taskType === "task2" && !raw.task2 && raw.task1) {
    raw.task2 = raw.task1 as any;
    raw.task1 = null;
  }

  if (raw.task1) {
    const taScore = raw.task1.TA ?? (raw.task1 as any).TR ?? 1;
    raw.task1.TA = toHalfBand(taScore);
    raw.task1.CC = toHalfBand(raw.task1.CC ?? 1);
    raw.task1.LR = toHalfBand(raw.task1.LR ?? 1);
    raw.task1.GRA = toHalfBand(raw.task1.GRA ?? 1);

    const mean = (raw.task1.TA + raw.task1.CC + raw.task1.LR + raw.task1.GRA) / 4;
    raw.task1.band = toHalfBand(mean);
  }

  if (raw.task2) {
    const trScore = raw.task2.TR ?? (raw.task2 as any).TA ?? 1;
    raw.task2.TR = toHalfBand(trScore);
    raw.task2.CC = toHalfBand(raw.task2.CC ?? 1);
    raw.task2.LR = toHalfBand(raw.task2.LR ?? 1);
    raw.task2.GRA = toHalfBand(raw.task2.GRA ?? 1);

    const mean = (raw.task2.TR + raw.task2.CC + raw.task2.LR + raw.task2.GRA) / 4;
    raw.task2.band = toHalfBand(mean);
  }

  if (raw.task1 && raw.task2) {
    raw.overall_band = toHalfBand((raw.task1.band + raw.task2.band * 2) / 3);
  } else if (raw.task1) {
    raw.overall_band = raw.task1.band;
  } else if (raw.task2) {
    raw.overall_band = raw.task2.band;
  }

  return raw;
}

function extractJson(raw: string, taskType: TaskType): GradingFeedback {
  let jsonString = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  const start = jsonString.indexOf("{");
  const end = jsonString.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new JsonExtractionError("Không tìm thấy cấu trúc JSON hợp lệ trong phản hồi AI.");
  }

  jsonString = jsonString.slice(start, end + 1);

  try {
    return sanitizeBands(JSON.parse(jsonString) as GradingFeedback, taskType);
  } catch {
    const repaired = jsonString.replace(/[\u0000-\u001F]/g, (ch) => {
      switch (ch) {
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\t": return "\\t";
        default: return ""; 
      }
    });

    try {
      return sanitizeBands(JSON.parse(repaired) as GradingFeedback, taskType);
    } catch (finalErr) {
      throw new JsonExtractionError(
        `AI trả về JSON không hợp lệ và không thể tự sửa: ${(finalErr as Error).message}`,
      );
    }
  }
}

function isFallbackWorthyError(err: any): boolean {
  if (err instanceof JsonExtractionError) return true;

  const status = err?.status ?? err?.response?.status ?? err?.code;
  if (status === 429 || status === 413 || status === 503) return true;
  if (status === "RESOURCE_EXHAUSTED" || status === "UNAVAILABLE") return true;

  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("rate_limit") ||
    msg.includes("quota") ||
    msg.includes("too large") ||
    msg.includes("overloaded") ||
    msg.includes("resource_exhausted") ||
    msg.includes("exceeded your current quota")
  );
}

// ─────────────────────────────────────────────────────────────
// Provider: Groq
// ─────────────────────────────────────────────────────────────

const GROQ_MODEL_CHAIN: Array<{ model: string; maxTokens: number }> = [
  { model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile", maxTokens: 3500 },
  { model: "llama-3.1-8b-instant", maxTokens: 2800 },
];

async function gradeWithGroq(
  content: string,
  testPrompt: string,
  taskType: TaskType,
): Promise<GradingFeedback> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const systemPrompt = buildSystemPrompt(taskType);
  const userContent = `Prompt:\n${testPrompt}\n\nEssay:\n${content}`;

  let lastError: any;

  for (const { model, maxTokens } of GROQ_MODEL_CHAIN) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.1, // Giữ thấp để độ chính xác về JSON và ngữ pháp cao nhất
        max_tokens: maxTokens,
        response_format: { type: "json_object" }, // ÉP GROQ XUẤT JSON KHÔNG KÈM TEXT LUNG TUNG
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      return extractJson(raw, taskType);
    } catch (err: any) {
      lastError = err;
      if (!isFallbackWorthyError(err)) throw err;
      console.warn(
        `⚠️ [groq] model ${model} thất bại (${err?.status ?? (err instanceof JsonExtractionError ? "invalid_json" : "?")}), thử model kế tiếp...`,
      );
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Provider: Gemini
// ─────────────────────────────────────────────────────────────

const GEMINI_MODEL_CHAIN: Array<{ model: string; maxOutputTokens: number }> = [
  { model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash", maxOutputTokens: 4096 },
  { model: "gemini-2.5-flash-lite", maxOutputTokens: 3500 },
];

async function gradeWithGemini(
  content: string,
  testPrompt: string,
  taskType: TaskType,
): Promise<GradingFeedback> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
  const systemPrompt = buildSystemPrompt(taskType);
  const userContent = `Prompt:\n${testPrompt}\n\nEssay:\n${content}`;

  let lastError: any;

  for (const { model, maxOutputTokens } of GEMINI_MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          maxOutputTokens,
          responseMimeType: "application/json", // ÉP GEMINI XUẤT JSON KHÔNG KÈM TEXT LUNG TUNG
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
      if (!isFallbackWorthyError(err)) throw err;
      console.warn(
        `⚠️ [gemini] model ${model} thất bại (${err?.status ?? err?.code ?? (err instanceof JsonExtractionError ? "invalid_json" : "?")}), thử model kế tiếp...`,
      );
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Public API 
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