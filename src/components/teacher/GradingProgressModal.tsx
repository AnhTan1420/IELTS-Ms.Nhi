"use client";

import { Check, Clock, Loader2 } from "lucide-react";

// Các bước hiển thị trong modal "Đang chấm điểm bài viết" — chỉ mô phỏng tiến trình
// ở phía client (backend không stream tiến độ thật), dừng lại ở bước cuối chờ kết quả thật.
export const GRADING_STEPS = [
  "Phân tích ngữ pháp chuyên sâu",
  "Tối ưu từ vựng theo mục tiêu",
  "Đánh giá tính mạch lạc và chính xác của câu",
  "Chấm điểm overall",
  "Đối chiếu lại với các bài có band điểm tương tự",
];

type GradingProgressModalProps = {
  isGrading: boolean;
  gradingStep: number;
};

// Modal fullscreen overlay hiển thị khi đang gọi API chấm điểm (isGrading = true)
export default function GradingProgressModal({ isGrading, gradingStep }: GradingProgressModalProps) {
  if (!isGrading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-1">Đang chấm điểm bài viết</h3>
        <p className="text-sm text-slate-500 mb-6">AI đang phân tích chi tiết bài viết của bạn</p>

        <div className="space-y-3 text-left mb-6">
          {GRADING_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              {i < gradingStep ? (
                <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : i === gradingStep ? (
                <Loader2 className="h-5 w-5 text-cyan-500 animate-spin shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-slate-300 shrink-0" />
              )}
              <span
                className={`text-sm font-medium ${i < gradingStep ? "text-emerald-600" : i === gradingStep ? "text-slate-800" : "text-slate-400"
                  }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
            style={{ width: `${((gradingStep + 1) / GRADING_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-slate-500">
          {gradingStep + 1}/{GRADING_STEPS.length} bước hoàn thành
        </p>
      </div>
    </div>
  );
}
