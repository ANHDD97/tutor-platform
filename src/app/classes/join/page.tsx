"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getErrorMessage } from "@/lib/errors";

type JoinRole = "student" | "parent";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  class_code: string;
};

export default function JoinClassPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [role, setRole] = useState<JoinRole>("student");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const join = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    setMessage("");

    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const user = userData.user;
      if (!user) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const classCode = code.trim().toUpperCase();
      if (!classCode) {
        setMessage("Hãy nhập class code.");
        return;
      }

      const { data: cls, error: findErr } = await supabase
        .from("classes")
        .select("id,name,description,class_code")
        .eq("class_code", classCode)
        .single();

      if (findErr || !cls) {
        setMessage("Không tìm thấy lớp với code này.");
        return;
      }

      const c = cls as ClassRow;

      const { error: joinErr } = await supabase.from("class_members").insert({
        class_id: c.id,
        user_id: user.id,
        role,
        joined_at: new Date().toISOString(),
      });

      if (joinErr) {
        const msg = joinErr.message.toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          setMessage(
            "Bạn đã join lớp này rồi. Nếu chọn sai vai trò, bạn có thể đổi vai trò trong Class Detail."
          );
          return;
        }

        setMessage("Lỗi join: " + joinErr.message);
        return;
      }

      setMessage(`✅ Join thành công: ${c.name} (role: ${role})`);
      setTimeout(() => {
        router.push("/classes");
        router.refresh();
      }, 300);
    } catch (e) {
      setMessage("Lỗi: " + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 560 }}>
      <Link href="/classes">← Back</Link>

      <h1 style={{ marginTop: 12 }}>Join Class</h1>

      <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <div>
          <label>Class code</label>
          <br />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="VD: YM3NCW6C"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label>Bạn join với vai trò</label>
          <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="role"
                checked={role === "student"}
                onChange={() => setRole("student")}
              />
              Student
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                name="role"
                checked={role === "parent"}
                onChange={() => setRole("parent")}
              />
              Parent
            </label>
          </div>
        </div>

        <button onClick={join} disabled={loading}>
          {loading ? "Joining..." : "Join"}
        </button>

        {message && <p style={{ marginTop: 6 }}>{message}</p>}
      </div>
    </div>
  );
}
