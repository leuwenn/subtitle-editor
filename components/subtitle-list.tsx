import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isValidTime, timeToSeconds } from "@/lib/utils";
import type { Subtitle } from "@/types/subtitle";
import { IconFold, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface SubtitleListProps {
  subtitles: Subtitle[];
  currentTime?: number;
  onScrollToRegion: (id: number) => void;
  onUpdateSubtitleStartTime: (id: number, newTime: string) => void;
  onUpdateSubtitleEndTime: (id: number, newTime: string) => void;
  onUpdateSubtitle: (id: number, newText: string) => void;
  onMergeSubtitles: (id1: number, id2: number) => void;
  onAddSubtitle: (beforeId: number, afterId: number | null) => void;
  onDeleteSubtitle: (id: number) => void;
  onSplitSubtitle: (id: number, caretPos: number, textLength: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackTime: (time: number) => void;
}

export function SubtitleList({
  subtitles,
  currentTime = 0,
  onScrollToRegion,
  onUpdateSubtitleStartTime,
  onUpdateSubtitleEndTime,
  onUpdateSubtitle,
  onMergeSubtitles,
  onAddSubtitle,
  onDeleteSubtitle,
  onSplitSubtitle,
  setIsPlaying,
  setPlaybackTime,
}: SubtitleListProps) {
  const [editingStartTimeId, setEditingStartTimeId] = useState<number | null>(
    null
  );
  const [editStartTime, setEditStartTime] = useState("");
  const [editingEndTimeId, setEditingEndTimeId] = useState<number | null>(null);
  const [editEndTime, setEditEndTime] = useState("");

  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Scroll to the current subtitle when user clicks a region in the waveform visualizer
  useEffect(() => {
    if (!listRef.current) return;

    // Find the current subtitle based on playback time
    const currentSubtitle = subtitles.find(
      (sub) =>
        timeToSeconds(sub.startTime) <= currentTime &&
        timeToSeconds(sub.endTime) >= currentTime
    );

    if (currentSubtitle) {
      const subtitleElement = document.getElementById(
        `subtitle-${currentSubtitle.id}`
      );
      if (subtitleElement) {
        subtitleElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentTime, subtitles]);

  const handleTimeUpdate = (
    id: number,
    newTime: string,
    updateFunction: (id: number, newTime: string) => void,
    setEditingId: (id: number | null) => void,
    isStartTime = false
  ) => {
    if (!isValidTime(newTime)) {
      toast({
        title: "Invalid time format",
        description: "Please use the format HH:MM:SS,MS (e.g., 00:00:20,450).",
      });
      setEditingId(null);
      return;
    }

    const subtitle = subtitles.find((sub) => sub.id === id);
    if (!subtitle) return;

    const newTimeInSeconds = timeToSeconds(newTime);

    if (isStartTime) {
      if (newTimeInSeconds > timeToSeconds(subtitle.endTime)) {
        toast({
          title: "Invalid start time",
          description:
            "Start time cannot be later than the end time of the subtitle.",
        });
        setEditingId(null);
        return;
      }
    } else {
      if (newTimeInSeconds < timeToSeconds(subtitle.startTime)) {
        toast({
          title: "Invalid end time",
          description:
            "End time cannot be earlier than the start time of the subtitle.",
        });
        setEditingId(null);
        return;
      }
    }

    updateFunction(id, newTime);
    setEditingId(null);
  };

  return (
    <div ref={listRef} className="h-full overflow-y-scroll">
      <TooltipProvider>
        {subtitles.map((subtitle, index) => (
          <div key={subtitle.id}>
            <div
              id={`subtitle-${subtitle.id}`}
              key={subtitle.id}
              tabIndex={0}
              onClick={() => onScrollToRegion(subtitle.id)}
              onFocus={() => {
                setPlaybackTime(timeToSeconds(subtitle.startTime));
                // setIsPlaying(true); // Removed from onFocus
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  setPlaybackTime(timeToSeconds(subtitle.startTime));
                  setIsPlaying(true);
                }
              }}
              className={`px-4 py-2 border-b border-gray-500 hover:bg-secondary/50 cursor-pointer grid grid-cols-[1rem_7rem_1fr] gap-4 items-center ${
                timeToSeconds(subtitle.startTime) <= currentTime &&
                timeToSeconds(subtitle.endTime) >= currentTime
                  ? "bg-secondary"
                  : ""
              }`}
            >
              {/* Subtitle ID */}
              <div className="text-sm text-muted-foreground font-mono">
                {subtitle.id}
              </div>

              {/* Subtitle start and end time */}
              <div className="text-sm text-muted-foreground flex flex-col gap-1">
                {editingStartTimeId === subtitle.id ? (
                  <Input
                    ref={(input) => {
                      if (input) input.focus();
                    }}
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    onBlur={() =>
                      handleTimeUpdate(
                        subtitle.id,
                        editStartTime,
                        onUpdateSubtitleStartTime,
                        setEditingStartTimeId
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleTimeUpdate(
                          subtitle.id,
                          editStartTime,
                          onUpdateSubtitleStartTime,
                          setEditingStartTimeId
                        );
                      }
                    }}
                    className="p-1 w-26 h-8 text-center text-black"
                  />
                ) : (
                  <Button
                    tabIndex={0}
                    onClick={() => {
                      setEditingStartTimeId(subtitle.id);
                      setEditStartTime(subtitle.startTime);
                    }}
                    onKeyUp={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setEditingStartTimeId(subtitle.id);
                        setEditStartTime(subtitle.startTime);
                      }
                    }}
                    variant="ghost"
                    className="bg-transparent h-8"
                  >
                    {subtitle.startTime}
                  </Button>
                )}

                {editingEndTimeId === subtitle.id ? (
                  <Input
                    ref={(input) => {
                      if (input) input.focus();
                    }}
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    onBlur={() =>
                      handleTimeUpdate(
                        subtitle.id,
                        editEndTime,
                        onUpdateSubtitleEndTime,
                        setEditingEndTimeId
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleTimeUpdate(
                          subtitle.id,
                          editEndTime,
                          onUpdateSubtitleEndTime,
                          setEditingEndTimeId
                        );
                      }
                    }}
                    className="p-1 w-26 h-8 text-center text-black"
                  />
                ) : (
                  <Button
                    tabIndex={0}
                    onClick={() => {
                      setEditingEndTimeId(subtitle.id);
                      setEditEndTime(subtitle.endTime);
                    }}
                    onKeyUp={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setEditingEndTimeId(subtitle.id);
                        setEditEndTime(subtitle.endTime);
                      }
                    }}
                    variant="ghost"
                    className="bg-transparent h-8"
                  >
                    {subtitle.endTime}
                  </Button>
                )}
              </div>

              {/* Subtitle text */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {editingTextId === subtitle.id ? (
                    <Textarea
                      ref={(textArea) => {
                        if (textArea) textArea.focus();
                      }}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => {
                        onUpdateSubtitle(subtitle.id, editText);
                        setEditingTextId(null);
                      }}
                      onKeyDown={(e) => {
                        // Stop space key propagation when editing
                        if (e.key === " ") {
                          e.stopPropagation();
                        }

                        // Check SHIFT + ENTER
                        if (e.key === "Enter" && e.shiftKey) {
                          e.preventDefault();
                          // caretPos is e.currentTarget.selectionStart
                          // total text length is e.currentTarget.value.length
                          const caretPos = e.currentTarget.selectionStart;
                          const totalLen = e.currentTarget.value.length;

                          onSplitSubtitle(subtitle.id, caretPos, totalLen);

                          // If you also want to end editing after splitting:
                          setEditingTextId(null);
                          return;
                        }

                        // Optionally handle normal Enter key
                        if (e.key === "Enter" && !e.shiftKey) {
                          // e.g. confirm edit
                          onUpdateSubtitle(subtitle.id, editText);
                          setEditingTextId(null);
                        }
                      }}
                      className="w-full p-2"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left text-lg"
                      tabIndex={0}
                      onClick={() => {
                        setEditingTextId(subtitle.id);
                        setEditText(subtitle.text);
                      }}
                      onKeyUp={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setEditingTextId(subtitle.id);
                          setEditText(subtitle.text);
                        }
                      }}
                    >
                      {subtitle.text}
                    </button>
                  )}
                </div>

                {/* Delete button */}
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => onDeleteSubtitle(subtitle.id)}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                  >
                    <IconTrash size={12} />
                  </TooltipTrigger>
                  <TooltipContent className="bg-red-600">Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Merge and add button */}
            <div className="flex justify-center gap-12 -mt-3 -mb-3">
              {index < subtitles.length - 1 && (
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() =>
                      onMergeSubtitles(subtitle.id, subtitles[index + 1].id)
                    }
                    className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded"
                  >
                    <IconFold size={12} />
                  </TooltipTrigger>
                  <TooltipContent className="bg-yellow-500">
                    Merge
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger
                  type="button"
                  onClick={() =>
                    onAddSubtitle(
                      subtitle.id,
                      index < subtitles.length - 1
                        ? subtitles[index + 1].id
                        : null
                    )
                  }
                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
                >
                  <IconPlus size={12} />
                </TooltipTrigger>
                <TooltipContent className="bg-green-500">Add</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </TooltipProvider>
    </div>
  );
}
