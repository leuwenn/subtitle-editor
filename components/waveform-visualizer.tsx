"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Timeline from "wavesurfer.js/dist/plugins/timeline.esm.js";
import Hover from "wavesurfer.js/dist/plugins/hover.esm.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
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
}

export function WaveformVisualizer({
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

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 100,
    waveColor: "#a3a3a3",
    progressColor: "#171717",
    cursorColor: "#b91c1c",
    barWidth: 1,
    barGap: 1,
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
          timeInterval: 0.2,
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

  // Sync progress with the right panel meidia player
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

  // Sync current time with the media player
  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.setTime(currentTime);
    }
  }, [wavesurfer, currentTime]);

  // Load media file into wavesurfer
  useEffect(() => {
    if (mediaFile) {
      setMediaUrl(URL.createObjectURL(mediaFile));
    }
  }, [mediaFile]);

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

  // Handle subtitle region creation and updates
  useEffect(() => {
    if (wavesurfer) {
      const handlePlay = () => {
        wavesurfer.setMuted(true);
      };

      const updateRegions = () => {
        const regionsPlugin = wavesurfer
          .getActivePlugins()
          .find((plugin) => plugin instanceof RegionsPlugin) as RegionsPlugin;

        if (regionsPlugin) {
          // Store existing regions' drag and resize states
          regionsPlugin.clearRegions();

          subtitles.forEach((subtitle, i) => {
            const start = timeToSeconds(subtitle.startTime);
            const end = timeToSeconds(subtitle.endTime);
            regionsPlugin.addRegion({
              id: subtitle.id.toString(),
              start,
              end,
              content: `${subtitle.startTime} ${subtitle.text} ${subtitle.endTime}`,
              color: "#ef444420",
              drag: true,
              resize: true,
              minLength: 0.1,
            });
          });

          // Add region update handler
          regionsPlugin.on("region-updated", (region) => {
            const subtitleId = Number.parseInt(region.id);
            const newStartTime = secondsToTime(region.start);
            const newEndTime = secondsToTime(region.end);
            onUpdateSubtitleTiming(subtitleId, newStartTime, newEndTime);
          });
        }
      };

      wavesurfer.on("play", handlePlay);
      wavesurfer.on("ready", updateRegions);

      // Update regions when subtitles change
      updateRegions();

      if (isPlaying) {
        wavesurfer.play();
      } else {
        wavesurfer.pause();
      }

      return () => {
        wavesurfer.un("play", handlePlay);
        wavesurfer.un("ready", updateRegions);
      };
    }
  }, [wavesurfer, isPlaying, subtitles, onUpdateSubtitleTiming]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full bg-secondary rounded-lg"
        role="button"
        tabIndex={0}
      />
    </div>
  );
}
