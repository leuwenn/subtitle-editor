import type { Subtitle } from "@/types/subtitle";

export function parseSRT(srtContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  blocks.map((block) => {
    const lines = block.trim().split("\n");
    if (lines.length >= 3) {
      const id = Number.parseInt(lines[0]);
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
      );

      if (timeMatch) {
        const [, startTime, endTime] = timeMatch;
        const text = lines.slice(2).join("\n");

        subtitles.push({
          id,
          startTime,
          endTime,
          text,
        });
      }
    }
  });

  return subtitles;
}
