"use client";

import { srtToVtt, subtitlesToSrtString } from "@/lib/utils";
import type { Subtitle } from "@/types/subtitle";
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface VideoPlayerProps {
  mediaFile: File | null;
  subtitles: Subtitle[];
  setMediaFile: (file: File | null) => void;
  setMediaFileName: (name: string) => void;
  onProgress: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  onDuration: (duration: number) => void;
  seekTime: number;
  isPlaying: boolean;
  playbackRate: number;
}

export default function VideoPlayer({
  mediaFile,
  subtitles,
  setMediaFile,
  setMediaFileName,
  onProgress,
  onPlayPause,
  onDuration,
  seekTime,
  isPlaying,
  playbackRate,
}: VideoPlayerProps) {
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [vttUrl, setVttUrl] = useState("");
  const playerRef = useRef<ReactPlayer>(null);
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    if (mediaFile) {
      setIsVideo(mediaFile.type.startsWith("video/"));
    }
  }, [mediaFile]);

  const lastPlayStateChange = useRef<number>(0);
  const DEBOUNCE_TIME = 200; // 200ms debounce

  useEffect(() => {
    if (playerRef.current && typeof seekTime === "number") {
      const player = playerRef.current;
      const currentTime = player.getCurrentTime();
      if (Math.abs(currentTime - seekTime) > 0.5) {
        player.seekTo(seekTime, "seconds");
      }
    }
  }, [seekTime]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Handle play/pause with debounce
  useEffect(() => {
    const now = Date.now();
    if (now - lastPlayStateChange.current < DEBOUNCE_TIME) {
      return; // Ignore rapid changes
    }
    lastPlayStateChange.current = now;
  }, [isPlaying]);

  useEffect(() => {
    if (mediaFile) {
      setMediaUrl(URL.createObjectURL(mediaFile));
    } else {
      setMediaUrl("");
    }
  }, [mediaFile]);

  useEffect(() => {
    // 1) Convert subtitles to a fresh .vtt Blob URL
    const srtString = subtitlesToSrtString(subtitles);
    const vttString = srtToVtt(srtString);
    const blob = new Blob([vttString], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    setVttUrl(url);

    // 2) Force the DOM to use a fresh <track src="...">
    const videoEl = playerRef.current?.getInternalPlayer();

    // Only do this if we're in the HTML5 player (ReactPlayer returns an <HTMLVideoElement>)
    if (videoEl && videoEl.tagName === "VIDEO") {
      // Remove all old <track> elements
      const existingTracks = videoEl.getElementsByTagName("track");
      while (existingTracks.length > 0) {
        existingTracks[0].remove();
      }

      // Create a new <track> element and append it
      const newTrack = document.createElement("track");
      newTrack.kind = "subtitles";
      newTrack.label = "Subtitles";
      newTrack.srclang = "en";
      newTrack.src = url;
      newTrack.default = true;

      // Wait for the track to load, then show it
      newTrack.addEventListener("load", () => {
        newTrack.track.mode = "showing";
      });

      videoEl.appendChild(newTrack);
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [subtitles]);

  if (!mediaUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Label className="cursor-pointer text-xl hover:text-blue-500 underline">
          Load a local video / audio file
          <Input
            className="hidden"
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMediaFile(file);
              setMediaUrl(URL.createObjectURL(file));
              setMediaFileName(file.name);
            }}
          />
        </Label>
        <p className="my-4 text-lg">
          Supported formats: <code>m4a</code>, <code>mp3</code>,{" "}
          <code>mp4</code>, <code>wav</code>, <code>aac</code>, <code>wma</code>
          , <code>flac</code>, <code>opus</code>, <code>ogg</code>,{" "}
          <code>webm</code>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <ReactPlayer
        ref={playerRef}
        url={mediaUrl}
        width="100%"
        height="100%"
        progressInterval={100}
        onProgress={(state) => {
          const player = playerRef.current?.getInternalPlayer();
          if (player && !player.seeking) {
            onProgress(state.playedSeconds);
          }
        }}
        onPlay={() => onPlayPause(true)}
        onPause={() => onPlayPause(false)}
        onDuration={onDuration}
        playing={isPlaying}
        playbackRate={playbackRate}
        config={{
          file: {
            forceVideo: false, // Do not force video
            attributes: {
              controlsList: "nodownload",
              playsInline: true,
            },
            tracks: [
              {
                label: "Subtitles",
                kind: "subtitles",
                src: vttUrl, // ← pass the in-memory URL to the track
                srcLang: "unknown",
                default: true,
              },
            ],
          },
        }}
      />
    </div>
  );
}
