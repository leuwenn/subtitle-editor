import { timeToSeconds } from "@/lib/utils";
import type { Subtitle } from "@/types/subtitle";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import SubtitleItem from "./subtitle-item";

interface SubtitleListProps {
  subtitles: Subtitle[];
  currentTime?: number;
  onScrollToRegion: (uuid: string) => void;
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
  ...props // Capture the rest of the props
}: SubtitleListProps) {
  const listRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={listRef} className="h-full overflow-y-scroll">
      <AnimatePresence>
        {subtitles.map((subtitle: Subtitle, index: number) => {
          const isLastItem = index === subtitles.length - 1;
          const nextSubtitle = isLastItem ? null : subtitles[index + 1];
          return (
            <SubtitleItem
              key={subtitle.uuid}
              subtitle={subtitle}
              nextSubtitle={nextSubtitle}
              index={index}
              isLastItem={isLastItem}
              currentTime={currentTime}
              editingSubtitleUuid={editingSubtitleUuid}
              onScrollToRegion={onScrollToRegion}
              setEditingSubtitleUuid={setEditingSubtitleUuid}
              onUpdateSubtitleStartTime={onUpdateSubtitleStartTime}
              onUpdateSubtitleEndTime={onUpdateSubtitleEndTime}
              onUpdateSubtitle={onUpdateSubtitle}
              onMergeSubtitles={onMergeSubtitles}
              onAddSubtitle={onAddSubtitle}
              onDeleteSubtitle={onDeleteSubtitle}
              onSplitSubtitle={onSplitSubtitle}
              setIsPlaying={setIsPlaying}
              setPlaybackTime={setPlaybackTime}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
