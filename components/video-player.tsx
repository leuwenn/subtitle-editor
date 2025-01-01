"use client";

import { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  mediaFile: File | null;
  onProgress: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  seekTime: number;
  isPlaying: boolean;
}

export function VideoPlayer({
  mediaFile,
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

  useEffect(() => {
    if (mediaFile) {
      setMediaUrl(URL.createObjectURL(mediaFile));
    }
    // return () => {
    //   if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    // };
  }, [mediaFile]);

  if (!mediaFile || !mediaUrl) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Upload a video file to get started
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
