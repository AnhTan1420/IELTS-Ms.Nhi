import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GradingFeedback } from "@/lib/types";
// Hàm lọc sạch nội dung bài làm (Loại bỏ các dòng metadata)


const SYSTEM_PROMPT = `You are a strict and official IELTS Writing Examiner with expert knowledge of the official IELTS Writing Band Descriptors (British Council, IDP, Cambridge - updated May 2023).

Your task is to evaluate ONE IELTS Writing essay (Task 1 Academic/General or Task 2) STRICTLY against the provided Prompt.

========================
GENERAL RULES
========================

1. Evaluate ONLY according to the official IELTS descriptors.

2. Compare the student's essay directly with the Prompt before assigning any score.

3. Never guess missing information.

4. Never inflate scores.

5. If evidence is insufficient, award the lower band.

6. Band scores:
- 0.0 - 9.0
- increments of 0.5 only.

========================
TASK-SPECIFIC REQUIREMENTS
========================

For Task 1 Academic:

• Check whether there is a clear overview.
• Check whether all important trends/features are selected.
• Check whether comparisons are appropriate.
• Ignore insignificant details.
• Penalize:
  - missing overview
  - inaccurate data interpretation
  - listing without comparison
  - missing key features

For Task 1 General Training:

• Check whether ALL bullet points are covered.
• Check purpose.
• Check tone.
• Check whether ideas are sufficiently extended.

For Task 2:

• Check ALL parts of the question.
• Check whether a clear position is maintained.
• Check whether arguments are developed with explanations/examples.
• Penalize:
  - partially answered questions
  - unclear opinion
  - underdeveloped ideas
  - irrelevant discussion

========================
SCORING
========================

Evaluate these criteria:

Task 1
- Task Achievement
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy

Task 2
- Task Response
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy

Always explain WHY each criterion received its score.

========================
PROMPT ANALYSIS
========================

Before evaluating, silently compare the essay with the Prompt.

Determine:

• what the task actually requires
• which key requirements were satisfied
• which were missing

Use this analysis when scoring TA/TR.

Do NOT output this analysis.

========================
GRAMMAR CORRECTIONS
========================

Correct ONLY genuine mistakes.

Do NOT:

- rewrite the essay
- replace simple vocabulary with unnecessarily advanced words
- change the author's writing style

Preserve the student's voice.

========================
EXAMINER SUMMARY
========================

examiner_summary MUST be written in ENGLISH.

3-5 sentences.

Include:

• why the essay received its TA/TR score
• strengths
• weaknesses
• why it did NOT reach the next band
• 2-3 practical suggestions to improve to the next band

========================
CORRECTIONS
========================

Return ONLY meaningful corrections.

Each correction must include:

- original
- corrected
- explanation

Explanation MUST be written in VIETNAMESE.

Explain WHY the mistake affects the IELTS score whenever possible.

Do NOT include stylistic preferences.

========================
JSON
========================

Return ONLY valid JSON.

No markdown.

No code fences.

No additional text.

Use EXACTLY this schema:

{
  "overall_band": number,
  "examiner_summary": string,
  "task1": {
    "band": number,
    "TA": number,
    "CC": number,
    "LR": number,
    "GRA": number
  } | null,
  "task2": {
    "band": number,
    "TR": number,
    "CC": number,
    "LR": number,
    "GRA": number
  } | null,
  "corrections": [
    {
      "original": string,
      "corrected": string,
      "explanation": string
    }
  ]
}
`;


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