const CLICK_SOUND_URL = new URL('../sound/click.wav', import.meta.url).href;

let audioContext = null;
let clickBufferPromise = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioContextClass ? new AudioContextClass() : null;
  }
  return audioContext;
}

export function preloadClickSound() {
  if (clickBufferPromise) return clickBufferPromise;

  clickBufferPromise = fetch(CLICK_SOUND_URL)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const context = getAudioContext();
      if (!context) return null;
      return new Promise((resolve, reject) => {
        context.decodeAudioData(buffer.slice(0), resolve, reject);
      });
    })
    .catch(() => null);

  return clickBufferPromise;
}

export async function playClickSound() {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const buffer = await preloadClickSound();
  if (!buffer) return;

  const source = context.createBufferSource();
  const gainNode = context.createGain();
  gainNode.gain.value = 0.45;
  source.buffer = buffer;
  source.connect(gainNode);
  gainNode.connect(context.destination);
  source.start(0);
}
