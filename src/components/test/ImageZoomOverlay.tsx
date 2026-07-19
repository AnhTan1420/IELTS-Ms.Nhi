import { X } from "lucide-react";

type Props = { imageUrl: string; onClose: () => void };

// Ảnh biểu đồ Task 1 phóng to — đóng bằng nút X, click ra ngoài, hoặc phím Esc
// (phím Esc được xử lý ở component cha vì cần gắn/gỡ listener theo state isImageZoomed).
export default function ImageZoomOverlay({ imageUrl, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Đóng"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Biểu đồ Task 1 (phóng to)"
        className="max-h-[88vh] max-w-[92vw] w-auto rounded-2xl border border-white/10 bg-white object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
