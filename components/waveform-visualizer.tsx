"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Timeline from "wavesurfer.js/dist/plugins/timeline.esm.js";
import Hover from "wavesurfer.js/dist/plugins/hover.esm.js";
import RegionsPlugin, {
  type Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { Subtitle } from "@/types/subtitle";

// Function to convert SRT timestamp to seconds
const timeToSeconds = (time: string): number => {
  const [hours, minutes, seconds] = time
    .split(":")
    .map((part) => Number.parseFloat(part.replace(",", ".")));
  return hours * 3600 + minutes * 60 + seconds;
};

// Function to convert seconds to SRT timestamp format
const secondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${secs.toFixed(3).padStart(6, "0").replace(".", ",")}`;
};

const renderRegionContent = (
  startTime: string,
  text: string,
  endTime: string
): HTMLElement => {
  const content = document.createElement("div");

  content.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem;">
        <em>${startTime}</em>
        <em>${endTime}</em>
      </div>
      <div style="padding-left: 1rem; padding-right: 1rem; padding-bottom: 0.5rem; margin-top: 3rem;">
        <span>${text}</span>
      </div>
    </div>;
`;

  return content;
};

interface WaveformVisualizerProps {
  mediaFile: File | null;
  currentTime: number;
  isPlaying: boolean;
  subtitles: Subtitle[];
  onSeek: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  onUpdateSubtitleTiming: (
    id: number,
    startTime: string,
    endTime: string
  ) => void;
  onUpdateSubtitleText: (id: number, newText: string) => void;
  onDeleteSubtitle: (id: number) => void;
}

