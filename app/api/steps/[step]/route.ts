import { z } from "zod";
import { apiKeyLooksValid, Extraction, SETUP_MESSAGE } from "@/lib/ai";
import { adviceStep, assembleStep, checksStep, readStep, writeStep, type ChecksResult } from "@/lib/pipeline";
import { MAX_IMAGE_BYTES } from "@/lib/validateInput";

// The pipeline steps the n8n workflow calls, one HTTP request per step:
//   POST /api/steps/read      { text, image? }          -> { ok, extraction } | { ok: false, error, readText? }
//   POST /api/steps/checks    { extraction, text, symbol? } -> ChecksResult
//   POST /api/steps/write     { facts }                 -> { ok, text } | { ok: false, error }
//   POST /api/steps/advice    { text }                  -> { gives_advice }
//   POST /api/steps/assemble  { checks, text, extraction } -> { ok: true, card, extraction }
// Every step answers 200 with an `ok` flag, so the workflow can branch on it.

export const maxDuration = 60;

const Image = z.object({
  data: z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});
const CardText = z.object({
  claim_plain: z.string(),
  company_line: z.string(),
  flag_lines: z.array(z.object({ kind: z.string(), line: z.string() })),
  risk_reason: z.string(),
});

const BAD_REQUEST = Response.json({ ok: false, error: "Bad request" }, { status: 400 });

export async function POST(request: Request, ctx: RouteContext<"/api/steps/[step]">) {
  const { step } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body) return BAD_REQUEST;

  switch (step) {
    case "read": {
      const input = z.object({ text: z.string().max(5000), image: Image.nullish() }).safeParse(body);
      if (!input.success) return BAD_REQUEST;
      if (!apiKeyLooksValid()) return Response.json({ ok: false, error: SETUP_MESSAGE });
      return Response.json(await readStep(input.data.text.trim(), input.data.image ?? null));
    }
    case "checks": {
      const input = z
        .object({ extraction: Extraction, text: z.string().default(""), symbol: z.string().nullish() })
        .safeParse(body);
      if (!input.success) return BAD_REQUEST;
      return Response.json(checksStep(input.data.extraction, input.data.text, input.data.symbol ?? undefined));
    }
    case "write": {
      // The facts come straight from the checks step; Gemini only rewords them.
      if (!body.facts || typeof body.facts.claim !== "string") return BAD_REQUEST;
      return Response.json(await writeStep(body.facts as ChecksResult["facts"]));
    }
    case "advice": {
      const input = z.object({ text: CardText.nullable() }).safeParse(body);
      if (!input.success) return BAD_REQUEST;
      return Response.json(await adviceStep(input.data.text));
    }
    case "assemble": {
      // If the second check found implied advice, the card uses the fixed safe text.
      const text = CardText.nullable().safeParse(body.gives_advice ? null : body.text);
      if (!body.checks?.facts || !text.success) return BAD_REQUEST;
      return Response.json({ ok: true, card: assembleStep(body.checks as ChecksResult, text.data), extraction: body.extraction ?? null });
    }
    default:
      return Response.json({ ok: false, error: "Unknown step" }, { status: 404 });
  }
}
