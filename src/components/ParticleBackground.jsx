import React, { useMemo } from 'react';
import { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

export default function ParticleBackground() {
  const options = useMemo(() => ({
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      number: { value: 60 },
      color: { value: ['#ff2a6d', '#05d9e8', '#d300c5'] },
      move: {
        enable: true,
        speed: 0.5,
        direction: 'none',
        random: true,
        outModes: { default: 'out' }
      },
      opacity: { value: { min: 0.1, max: 0.4 } },
      size: { value: { min: 0.5, max: 2 } },
      links: {
        enable: true,
        color: '#05d9e8',
        opacity: 0.15,
        distance: 150
      }
    },
    background: { color: '#0a0a0f' }
  }), []);

  const init = useCallback((engine) => loadSlim(engine), []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Particles id="tsparticles" init={init} options={options} />
    </div>
  );
}
