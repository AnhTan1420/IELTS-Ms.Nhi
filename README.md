## Project Structure
```text
src/
├── app/                            # 🌐 LAYER 1: Routing & Next.js API Routes
│   ├── api/                        # RESTful API Endpoints (Backend-driven)
│   │   ├── grade/
│   │   │   └── route.ts            # API tiếp nhận và kích hoạt pipeline chấm điểm AI
│   │   └── submissions/
│   │       ├── [id]/
│   │       │   ├── submit/route.ts # API xử lý nộp bài từ phía học sinh
│   │       │   ├── warning/route.ts# API ghi nhận log cảnh báo vi phạm/gian lận
│   │       │   └── route.ts        # API CRUD (Chi tiết/Xóa/Cập nhật) một bài nộp cụ thể
│   │       └── route.ts            # API lấy danh sách tổng hợp bài nộp
│   ├── login/
│   │   └── page.tsx                # Giao diện cổng đăng nhập hệ thống
│   ├── teacher/
│   │   └── page.tsx                # Trang đầu não (Dashboard) quản lý của Giáo viên
│   └── test/[id]/
│       └── page.tsx                # Không gian làm bài trực tuyến của Học sinh
│
├── components/                     # 🎨 LAYER 2: Dumb & Smart UI Components
│   ├── auth/                       # Thành phần giao diện liên quan đến xác thực
│   │   ├── AuthStatus.tsx          # Hiển thị trạng thái phiên đăng nhập & phân quyền
│   │   └── LoginForm.tsx           # Form xử lý dữ liệu đăng nhập
│   ├── teacher/                    # Các module UI phục vụ nghiệp vụ của giáo viên
│   │   ├── ExamCreateForm.tsx      # Giao diện tạo đề thi, quản lý file/hình ảnh đính kèm
│   │   ├── FeedbackExport.tsx      # Component xử lý xuất dữ liệu nhận xét/báo cáo
│   │   ├── GradingProgressModal.tsx# Modal theo dõi tiến trình chấm điểm AI (Real-time tracking)
│   │   ├── GradingResultPanel.tsx  # Bảng hiển thị điểm số (Band score) và ký tự sửa lỗi (Diff)
│   │   ├── submission-utils.tsx    # Các helper component phụ trợ hiển thị bài làm
│   │   ├── SubmissionDetail.tsx    # Khung xem chi tiết bài làm (Hỗ trợ chia cột Task 1/Task 2)
│   │   ├── SubmissionList.tsx      # Danh sách bài nộp, tích hợp thanh tác vụ xử lý hàng loạt
│   │   └── TeacherDashboard.tsx    # Layout core tổng điều phối trạng thái Tab của giáo viên
│   └── test/
│       └── StudentTest.tsx         # Toàn bộ giao diện làm bài, khu vực nhập liệu của học sinh
│
├── hooks/                          # 🧠 LAYER 3: Custom Hooks (State & Business Logic)
│   ├── teacher/                    # Đóng gói logic nghiệp vụ quản lý của giáo viên
│   │   ├── useBulkActions.ts       # Quản lý state chọn nhiều file, xóa/tải hàng loạt (Bulk select)
│   │   ├── useSubmissions.ts       # Điều phối luồng nộp dữ liệu chấm điểm và cập nhật comment
│   │   ├── useTeacherAuth.ts       # Bộ lọc/Kiểm tra quyền truy cập trực tiếp tại Client-side
│   │   └── useTests.ts             # Quản lý trạng thái đóng/mở và vòng đời của đề thi
│   ├── useAntiCheat.ts             # Hook giám sát hành vi: chuyển tab, blur màn hình để chống gian lận
│   └── useExamTimer.ts             # Bộ đếm ngược thời gian làm bài, tự động kích hoạt nộp bài khi hết giờ
│
└── lib/                            # 🛠 LAYER 4: Core Engine & Infrastructure
    ├── grading/                    # Hệ thống lõi xử lý AI Grading Pipeline
    │   ├── index.ts                # Entry point tập hợp và xuất bản các hàm chấm điểm
    │   ├── parse.ts                # Vệ sinh chuỗi dữ liệu (Sanitize) và phân tích cú pháp JSON trả về từ LLM
    │   ├── prompt.ts               # Quản lý cấu hình TASK_CONFIG và thiết kế kỹ thuật Prompt (System Prompt)
    │   └── provider.ts             # Lớp trừu tượng (Abstraction) kết nối SDK của Groq / Gemini API
    ├── teacher/
    │   └── exportDoc.ts            # Tiện ích chuyển đổi dữ liệu và xuất file báo cáo (Word/PDF)
    ├── supabase-admin.ts           # Khởi tạo Supabase Client với quyền Service Role (Bypass RLS cho các tác vụ hệ thống)
    ├── supabase.ts                 # Khởi tạo Supabase Client thông thường (Tương tác an toàn dựa trên JWT)
    └── types.ts                    # Tập trung quản lý toàn bộ định nghĩa kiểu dữ liệu (TypeScript Interfaces)
