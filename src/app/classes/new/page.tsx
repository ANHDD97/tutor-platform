"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  is_tutor: boolean;
  tutor_bio: string | null;
  tutor_subjects: string | null;
  tutor_payment_method: string | null;
  tutor_payment_detail: string | null;
};

export default function CreateClassPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isTutor, setIsTutor] = useState(false);
  const [message, setMessage] = useState("");

  // upgrade form
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState("JLPT N3 Grammar");
  const [payMethod, setPayMethod] = useState("Bank / Momo / Paypal");
  const [payDetail, setPayDetail] = useState("");

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      if (!alive) return;

      setMessage("");

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (!alive) return;
        setMessage("Bạn chưa đăng nhập.");
        setChecking(false);
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select(
          "id,is_tutor,tutor_bio,tutor_subjects,tutor_payment_method,tutor_payment_detail"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        if (!alive) return;
        setMessage("Lỗi load profile: " + error.message);
        setChecking(false);
        return;
      }

      const p = prof as ProfileRow;

      if (!alive) return;

      setIsTutor(!!p.is_tutor);

      // prefill nếu có
      setBio(p.tutor_bio ?? "");
      setSubjects(p.tutor_subjects ?? "JLPT N3 Grammar");
      setPayMethod(p.tutor_payment_method ?? "Bank / Momo / Paypal");
      setPayDetail(p.tutor_payment_detail ?? "");

      setChecking(false);
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, []);

  const upgradeToTutor = async () => {
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("Bạn chưa đăng nhập.");
      return;
    }

    // validate tối thiểu
    if (bio.trim().length < 20) {
      setMessage("Bio quá ngắn. Hãy viết ít nhất ~20 ký tự.");
      return;
    }
    if (!subjects.trim()) {
      setMessage("Hãy nhập chuyên môn/subjects.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_tutor: true,
        tutor_bio: bio.trim(),
        tutor_subjects: subjects.trim(),
        tutor_payment_method: payMethod.trim(),
        tutor_payment_detail: payDetail.trim(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage("Lỗi upgrade: " + error.message);
      return;
    }

    setMessage("✅ Upgrade thành Tutor thành công!");
    setIsTutor(true);

    // refresh UI để hiện form create class
    setTimeout(() => router.refresh(), 300);
  };

  if (checking) return <div style={{ padding: 40 }}>Loading...</div>;

  // ✅ Gate: chưa tutor thì show upgrade screen
  if (!isTutor) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <Link href="/classes">← Back</Link>
        <h1 style={{ marginTop: 12 }}>Create Class</h1>

        <p>
          Bạn đang là <b>Student</b>. Để tạo lớp, bạn cần <b>Upgrade to Tutor</b>.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div>
            <label>Bio (giới thiệu)</label>
            <br />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              style={{ width: "100%" }}
              placeholder="Ví dụ: Mình dạy JLPT N3 ngữ pháp, có lộ trình + bài tập, học 60 phút/buổi..."
            />
          </div>

          <div>
            <label>Chuyên môn / Subjects</label>
            <br />
            <input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>Payment method (V1: text)</label>
            <br />
            <input
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>Payment detail (V1: text)</label>
            <br />
            <input
              value={payDetail}
              onChange={(e) => setPayDetail(e.target.value)}
              style={{ width: "100%" }}
              placeholder="VD: Momo 09xx..., Bank..., Paypal..."
            />
          </div>

          <button onClick={upgradeToTutor}>Upgrade to Tutor</button>

          {message && <p style={{ marginTop: 6 }}>{message}</p>}
        </div>
      </div>
    );
  }

  // ✅ Tutor rồi thì hiện form create class (bạn dán form cũ vào đây)
  return (
    <div style={{ padding: 40 }}>
      <Link href="/classes">← Back</Link>
      <h1 style={{ marginTop: 12 }}>Create Class</h1>

      <p style={{ opacity: 0.7 }}>Bạn đã là Tutor. Bây giờ có thể tạo lớp.</p>

      {/* TODO: Dán form Create Class hiện tại của bạn vào đây */}
    </div>
  );
}
