"use client"; // Ensure this is the very first line

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// VideoPlayer is now dynamically imported below
import {
  SubtitleProvider,
  useSubtitleContext,
} from "@/context/subtitle-context"; // Import context
import { parseSRT } from "@/lib/subtitleOperations"; // Keep only parseSRT
import { timeToSeconds } from "@/lib/utils"; // Use the original timeToSeconds
import {
  DownloadIcon,
  QuestionMarkCircledIcon,
  VideoIcon,
} from "@radix-ui/react-icons";
import {
  IconArrowBack,
  IconArrowForward,
  IconBadgeCc,
  IconKeyboard,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Link from "next/link";
// Import useState
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const VideoPlayer = dynamic(() => import("@/components/video-player"), {
  ssr: false, // Disable server-side rendering
});

const WaveformVisualizer = dynamic(
  () => import("@/components/waveform-visualizer"),
  {
    ssr: false, // Disable server-side rendering
  },
);

interface WaveformRef {
  scrollToRegion: (uuid: string) => void;
  setWaveformTime: (time: number) => void;
}

// Define the main content component that will consume the context
function MainContent() {
  const waveformRef = useRef<WaveformRef>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const srtFileInputRef = useRef<HTMLInputElement>(null);
  // Get subtitle state and actions from context
  const {
    subtitles,
    setInitialSubtitles, // Use this instead of setSubtitlesWithHistory
    undoSubtitles,
    redoSubtitles,
    canUndoSubtitles,
    canRedoSubtitles,
    // Action functions are now available via context, no need for local handlers like handleUpdateSubtitleText etc.
  } = useSubtitleContext();

  // Keep page-specific state here
  const [srtFileName, setSrtFileName] = useState<string>("subtitles.srt");
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingSrtFile, setPendingSrtFile] = useState<File | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>("Load media");

  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  // State to track which subtitle is being edited
  const [editingSubtitleUuid, setEditingSubtitleUuid] = useState<string | null>(
    null,
  );

  const handleFileUpload = async (file: File) => {
    setSrtFileName(file.name);
    const text = await file.text();
    const parsedSubtitles = parseSRT(text);
    // Use the context action to set initial subtitles
    setInitialSubtitles(parsedSubtitles);
  };

  const handleSrtFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
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

  // --- Old Subtitle Modification Callbacks Removed ---
  // Actions are now handled by context provider and consumed directly by child components

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
      const activeElement = document.activeElement;
      // Check if the focused element is an input or textarea
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA"
      ) {
        return; // Allow spacebar default behavior in inputs/textareas
      }

      if (event.code === "Space") {
        event.preventDefault(); // Prevent default space behavior (like scrolling) elsewhere
        setIsPlaying(!isPlaying);
      } else if (event.key === "Tab") {
        event.preventDefault(); // Prevent default tab behavior (focus switching)

        // Find the subtitle currently playing
        const currentSubtitle = subtitles.find((sub) => {
          // Convert SRT time strings to seconds using the original util function
          const startTimeSeconds = timeToSeconds(sub.startTime);
          const endTimeSeconds = timeToSeconds(sub.endTime);
          return (
            playbackTime >= startTimeSeconds && playbackTime < endTimeSeconds
          );
        });

        if (currentSubtitle) {
          setEditingSubtitleUuid(currentSubtitle.uuid); // Set the UUID of the subtitle to edit
          // Optionally, scroll the list to the editing item if needed
          // This might require passing a ref or callback to SubtitleList
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup function
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // Dependencies now include subtitles and playbackTime for finding the current subtitle
  }, [isPlaying, subtitles, playbackTime]); // Removed setEditingSubtitleUuid

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
        <h1 className="text-lg font-semibold">Éditeur de sous-titre Ouideo</h1>
        <div className="flex gap-4 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canUndoSubtitles}
                  onClick={undoSubtitles}
                  className="cursor-pointer"
                  aria-label="Undo"
                >
                  <IconArrowBack />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Annuler</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canRedoSubtitles}
                  onClick={redoSubtitles}
                  className="cursor-pointer"
                  aria-label="Redo"
                >
                  <IconArrowForward />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refaire</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* FindReplace will get subtitles & actions from context */}
          <FindReplace />

          <Label className="cursor-pointer">
            <Input
              ref={mediaFileInputRef}
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
            />
            <Button
              variant="secondary"
              onClick={() => {
                mediaFileInputRef.current?.click();
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
              ref={srtFileInputRef}
              type="file"
              className="hidden"
              accept=".srt"
              onChange={handleSrtFileSelect}
            />
            <Button
              variant="secondary"
              onClick={() => {
                srtFileInputRef.current?.click();
              }}
              className="hover:bg-amber-500 hover:text-white bg-amber-300 text-black rounded-sm cursor-pointer"
            >
              <IconBadgeCc />
              Charger SRT
            </Button>
          </Label>

          <Button
            onClick={downloadSRT}
            disabled={subtitles.length === 0}
            className="cursor-pointer"
          >
            <DownloadIcon />
            Sauvegarder SRT
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
                // SubtitleList will get subtitles & actions from context
                <SubtitleList
                  // Pass only non-subtitle state/props
                  currentTime={playbackTime}
                  onScrollToRegion={(uuid) => {
                    if (waveformRef.current) {
                      waveformRef.current.scrollToRegion(uuid);
                    }
                  }}
                  setIsPlaying={setIsPlaying}
                  setPlaybackTime={setPlaybackTime}
                  editingSubtitleUuid={editingSubtitleUuid}
                  setEditingSubtitleUuid={setEditingSubtitleUuid}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground rounded-sm">
                  <Label className="cursor-pointer text-xl hover:text-blue-500 underline">
                    Charger un fichier SRT
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
                  <p className="text-xl my-4">ou</p>
                  <button
                    type="button"
                    onClick={() =>
                      // Use the context action for starting from scratch
                      setInitialSubtitles([
                        {
                          uuid: uuidv4(), // Assign UUID
                          id: 1,
                          startTime: "00:00:00,000",
                          endTime: "00:00:03,000",
                          text: "Nouveau sous-titre",
                        },
                      ])
                    }
                    className="cursor-pointer text-xl text-muted-foreground underline hover:text-blue-500"
                  >
                    Commencer de zéro
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Media player */}
          <div className="w-1/2 border-l-2 border-black">
            {/* VideoPlayer will get subtitles from context */}
            <VideoPlayer
              mediaFile={mediaFile}
              setMediaFile={setMediaFile}
              setMediaFileName={setMediaFileName}
              onProgress={(time) => {
                setPlaybackTime(time);
                waveformRef.current?.setWaveformTime(time);
              }}
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
                isPlaying={isPlaying}
                onSeek={setPlaybackTime}
                onPlayPause={setIsPlaying}
                // Subtitle action props removed (will use context)
              />
            </>
          ) : (
            <div className="grid grid-cols-2 items-left h-full text-gray-600 px-8 py-4 border-t-2 border-black">
              <div className="text-lg text-gray-600 p-2">
                <p className="">
                  Après avoir chargé les sous-titres et le fichier média :
                </p>
                <ul className="list-disc list-inside my-2">
                  <li>
                    Cliquez sur le texte du sous-titre ou les horodatages pour
                    modifier vos légendes.
                  </li>
                  <li>
                    Cliquez sur les icônes pour ajouter, fusionner ou supprimer
                    des sous-titres.
                  </li>
                  <li>
                    Faites glisser les bordures en pointillés sur la forme
                    d'onde pour modifier les horodatages des sous-titres.
                  </li>

                  <li>
                    N'oubliez pas de cliquer sur "Sauvegarder SRT" pour
                    enregistrer les sous-titres lorsque vous terminez l'édition
                    !
                  </li>
                </ul>
              </div>
              <div className="p-2">
                <h2 className="text-lg inline-flex items-center">
                  <IconKeyboard className="mr-2" />
                  Raccourcis :
                </h2>
                <ul className="list-disc list-inside px-2">
                  <li>
                    <kbd>espace</kbd> pour lire/mettre en pause la vidéo.
                  </li>
                  <li>
                    <kbd>tab</kbd> pour modifier le texte du sous-titre actuel.
                  </li>
                  <li>
                    <kbd>↑</kbd> et <kbd>↓</kbd> pour passer au sous-titre
                    précédent/suivant.
                  </li>
                  <li>
                    <kbd>shift</kbd> + <kbd>entrée</kbd> pour diviser le texte
                    du sous-titre à la position du curseur lors de l'édition.
                  </li>
                  <li>
                    <kbd>shift</kbd> + <kbd>retour arrière</kbd> pour fusionner
                    le sous-titre actuel avec le précédent.
                  </li>
                  <li>
                    <kbd>ctrl</kbd> + <kbd>z</kbd> (Windows) ou{" "}
                    <kbd>&#8984;</kbd> + <kbd>z</kbd> (Mac) pour annuler,{" "}
                    <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>z</kbd> (Windows)
                    ou <kbd>&#8984;</kbd> + <kbd>shift</kbd> + <kbd>z</kbd>{" "}
                    (Mac) pour refaire.
                  </li>
                </ul>
              </div>
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
              <AlertDialogTitle>
                Remplacer les sous-titres existants ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Charger un nouveau fichier SRT remplacera les sous-titres
                actuels. Assurez-vous d'avoir d'abord téléchargé le SRT actuel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingSrtFile(null)}>
                Annuler
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
                Oui
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Default export wraps MainContent with the provider
export default function Home() {
  return (
    <SubtitleProvider>
      <MainContent />
    </SubtitleProvider>
  );
}
