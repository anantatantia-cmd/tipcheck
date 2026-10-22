import { apiKeyLooksValid, Extraction, SETUP_MESSAGE } from "@/lib/ai";
import { checksStep, errorToBody, runLocal, SOMETHING_WRONG, writeAndAssemble } from "@/lib/pipeline";
import type { CheckBody, CheckResponse } from "@/lib/types";
import { validateInput } from "@/lib/validateInput";

// The browser posts every tip here. Input checks run first, then the pipeline in
// lib/pipeline.ts: read (Gemini) -> checks (code) -> write (Gemini) -> advice (Gemini) -> card.
export const maxDuration = 60;

export async function POST(request: Request) {
  const started = Date.now();
  const reply = (body: CheckBody, status: number) =>
    Response.json({ ...body, elapsedMs: Date.now() - started } satisfies CheckResponse, { status });

  try {
    // Mode 2: the user picked a different company under "Not this company?".
    // Reuse the tip we already read and only redo checks and the card.
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      const extraction = Extraction.safeParse(body?.extraction);
      if (!extraction.success || typeof body?.symbol !== "string") {
        return reply({ ok: false, error: SOMETHING_WRONG }, 400);
      }
      if (!apiKeyLooksValid()) return reply({ ok: false, error: SETUP_MESSAGE }, 503);
      const result = await writeAndAssemble(checksStep(extraction.data, "", body.symbol));
      if (result.body.ok) result.body.extraction = extraction.data;
      return reply(result.body, result.status);
    }

    // Mode 1: a new tip, as pasted text and/or a screenshot. Bad input never reaches the AI.
    const form = await request.formData();
    const checked = await validateInput(form.get("text"), form.get("image"));
    if (!checked.ok) return reply({ ok: false, error: checked.error }, 400);
    if (!apiKeyLooksValid()) return reply({ ok: false, error: SETUP_MESSAGE }, 503);

    const result = await runLocal(checked.input.text, checked.input.image);
    return reply(result.body, result.status);
  } catch (err) {
    const { error, status } = errorToBody(err);
    return reply({ ok: false, error }, status);
  }
}
