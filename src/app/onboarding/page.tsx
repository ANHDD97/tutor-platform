"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function OnboardingPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("My Tutor Workspace");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const becomeTutor = async () => {
    setMessage("");

    // 1) lấy user hiện tại
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData.user;
    if (userErr || !user) {
      setMessage("Bạn chưa đăng nhập.");
      return;
    }

    // 2) tạo workspace
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({
        owner_user_id: user.id,
        name: workspaceName,
      })
      .select()
      .single();

    if (wsErr) {
      setMessage("Lỗi tạo workspace: " + wsErr.message);
      return;
    }

    // 3) cập nhật profile thành tutor + gán default_workspace_id
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        can_tutor: true,
        default_workspace_id: ws.id,
      })
      .eq("user_id", user.id);

    if (pErr) {
      setMessage("Workspace tạo rồi nhưng lỗi cập nhật profile: " + pErr.message);
      return;
    }

    setMessage("✅ Bạn đã trở thành Tutor! Workspace đã tạo: " + ws.name);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Onboarding</h1>

      {userEmail ? (
        <p>Đang đăng nhập: {userEmail}</p>
      ) : (
        <p style={{ color: "tomato" }}>Bạn chưa đăng nhập</p>
      )}

      <div style={{ marginTop: 20 }}>
        <label>Workspace name</label>
        <br />
        <input
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          style={{ width: 320 }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={becomeTutor}>Become Tutor (Create Workspace)</button>
      </div>

      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
}
