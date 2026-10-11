"use client";
import { useEffect, useState } from "react";

/** Renders timestamps in the viewer's timezone (server would render UTC). */
export default function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    setText(sameDay ? `today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }));
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
