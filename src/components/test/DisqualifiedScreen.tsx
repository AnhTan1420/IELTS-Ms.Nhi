import { ShieldAlert } from "lucide-react";

type Props = { warnings: number; maxWarnings: number };

// MÀN HÌNH 2: BỊ HỦY BÀI THI (GIAN LẬN)
export default function DisqualifiedScreen({ warnings, maxWarnings }: Props) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
      <ShieldAlert className="mb-4 h-20 w-20 text-red-500" />
      <h1 className="mb-2 text-3xl font-bold text-red-500">BÀI THI BỊ HỦY</h1>
      <p className="max-w-md text-slate-400">
        Bạn đã vi phạm quy chế thi (thoát toàn màn hình hoặc chuyển tab) {warnings} lần.
        {warnings >= maxWarnings && ` Giới hạn tối đa là ${maxWarnings} lần.`}
        Bài làm của bạn đã bị khóa và đánh dấu gian lận.
      </p>
    </main>
  );
}
