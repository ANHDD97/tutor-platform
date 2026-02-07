"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getErrorMessage } from "@/lib/errors";

type MemberRole = "tutor" | "student" | "parent";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  class_code: string;
  workspace_id: string | null;
  created_by: string;
  created_at: string;
};

type SessionRow = {
  id: string;
  title: string;
  note: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

type MemberRow = {
  role: MemberRole;
};

function toLocalInputValue(dt: Date): string {
  // input type="datetime-local" expects: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}`;
}

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = useMemo(() => {
    const v = params?.id;
    return typeof v === "string" ? v : "";
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [cls, setCls] = useState<ClassRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);

  // create session form
  const [title, setTitle] = useState("Buổi 1 - Ngữ pháp nền tảng");
  const [startAt, setStartAt] = useState(() => toLocalInputValue(new Date()));
  const [endAt, setEndAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return toLocalInputValue(d);
  });
  const [creating, setCreating] = useState(false);

  const [changingRole, setChangingRole] = useState(false);

  const load = async (): Promise<void> => {
    if (!classId) {
      setMessage("Thiếu class id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = userData.user;

      // load class
      const { data: c, error: cErr } = await supabase
        .from("classes")
        .select("id,name,description,class_code,workspace_id,created_by,created_at")
        .eq("id", classId)
        .single();

      if (cErr) {
        setMessage("Lỗi load class: " + cErr.message);
        setCls(null);
        setSessions([]);
        setMyRole(null);
        setLoading(false);
        return;
      }

      setCls(c as ClassRow);

      // load membership role (nếu chưa join => null)
      if (user) {
        const { data: m, error: mErr } = await supabase
          .from("class_members")
          .select("role")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .single();

        if (!mErr && m) {
          setMyRole((m as MemberRow).role);
        } else {
          setMyRole(null);
        }
      } else {
        setMyRole(null);
      }

      // load sessions list
      const { data: s, error: sErr } = await supabase
        .from("sessions")
        .select("id,title,note,start_at,end_at,status")
        .eq("class_id", classId)
        .order("start_at", { ascending: true });

      if (sErr) {
        setMessage("Lỗi load sessions: " + sErr.message);
        setSessions([]);
      } else {
        setSessions((s ?? []) as SessionRow[]);
      }
    } catch (e) {
      setMessage("Lỗi: " + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const changeRole = async (nextRole: Exclude<MemberRole, "tutor">): Promise<void> => {
    if (!classId) return;

    setMessage("");

    // chỉ cho đổi nếu đang là student/parent
    if (!myRole) {
      setMessage("Bạn chưa join lớp.");
      return;
    }
    if (myRole === "tutor") {
      setMessage("Tutor không thể đổi vai trò ở đây.");
      return;
    }
    if (myRole === nextRole) return;

    const ok = window.confirm(
      `Bạn có chắc muốn đổi vai trò từ "${myRole}" sang "${nextRole}" không?`
    );
    if (!ok) return;

    setChangingRole(true);

    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = userData.user;
      if (!user) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const { error } = await supabase
        .from("class_members")
        .update({ role: nextRole })
        .eq("class_id", classId)
        .eq("user_id", user.id);

      if (error) {
        setMessage("Lỗi đổi vai trò: " + error.message);
        return;
      }

      setMyRole(nextRole);
      setMessage(`✅ Đã đổi vai trò thành "${nextRole}".`);
    } catch (e) {
      setMessage("Lỗi: " + getErrorMessage(e));
    } finally {
      setChangingRole(false);
    }
  };

  const createSession = async (): Promise<void> => {
    if (!classId) return;

    setMessage("");

    if (myRole !== "tutor") {
      setMessage("Bạn không có quyền tạo session (chỉ Tutor).");
      return;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setMessage("Start/End không hợp lệ.");
      return;
    }
    if (end <= start) {
      setMessage("End phải lớn hơn Start.");
      return;
    }
    if (!title.trim()) {
      setMessage("Hãy nhập title.");
      return;
    }

    setCreating(true);

    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = userData.user;
      if (!user) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      const { error } = await supabase.from("sessions").insert({
        class_id: classId,
        title: title.trim(),
        note: null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "scheduled",
        created_by: user.id,
      });

      if (error) {
        setMessage("Lỗi tạo session: " + error.message);
        return;
      }

      setMessage("✅ Tạo session thành công!");
      await load(); // reload list
    } catch (e) {
      setMessage("Lỗi: " + getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <Link href="/classes">← Back</Link>
        <h1 style={{ marginTop: 12 }}>Class Detail</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!cls) {
    return (
      <div style={{ padding: 40 }}>
        <Link href="/classes">← Back</Link>
        <h1 style={{ marginTop: 12 }}>Class Detail</h1>
        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <Link href="/classes">← Back</Link>

      <h1 style={{ marginTop: 12 }}>Class Detail</h1>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>
          {cls.name}{" "}
          <span style={{ fontWeight: 400, opacity: 0.7 }}>
            {myRole ? `(role: ${myRole})` : "(chưa join?)"}
          </span>
        </div>

        {cls.description && <div style={{ marginTop: 6 }}>{cls.description}</div>}

        <div style={{ marginTop: 6, opacity: 0.8 }}>Code: {cls.class_code}</div>

        {/* đổi vai trò (chỉ student/parent) */}
        {myRole && myRole !== "tutor" && (
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              disabled={changingRole || myRole === "student"}
              onClick={() => changeRole("student")}
            >
              Chuyển sang Student
            </button>

            <button
              disabled={changingRole || myRole === "parent"}
              onClick={() => changeRole("parent")}
            >
              Chuyển sang Parent
            </button>
          </div>
        )}

        {message && <p style={{ marginTop: 10 }}>{message}</p>}
      </div>

      <hr style={{ margin: "22px 0" }} />

      <h2>Sessions</h2>
      {sessions.length === 0 ? (
        <p>Chưa có session nào.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ padding: 12, border: "1px solid #333", borderRadius: 8 }}>
              <div style={{ fontWeight: 700 }}>{s.title}</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                {new Date(s.start_at).toLocaleString()} → {new Date(s.end_at).toLocaleString()} (
                {s.status})
              </div>
              {s.note && <div style={{ marginTop: 6 }}>{s.note}</div>}
            </div>
          ))}
        </div>
      )}

      <hr style={{ margin: "22px 0" }} />

      {/* ✅ Ẩn Create Session nếu không phải tutor */}
      {myRole === "tutor" && (
        <div style={{ maxWidth: 600 }}>
          <h2>Create Session (Tutor)</h2>

          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <div>
              <label>Title</label>
              <br />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label>Start</label>
              <br />
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label>End</label>
              <br />
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <button onClick={createSession} disabled={creating}>
              {creating ? "Creating..." : "Create Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
