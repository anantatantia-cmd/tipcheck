import { apiKeyLooksValid, Extraction, SETUP_MESSAGE } from "@/lib/ai";
import { checksStep, errorToBody, runLocal, SOMETHING_WRONG, writeAndAssemble } from "@/lib/pipeline";
import type { CheckBody, CheckResponse } from "@/lib/types";
import { validateInput, type ImageType } from "@/lib/validateInput";

// The browser posts every tip here. When N8N_WEBHOOK_URL is set, the n8n workflow runs the
// pipeline by calling the step endpoints in app/api/steps/[step]. If n8n isn't set up or
// doesn't answer in time, the same steps run here instead, so the site keeps working.
export const maxDuration = 60;

const N8N_TIMEOUT_MS = 40_000;

export async function POST(request: Request) {
  const started = Date.now();
  const reply = (body: CheckBody, status: number, via: "n8n" | "local" | "none") =>
    Response.json({ ...body, elapsedMs: Date.now() - started } satisfies CheckResponse, {
      status,
      headers: { "x-tipcheck-via": via },
    });

  try {
    // Mode 2: the user picked a different company under "Not this company?".
    // Reuse the tip we already read and only redo checks and the card.
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      const extraction = Extraction.safeParse(body?.extraction);
      if (!extraction.success || typeof body?.symbol !== "string") {
        return reply({ ok: false, error: SOMETHING_WRONG }, 400, "none");
      }
      if (!apiKeyLooksValid()) return reply({ ok: false, error: SETUP_MESSAGE }, 503, "none");
      const result = await writeAndAssemble(checksStep(extraction.data, "", body.symbol));
      if (result.body.ok) result.body.extraction = extraction.data;
      return reply(result.body, result.status, "local");
    }

    // Mode 1: a new tip, as pasted text and/or a screenshot. Input checks run here first,
    // so bad input never reaches n8n or the AI.
    const form = await request.formData();
    const checked = await validateInput(form.get("text"), form.get("image"));
    if (!checked.ok) return reply({ ok: false, error: checked.error }, 400, "none");
    if (!apiKeyLooksValid()) return reply({ ok: false, error: SETUP_MESSAGE }, 503, "none");

    const { text, image } = checked.input;
    const viaN8n = await callN8n(text, image);
    if (viaN8n) return reply(viaN8n.body, viaN8n.status, "n8n");

    const local = await runLocal(text, image);
    return reply(local.body, local.status, "local");
  } catch (err) {
    const { error, status } = errorToBody(err);
    return reply({ ok: false, error }, status, "none");
  }
}

// Sends the tip to the n8n workflow. Returns null (so we fall back) if n8n isn't
// configured, errors, times out, or answers with something that isn't a TipCheck result.
async function callN8n(
  text: string,
  image: { data: string; mediaType: ImageType } | null,
): Promise<{ body: CheckBody; status: number } | null> {
  const url = process.env.N8N_WEBHOOK_URL?.trim();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, image }),
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    });
    const body = (await res.json()) as CheckBody;
    if (!res.ok || typeof body?.ok !== "boolean") throw new Error(`n8n answered ${res.status}`);
    return { body, status: body.ok ? 200 : 400 };
  } catch (err) {
    console.error("n8n unavailable, running locally:", err instanceof Error ? err.message : "error");
    return null;
  }
}
