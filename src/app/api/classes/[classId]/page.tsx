"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function TeacherClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params?.classId as string;

  const [classData, setClassData] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!classId) return;

    async function fetchClassDetails() {
      try {
        setLoading(true);
        // 1. Lấy thông tin lớp học
        const classRes = await fetch(`/api/classes/${classId}`);
        if (!classRes.ok) {
          throw new Error("Không thể tải thông tin lớp học hoặc ID không tồn tại.");
        }
        const cData = await classRes.json();
        setClassData(cData);

        // 2. Lấy danh sách đề thi thuộc lớp này
        const testsRes = await fetch(`/api/tests?classId=${classId}`);
        if (testsRes.ok) {
          const tData = await testsRes.json();
          setTests(Array.isArray(tData) ? tData : []);
        }

        // 3. Lấy các bài nộp của học sinh
        const subRes = await fetch(`/api/classes/${classId}/submissions`);
        if (subRes.ok) {
          const sData = await subRes.json();
          setSubmissions(Array.isArray(sData) ? sData : []);
        }
      } catch (err: any) {
        console.error("Lỗi đồng bộ dữ liệu lớp học:", err);
        setErrorMsg(err.message || "Đã xảy ra lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    }

    fetchClassDetails();
  }, [classId]);

  const copyTestLink = (testId: string) => {
    const origin = window.location.origin;
    const fullLink = `${origin}/test/${testId}`;
    navigator.clipboard.writeText(fullLink);
    alert("Đã copy liên kết bài thi! Hãy gửi link này cho học sinh của lớp.");
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Đang tải dữ liệu lớp học...</div>;
  
  if (errorMsg || !classData) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow text-center my-10 border">
        <p className="text-red-500 font-semibold mb-4">{errorMsg || "Không tìm thấy thông tin lớp học này."}</p>
        <button onClick={() => router.push("/teacher")} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Quay lại trang quản lý chung
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header điều khiển */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{classData.name || "Lớp học chưa có tên"}</h1>
          <p className="text-xs text-gray-400 mt-1">Mã lớp (ID): {classId}</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={() => router.push("/teacher")}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm transition"
          >
            Danh sách lớp
          </button>
          <button
            onClick={() => router.push(`/teacher/tests/create?classId=${classId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition font-medium"
          >
            + Tạo Đề Thi Mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Khối quản lý Đề thi của lớp */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Đề thi đã tạo</h2>
          {tests.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Chưa có đề thi nào trong lớp.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto(s)">
              {tests.map((test) => (
                <div key={test.id} className="p-3 bg-gray-50 rounded-lg border flex flex-col space-y-2">
                  <div className="font-semibold text-sm text-gray-800 truncate">{test.title}</div>
                  <button
                    onClick={() => copyTestLink(test.id)}
                    className="w-full text-center text-xs bg-white text-blue-600 border border-blue-200 py-1.5 rounded hover:bg-blue-50 transition"
                  >
                    Copy Link Đề
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Khối danh sách bài làm của Học sinh */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Kết quả làm bài</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Chưa có học sinh nào nộp bài.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-xs font-semibold text-gray-600">Học sinh</th>
                    <th className="p-3 text-xs font-semibold text-gray-600">Đề thi</th>
                    <th className="p-3 text-xs font-semibold text-gray-600">Band</th>
                    <th className="p-3 text-xs font-semibold text-gray-600">Điểm</th>
                    <th className="p-3 text-xs font-semibold text-gray-600">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-3 text-sm font-medium text-gray-800">{sub.student_name}</td>
                      <td className="p-3 text-sm text-gray-600 max-w-[150px] truncate">{sub.tests?.title || "Đề thi"}</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-bold text-xs">
                          {sub.band || "N/A"}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-semibold text-gray-700">{sub.score}</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => router.push(`/teacher/submissions/${sub.id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}