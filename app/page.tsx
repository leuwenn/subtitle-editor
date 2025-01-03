"use client";

import { SubtitleList } from "@/components/subtitle-list";
import { VideoPlayer } from "@/components/video-player";
import { parseSRT } from "@/lib/srtParser";
import {
  addSubtitle,
  deleteSubtitle,
  mergeSubtitles,
  updateSubtitle,
} from "@/lib/subtitleOperations";
import type { Subtitle } from "@/types/subtitle";
import dynamic from "next/dynamic";
import { useCallback, useState, useMemo } from "react";

const WaveformVisualizer = dynamic(
  () => import("@/components/waveform-visualizer"),
  {
    ssr: false, // Disable server-side rendering
  }
);

export default function Home() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [srtFileName, setSrtFileName] = useState<string>('subtitles.srt');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSrtFileName(file.name);
    const text = await file.text();
    const parsedSubtitles = parseSRT(text);
    setSubtitles(parsedSubtitles);
  };

  // Use useCallback to memoize onDeleteSubtitle
  const onDeleteSubtitle = useCallback((id: number) => {
    setSubtitles((prevSubtitles) => deleteSubtitle(prevSubtitles, id));
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="h-[6vh] border-b flex items-center px-4 justify-between">
        <h1 className="text-lg font-semibold">Subtitle Editor</h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => {
              if (subtitles.length === 0) return;
              
              const srtContent = subtitles
                .sort((a, b) => a.id - b.id)
                .map((subtitle) => {
                  return `${subtitle.id}\n${subtitle.startTime} --> ${subtitle.endTime}\n${subtitle.text}\n`;
                })
                .join('\n');
              
              const blob = new Blob([srtContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = srtFileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            disabled={subtitles.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-full 
                     bg-violet-50 text-violet-700 hover:bg-violet-100 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download SRT
          </button>
          <label className="text-sm text-gray-600 mb-1">
            Upload Media
            <input
              type="file"
              name="media"
              accept="audio/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0 file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
          </label>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top section - Split panels */}
        <div className="flex h-[64vh]">
          {/* Left panel - Subtitle list */}
          <div className="w-1/2">
            <div className="h-full">
              {subtitles.length > 0 ? (
                <SubtitleList
                  subtitles={subtitles}
                  currentTime={playbackTime}
                  onUpdateSubtitle={(id: number, newText: string) => {
                    setSubtitles(updateSubtitle(subtitles, id, newText));
                  }}
                  onMergeSubtitles={(id1: number, id2: number) => {
                    setSubtitles(mergeSubtitles(subtitles, id1, id2));
                  }}
                  onAddSubtitle={(beforeId: number, afterId: number) => {
                    setSubtitles(addSubtitle(subtitles, beforeId, afterId));
                  }}
                  onDeleteSubtitle={(id: number) => {
                    setSubtitles(deleteSubtitle(subtitles, id));
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <label className="cursor-pointer hover:text-blue-500 hover:underline">
                    Upload an SRT file to get started
                    <input
                      type="file"
                      className="hidden"
                      accept=".srt"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Media player */}
          <div className="w-1/2 p-4">
            <VideoPlayer
              mediaFile={mediaFile}
              onProgress={(time) => setPlaybackTime(time)}
              onPlayPause={(playing) => setIsPlaying(playing)}
              seekTime={playbackTime}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* Bottom section - Waveform */}
        <div className="h-[30vh] p-2">
          <WaveformVisualizer
            mediaFile={mediaFile}
            currentTime={playbackTime}
            isPlaying={isPlaying}
            subtitles={subtitles}
            onSeek={setPlaybackTime}
            onPlayPause={setIsPlaying}
            onUpdateSubtitleTiming={(id, startTime, endTime) => {
              setSubtitles((subs) =>
                subs.map((sub) =>
                  sub.id === id ? { ...sub, startTime, endTime } : sub
                )
              );
            }}
            onUpdateSubtitleText={(id: number, newText: string) => {
              setSubtitles(updateSubtitle(subtitles, id, newText));
            }}
            onDeleteSubtitle={onDeleteSubtitle}
          />
        </div>
      </div>
    </div>
  );
}
