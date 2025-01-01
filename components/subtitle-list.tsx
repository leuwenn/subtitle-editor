import type { Subtitle } from "@/types/subtitle";
import { useState } from "react";

interface SubtitleListProps {
  subtitles: Subtitle[];
  onUpdateSubtitle: (id: number, newText: string) => void;
}

export function SubtitleList({
  subtitles,
  onUpdateSubtitle,
}: SubtitleListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  return (
    <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4">
      {subtitles.map((subtitle) => (
        <div
          key={subtitle.id}
          className="p-4 border  hover:bg-secondary/50 cursor-pointer"
        >
          <div className="text-sm text-muted-foreground">
            {subtitle.startTime} → {subtitle.endTime}
          </div>
          <div className="mt-1">
            {editingId === subtitle.id ? (
              <textarea
                ref={(textArea) => {
                  if (textArea) textArea.focus();
                }}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => {
                  onUpdateSubtitle(subtitle.id, editText);
                  setEditingId(null);
                }}
                className="w-full p-1 border rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            ) : (
              <div
                onClick={() => {
                  setEditingId(subtitle.id);
                  setEditText(subtitle.text);
                }}
                onKeyUp={() => {}}
              >
                {subtitle.text}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
