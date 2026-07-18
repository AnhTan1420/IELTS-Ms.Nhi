"use client";

import { AlertTriangle, BookOpen, Bot, Image as ImageIcon, Sparkles, Type } from "lucide-react";
import type { GradingFeedback } from "@/lib/types";
import { countMatchedCorrections, countWords } from "./submission-utils";

type GradingResultPanelProps = {
  feedback: GradingFeedback;
  task1Answer?: string;
  task2Answer?: string;
};

// Card "Đánh giá từ AI Examiner": band tổng, thống kê từ/lỗi theo Task, nhận xét,
// bảng điểm chi tiết Task 1/Task 2, và danh sách lỗi sai + đề xuất sửa (corrections diff).
export default function GradingResultPanel({ feedback, task1Answer, task2Answer }: GradingResultPanelProps) {
  return (
    <div className="mt-8 rounded-3xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50/80 to-white overflow-hidden shadow-sm">
      <div className="p-6 border-b border-cyan-100 bg-white/50 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-100 p-2.5 rounded-2xl">
            <Sparkles className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Đánh giá từ AI Examiner</h3>
            <p className="text-xs font-medium text-cyan-700">Tự động phân tích theo tiêu chuẩn IELTS</p>
          </div>
        </div>
        <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl flex items-center gap-2 shadow-md">
          <span className="text-sm font-medium text-slate-300">Overall</span>
          <span className="text-2xl font-black text-cyan-400">{feedback.overall_band}</span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Thống kê từ & lỗi — tách riêng theo từng Task */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Task 1", text: task1Answer, icon: <ImageIcon className="h-3.5 w-3.5" /> },
            { label: "Task 2", text: task2Answer, icon: <BookOpen className="h-3.5 w-3.5" /> },
          ].map((task) => {
            const errorCount = countMatchedCorrections(task.text, feedback.corrections ?? []);
            return (
              <div key={task.label} className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  {task.icon} {task.label}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1.5 rounded-lg shrink-0"><Type className="h-3.5 w-3.5 text-slate-500" /></div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Số từ</p>
                      <p className="text-base font-black text-slate-900">
                        {countWords(task.text)} <span className="text-[10px] font-medium text-slate-400">từ</span>
                      </p>
                    </div>
                  </div>
                  {(feedback.corrections?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 p-1.5 rounded-lg shrink-0"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /></div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Số lỗi</p>
                        <p className="text-base font-black text-slate-900">
                          {errorCount} <span className="text-[10px] font-medium text-slate-400">lỗi</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-cyan-100/50 shadow-sm relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 rounded-l-2xl"></div>
          <p className="text-[15px] leading-relaxed text-slate-700 italic whitespace-pre-line">
            {feedback.examiner_summary}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Task 1 Card */}
          {feedback.task1 && (
            <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden hover:border-cyan-300 transition-colors">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-400" /> Task 1
                </span>
                {/* Giữ nguyên Band điểm lẻ */}
                <span className="rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold px-3 py-1">
                  Band {feedback.task1.band}
                </span>
              </div>
              <div className="p-5">
                <dl className="space-y-3 text-sm">
                  {[
                    { label: "Task Achievement", score: feedback.task1.TA },
                    { label: "Coherence & Cohesion", score: feedback.task1.CC },
                    { label: "Lexical Resource", score: feedback.task1.LR },
                    { label: "Grammar", score: feedback.task1.GRA },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                      <dt className="text-slate-500 font-medium">{item.label}</dt>
                      {/* Ép kiểu về số nguyên ở đây 👇 */}
                      <dd className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded text-xs">
                        {item.score !== undefined && item.score !== null && !isNaN(Number(item.score))
                          ? Math.round(Number(item.score))
                          : item.score}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Task 2 Card */}
          {feedback.task2 && (
            <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden hover:border-cyan-300 transition-colors">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-400" /> Task 2
                </span>
                {/* Giữ nguyên Band điểm lẻ */}
                <span className="rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold px-3 py-1">
                  Band {feedback.task2.band}
                </span>
              </div>
              <div className="p-5">
                <dl className="space-y-3 text-sm">
                  {[
                    { label: "Task Response", score: feedback.task2.TR },
                    { label: "Coherence & Cohesion", score: feedback.task2.CC },
                    { label: "Lexical Resource", score: feedback.task2.LR },
                    { label: "Grammar", score: feedback.task2.GRA },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                      <dt className="text-slate-500 font-medium">{item.label}</dt>
                      {/* Ép kiểu về số nguyên ở đây 👇 */}
                      <dd className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded text-xs">
                        {item.score !== undefined && item.score !== null && !isNaN(Number(item.score))
                          ? Math.round(Number(item.score))
                          : item.score}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Corrections Diff */}
        {feedback.corrections && feedback.corrections.length > 0 && (
          <div className="pt-4">
            <h4 className="font-black text-slate-900 mb-4 text-lg flex items-center gap-2">
              Lỗi sai & Đề xuất sửa
            </h4>
            <div className="space-y-4">
              {feedback.corrections.map((correction: any, index: number) => (
                <div key={index} className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-red-50/50 border border-red-100 p-3">
                      <span className="block text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Bản gốc</span>
                      <p className="text-[14px] text-red-700 line-through decoration-red-300/50">
                        {correction.original}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3">
                      <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Đề xuất sửa</span>
                      <p className="text-[14px] text-emerald-800 font-medium">
                        {correction.corrected}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                    <Bot className="h-5 w-5 shrink-0 text-cyan-600 mt-0.5" />
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {correction.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
