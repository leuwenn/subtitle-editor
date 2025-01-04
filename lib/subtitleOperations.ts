import type { Subtitle } from "@/types/subtitle";

const DEFAULT_SUBTITLE_DURATION = 3; // seconds

export const reorderSubtitleIds = (subtitles: Subtitle[]): Subtitle[] => {
  let nextId = 1;
  return subtitles.map((subtitle) => {
    const newId = nextId;
    nextId++;
    return { ...subtitle, id: newId };
  });
};

export const updateSubtitle = (
  subtitles: Subtitle[],
  id: number,
  newText: string
): Subtitle[] => {
  return subtitles.map((sub) =>
    sub.id === id ? { ...sub, text: newText } : sub
  );
};

export const mergeSubtitles = (
  subtitles: Subtitle[],
  id1: number,
  id2: number
): Subtitle[] => {
  const sub1 = subtitles.find((s) => s.id === id1);
  const sub2 = subtitles.find((s) => s.id === id2);
  if (!sub1 || !sub2) return subtitles;

  const mergedSubtitle = {
    id: sub1.id,
    startTime: sub1.startTime,
    endTime: sub2.endTime,
    text: `${sub1.text}\n${sub2.text}`,
  };

  const updatedSubtitles = subtitles
    .filter((s) => s.id !== id2)
    .map((sub) => (sub.id === id1 ? mergedSubtitle : sub));

  return reorderSubtitleIds(updatedSubtitles);
};

export const deleteSubtitle = (
  subtitles: Subtitle[],
  id: number
): Subtitle[] => {
  const updatedSubtitles = subtitles.filter((sub) => sub.id !== id);
  return reorderSubtitleIds(updatedSubtitles);
};

export const addSubtitle = (
  subtitles: Subtitle[],
  beforeId: number,
  afterId: number | null
): Subtitle[] => {
  const beforeSub = subtitles.find((s) => s.id === beforeId);
  if (!beforeSub) return subtitles;

  let newSubtitle: Subtitle;
  if (afterId === null) {
    // Adding at the end
    const endTimeSeconds =
      timeStringToSeconds(beforeSub.endTime) + DEFAULT_SUBTITLE_DURATION;
    newSubtitle = {
      id: beforeSub.id + 1,
      startTime: beforeSub.endTime,
      endTime: secondsToTimeString(endTimeSeconds),
      text: "New subtitle",
    };
  } else {
    // Adding in between
    const afterSub = subtitles.find((s) => s.id === afterId);
    if (!afterSub) return subtitles;
    newSubtitle = {
      id: beforeSub.id + 1,
      startTime: beforeSub.endTime,
      endTime: afterSub.startTime,
      text: "New subtitle",
    };
  }

  const index = subtitles.findIndex((s) => s.id === beforeId);
  const updatedSubtitles = [
    ...subtitles.slice(0, index + 1),
    newSubtitle,
    ...subtitles.slice(index + 1),
  ];

  return reorderSubtitleIds(updatedSubtitles);
};

// Helper functions to convert between time string and seconds
const timeStringToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString
    .split(":")
    .map((part) => Number.parseFloat(part.replace(",", ".")));
  return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTimeString = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 12).replace(".", ",");
};
