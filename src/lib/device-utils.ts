// Tiện ích phát hiện khả năng của thiết bị/trình duyệt, chủ yếu phục vụ
// màn hình làm bài thi (StudentTest) và cơ chế chống gian lận (useAntiCheat).
//
// Lý do cần file này: Safari trên iOS (iPhone/iPad) KHÔNG hỗ trợ Fullscreen API
// cho các phần tử thông thường (chỉ hỗ trợ cho <video>). Gọi thẳng
// `document.documentElement.requestFullscreen()` trên các máy này sẽ ném lỗi
// "requestFullscreen is not a function" và làm học sinh không vào được bài thi.

type FullscreenElement = HTMLElement & {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

/** Trả về true nếu trình duyệt hiện tại có bất kỳ API fullscreen nào (kể cả có tiền tố vendor). */
export function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as FullscreenElement;
  return Boolean(
    el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitRequestFullScreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen,
  );
}

/** Trả về phần tử đang fullscreen, có kiểm tra các tiền tố vendor cũ. */
export function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as FullscreenDocument;
  return (
    document.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

/**
 * Yêu cầu fullscreen theo cách an toàn: thử mọi tiền tố vendor, không bao giờ throw.
 * Trả về true nếu yêu cầu thành công (hoặc đã ở trong fullscreen), false nếu thiết bị
 * không hỗ trợ hoặc trình duyệt từ chối (ví dụ do không xuất phát từ user-gesture).
 */
export async function requestFullscreenSafe(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (getFullscreenElement()) return true;

  const el = document.documentElement as FullscreenElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    } else if (el.webkitRequestFullScreen) {
      await el.webkitRequestFullScreen();
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    } else {
      // Thiết bị không hỗ trợ (điển hình: Safari iOS). Không coi là lỗi.
      return false;
    }
    return true;
  } catch (err) {
    // Một số trình duyệt từ chối nếu không phải do user-gesture trực tiếp gây ra,
    // hoặc do người dùng đã chặn fullscreen. Bỏ qua để không chặn luồng làm bài.
    console.warn("Không thể bật fullscreen, tiếp tục ở chế độ thường:", err);
    return false;
  }
}

/** Thoát fullscreen một cách an toàn, hỗ trợ tiền tố vendor, không bao giờ throw. */
export async function exitFullscreenSafe(): Promise<void> {
  if (typeof document === "undefined") return;
  const doc = document as FullscreenDocument;
  try {
    if (!getFullscreenElement()) return;
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }
  } catch {
    // Bỏ qua - không quan trọng bằng việc nộp bài thành công.
  }
}

/** Phát hiện iOS (iPhone/iPad/iPod), kể cả iPad "desktop mode" giả làm Mac. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ báo UA giống macOS nhưng có touch support.
  const isIPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS;
}

/** Phát hiện thiết bị di động nói chung (dùng để điều chỉnh UI/thông báo). */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || isIOS();
}
