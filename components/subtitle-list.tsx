import type { Subtitle } from "@/types/subtitle";
import { useState, useRef, useEffect } from "react";
import { Merge, Plus, Trash2 } from "lucide-react";
interface SubtitleListProps {
  subtitles: Subtitle[];
  currentTime?: number;
  onUpdateSubtitle: (id: number, newText: string) => void;
  onMergeSubtitles: (id1: number, id2: number) => void;
  onAddSubtitle: (beforeId: number, afterId: number) => void;
  onDeleteSubtitle: (id: number) => void;
}

export function SubtitleList({
  subtitles,
  currentTime = 0,
  onUpdateSubtitle,
  onMergeSubtitles,
  onAddSubtitle,
  onDeleteSubtitle,
}: SubtitleListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Function to convert SRT timestamp to seconds
  const timeToSeconds = (time: string): number => {
    const [hours, minutes, seconds] = time.split(':').map(part => 
      parseFloat(part.replace(',', '.'))
    );
    return hours * 3600 + minutes * 60 + seconds;
  };

  useEffect(() => {
    if (!listRef.current) return;

    // Find the current subtitle based on playback time
    const currentSubtitle = subtitles.find(
      sub =>
        timeToSeconds(sub.startTime) <= currentTime &&
        timeToSeconds(sub.endTime) >= currentTime
    );

    if (currentSubtitle) {
      const subtitleElement = document.getElementById(`subtitle-${currentSubtitle.id}`);
      if (subtitleElement) {
        subtitleElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentTime, subtitles]);

  return (
    <div ref={listRef} className="h-[calc(100vh-20rem)] overflow-y-scroll p-4">
      {subtitles.map((subtitle, index) => (
        <div key={subtitle.id}>
          <div
            id={`subtitle-${subtitle.id}`}
            key={subtitle.id}
            className={`p-4 border-b border-gray-300 hover:bg-secondary/50 cursor-pointer grid grid-cols-[2rem_6rem_1fr] gap-4 items-center ${
              timeToSeconds(subtitle.startTime) <= currentTime &&
              timeToSeconds(subtitle.endTime) >= currentTime
                ? "bg-secondary"
                : ""
            }`}
          >
            <div className="text-sm text-muted-foreground font-mono">
              {subtitle.id}
            </div>
            <div className="text-sm text-muted-foreground flex flex-col gap-2">
              <span>{subtitle.startTime}</span>
              <span>{subtitle.endTime}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
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
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      setEditingId(subtitle.id);
                      setEditText(subtitle.text);
                    }}
                    onKeyUp={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setEditingId(subtitle.id);
                        setEditText(subtitle.text);
                      }
                    }}
                  >
                    {subtitle.text}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDeleteSubtitle(subtitle.id)}
                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {index < subtitles.length - 1 && (
            <div className="flex justify-center gap-12 -mt-3 -mb-3">
              <button
                type="button"
                onClick={() =>
                  onMergeSubtitles(subtitle.id, subtitles[index + 1].id)
                }
                className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded"
              >
                <Merge size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  onAddSubtitle(subtitle.id, subtitles[index + 1].id)
                }
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
