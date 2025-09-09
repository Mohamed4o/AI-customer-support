"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Supabase client setup
const supabaseUrl = "https://odqsxdvebxvnsy eoenan.supabase.co"; // عدل لو مختلف
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcXN4ZHZlYnh2bnN5ZW9lbmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDYwMzksImV4cCI6MjA3MzAyMjAzOX0.gEx6B9un1nRxQNKdJtsG3ho7Eb2hatU830FSzNUhuZg";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const sessionId = "test-session";

  // ✅ Load existing messages
  useEffect(() => {
    const loadMessages = async () => {
      let { data } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    loadMessages();

    // ✅ Realtime subscription
    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Send message to Supabase + trigger OpenAI (via backend route)
  const sendMessage = async () => {
    if (!input.trim()) return;

    // 1. Insert user message
    await supabase.from("messages").insert([
      { session_id: sessionId, sender: "user", text: input },
    ]);

    // 2. Call our backend API (Next.js /api/chat)
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, input }),
    });

    setInput("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-xl max-w-[80%] text-sm shadow-md whitespace-pre-line ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white self-end ml-auto"
                  : "bg-gray-200 text-gray-800 self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-xl px-3 py-2 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
