"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Subtitle } from "@/types/subtitle";
import { IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FindReplaceProps {
  subtitles: Subtitle[];
  setSubtitles: (subtitles: Subtitle[]) => void;
}

export function FindReplace({ subtitles, setSubtitles }: FindReplaceProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isMatchFullWord, setIsMatchFullWord] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [matchedSubtitles, setMatchedSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitles, setSelectedSubtitles] = useState<Set<number>>(
    new Set()
  );

  const handleReplace = () => {
    const regexFlags = isCaseSensitive ? "g" : "gi";
    const findRegex = isMatchFullWord
      ? new RegExp(`\\b${findText}\\b`, regexFlags)
      : new RegExp(findText, regexFlags);

    const updatedSubtitles = subtitles.map((subtitle) => {
      if (selectedSubtitles.has(subtitle.id) && findRegex.test(subtitle.text)) {
        const newText = subtitle.text.replace(findRegex, replaceText);
        return { ...subtitle, text: newText };
      }
      return subtitle;
    });

    setSubtitles(updatedSubtitles);
    setMatchedSubtitles(
      updatedSubtitles.filter((subtitle) => findRegex.test(subtitle.text))
    );
    // Don't close the dialog automatically
    // setIsDialogOpen(false);
  };

  const highlightMatches = (text: string, findRegex: RegExp) => {
    if (!findText) return text;

    const parts = text.split(findRegex);
    const highlighted = [];

    for (let i = 0; i < parts.length; i++) {
      highlighted.push(parts[i]);
      if (i < parts.length - 1) {
        const match = text.match(findRegex)?.[0];
        if (match) {
          highlighted.push(
            <span key={`match-${i}`} className="bg-red-500 text-white">
              {match}
            </span>
          );
        }
      }
    }

    return <>{highlighted}</>;
  };

  const highlightReplacements = (
    originalText: string,
    newText: string,
    findRegex: RegExp
  ) => {
    if (!findText) return newText;

    const replacedParts = newText.split(replaceText);
    const highlighted = [];

    for (let i = 0; i < replacedParts.length; i++) {
      highlighted.push(replacedParts[i]);
      if (i < replacedParts.length - 1) {
        highlighted.push(
          <span key={`replace-${i}`} className="bg-green-500 text-white">
            {replaceText}
          </span>
        );
      }
    }

    return <>{highlighted}</>;
  };

  useEffect(() => {
    if (findText) {
      const regexFlags = isCaseSensitive ? "g" : "gi";
      const findRegex = isMatchFullWord
        ? new RegExp(`\\b${findText}\\b`, regexFlags)
        : new RegExp(findText, regexFlags);

      setMatchedSubtitles(
        subtitles.filter((subtitle) => findRegex.test(subtitle.text))
      );
    } else {
      setMatchedSubtitles([]);
    }
  }, [subtitles, findText, isCaseSensitive, isMatchFullWord]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-black rounded-none">
          <IconSearch />
          Find / Replace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Find and Replace</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 max-h-[36rem] overflow-auto">
          <div className="flex items-center gap-2">
            <Label htmlFor="find">Find</Label>
            <Input
              id="find"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={isCaseSensitive}
                onCheckedChange={(checked) => {
                  // Handle the CheckedState and update isCaseSensitive
                  if (checked === "indeterminate") {
                    setIsCaseSensitive(true); // Or false, depending on how you want to handle indeterminate
                  } else {
                    setIsCaseSensitive(checked);
                  }
                }}
              />
              <label
                htmlFor="case-sensitive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Case sensitive
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="match-full-word"
                checked={isMatchFullWord}
                onCheckedChange={(checked) => {
                  // Handle the CheckedState and update isCaseSensitive
                  if (checked === "indeterminate") {
                    setIsMatchFullWord(true); // Or false, depending on how you want to handle indeterminate
                  } else {
                    setIsMatchFullWord(checked);
                  }
                }}
              />
              <label
                htmlFor="match-full-word"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Match full word
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="replace">Replace with</Label>
            <Input
              id="replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="flex-1"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      matchedSubtitles.length > 0 &&
                      matchedSubtitles.every((sub) =>
                        selectedSubtitles.has(sub.id)
                      )
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSubtitles(
                          new Set(matchedSubtitles.map((sub) => sub.id))
                        );
                      } else {
                        setSelectedSubtitles(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchedSubtitles.map((subtitle) => {
                const regexFlags = isCaseSensitive ? "g" : "gi";
                const findRegex = isMatchFullWord
                  ? new RegExp(`\\b${findText}\\b`, regexFlags)
                  : new RegExp(findText, regexFlags);
                const newText = subtitle.text.replace(findRegex, replaceText);
                return (
                  <TableRow key={subtitle.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSubtitles.has(subtitle.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedSubtitles);
                          if (checked) {
                            newSelected.add(subtitle.id);
                          } else {
                            newSelected.delete(subtitle.id);
                          }
                          setSelectedSubtitles(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {highlightMatches(subtitle.text, findRegex)}
                    </TableCell>
                    <TableCell>
                      {highlightReplacements(subtitle.text, newText, findRegex)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={handleReplace}>Replace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
