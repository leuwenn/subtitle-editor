import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isValidTime, timeToSeconds } from "@/lib/utils";
import type { Subtitle } from "@/types/subtitle";
import { IconFold, IconPlus, IconTrash } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
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
  onScrollToRegion: (uuid: string) => void; // Change id to uuid
  onUpdateSubtitleStartTime: (id: number, newTime: string) => void;
  onUpdateSubtitleEndTime: (id: number, newTime: string) => void;
  onUpdateSubtitle: (id: number, newText: string) => void;
  onMergeSubtitles: (id1: number, id2: number) => void;
  onAddSubtitle: (beforeId: number, afterId: number | null) => void;
  onDeleteSubtitle: (id: number) => void;
  onSplitSubtitle: (id: number, caretPos: number, textLength: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackTime: (time: number) => void;
  editingSubtitleUuid: string | null;
  setEditingSubtitleUuid: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function SubtitleList({
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
  editingSubtitleUuid,
  setEditingSubtitleUuid,
}: SubtitleListProps) {
  const [editingStartTimeId, setEditingStartTimeId] = useState<number | null>(
    null
  );
  const [editStartTime, setEditStartTime] = useState("");
  const [editingEndTimeId, setEditingEndTimeId] = useState<number | null>(null);
  const [editEndTime, setEditEndTime] = useState("");

  const [editText, setEditText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({}); // Ref to hold text area elements by uuid

  const { toast } = useToast();

  // Effect to handle focusing the text area when editingSubtitleUuid changes
  useEffect(() => {
    if (editingSubtitleUuid) {
      const subtitleToEdit = subtitles.find(
        (sub) => sub.uuid === editingSubtitleUuid
      );
      if (subtitleToEdit) {
        // Set the text for the textarea
        setEditText(subtitleToEdit.text);
        // Focus the corresponding textarea
        setTimeout(() => {
          textAreaRefs.current[editingSubtitleUuid]?.focus();
          // Select all text in the textarea
          textAreaRefs.current[editingSubtitleUuid]?.select();
        }, 0); // Timeout ensures the element is rendered
      }
    }
  }, [editingSubtitleUuid, subtitles]); // Depend on editingSubtitleUuid and subtitles

  // Scroll to the current subtitle based on playback time
  useEffect(() => {
    if (!listRef.current) return;

    // Find the current subtitle based on playback time
    const currentSubtitle = subtitles.find(
      (sub) =>
        timeToSeconds(sub.startTime) <= currentTime &&
        timeToSeconds(sub.endTime) >= currentTime
    );

    if (currentSubtitle) {
      // Use uuid for the element ID
      const subtitleElement = document.getElementById(
        `subtitle-${currentSubtitle.uuid}`
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
        className: "border-0 bg-orange-200 text-red-700",
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
          className: "border-0 bg-orange-200 text-red-700",
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
          className: "border-0 bg-orange-200 text-red-700",
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
        <AnimatePresence>
          {subtitles.map((subtitle, index) => (
            <motion.div
              key={subtitle.uuid} // Use UUID for stable key
              initial={{ opacity: 0, height: 0 }} // Keep height animation
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, y: 0 }}
              transition={{ duration: 0.1 }}
            >
              {/* Use uuid for the element ID */}
              <div
                id={`subtitle-${subtitle.uuid}`}
                // Pass uuid to the callback
                onClick={() => onScrollToRegion(subtitle.uuid)}
                onFocus={() => {
                  setPlaybackTime(timeToSeconds(subtitle.startTime));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    setPlaybackTime(timeToSeconds(subtitle.startTime));
                    setIsPlaying(true);
                  }
                }}
                className={`px-4 py-2 border-b border-gray-800 hover:bg-amber-50 cursor-pointer grid grid-cols-[1rem_7rem_1fr] gap-4 items-center ${
                  timeToSeconds(subtitle.startTime) <= currentTime &&
                  timeToSeconds(subtitle.endTime) >= currentTime
                    ? "bg-cyan-50"
                    : ""
                }`}
              >
                {/* Subtitle ID */}
                <div className="text-sm text-muted-foreground font-mono">
                  {subtitle.id}
                </div>

                {/* Subtitle start and end time */}
                <div className="text-sm text-muted-foreground flex flex-col gap-0">
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
                      className="p-0 w-26 h-8 text-center text-black"
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
                      className="hover:bg-transparent h-8 cursor-pointer"
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
                      className="p-0 w-26 h-8 text-center text-black"
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
                      className="hover:bg-transparent h-8 cursor-pointer"
                    >
                      {subtitle.endTime}
                    </Button>
                  )}
                </div>

                {/* Subtitle text */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    {/* Use editingSubtitleUuid directly */}
                    {editingSubtitleUuid === subtitle.uuid ? (
                      <Textarea
                        ref={(el) => {
                          // Store ref in the map
                          textAreaRefs.current[subtitle.uuid] = el;
                        }}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => {
                          onUpdateSubtitle(subtitle.id, editText);
                          setEditingSubtitleUuid(null);
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
                            setEditingSubtitleUuid(null); // Reset parent state
                            return;
                          }

                          // Optionally handle normal Enter key
                          if (e.key === "Enter" && !e.shiftKey) {
                            // e.g. confirm edit
                            onUpdateSubtitle(subtitle.id, editText);
                            setEditingSubtitleUuid(null); // Reset parent state
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            // Cancel edit: Reset text and exit edit mode
                            setEditText(subtitle.text); // Revert to original text
                            setEditingSubtitleUuid(null); // Exit edit mode
                          }
                        }}
                        className="w-full px-2 h-4"
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left text-lg cursor-pointer"
                        tabIndex={0}
                        onClick={() => {
                          // Set parent state directly
                          setEditingSubtitleUuid(subtitle.uuid);
                          // editText state will be set by the useEffect hook
                        }}
                        onKeyUp={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            // Set parent state directly
                            setEditingSubtitleUuid(subtitle.uuid);
                            // editText state will be set by the useEffect hook
                          }
                        }}
                      >
                        {subtitle.text || (
                          <span className="text-muted-foreground">(Empty)</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Delete button */}
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      onClick={() => onDeleteSubtitle(subtitle.id)}
                      className="mx-4 my-auto px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded cursor-pointer"
                    >
                      <IconTrash size={16} />
                    </TooltipTrigger>
                    <TooltipContent className="bg-red-600 px-2 py-1 text-sm">
                      Delete
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Merge and add button */}
              <div className="flex justify-center gap-16 -mt-3 -mb-3">
                {index < subtitles.length - 1 && (
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      onClick={() =>
                        onMergeSubtitles(subtitle.id, subtitles[index + 1].id)
                      }
                      className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded cursor-pointer"
                    >
                      <IconFold size={16} />
                    </TooltipTrigger>
                    <TooltipContent className="bg-amber-500 px-2 py-1 text-sm">
                      Merge
                    </TooltipContent>
                  </Tooltip>
                )}

                {(() => {
                  // Calculate if the add button should be disabled
                  let isAddDisabled = false;
                  let tooltipContent = "Add";
                  if (index < subtitles.length - 1) {
                    const currentEndTimeSec = timeToSeconds(subtitle.endTime);
                    const nextStartTimeSec = timeToSeconds(
                      subtitles[index + 1].startTime
                    );
                    const timeDiff = nextStartTimeSec - currentEndTimeSec;
                    isAddDisabled = timeDiff <= 0.001;
                    if (isAddDisabled) {
                      tooltipContent = "No room to add";
                    }
                  }

                  return (
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        disabled={isAddDisabled}
                        onClick={() => {
                          if (!isAddDisabled) {
                            onAddSubtitle(
                              subtitle.id,
                              index < subtitles.length - 1
                                ? subtitles[index + 1].id
                                : null
                            );
                          }
                        }}
                        className={`px-2 py-1 text-sm rounded ${
                          isAddDisabled
                            ? "bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-not-allowed"
                            : "bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer"
                        }`}
                      >
                        <IconPlus size={16} />
                      </TooltipTrigger>
                      <TooltipContent
                        className={`px-2 py-1 text-sm ${
                          isAddDisabled ? "bg-gray-500" : "bg-green-500"
                        }`}
                      >
                        {tooltipContent}
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </TooltipProvider>
    </div>
  );
}
