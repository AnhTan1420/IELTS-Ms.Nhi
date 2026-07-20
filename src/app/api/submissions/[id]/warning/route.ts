import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_WARNINGS = 5;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reason } = (await request.json()) as { reason?: string };

  if (!reason) {
    return NextResponse.json({ error: "Missing reason" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Toàn bộ logic (đọc trạng thái, tăng warning_count, cập nhật status,
  // ghi bản ghi warnings) giờ chạy atomic trong 1 hàm SQL — xem
  // increment_submission_warning() trong optimize_schema.sql. Postgres tự
  // khóa row bằng "for update" nên 2 request bắn gần như cùng lúc không còn
  // giẫm lên nhau (lost update) như bản SELECT-rồi-UPDATE cũ nữa.
  const { data, error } = await supabaseAdmin
    .rpc("increment_submission_warning", {
      p_submission_id: id,
      p_reason: reason,
      p_max_warnings: MAX_WARNINGS,
    })
    .single();

  if (error) {
    // Hàm SQL raise exception khi không tìm thấy submission -> Postgres trả
    // lỗi về đây, message thường có dạng "Submission <uuid> not found".
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    console.error("Failed to increment warning:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as {
    warning_count: number;
    status: string;
    disqualified: boolean;
    already_finished: boolean;
  };

  console.log(
    `[AntiCheat] Submission ${id}: warning_count=${result.warning_count}, status=${result.status}` +
      (result.already_finished ? " (already finished, không tăng thêm)" : "")
  );

  return NextResponse.json({
    warningCount: result.warning_count,
    status: result.status,
    maxWarnings: MAX_WARNINGS,
  });
}