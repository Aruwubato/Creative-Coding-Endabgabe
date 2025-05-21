window.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('AudioContext resumed');
    });
  }
});

let bpm = 100;
let beatInterval = 60000 / bpm / 2;
let globalBeatCount = 0;
let instruments = [];

function updateBeatInterval() {
  beatInterval = 60000 / bpm / 2;
}

function startGlobalClock() {
  function tick() {
    globalBeatCount++;
    instruments.forEach(instr => {
      if (instr.isPlaying && instr.beatPattern.includes(globalBeatCount % instr.beatModulo)) {
        instr.play();
        instr.visualize();
      }
    });
    setTimeout(tick, beatInterval);
  }
  tick();
}

function flashAllStarsRainbow() {
  if (!window.stars) return;
  window.stars.forEach((star, i) => {
    const rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'];
    const color = rainbowColors[(i + Math.floor(Date.now() / 100)) % rainbowColors.length];
    star.setAttribute('material', 'emissive', color);
    setTimeout(() => {
      if (star) star.setAttribute('material', 'emissive', '#000000');
    }, 300);
  });
}

// === Web Audio Setup ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Preload audio buffers cache
const audioBuffers = {};

async function loadAudioBuffer(url) {
  if (audioBuffers[url]) return audioBuffers[url];
  const res = await fetch(url);
  const arrayBuf = await res.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuf);
  audioBuffers[url] = decoded;
  return decoded;
}

AFRAME.registerComponent('drum-step', {
  schema: {
    soundId: { type: 'string' },
    beatPattern: { type: 'string' },
    beatModulo: { type: 'int', default: 8 }
  },
  init: function () {
    const el = this.el;
    const audioEl = document.querySelector(`#${this.data.soundId}`);
    const src = audioEl.getAttribute('src');
    const beatPattern = this.data.beatPattern.split(',').map(n => parseInt(n));
    const originalScale = el.getAttribute('scale');

    // Create a PannerNode for spatial audio
    const panner = audioCtx.createPanner();
    panner.panningModel = 'HRTF'; // realistic spatialization
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Connect panner to destination once
    panner.connect(audioCtx.destination);

    const instr = {
      el,
      isPlaying: false,
      async play() {
        flashAllStarsRainbow();
        try {
          const buffer = await loadAudioBuffer(src);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;

          // Update panner position from entity position before playing
          const pos = el.object3D.position;
          panner.setPosition(pos.x, pos.y, pos.z);

          source.connect(panner);
          source.start();
        } catch (err) {
          console.error('Audio error:', err);
        }
      },
      visualize: () => {
// Reset scale first to original before animating
el.setAttribute('scale', originalScale);

// Clear previous animation and trigger new pulse
el.removeAttribute('animation__pulse');
el.setAttribute('animation__pulse', {
  property: 'scale',
  to: {
    x: originalScale.x * 1.3,
    y: originalScale.y * 1.3,
    z: originalScale.z * 1.3
  },
  dir: 'alternate',
  dur: 150,
  easing: 'easeInOutQuad',
  loop: 1
});
      },
      beatPattern,
      beatModulo: this.data.beatModulo
    };

    instruments.push(instr);

    el.addEventListener('click', () => {
      instr.isPlaying = !instr.isPlaying;
      el.setAttribute('material', 'color', instr.isPlaying ? '#00FF00' : '#733B73');
      el.setAttribute('material', 'emissive', '#000000');
      el.setAttribute('scale', originalScale);
    });
  }
});


startGlobalClock();

window.addEventListener('DOMContentLoaded', () => {
  const bpmSlider = document.getElementById('bpmSlider');
  const bpmDisplay = document.getElementById('bpmDisplay');

  bpmSlider.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    bpmDisplay.innerText = bpm + ' BPM';
    updateBeatInterval();
  });
});


