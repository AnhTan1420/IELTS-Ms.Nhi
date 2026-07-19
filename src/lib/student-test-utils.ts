// Tách khỏi StudentTest.tsx: hằng số + hàm thuần dùng chung giữa các màn hình bài thi.
import type { RefObject } from "react";

export const AUTOSAVE_INTERVAL_MS = 5000;

// Số từ tối thiểu theo band descriptor thật của IELTS Writing — khớp với
// TASK_CONFIG.task1/task2.minWords bên `src/lib/grading/prompt.ts` để thanh
// tiến độ hiển thị cho học sinh và mức phạt AI chấm ở phía sau dùng chung một
// "sự thật" duy nhất, không lệch số với nhau.
export const TASK1_MIN_WORDS = 150;
export const TASK2_MIN_WORDS = 250;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export function scrollToRef(ref: RefObject<HTMLElement | null>) {
  ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
}
