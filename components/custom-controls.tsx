import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { PlayIcon, PauseIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

interface CustomControlsProps {
  isPlaying: boolean;
  playbackTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: string) => void;
}

export function CustomControls({
  isPlaying,
  playbackTime,
  duration,
  onPlayPause,
  onSeek,
  playbackRate,
  onChangePlaybackRate,
}: CustomControlsProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedTime = `${minutes}:${
      remainingSeconds < 10 ? "0" : ""
    }${remainingSeconds}`;
    return formattedTime;
  };

  return (
    <div className="p-4 flex items-center gap-4 h-[6vh] border-t-2 border-black">
      <Button onClick={onPlayPause} variant="ghost">
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger className="">{playbackRate}x</DropdownMenuTrigger>
        <DropdownMenuContent className="border-1 border-black">
          <DropdownMenuRadioGroup
            value={playbackRate.toString()}
            onValueChange={onChangePlaybackRate}
          >
            <DropdownMenuRadioItem value="0.5">0.5x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="0.75">0.75x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1">1x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1.25">1.25x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1.5">1.5x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="2">2x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="3">3x</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="4">4x</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Slider
        value={[playbackTime]}
        max={duration}
        step={0.01}
        onValueChange={(value) => onSeek(value[0])}
        className="w-full"
      />
      <span className="text-sm w-fit">
        {formatTime(playbackTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
