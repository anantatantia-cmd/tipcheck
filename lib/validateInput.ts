// Checks the input before anything is sent to the AI, so bad input costs nothing.

export const NOT_A_TIP_MESSAGE =
  "We couldn't find a stock tip in this. Paste the message that mentions a stock.";

export const UNREADABLE_IMAGE_MESSAGE =
  "We couldn't read that screenshot. Try a clearer one, or paste the text.";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export type ValidInput = {
  text: string;
  image: { data: string; mediaType: ImageType } | null;
};

export async function validateInput(
  rawText: FormDataEntryValue | null,
  file: FormDataEntryValue | null,
): Promise<{ ok: true; input: ValidInput } | { ok: false; error: string }> {
  const text = typeof rawText === "string" ? rawText.trim().slice(0, 5000) : "";
  const hasFile = file instanceof File && file.size > 0;

  if (!hasFile) {
    // Too short to be a tip: skip the AI call entirely.
    if (text.length < 8) return { ok: false, error: NOT_A_TIP_MESSAGE };
    return { ok: true, input: { text, image: null } };
  }

  if (!IMAGE_TYPES.includes(file.type as ImageType)) {
    return {
      ok: false,
      error: "That file isn't a picture. Upload a screenshot (PNG, JPG or WEBP).",
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: "That screenshot is too big. Please use one under 5 MB.",
    };
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { ok: true, input: { text, image: { data, mediaType: file.type as ImageType } } };
}
