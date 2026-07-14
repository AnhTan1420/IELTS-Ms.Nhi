import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { gradeSubmission } from "@/lib/grading";

export async function POST(request: Request) {
  // 1. Nhận các tham số từ frontend gửi lên
  const { submissionId, content, testPrompt, taskType, task1Prompt, task2Prompt } = await request.json();

  // 2. Kiểm tra các tham số bắt buộc tối thiểu
  if (!submissionId || !content || !taskType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Kiểm tra tính hợp lệ của taskType
  if (taskType !== "task1" && taskType !== "task2" && taskType !== "both") {
    return NextResponse.json({ error: "Invalid taskType" }, { status: 400 });
  }

  try {
    let feedback: any;

    if (taskType === "both") {
      // Yêu cầu phải có đủ cả 2 đề bài để thực hiện chấm đồng thời
      if (!task1Prompt || !task2Prompt) {
        return NextResponse.json({ error: "Missing task prompts for both tasks" }, { status: 400 });
      }

      // Chấm song song cả 2 task để tối ưu hiệu năng và tốc độ phản hồi
      const [feedback1, feedback2] = await Promise.all([
        gradeSubmission(content, task1Prompt, "task1"),
        gradeSubmission(content, task2Prompt, "task2")
      ]);

      // Ép kiểu sang any để bỏ qua kiểm tra nghiêm ngặt của TypeScript khi bóc tách dữ liệu động
      const fb1 = feedback1 as any;
      const fb2 = feedback2 as any;

      // Trích xuất điểm band của từng task từ các biến đã cast 'any'
      const band1 = Number(fb1.task1?.band || fb1.overall_band || fb1.band || 0);
      const band2 = Number(fb2.task2?.band || fb2.overall_band || fb2.band || 0);

      // Tính điểm trung bình cộng và làm tròn theo chuẩn IELTS (.25 -> .5 | .75 -> số nguyên tiếp theo)
      const avgBand = (band1 + band2) / 2;
      const overallBand = Math.round(avgBand * 2) / 2;

      // Hợp nhất dữ liệu feedback của 2 task thành 1 đối tượng duy nhất để hiển thị
      feedback = {
        overall_band: overallBand,
        examiner_summary: `### Task 1 Evaluation:\n${fb1.examiner_summary || "Không có nhận xét."}\n\n### Task 2 Evaluation:\n${fb2.examiner_summary || "Không có nhận xét."}`,
        task1: fb1.task1 || {
          band: band1,
          TA: fb1.task1?.TA ?? fb1.TA,
          CC: fb1.task1?.CC ?? fb1.CC,
          LR: fb1.task1?.LR ?? fb1.LR,
          GRA: fb1.task1?.GRA ?? fb1.GRA,
        },
        task2: fb2.task2 || {
          band: band2,
          TR: fb2.task2?.TR ?? fb2.TR,
          CC: fb2.task2?.CC ?? fb2.CC,
          LR: fb2.task2?.LR ?? fb2.LR,
          GRA: fb2.task2?.GRA ?? fb2.GRA,
        },
        corrections: [
          ...(fb1.corrections || []),
          ...(fb2.corrections || [])
        ]
      };
    } else {
      if (!testPrompt) {
        return NextResponse.json({ error: "Missing testPrompt" }, { status: 400 });
      }
      feedback = await gradeSubmission(content, testPrompt, taskType);
    }

    // Cập nhật kết quả chấm vào database Supabase
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