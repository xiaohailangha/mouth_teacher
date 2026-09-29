const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

// Display-only gain for the two A2F tongue channels that carry substantial
// variation in the captured Mandarin speech. Never invent a tongue-tip pose.
export function visibleA2fTongue(raw, enhanced = true) {
  if (!enhanced) return raw;
  return {
    ...raw,
    tongueMiddleRaise: Math.min(.85, 1.8 * clamp(raw.tongueMiddleRaise)),
    tongueRetract: Math.min(.85, 1.25 * clamp(raw.tongueRetract)),
  };
}
