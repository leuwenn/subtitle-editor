"use client";

import { Label } from "./ui/label";
import { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";
import { Input } from "./ui/input";

interface VideoPlayerProps {
  setMediaFile: (file: File | null) => void;
  onProgress: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  seekTime: number;
  isPlaying: boolean;
}

export function VideoPlayer({
  setMediaFile,
  onProgress,
  onPlayPause,
  seekTime,
  isPlaying,
}: VideoPlayerProps) {
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const playerRef = useRef<ReactPlayer>(null);

  useEffect(() => {
    if (playerRef.current && typeof seekTime === "number") {
      const player = playerRef.current;
      const currentTime = player.getCurrentTime();
      if (Math.abs(currentTime - seekTime) > 0.5) {
        player.seekTo(seekTime, "seconds");
      }
    }
  }, [seekTime]);

  if (!mediaUrl) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Label className="cursor-pointer text-xl hover:text-blue-500 underline">
          Load a video / audio file
          <Input
            className="hidden"
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMediaFile(file);
              setMediaUrl(URL.createObjectURL(file));
            }}
          />
        </Label>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
      <ReactPlayer
        ref={playerRef}
        url={mediaUrl}
        width="100%"
        height="100%"
        controls={true}
        progressInterval={100}
        onProgress={(state) => {
          const player = playerRef.current?.getInternalPlayer();
          if (player && !player.seeking) {
            onProgress(state.playedSeconds);
          }
        }}
        onPlay={() => onPlayPause(true)}
        onPause={() => onPlayPause(false)}
        playing={isPlaying}
        config={{
          file: {
            attributes: {
              controlsList: "nodownload",
              playsInline: true,
            },
          },
        }}
      />
    </div>
  );
}
