# Voice Impersonation Detector

AI-powered real-time voice cloning and impersonation detection app.

## Features

- **Upload mode** — analyse any audio file (.wav, .mp3, .ogg, .m4a)
- **Live detection** — monitor an ongoing call in real-time (2-second chunks)
- **Smart alerts with sound:**
  - Low risk → green "Voice verified — safe" notification + rising chime
  - Medium risk → amber "Risk detected" warning + double-pulse beep (call continues)
  - High risk → automatic call termination + red alert screen + siren alarm

## Quick start

Just open `index.html` in any modern browser. No server or build step needed.

```
open index.html
```

## How it works (detection pipeline)

```
Audio input → Preprocessing (16kHz mono)
           → Feature extraction:
               • MFCCs (13–40 coefficients)
               • Mel-spectrogram (128 bands)
               • Pitch contours
               • Prosody / speech rhythm
           → Deep learning classifier
           → Confidence score (0–100% AI probability)
           → Alert action (safe / warn / terminate)
```

## Risk thresholds

| Score    | Risk level  | Action                         |
|----------|-------------|--------------------------------|
| 0 – 39%  | Low         | Green notification, chime sound |
| 40 – 74% | Medium      | Amber warning, double beep      |
| 75 – 100%| High        | Call terminated, siren alarm    |

## Connecting a real AI model

The demo uses random probability scores. To connect a real model:

1. In `app.js`, replace the `Math.floor(Math.random() * 100)` line in
   `runAnalysis()` and `processChunk()` with a fetch call to your backend:

```js
const res  = await fetch('/api/detect', {
  method: 'POST',
  body: formData   // audio blob
});
const { probability } = await res.json();
```

2. On the backend (Python/Node), run the audio through:
   - **RawNet2** — end-to-end raw waveform classifier
   - **Wav2Vec2** — pretrained speech encoder + classifier head
   - **CNN on mel-spectrograms** — fast and accurate for real-time use

### Recommended datasets for training
- ASVspoof 2019 / 2021 (LA track) — the standard benchmark
- FakeAVCeleb — celebrity voice cloning samples
- WaveFake — multiple TTS/VC systems

## File structure

```
voice-detection-app/
├── index.html   — app shell and markup
├── style.css    — dark-mode design system
├── app.js       — all UI logic, audio synthesis, detection flow
└── README.md    — this file
```

## Browser support

Works in all modern browsers (Chrome, Firefox, Edge, Safari).
Web Audio API required for sound alerts.

---

> **Note:** Results are probabilistic risk signals, not definitive proof.
> Always verify caller identity through a secondary trusted channel.
