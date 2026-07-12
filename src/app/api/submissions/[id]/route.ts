import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Periodic autosave while the student is typing. This is what lets the teacher
// dashboard show the essay "live" before it's submitted.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content, end_reason, status } = (await request.json()) as {
    content?: string;
    end_reason?: string;
    status?: string;
  };

  const hasContent = typeof content === "string";

  if (!hasContent && !end_reason && !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: submission, error: fetchError } = await supabaseAdmin
    .from("submissions")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "in_progress" && !status) {
    // Test already finished — silently ignore late autosave pings.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const updateData: { content?: string; end_reason?: string; status?: string; submitted_at?: string } =
    {};

  if (hasContent) {
    updateData.content = content;
  }
  if (end_reason) {
    updateData.end_reason = end_reason;
  }
  if (status) {
    updateData.status = status;
    // Set submitted_at when status changes to disqualified or submitted
    if (status === "disqualified" || status === "submitted") {
      updateData.submitted_at = new Date().toISOString();
    }
  }

  const { error } = await supabaseAdmin.from("submissions").update(updateData).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
