import React, { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { WaveformContianer } from '@wavesurfer/react';

const AudioWaveform = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    if (wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: wavesurferRef.current,
        // ... other wavesurfer options
      });

      wavesurfer.on('scroll', (data) => {
        setScrollPosition(data.scrollLeft);
      });
    }
  }, []);

  return (
    <div>
      <WaveformContianer ref={wavesurferRef} />
      <div style={{ overflowX: 'scroll', width: '500px' }}>
        <div style={{ width: scrollPosition + 'px' }}></div>
      </div>
    </div>
  );
};

export default AudioWaveform;