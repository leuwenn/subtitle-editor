"use client";

import { SubtitleList } from "@/components/subtitle-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCallback, useRef, useState } from "react";

const WaveformVisualizer = dynamic(
  () => import("@/components/waveform-visualizer"),
  {
    ssr: false, // Disable server-side rendering
  }
);

interface WaveformRef {
  scrollToRegion: (id: number) => void;
}

export default function Home() {
  const waveformRef = useRef<WaveformRef>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [srtFileName, setSrtFileName] = useState<string>("subtitles.srt");
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingSrtFile, setPendingSrtFile] = useState<File | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>("Load media file");

  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleFileUpload = async (file: File) => {
    setSrtFileName(file.name);
    const text = await file.text();
    const parsedSubtitles = parseSRT(text);
    setSubtitles(parsedSubtitles);
  };

  const handleSrtFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (subtitles.length > 0) {
      setPendingSrtFile(file);
      setShowOverwriteDialog(true);
    } else {
      await handleFileUpload(file);
    }
  };

  const downloadSRT = () => {
    if (subtitles.length === 0) return;

    const srtContent = subtitles
      .sort((a, b) => a.id - b.id)
      .map((subtitle) => {
        return `${subtitle.id}\n${subtitle.startTime} --> ${subtitle.endTime}\n${subtitle.text}\n`;
      })
      .join("\n");

    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = srtFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Use useCallback to memoize onDeleteSubtitle
  const onDeleteSubtitle = useCallback((id: number) => {
    setSubtitles((prevSubtitles) => deleteSubtitle(prevSubtitles, id));
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <nav className="h-[6vh] border-black border-b-2 flex items-center px-12 justify-between">
        <h1 className="text-lg font-semibold">Subtitle Editor</h1>
        <div className="flex gap-4 items-center">
          <Label className="cursor-pointer">
            <Input
              type="file"
              className="hidden"
              accept="audio/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setMediaFile(null); // Reset first to trigger a re-render
                setTimeout(() => {
                  setMediaFile(file);
                  setMediaFileName(file.name);
                }, 0);
              }}
              id="media-file-input"
            />
            <Button
              variant="secondary"
              className=""
              onClick={() => {
                document.getElementById("media-file-input")?.click();
              }}
            >
              {mediaFileName}
            </Button>
          </Label>
          <Label className="cursor-pointer">
            <Input
              type="file"
              className="hidden"
              accept=".srt"
              onChange={handleSrtFileSelect}
              id="srt-file-input"
            />
            <Button
              variant="secondary"
              onClick={() => {
                document.getElementById("srt-file-input")?.click();
              }}
            >
              Load SRT
            </Button>
          </Label>
          <Button onClick={downloadSRT} disabled={subtitles.length === 0}>
            Download SRT
          </Button>
        </div>
      </nav>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top section - Split panels */}
        <div className="flex h-[70vh]">
          {/* Left panel - Subtitle list */}
          <div className="w-1/2">
            <div className="h-full">
              {subtitles.length > 0 ? (
                <SubtitleList
                  subtitles={subtitles}
                  currentTime={playbackTime}
                  onScrollToRegion={(id) => {
                    if (waveformRef.current) {
                      waveformRef.current.scrollToRegion(id);
                    }
                  }}
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
                  <Label className="cursor-pointer text-xl hover:text-blue-500 underline">
                    Upload an SRT file
                    <Input
                      type="file"
                      className="hidden"
                      accept=".srt"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleFileUpload(file);
                      }}
                    />
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Media player */}
          <div className="w-1/2 p-4">
            <VideoPlayer
              mediaFile={mediaFile}
              subtitles={subtitles}
              setMediaFile={setMediaFile}
              setMediaFileName={setMediaFileName}
              onProgress={(time) => setPlaybackTime(time)}
              onPlayPause={(playing) => setIsPlaying(playing)}
              seekTime={playbackTime}
              isPlaying={isPlaying}
            />
          </div>
        </div>

        {/* Bottom section - Waveform */}
        <div className="h-[20vh] p-2">
          <WaveformVisualizer
            ref={waveformRef}
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

      {/* SRT ovverwrite alert dialog */}
      <AlertDialog
        open={showOverwriteDialog}
        onOpenChange={setShowOverwriteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing subtitles?</AlertDialogTitle>
            <AlertDialogDescription>
              Loading a new SRT file will replace the current subtitles. Make
              sure you have downloaded them before replacing it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSrtFile(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingSrtFile) {
                  await handleFileUpload(pendingSrtFile);
                  setPendingSrtFile(null);
                }
                setShowOverwriteDialog(false);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
