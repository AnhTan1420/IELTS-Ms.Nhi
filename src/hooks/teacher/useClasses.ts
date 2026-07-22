"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ClassRow } from "@/lib/types";

// Quản lý danh sách lớp học: tải, tạo, đổi tên, xóa. Dùng chung bởi tab
// "Quản lý lớp học" (CRUD đầy đủ) và ExamCreateForm (chỉ cần đọc để chọn lớp).
export function useClasses(onError?: (message: string) => void) {
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const loadClasses = async () => {
    try {
      const { data, error: loadError } = await supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });
      if (loadError) onError?.(loadError.message);
      else setClasses((data ?? []) as ClassRow[]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateClass = async (name: string) => {
    if (!name.trim()) return false;
    const { error: insertError } = await supabase.from("classes").insert([{ name: name.trim() }]);
    if (insertError) {
      onError?.(insertError.message);
      return false;
    }
    await loadClasses();
    return true;
  };

  const handleRenameClass = async (id: string, name: string) => {
    if (!name.trim()) return false;
    const { error: updateError } = await supabase.from("classes").update({ name: name.trim() }).eq("id", id);
    if (updateError) {
      onError?.(updateError.message);
      return false;
    }
    await loadClasses();
    return true;
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("Xóa lớp học này? Các đề thi đang gắn lớp này sẽ chuyển về trạng thái \"Chưa phân lớp\".")) return;

    const { error: deleteError } = await supabase.from("classes").delete().eq("id", id);
    if (deleteError) onError?.(deleteError.message);
    else void loadClasses();
  };

  return { classes, loadClasses, handleCreateClass, handleRenameClass, handleDeleteClass };
}
