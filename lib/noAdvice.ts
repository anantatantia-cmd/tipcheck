// TipCheck describes a tip; it never recommends acting on it.
// Describing the tip ("the message tells you to buy") is fine; advising is not.
const ADVICE =
  /\b(you should|we recommend|i recommend|we suggest|consider (?:buying|selling|investing)|go ahead and (?:buy|sell|invest)|(?:do not|don't) (?:buy|sell|invest)|safe to (?:buy|invest)|(?:a )?(?:good|great|safe) (?:buy|investment|time to buy)|worth (?:buying|investing)|book (?:your )?profits?)\b|(?:^|[.!?]\s+)(?:buy|sell|hold|avoid|invest)\b/i;

export function containsAdvice(texts: string[]): boolean {
  return texts.some((t) => ADVICE.test(t));
}
