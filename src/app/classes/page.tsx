"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  class_code: string;
  created_by: string;
  created_at: string;
};

type MemberRow = {
  role: string;
  class_id: string;
  classes?: ClassRow | null;
};

export default function MyClassesPage() {
  const [items, setItems] = useState<MemberRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      setMessage("");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessage("Bạn chưa đăng nhập.");
        return;
      }

      // lấy danh sách class qua membership
      const { data, error } = await supabase
        .from("class_members")
        .select(
          `
          role,
          class_id,
          classes (
            id, name, description, class_code, created_by, created_at
          )
        `
        )
        .order("joined_at", { ascending: false });

      if (error) {
        setMessage("Lỗi load classes: " + error.message);
        return;
      }

      setItems(((data ?? []) as unknown) as MemberRow[]);

    })();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>My Classes</h1>

      <div style={{ marginTop: 12 }}>
        <Link href="/classes/new">+ Create class</Link>
        <span style={{ marginLeft: 16 }} />
        <Link href="/classes/join">Join by code</Link>
      </div>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}

      <div style={{ marginTop: 20 }}>
        {items.length === 0 ? (
          <p>Chưa có lớp nào.</p>
        ) : (
          <ul>
            {items.map((it) => (
              <li key={it.class_id} style={{ marginBottom: 16 }}>
                <div>
                  <b>{it.classes?.name}</b>{" "}
                  <span style={{ opacity: 0.7 }}>({it.role})</span>
                </div>
                {it.classes?.description && (
                  <div style={{ opacity: 0.85 }}>{it.classes.description}</div>
                )}
                <div style={{ marginTop: 6 }}>
                  <Link href={`/classes/${it.class_id}`}>Open</Link>
                  <span style={{ marginLeft: 12, opacity: 0.7 }}>
                    Code: {it.classes?.class_code}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
