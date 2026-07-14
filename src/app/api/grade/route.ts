import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { gradeSubmission } from "@/lib/grading";

export async function POST(request: Request) {
  // 1. Nhận thêm taskType ("task1" hoặc "task2") từ frontend gửi lên
  const { submissionId, content, testPrompt, taskType } = await request.json();

  // 2. Thêm taskType vào danh sách bắt buộc phải có
  if (!submissionId || !content || !testPrompt || !taskType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // (Optional) Kiểm tra xem taskType gửi lên có hợp lệ không
  if (taskType !== "task1" && taskType !== "task2") {
    return NextResponse.json({ error: "Invalid taskType" }, { status: 400 });
  }

  try {
    // 3. Truyền báu vật taskType vào đây để hàm biết đường chọn prompt phù hợp
    const feedback = await gradeSubmission(content, testPrompt, taskType);

    const { error } = await getSupabaseAdmin()
      .from("submissions")
      .update({ feedback, band_score: feedback.overall_band })
      .eq("id", submissionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Grading failed:", error);
    return NextResponse.json({ error: "All AI providers failed" }, { status: 502 });
  }
}
