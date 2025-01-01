"use client";

import { useState } from "react";
import { SubtitleList } from "@/components/subtitle-list";
import { parseSRT } from "@/lib/srtParser";
import type { Subtitle } from "@/types/subtitle";
import { updateSubtitle, mergeSubtitles, addSubtitle, deleteSubtitle } from "@/lib/subtitleOperations";

export default function Home() {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsedSubtitles = parseSRT(text);
    setSubtitles(parsedSubtitles);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top toolbar */}
      <div className="h-12 border-b flex items-center px-4 justify-between">
        <h1 className="text-lg font-semibold">Subtitle Editor</h1>
        <input
          type="file"
          accept=".srt"
          onChange={handleFileUpload}
          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0 file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left panel - Subtitle list */}
        <div className="w-1/2 border-r">
          <div className="h-full">
            {subtitles.length > 0 ? (
              <SubtitleList 
                subtitles={subtitles} 
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
                Upload an SRT file to get started
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Video player */}
        <div className="w-1/2 p-4">
          <div className="bg-black aspect-video rounded-lg flex items-center justify-center text-white">
            Video Player
          </div>
        </div>
      </div>

      {/* Bottom panel - Waveform */}
      <div className="h-32 border-t p-4">
        <div className="w-full h-full bg-secondary rounded-lg flex items-center justify-center">
          Waveform Visualization
        </div>
      </div>
    </div>
  );
}
