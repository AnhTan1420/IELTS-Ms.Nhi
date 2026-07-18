"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Kiểm tra đăng nhập giáo viên + tự động đăng xuất sau 30 phút không hoạt động.
export function useTeacherAuth() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // Chuyển về trang login
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(Boolean(data.user));
      setAuthChecked(true);
    });
  }, []);

  // Logic Auto Sign Out sau 30 phút (1,800,000 ms)
  useEffect(() => {
    if (!isAuthed) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleSignOut();
        alert("Phiên làm việc đã hết hạn sau 30 phút không hoạt động.");
      }, 1000 * 60 * 30); // 30 phút
    };

    // Lắng nghe các hành động của người dùng
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    // Khởi tạo bộ đếm lần đầu
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  return { authChecked, isAuthed, handleSignOut };
}