export default function WaveformVisualizer({
  mediaFile,
  currentTime,
  isPlaying,
  subtitles,
  onSeek,
  onPlayPause,
  onUpdateSubtitleTiming,
}: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const subtitleToRegionMap = useRef<Map<number, Region>>(new Map());

  /****************************************************************
   *  Initialize the wavesurfer with options and plugins
   * */
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 100,
    waveColor: "#A7F3D0",
    progressColor: "#00d4ff",
    cursorColor: "#b91c1c",
    url: mediaUrl,
    minPxPerSec: 100, // Lower default minimum pixels per second
    fillParent: true, // Start with fill parent true
    autoCenter: true, // Enable auto center initially
    backend: "WebAudio",
    normalize: true,
    interact: true,
    hideScrollbar: false, // We'll handle scrolling manually
    plugins: useMemo(
      () => [
        Timeline.create({
          timeInterval: 0.1,
          primaryLabelInterval: 1,
          style: {
            fontSize: "12px",
          },
        }),
        Hover.create({
          lineColor: "#ff0000",
          lineWidth: 1,
          labelBackground: "#555",
          labelColor: "#fff",
          labelSize: "12px",
        }),
        RegionsPlugin.create(),
      ],
      [] // Keep the dependency array empty
    ),
  });

  // Handle zoom level based on duration
  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.on("ready", () => {
        const duration = wavesurfer.getDuration();
        const containerWidth = containerRef.current?.clientWidth || 0;

        if (duration <= 30) {
          // For tracks under 30 seconds
          wavesurfer.zoom(containerWidth / duration); // Fit to container
        } else {
          wavesurfer.zoom(100); // Default zoom for longer tracks
          wavesurfer.setOptions({
            fillParent: false,
            autoCenter: false,
          });
        }
      });
    }
  }, [wavesurfer]);

  // Handle horizontal scrolling
  useEffect(() => {
    if (wavesurfer && containerRef.current) {
      const container = containerRef.current;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault(); // Prevent default vertical scrolling

        // Adjust the scroll amount as needed
        const scrollAmount = e.deltaY * 2;

        // Get the current scroll position
        const scrollLeft = wavesurfer.getScroll();

        // Calculate the new scroll position
        const newScrollLeft = scrollLeft + scrollAmount;

        // Set the new scroll position
        wavesurfer.setScroll(newScrollLeft);
      };

      container.addEventListener("wheel", handleWheel);

      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
  }, [wavesurfer]);

  // Load media file into wavesurfer
  useEffect(() => {
    if (mediaFile) {
      setIsLoading(true);
      setMediaUrl(URL.createObjectURL(mediaFile));
    }
  }, [mediaFile]);

  /****************************************************************
   *  Sync the wavesurfer progress with the right panel media player
   *  */

  // If you click the waveform, seek to that position in the media player
  useEffect(() => {
    if (wavesurfer) {
      const handleSeek = (time: number) => {
        onSeek(time);
      };

      wavesurfer.on("interaction", handleSeek);

      return () => {
        wavesurfer.un("interaction", handleSeek);
      };
    }
  }, [wavesurfer, onSeek]);

  // If the media player seeks, update the waveform progressß
  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.setTime(currentTime);
    }
  }, [wavesurfer, currentTime]);

  // Handle spacebar for play/pause
  useEffect(() => {
    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent any default spacebar behavior
        onPlayPause(!isPlaying); // Toggle play/pause
      }
    };

    if (container) {
      container.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (container) {
        container.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [isPlaying, onPlayPause]); // Add isPlaying and onPlayPause as dependencies

  /****************************************************************
   * Handle subtitle region creation and updates
   *
   * There are 4 actions from the subtitle list that requires the waveform to re-render:
   * 1. Update the subtitle text
   * 2. Merge a subtitle
   * 3. Add a new subtitle
   * 4. Delete a subtitle
   *
   * For the first action, we only need to update the target region content.
   * For the other 3 actions, we need to re-render the regions list.
   *
   * And there is only 1 action from the wavefrom regions that requires the subtitle list
   * to re-render:
   * 1. Update the subtitle timing by draging the region box
   *
   * And we only need to re-render the target region box.
   * */

  const updateRegions = useCallback(() => {
    if (!wavesurfer || wavesurfer.getDuration() === 0) return;

    // Grab the plugin by name in Wavesurfer v7
    const regionsPlugin = wavesurfer
      .getActivePlugins()
      .find((p) => p instanceof RegionsPlugin);
    if (!regionsPlugin) return;

    // 1) Remove existing regions
    regionsPlugin.clearRegions();
    subtitleToRegionMap.current.clear();

    // 2) Add them back in fresh
    subtitles.map((subtitle) => {
      const start = timeToSeconds(subtitle.startTime);
      const end = timeToSeconds(subtitle.endTime);

      const content = renderRegionContent(
        subtitle.startTime,
        subtitle.text,
        subtitle.endTime
      );

      // Create the new region
      const region = regionsPlugin.addRegion({
        id: subtitle.id.toString(),
        start,
        end,
        content,
        color: "#fb923c20",
        drag: true,
        resize: true,
        minLength: 0.1,
      });

      // Save reference
      subtitleToRegionMap.current.set(subtitle.id, region);
    });
  }, [wavesurfer, subtitles]);

  // Handle Wavesurfer events
  useEffect(() => {
    if (!wavesurfer) return;

    const handleReady = () => {
      setIsLoading(false);
      // Build regions once initially
      updateRegions();
      // If you want to auto-play after load:
      if (isPlaying) {
        wavesurfer.play();
      } else {
        wavesurfer.pause();
      }
    };

    // Called whenever a region is dragged/resized
    const handleRegionUpdate = (region: Region) => {
      const subtitleId = Number.parseInt(region.id);
      const contentEl = region.content as HTMLElement;
      let newStartTime = region.start;
      let newEndTime = region.end;
      let adjusted = false;

      // Check for overlaps with other regions and adjust times
      subtitleToRegionMap.current.forEach((otherRegion, otherId) => {
        if (otherId !== subtitleId) {
          if (
            newStartTime < otherRegion.end &&
            newEndTime > otherRegion.start
          ) {
            // Overlap detected
            adjusted = true;
            if (region.start < otherRegion.start) {
              // Adjust end time to be just before the start of the other region
              newEndTime = otherRegion.start;
            } else {
              // Adjust start time to be just after the end of the other region
              newStartTime = otherRegion.end;
            }
          }
        }
      });

      if (adjusted) {
        // Update the region with adjusted times
        region.setOptions({
          start: newStartTime,
          end: newEndTime,
        });
      }

      const newStartTimeFormatted = secondsToTime(newStartTime);
      const newEndTimeFormatted = secondsToTime(newEndTime);

      const subtitle = subtitles.find((s) => s.id === subtitleId);
      if (subtitle) {
        region.setOptions({
          content: renderRegionContent(
            newStartTimeFormatted,
            subtitle.text,
            newEndTimeFormatted
          ),
        });
      }

      onUpdateSubtitleTiming(
        subtitleId,
        newStartTimeFormatted,
        newEndTimeFormatted
      );
    };

    // Register events
    wavesurfer.on("ready", handleReady);

    // Or if you want to do something on "region-updated":
    const regionsPlugin = wavesurfer
      .getActivePlugins()
      .find((p) => p instanceof RegionsPlugin) as RegionsPlugin;
    if (regionsPlugin) {
      regionsPlugin.on("region-updated", handleRegionUpdate);
    }

    return () => {
      // Cleanup
      wavesurfer.un("ready", handleReady);
      if (regionsPlugin) {
        regionsPlugin.un("region-updated", handleRegionUpdate);
      }
    };
  }, [wavesurfer, isPlaying, subtitles, onUpdateSubtitleTiming, updateRegions]);

  useEffect(() => {
    if (!wavesurfer) return;
    // Optionally check if (wavesurfer.isReady) here,
    // but usually if subtitles change after "ready,"
    // you can just call updateRegions().
    updateRegions();
  }, [wavesurfer, subtitles, updateRegions]);

  // Update subtitle text requires only updating the target region content
  useEffect(() => {
    if (!wavesurfer) return;
    subtitles.map((subtitle) => {
      const region = subtitleToRegionMap.current.get(subtitle.id);
      if (region?.element) {
        region.setOptions({
          content: renderRegionContent(
            subtitle.startTime,
            subtitle.text,
            subtitle.endTime
          ),
        });
      }
    });
  }, [subtitles, wavesurfer]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full bg-secondary rounded-lg"
        role="button"
        tabIndex={0}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
