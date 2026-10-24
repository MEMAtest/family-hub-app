import { z } from "zod";

export const brainWritingInput = z.object({
  text: z.string().trim().min(4).max(4000),
  nodeType: z
    .enum(["note", "task", "thought", "idea", "milestone"])
    .default("note"),
});
export const brainWritingOutput = z.object({
  title: z.string().trim().min(1).max(90),
  content: z.string().trim().min(1).max(6000),
});
export type BrainWriting = z.infer<typeof brainWritingOutput>;

export function validateBrainWriting(
  text: string,
  result: unknown,
): BrainWriting {
  const draft = brainWritingOutput.parse(result);
  const protectedParts = (value: string) => ({
    numbers: (value.match(/\b\d+(?:[.,:/-]\d+)*\b/g) ?? []).sort(),
    currencies: (value.match(/[£$€]\s*\d+(?:[.,]\d+)*/g) ?? [])
      .map((item) => item.replace(/\s/g, ""))
      .sort(),
    links: (value.match(/\[\[[^\]]+\]\]|https?:\/\/[^\s<>]+/g) ?? []).sort(),
    checks: (value.match(/^\s*[-*]\s+\[[ xX]\]/gm) ?? []).map((item) =>
      item.includes("[ ]") ? "open" : "done",
    ),
  });
  if (
    JSON.stringify(protectedParts(text)) !==
    JSON.stringify(protectedParts(draft.content))
  ) {
    throw new Error(
      "The refinement changed protected details. Your original wording is unchanged.",
    );
  }
  return draft;
}
