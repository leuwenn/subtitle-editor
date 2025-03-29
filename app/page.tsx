"use client";

import CustomControls from "@/components/custom-controls";
import FindReplace from "@/components/find-replace";
import SubtitleList from "@/components/subtitle-list";
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
import VideoPlayer from "@/components/video-player";
import { useUndoableState } from "@/hooks/use-undoable-state";
import {
  addSubtitle,
  deleteSubtitle,
  mergeSubtitles,
  parseSRT,
  splitSubtitle,
  updateSubtitle,
  updateSubtitleEndTime,
  updateSubtitleStartTime,
} from "@/lib/subtitleOperations";
import type { Subtitle } from "@/types/subtitle";
import {
  DownloadIcon,
  QuestionMarkCircledIcon,
  VideoIcon,
} from "@radix-ui/react-icons";
import {
  IconArrowBack,
  IconArrowForward,
  IconBadgeCc,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid"; // Import uuid

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

  // Replace useState with useUndoableState for subtitles
  const [
    subtitles,
    setSubtitlesWithHistory,
    undoSubtitles,
    redoSubtitles,
    canUndoSubtitles,
    canRedoSubtitles,
  ] = useUndoableState<Subtitle[]>([]);

  const [srtFileName, setSrtFileName] = useState<string>("subtitles.srt");
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingSrtFile, setPendingSrtFile] = useState<File | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>("Load media");

  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handleFileUpload = async (file: File) => {
    setSrtFileName(file.name);
    const text = await file.text();
    const parsedSubtitles = parseSRT(text);
    // Use the undoable state setter (resets history when loading a new file)
    setSubtitlesWithHistory(parsedSubtitles);
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

  // --- Subtitle Modification Callbacks using Undoable State ---

  // Handle operations that return a reducer function: (prevState) => newState
  const handleUpdateSubtitleStartTime = (id: number, newTime: string) => {
    setSubtitlesWithHistory(updateSubtitleStartTime(id, newTime));
  };

  const handleUpdateSubtitleEndTime = (id: number, newTime: string) => {
    setSubtitlesWithHistory(updateSubtitleEndTime(id, newTime));
  };

  // Handle operations that return the new state directly: newState
  const handleUpdateSubtitleText = (id: number, newText: string) => {
    setSubtitlesWithHistory((prev) => updateSubtitle(prev, id, newText));
  };

  const handleMergeSubtitles = (id1: number, id2: number) => {
    setSubtitlesWithHistory((prev) => mergeSubtitles(prev, id1, id2));
  };

  const handleAddSubtitle = (beforeId: number, afterId: number | null) => {
    setSubtitlesWithHistory((prev) => addSubtitle(prev, beforeId, afterId));
  };

  const onDeleteSubtitle = (id: number) => {
    setSubtitlesWithHistory((prev) => deleteSubtitle(prev, id));
  };

  const handleSplitSubtitle = (
    id: number,
    caretPos: number,
    textLength: number
  ) => {
    setSubtitlesWithHistory((prev) =>
      splitSubtitle(prev, id, caretPos, textLength)
    );
  };

  // Handle direct state update (like from WaveformVisualizer drag)
  const handleUpdateSubtitleTiming = (
    id: number,
    startTime: string,
    endTime: string
  ) => {
    setSubtitlesWithHistory((subs) =>
      subs.map((sub) => (sub.id === id ? { ...sub, startTime, endTime } : sub))
    );
  };
  // --- End Subtitle Modification Callbacks ---

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (subtitles.length > 0) {
        event.preventDefault();
        // Setting returnValue is required for most modern browsers
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [subtitles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the focused element is a textarea
      if (document.activeElement?.tagName === "TEXTAREA") return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]); // Keep this dependency for play/pause

  // Effect for Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleUndoRedo = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Check for Cmd/Ctrl + Z for Undo
      if (modKey && !event.shiftKey && event.key.toLowerCase() === "z") {
        // Prevent default browser/input undo behavior only if we can undo
        if (canUndoSubtitles) {
          event.preventDefault();
          undoSubtitles();
        }
      }
      // Check for Cmd/Ctrl + Shift + Z for Redo
      else if (modKey && event.shiftKey && event.key.toLowerCase() === "z") {
        // Prevent default browser redo behavior only if we can redo
        if (canRedoSubtitles) {
          event.preventDefault();
          redoSubtitles();
        }
      }
    };

    window.addEventListener("keydown", handleUndoRedo);
    return () => {
      window.removeEventListener("keydown", handleUndoRedo);
    };
    // Dependencies include the undo/redo functions and their possibility flags
  }, [undoSubtitles, redoSubtitles, canUndoSubtitles, canRedoSubtitles]);

  return (
    <div className="flex flex-col h-screen">
      <nav className="h-[6vh] border-black border-b-2 flex items-center px-12 justify-between">
        <h1 className="text-lg font-semibold">Subtitle Editor</h1>
        <div className="flex gap-4 items-center">
          <Link href="/faq" target="_blank">
            <Button variant="ghost" className="cursor-pointer">
              <QuestionMarkCircledIcon />
            </Button>
          </Link>

          <Button
            size="sm"
            variant="ghost"
            disabled={!canUndoSubtitles}
            onClick={undoSubtitles}
            className="cursor-pointer"
          >
            <IconArrowBack />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={!canRedoSubtitles}
            onClick={redoSubtitles}
            className="cursor-pointer"
          >
            <IconArrowForward />
          </Button>

          <FindReplace
            subtitles={subtitles}
            setSubtitles={setSubtitlesWithHistory}
          />

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
              onClick={() => {
                document.getElementById("media-file-input")?.click();
              }}
              className="bg-cyan-300 hover:bg-cyan-500 hover:text-white text-black rounded-sm cursor-pointer"
            >
              <VideoIcon />
              <span className="max-w-36 flex-1 overflow-hidden whitespace-nowrap text-ellipsis text-left">
                {mediaFileName}
              </span>
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
              className="hover:bg-amber-500 hover:text-white bg-amber-300 text-black rounded-sm cursor-pointer"
            >
              <IconBadgeCc />
              Load SRT
            </Button>
          </Label>

          <Button
            onClick={downloadSRT}
            disabled={subtitles.length === 0}
            className="cursor-pointer"
          >
            <DownloadIcon />
            Save SRT
          </Button>
        </div>
      </nav>

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
                  onScrollToRegion={(id) => {
                    if (waveformRef.current) {
                      waveformRef.current.scrollToRegion(id);
                    }
                  }}
                  // Pass the new memoized callbacks that use setSubtitlesWithHistory
                  onUpdateSubtitleStartTime={handleUpdateSubtitleStartTime}
                  onUpdateSubtitleEndTime={handleUpdateSubtitleEndTime}
                  onUpdateSubtitle={handleUpdateSubtitleText}
                  onMergeSubtitles={handleMergeSubtitles}
                  onAddSubtitle={handleAddSubtitle}
                  onDeleteSubtitle={onDeleteSubtitle}
                  onSplitSubtitle={handleSplitSubtitle}
                  setIsPlaying={setIsPlaying}
                  setPlaybackTime={setPlaybackTime}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground rounded-sm cursor-pointer">
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
                  <p className="text-xl my-4">Or</p>
                  <button
                    type="button"
                    onClick={() =>
                      // Use the undoable state setter for starting from scratch
                      setSubtitlesWithHistory([
                        {
                          uuid: uuidv4(), // Assign UUID
                          id: 1,
                          startTime: "00:00:00,000",
                          endTime: "00:00:03,000",
                          text: "New subtitle",
                        },
                      ])
                    }
                    className="cursor-pointer text-xl text-muted-foreground underline hover:text-blue-500"
                  >
                    Start from scratch
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Media player */}
          <div className="w-1/2 border-l-2 border-black">
            <VideoPlayer
              mediaFile={mediaFile}
              subtitles={subtitles}
              setMediaFile={setMediaFile}
              setMediaFileName={setMediaFileName}
              onProgress={(time) => setPlaybackTime(time)}
              onPlayPause={(playing) => setIsPlaying(playing)}
              onDuration={(duration) => setDuration(duration)}
              seekTime={playbackTime}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
            />
          </div>
        </div>

        {/* Bottom section - Waveform */}
        <div className="h-[20vh]">
          {/* Custom Controls */}

          {mediaFile ? (
            <>
              <CustomControls
                isPlaying={isPlaying}
                playbackTime={playbackTime}
                duration={duration}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onSeek={(time) => setPlaybackTime(time)}
                playbackRate={playbackRate}
                onChangePlaybackRate={(rate) =>
                  setPlaybackRate(Number.parseFloat(rate))
                }
              />
              <WaveformVisualizer
                ref={waveformRef}
                mediaFile={mediaFile}
                currentTime={playbackTime}
                isPlaying={isPlaying}
                subtitles={subtitles}
                onSeek={setPlaybackTime}
                onPlayPause={setIsPlaying}
                // Pass the new memoized callbacks that use setSubtitlesWithHistory
                onUpdateSubtitleTiming={handleUpdateSubtitleTiming}
                onUpdateSubtitleText={handleUpdateSubtitleText}
                onDeleteSubtitle={onDeleteSubtitle}
              />
            </>
          ) : (
            <div className="flex flex-col items-left text-lg  h-full text-gray-600 px-8 py-4 border-t-2 border-black">
              <p className="my-2">After loading the media and subtitles:</p>
              <ul className="list-disc list-inside">
                <li>Click the subtitle text or time stamps to edit.</li>
                <li>
                  When editing a subtitle text, press <kbd>shift</kbd> +{" "}
                  <kbd>enter</kbd> to split the subtitle into two.
                </li>
                <li>Click the icons to add, merge or delete subtitles.</li>
                <li>
                  Drag the dashed borders on the waveform to change the
                  subtitles' time stamps.
                </li>
                <li>
                  Press <kbd>ctrl</kbd> + <kbd>z</kbd> (Windows) or{" "}
                  <kbd>&#8984;</kbd> + <kbd>z</kbd> (Mac) to undo, and{" "}
                  <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>z</kbd> (Windows) or{" "}
                  <kbd>&#8984;</kbd> + <kbd>shift</kbd> + <kbd>z</kbd> (Mac) to
                  redo.
                </li>
                <li>
                  Remember to click "Save SRT" to save the subtitles after you
                  finish editing!
                </li>
              </ul>
            </div>
          )}
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
                sure you have downloaded the current SRT first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingSrtFile(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-500"
                onClick={async () => {
                  if (pendingSrtFile) {
                    await handleFileUpload(pendingSrtFile);
                    setPendingSrtFile(null);
                  }
                  setShowOverwriteDialog(false);
                }}
              >
                Yes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
