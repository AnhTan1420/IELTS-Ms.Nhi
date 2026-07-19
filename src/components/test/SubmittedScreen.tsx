import { CheckCircle2 } from "lucide-react";

// MÀN HÌNH 3: NỘP BÀI THÀNH CÔNG
export default function SubmittedScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Nộp bài thành công!</h1>
        <p className="mb-6 text-slate-500">
          Bạn đã hoàn thành bài thi IELTS Writing một cách an toàn. Hệ thống AI đang chấm bài và giáo viên sẽ xem lại
          kết quả sớm nhất.
        </p>
      </div>
    </main>
  );
}
