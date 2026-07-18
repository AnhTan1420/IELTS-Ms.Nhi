"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/types";
import { GRADING_STEPS } from "@/components/teacher/GradingProgressModal";

// Quản lý danh sách bài nộp: tải + theo dõi realtime, chấm điểm (AI), xóa, lưu nhận xét.
export function useSubmissions(isAuthed: boolean) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingStep, setGradingStep] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);

  const loadSubmissions = async () => {
    try {
      const { data, error: loadError } = await supabase
        .from("submissions")
        .select("*, tests(title, task1_prompt, task2_prompt, image_url, duration_minutes)")
        .order("created_at", { ascending: false });
      if (loadError) return setError(loadError.message);
      setSubmissions((data ?? []) as SubmissionRow[]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isAuthed) return;

    const load = async () => {
      await loadSubmissions();
    };
    void load();

    const channel = supabase
      .channel("teacher-submissions")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => void loadSubmissions())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  // Mô phỏng tiến trình chấm điểm ở phía client (backend không stream tiến độ thật),
  // mỗi bước hiển thị ~3 giây, dừng lại ở bước cuối để chờ kết quả thật từ server.
  useEffect(() => {
    if (!isGrading) {
      setGradingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setGradingStep((prev) => (prev < GRADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, [isGrading]);

  const handleGrade = async (submission: SubmissionRow, forceTaskType?: "task1" | "task2" | "both") => {
    if (!submission.content || !submission.tests) return;

    setIsGrading(true);
    setError(null);

    // Xác định taskType cần chấm: Ưu tiên lựa chọn thủ công, tiếp theo là cột task_type trong DB, mặc định là cả hai ("both")
    const taskType = forceTaskType || (submission as any).task_type || "both";

    // Chuẩn bị payload tùy biến theo loại chấm bài
    let payload: any = {
      submissionId: submission.id,
      content: submission.content,
      taskType,
    };

    if (taskType === "both") {
      payload.task1Prompt = submission.tests.task1_prompt;
      payload.task2Prompt = submission.tests.task2_prompt;
    } else {
      payload.testPrompt = taskType === "task1" ? submission.tests.task1_prompt : submission.tests.task2_prompt;
    }

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chấm bài thất bại.");
      void loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chấm bài thất bại.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleDeleteSubmission = async (submission: SubmissionRow, onDeleted?: (id: string) => void) => {
    if (!window.confirm(`Xóa vĩnh viễn bài làm của học viên "${submission.student_name}"?`)) return;

    setIsDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase.from("submissions").delete().eq("id", submission.id);
    setIsDeleting(false);

    if (deleteError) return setError(deleteError.message);
    onDeleted?.(submission.id);
    void loadSubmissions();
  };

  // Lưu nhận xét bổ sung của giáo viên vào cột teacher_comment
  const handleSaveComment = async (submissionId: string, comment: string) => {
    setIsSavingComment(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("submissions")
      .update({ teacher_comment: comment })
      .eq("id", submissionId);

    setIsSavingComment(false);
    if (updateError) setError(updateError.message);
    else void loadSubmissions();
  };

  return {
    submissions,
    loadSubmissions,
    isGrading,
    gradingStep,
    handleGrade,
    isDeleting,
    handleDeleteSubmission,
    isSavingComment,
    handleSaveComment,
    submissionsError: error,
    setSubmissionsError: setError,
  };
}
