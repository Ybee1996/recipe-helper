/** iOS-friendly timer alarm: HTML audio + Web Audio routed through a hidden video. */

export const ALARM_MS = 10_000;
const BEEP_GAP_MS = 420;
const BEEP_LEN = 0.16;
const SAMPLE_RATE = 22050;

type AudioContextCtor = new (contextOptions?: AudioContextOptions) => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function encodeWav(samples: Float32Array, sampleRate: number): string {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);

  function writeStr(offset: number, text: string) {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
    offset += 2;
  }

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function beepLoopWav(): string {
  const gap = Math.round((BEEP_GAP_MS / 1000) * SAMPLE_RATE);
  const beep = Math.round(BEEP_LEN * SAMPLE_RATE);
  const samples = new Float32Array(gap);
  for (let i = 0; i < beep; i += 1) {
    const env = Math.min(1, i / 80, (beep - i) / 80);
    samples[i] = Math.sin((2 * Math.PI * 880 * i) / SAMPLE_RATE) * env * 0.85;
  }
  return encodeWav(samples, SAMPLE_RATE);
}

function silentWav(): string {
  return encodeWav(new Float32Array(Math.round(SAMPLE_RATE * 0.2)), SAMPLE_RATE);
}

let beepUri: string | null = null;
let silentUri: string | null = null;

function beepSrc() {
  beepUri ??= beepLoopWav();
  return beepUri;
}

function silentSrc() {
  silentUri ??= silentWav();
  return silentUri;
}

export type AlarmAudio = {
  ctx: AudioContext;
  dest: MediaStreamAudioDestinationNode;
  video: HTMLVideoElement;
  html: HTMLAudioElement;
  keepGain: GainNode;
};

function attachVideo(audioStream: MediaStream): HTMLVideoElement {
  const tracks: MediaStreamTrack[] = [...audioStream.getAudioTracks()];
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const draw = canvas.getContext("2d");
  if (draw) {
    draw.fillStyle = "#000";
    draw.fillRect(0, 0, 2, 2);
  }
  if (typeof canvas.captureStream === "function") {
    tracks.unshift(...canvas.captureStream(1).getVideoTracks());
  }

  const video = document.createElement("video");
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.playsInline = true;
  video.autoplay = true;
  video.muted = false;
  video.controls = false;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText =
    "position:fixed;width:2px;height:2px;opacity:0.02;pointer-events:none;left:0;bottom:0;z-index:0;";
  video.srcObject = new MediaStream(tracks);
  document.body.appendChild(video);
  return video;
}

function makeHtmlAudio(src: string, loop: boolean): HTMLAudioElement {
  const el = new Audio(src);
  el.preload = "auto";
  el.loop = loop;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  return el;
}

export async function primeAlarmAudio(existing: AlarmAudio | null): Promise<AlarmAudio | null> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return existing;

  let pack = existing;
  if (!pack || pack.ctx.state === "closed") {
    const ctx = new Ctor();
    const dest = ctx.createMediaStreamDestination();
    const keepGain = ctx.createGain();
    keepGain.gain.value = 0.0004;
    const keep = ctx.createOscillator();
    keep.frequency.value = 18;
    keep.connect(keepGain);
    keepGain.connect(dest);
    keep.start();

    const video = attachVideo(dest.stream);
    const html = makeHtmlAudio(silentSrc(), true);
    pack = { ctx, dest, video, html, keepGain };
  }

  try {
    await pack.ctx.resume();
  } catch {
    // iOS may still resume on the next gesture.
  }

  try {
    pack.video.muted = false;
    await pack.video.play();
  } catch {
    // Needs a user gesture; callers run this from taps.
  }

  try {
    pack.html.src = silentSrc();
    pack.html.loop = true;
    pack.html.volume = 1;
    await pack.html.play();
  } catch {
    // Best-effort unlock.
  }

  return pack;
}

export async function resumeAlarmAudio(pack: AlarmAudio | null) {
  if (!pack) return;
  try {
    await pack.ctx.resume();
  } catch {
    // Ignore.
  }
  try {
    if (pack.video.paused) await pack.video.play();
  } catch {
    // Ignore.
  }
}

function playOneBeep(ctx: AudioContext, dest: MediaStreamAudioDestinationNode, high: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = high ? 1174 : 880;
  osc.connect(gain);
  gain.connect(dest);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + BEEP_LEN);
  osc.start(t);
  osc.stop(t + BEEP_LEN + 0.02);
}

export function playAlarm(
  pack: AlarmAudio,
  signal: AbortSignal,
): void {
  void resumeAlarmAudio(pack);

  let n = 0;
  const tick = () => {
    if (signal.aborted) return;
    playOneBeep(pack.ctx, pack.dest, n % 2 === 1);
    n += 1;
  };
  tick();
  const interval = window.setInterval(tick, BEEP_GAP_MS);

  pack.html.loop = true;
  pack.html.src = beepSrc();
  pack.html.currentTime = 0;
  pack.html.volume = 1;
  void pack.html.play().catch(() => {});

  const finish = () => {
    window.clearInterval(interval);
    pack.html.pause();
    pack.html.src = silentSrc();
    pack.html.loop = true;
    void pack.html.play().catch(() => {});
  };

  const stopTimer = window.setTimeout(finish, ALARM_MS);
  signal.addEventListener(
    "abort",
    () => {
      window.clearTimeout(stopTimer);
      finish();
    },
    { once: true },
  );
}

export function vibrateAlarm() {
  try {
    const pulse = [200, 220];
    const pattern: number[] = [];
    while (pattern.reduce((sum, n) => sum + n, 0) < ALARM_MS) {
      pattern.push(...pulse);
    }
    navigator.vibrate?.(pattern);
  } catch {
    // Android only — iOS Safari has no vibration API.
  }
}

export function stopVibrate() {
  try {
    navigator.vibrate?.(0);
  } catch {
    // Ignore.
  }
}
