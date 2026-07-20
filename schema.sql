-- ============================================================================
-- MIGRATION: Tối ưu index + gộp query thành RPC cho project ieltsmsnhinguyen
-- Idempotent — chạy lại nhiều lần trong Supabase SQL Editor không lỗi.
-- Dựa trên: schema hiện tại (user cung cấp) + cách src/ đang gọi supabase.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) INDEX CHO CÁC CỘT FOREIGN KEY / FILTER / ORDER BY
--
-- Postgres CHỈ tự tạo index cho PRIMARY KEY, không tự tạo cho cột FK.
-- Nhìn vào code:
--   - useSubmissions.ts  : .select("*, tests(...)").order("created_at", desc)
--       -> chạy trên TOÀN BỘ bảng submissions, mỗi lần có realtime event
--          (INSERT/UPDATE/DELETE bất kỳ) là load lại full bảng.
--   - useTests.ts        : .order("created_at", desc) trên bảng tests
--   - mọi route submissions/[id]/*  : .eq("id", id) — đã có PK index sẵn, ok.
--   - submissions_test_id_fkey, submissions_user_id_fkey, student_id_fkey,
--     class_id_fkey, tests_class_id_fkey, tests_created_by_fkey, warnings_*
--     -> chưa có cột nào trong số này được index.
--
-- Khi bảng submissions lớn dần (vài nghìn bài trở lên), thiếu index này sẽ
-- khiến mọi lần load dashboard giáo viên chậm dần + JOIN với tests chậm.
-- ----------------------------------------------------------------------------

create index if not exists idx_tests_created_by     on public.tests (created_by);
create index if not exists idx_tests_class_id       on public.tests (class_id);
create index if not exists idx_tests_created_at     on public.tests (created_at desc);

create index if not exists idx_submissions_test_id    on public.submissions (test_id);
create index if not exists idx_submissions_user_id    on public.submissions (user_id);
create index if not exists idx_submissions_student_id on public.submissions (student_id);
create index if not exists idx_submissions_class_id   on public.submissions (class_id);
create index if not exists idx_submissions_status     on public.submissions (status);
create index if not exists idx_submissions_created_at on public.submissions (created_at desc);
-- composite: hữu ích ngay khi bạn thêm lọc "theo lớp, mới nhất trước" ở UI
create index if not exists idx_submissions_class_created
  on public.submissions (class_id, created_at desc);

create index if not exists idx_warnings_submission_id on public.warnings (submission_id);
create index if not exists idx_warnings_user_id       on public.warnings (user_id);

create index if not exists idx_classes_created_by on public.classes (created_by);


-- ----------------------------------------------------------------------------
-- 2) RPC: TĂNG warning_count MỘT CÁCH ATOMIC
--
-- File src/app/api/submissions/[id]/warning/route.ts hiện làm 2 bước tách
-- rời: SELECT warning_count -> tính nextCount ở Node -> UPDATE. Nếu anti-cheat
-- bắn 2 warning gần như cùng lúc (rất dễ xảy ra), cả 2 request đọc cùng
-- warning_count cũ -> một lần tăng bị "mất" (lost update), học sinh có thể
-- vượt quá MAX_WARNINGS mà không bị disqualify đúng lúc. Comment trong code
-- cũng đã tự nhận ra rủi ro này ("nếu warnings tới rất nhanh, ta trust local
-- count").
--
-- Gộp toàn bộ SELECT -> tính -> UPDATE -> INSERT warnings vào 1 hàm SQL chạy
-- trong 1 transaction, dùng "for update" để khoá row -> loại bỏ race
-- condition hoàn toàn, đồng thời giảm từ 2-3 round-trip xuống còn 1 lần gọi
-- duy nhất từ code (supabase.rpc(...)).
-- ----------------------------------------------------------------------------

create or replace function public.increment_submission_warning(
  p_submission_id uuid,
  p_reason text,
  p_max_warnings integer default 5
)
returns table (
  warning_count integer,
  status text,
  disqualified boolean,
  already_finished boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_count  integer;
begin
  select s.status, s.warning_count into v_status, v_count
  from submissions s
  where s.id = p_submission_id
  for update; -- khoá row này cho tới hết transaction, request thứ 2 phải đợi

  if not found then
    raise exception 'Submission % not found', p_submission_id;
  end if;

  -- Bài đã completed/disqualified rồi thì không tăng nữa, trả trạng thái hiện tại
  if v_status <> 'in_progress' then
    return query select v_count, v_status, (v_status = 'disqualified'), true;
    return;
  end if;

  v_count := v_count + 1;
  v_status := case when v_count >= p_max_warnings then 'disqualified' else 'in_progress' end;

  update submissions set
    warning_count = v_count,
    status        = v_status,
    end_reason    = case when v_status = 'disqualified' then 'disqualified' else end_reason end,
    submitted_at  = case when v_status = 'disqualified' then now() else submitted_at end
  where id = p_submission_id;

  insert into warnings (submission_id, reason, warning_number)
  values (p_submission_id, p_reason, v_count);

  return query select v_count, v_status, (v_status = 'disqualified'), false;
end;
$$;

-- Cho phép gọi hàm này qua service-role key (route đang dùng supabaseAdmin) và
-- qua anon/authenticated nếu sau này bạn muốn gọi thẳng từ client:
grant execute on function public.increment_submission_warning(uuid, text, integer) to anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3) SỬA LẠI CHECK CONSTRAINT warning_count CHO KHỚP THỰC TẾ
--
-- schema.sql trong repo đang ghi "check (warning_count between 0 and 3)",
-- nhưng DB thật của bạn (bản user gửi) là "between 0 and 5", và code
-- (MAX_WARNINGS = 5 trong warning/route.ts) cũng đang dùng 5. Đây là ví dụ
-- điển hình của việc file schema.sql bị lệch khỏi DB thật — nên đồng bộ lại
-- để không ai đọc nhầm schema.sql rồi sửa code theo số sai.
-- ----------------------------------------------------------------------------

alter table public.submissions drop constraint if exists submissions_warning_count_check;
alter table public.submissions
  add constraint submissions_warning_count_check check (warning_count >= 0 and warning_count <= 5);


-- ----------------------------------------------------------------------------
-- 4) GHI CHÚ — KHÔNG PHẢI SQL CẦN CHẠY, CHỈ ĐỂ BẠN ĐỐI CHIẾU
--
-- Các cột sau đã tồn tại trong DB thật nhưng KHÔNG được dùng ở đâu trong
-- src/ hiện tại (grep không ra kết quả): classes (cả bảng), tests.class_id,
-- tests.content, submissions.class_id, submissions.teacher_notes,
-- submissions.teacher_band_score, submissions.is_reviewed.
-- Đây là "control debt": DB có sẵn hạ tầng cho tính năng theo lớp + review
-- 2 lượt (band AI vs band giáo viên chỉnh) nhưng frontend/API chưa hề đọc/ghi
-- các cột này, và RLS cũng chưa scope theo class_id (mọi giáo viên đã đăng
-- nhập đang thấy TẤT CẢ submissions/tests, không lọc theo lớp mình dạy).
-- Nếu tính năng lớp học sắp được dùng thật, nói mình biết để viết luôn phần
-- RLS lọc theo class_id + cập nhật TestRow/SubmissionRow trong types.ts.
-- ============================================================================