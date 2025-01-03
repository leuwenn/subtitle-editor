import type { Subtitle } from "@/types/subtitle";

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
  afterId: number
): Subtitle[] => {
  const beforeSub = subtitles.find((s) => s.id === beforeId);
  const afterSub = subtitles.find((s) => s.id === afterId);
  if (!beforeSub || !afterSub) return subtitles;

  const newSubtitle: Subtitle = {
    id: afterId,
    startTime: beforeSub.endTime,
    endTime: afterSub.startTime,
    text: "New subtitle",
  };

  const index = subtitles.findIndex((s) => s.id === afterId);
  const updatedSubtitles = [
    ...subtitles.slice(0, index),
    newSubtitle,
    ...subtitles.slice(index),
  ];

  return reorderSubtitleIds(updatedSubtitles);
};
