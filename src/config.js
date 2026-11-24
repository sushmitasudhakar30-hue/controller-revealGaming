// ─────────────────────────────────────────────────────────────
//  Edit this file to customise the animation text and timing.
//  The order of LABELS matches the order of the HUD callouts:
//  left stick, touchpad, right stick, action buttons, d-pad, grip.
//  The product is a GENERIC controller – replace the copy with
//  your own client's real specs before publishing.
// ─────────────────────────────────────────────────────────────
export const FONT = '"Consolas","SF Mono","Courier New",monospace';

export const LABELS = [
  { title: 'LEFT STICK',     sub: 'Hall-effect analog',   meta: 'ZERO DRIFT · 12-BIT' },
  { title: 'TOUCHPAD',       sub: 'Multi-touch surface',  meta: 'LIGHT BAR · CLICK' },
  { title: 'RIGHT STICK',    sub: 'Hall-effect analog',   meta: 'TENSION TUNED' },
  { title: 'ACTION BUTTONS', sub: 'Low-latency switches', meta: '1 MS RESPONSE' },
  { title: 'D-PAD',          sub: '8-way precision',      meta: 'MICRO-TACTILE' },
  { title: 'ERGO GRIP',      sub: 'Textured soft-touch',  meta: '210 G · BALANCED' },
];

// seconds (video is 10 s @ 24 fps, 1080x1920)
export const TIMELINE = {
  spinStart: 3.6,   // 360° rotation begins
  spinEnd:   8.6,   // …and ends facing front again
};
