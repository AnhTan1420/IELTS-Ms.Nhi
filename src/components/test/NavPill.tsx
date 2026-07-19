import { CheckCircle2 } from "lucide-react";

// Pill điều hướng nhanh trong thanh sub-nav dính đầu trang — tích xanh khi
// học sinh đã bắt đầu gõ bài, giúp định vị "mình đang ở đâu" trong bài thi.
export default function NavPill({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
        done
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
      }`}
    >
      {done && <CheckCircle2 className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
