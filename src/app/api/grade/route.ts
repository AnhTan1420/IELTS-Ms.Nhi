import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { gradeSubmission } from "@/lib/grading";

// Tăng giới hạn thời gian chạy trên Vercel lên 60 giây để tránh 502
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Nhận tham số
  const { submissionId, content, testPrompt, taskType, task1Prompt, task2Prompt } = await request.json();

  // 2. Validate cơ bản
  if (!submissionId || !content || !taskType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (taskType !== "task1" && taskType !== "task2" && taskType !== "both") {
    return NextResponse.json({ error: "Invalid taskType" }, { status: 400 });
  }

  try {
    let feedback: any;

    if (taskType === "both") {
      if (!task1Prompt || !task2Prompt) {
        return NextResponse.json({ error: "Missing task prompts for both tasks" }, { status: 400 });
      }

      // Gọi song song 2 task để tối ưu thời gian
      const [feedback1, feedback2] = await Promise.all([
        gradeSubmission(content, task1Prompt, "task1"),
        gradeSubmission(content, task2Prompt, "task2")
      ]);

      const fb1 = feedback1 as any;
      const fb2 = feedback2 as any;

      const band1 = Number(fb1.task1?.band || fb1.overall_band || fb1.band || 0);
      const band2 = Number(fb2.task2?.band || fb2.overall_band || fb2.band || 0);

      const avgBand = (band1 + band2) / 2;
      const overallBand = Math.round(avgBand * 2) / 2;

      feedback = {
        overall_band: overallBand,
        examiner_summary: `### Task 1 Evaluation:\n${fb1.examiner_summary || "Không có nhận xét."}\n\n### Task 2 Evaluation:\n${fb2.examiner_summary || "Không có nhận xét."}`,
        task1: fb1.task1 || { band: band1, TA: fb1.TA, CC: fb1.CC, LR: fb1.LR, GRA: fb1.GRA },
        task2: fb2.task2 || { band: band2, TR: fb2.TR, CC: fb2.CC, LR: fb2.LR, GRA: fb2.GRA },
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

    // 3. Cập nhật vào Supabase
    const { error } = await getSupabaseAdmin()
      .from("submissions")
      .update({ feedback, band_score: feedback.overall_band })
      .eq("id", submissionId);

    if (error) {
      console.error("❌ Supabase update failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(feedback);

  } catch (error) {
    // 1. Log chi tiết lỗi vào Vercel (dùng để kiểm tra trên Vercel Dashboard)
    console.error("❌ GRADING FAILED:", error);
    
    // 2. Trả về thông tin chi tiết cho Frontend (để F12 Console hiển thị)
    const technicalDetail = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({ 
        error: "Hệ thống AI đang quá tải hoặc hết lượt dùng. Vui lòng thử lại sau ít phút hoặc liên hệ Anh Tân.",
        detail: technicalDetail // Dòng này giúp bạn debug ở F12
    }, { status: 503 });
  }
}
