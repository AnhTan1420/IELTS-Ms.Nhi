"use client";

import { useEffect, useState } from "react";
import { Check, Edit3, GraduationCap, Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { useClasses } from "@/hooks/teacher/useClasses";

type ClassManagementProps = {
  onError: (message: string) => void;
  // Số đề thi đang gắn với mỗi lớp — truyền từ TeacherDashboard (đã có sẵn danh
  // sách tests) để hiện "3 đề thi" cạnh mỗi lớp mà không cần query riêng ở đây.
  testCountByClass: Record<string, number>;
};

// Tab "Quản lý lớp học" — CRUD danh sách lớp, dùng làm nguồn cho field chọn lớp
// ở ExamCreateForm và thanh tab lọc theo lớp ở "Theo dõi & Chấm bài".
export default function ClassManagement({ onError, testCountByClass }: ClassManagementProps) {
  const { classes, loadClasses, handleCreateClass, handleRenameClass, handleDeleteClass } = useClasses(onError);

  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    void loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsCreating(true);
    const ok = await handleCreateClass(newClassName);
    setIsCreating(false);
    if (ok) setNewClassName("");
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const submitRename = async (id: string) => {
    setIsSavingEdit(true);
    const ok = await handleRenameClass(id, editingName);
    setIsSavingEdit(false);
    if (ok) setEditingId(null);
  };

  return (
    <section className="grid gap-6 items-start lg:grid-cols-[1fr_400px]">
      <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200/60">
        <div className="border-b border-slate-100 pb-5 mb-5">
          <h2 className="text-xl font-bold text-slate-900">Danh sách Lớp học</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Các lớp bạn đã tạo — dùng để gắn đề thi và lọc bài làm theo lớp.</p>
        </div>

        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <GraduationCap className="h-8 w-8 mb-2 text-slate-300" />
            <p className="text-sm font-medium">Chưa có lớp học nào. Tạo lớp đầu tiên ở form bên cạnh.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between gap-3 p-4 border border-slate-200 rounded-2xl bg-white hover:border-cyan-300 hover:shadow-md transition-all"
              >
                {editingId === cls.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void submitRename(cls.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                    />
                    <button
                      onClick={() => void submitRename(cls.id)}
                      disabled={isSavingEdit}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                      title="Lưu"
                    >
                      {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition" title="Hủy">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 bg-cyan-50 text-cyan-600 rounded-full p-2">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{cls.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{testCountByClass[cls.id] ?? 0} đề thi</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                      <button onClick={() => startEditing(cls.id, cls.name)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-white rounded-md transition" title="Đổi tên lớp">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => void handleDeleteClass(cls.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition" title="Xóa lớp">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200/60 lg:sticky lg:top-24">
        <div className="border-b border-slate-100 pb-5 mb-6">
          <h2 className="text-xl font-bold text-slate-900">Tạo Lớp học Mới</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Đặt tên lớp, ví dụ: "IELTS 7.0 - Tối 3-5" hoặc "Lớp cô Nhi K15".</p>
        </div>

        <form onSubmit={submitCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tên lớp học</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-sm"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="VD: IELTS Writing - Lớp sáng"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-slate-900 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo lớp học
          </button>
        </form>
      </div>
    </section>
  );
}
