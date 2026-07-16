import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, reason } = (await request.json()) as {
    content?: string;
    reason?: "manual" | "timeout";
  };

  if (typeof content !== "string") {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: submission, error: fetchError } = await supabaseAdmin
    .from("submissions")
    .select("status, test_id")
    .eq("id", id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "in_progress") {
    return NextResponse.json({ ok: true, status: submission.status, alreadyFinished: true });
  }

  const { error: updateError } = await supabaseAdmin
    .from("submissions")
    .update({
      content,
      status: "completed",
      end_reason: reason ?? "manual",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ⚠️ KHÔNG AUTO-GRADE Ở ĐÂY: bài làm chỉ được đánh dấu "completed" (đã nộp).
  // Điểm số (band_score) và feedback CHỈ được tạo khi giáo viên chủ động bấm nút
  // chấm điểm trên TeacherDashboard (gọi tới /api/grade). Route này TUYỆT ĐỐI
  // không được gọi gradeSubmission()/update feedback — nếu cần khôi phục auto-grade
  // trong tương lai, hãy trao đổi rõ với giáo viên trước vì đây là điểm chặn có chủ đích.

  return NextResponse.json({ ok: true, status: "completed" });
}
