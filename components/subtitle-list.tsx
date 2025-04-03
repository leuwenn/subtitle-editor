import { useSubtitleContext } from "@/context/subtitle-context"; // Import context
import { timeToSeconds } from "@/lib/utils";
import type { Subtitle } from "@/types/subtitle";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import SubtitleItem from "./subtitle-item";

// Remove subtitle-related props
interface SubtitleListProps {
  currentTime?: number;
  onScrollToRegion: (uuid: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackTime: (time: number) => void;
  editingSubtitleUuid: string | null;
  setEditingSubtitleUuid: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function SubtitleList({
  currentTime = 0,
  onScrollToRegion,
  setIsPlaying,
  setPlaybackTime,
  editingSubtitleUuid,
  setEditingSubtitleUuid,
}: SubtitleListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  // Get subtitles from context
  const { subtitles } = useSubtitleContext();

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
              subtitle={subtitle} // Pass individual subtitle down
              nextSubtitle={nextSubtitle}
              index={index}
              isLastItem={isLastItem}
              currentTime={currentTime}
              editingSubtitleUuid={editingSubtitleUuid}
              onScrollToRegion={onScrollToRegion}
              setEditingSubtitleUuid={setEditingSubtitleUuid}
              // Remove subtitle action props (SubtitleItem will use context)
              setIsPlaying={setIsPlaying}
              setPlaybackTime={setPlaybackTime}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
