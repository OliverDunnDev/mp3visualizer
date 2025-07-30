import React, { useState, useRef, useEffect } from "react";

export default function AudioVisualizer() {
  const [audioFile, setAudioFile] = useState(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup animation on unmount
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const setupAudio = () => {
    if (!audioRef.current) return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioCtx;

    const source = audioCtx.createMediaElementSource(audioRef.current);
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 256;

    source.connect(analyzer);
    analyzer.connect(audioCtx.destination);

    analyzerRef.current = analyzer;

    const bufferLength = analyzer.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    draw(); // start animation
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyzer = analyzerRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvas || !ctx || !analyzer || !dataArray) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    analyzer.getByteFrequencyData(dataArray);

    const barWidth = (WIDTH / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = dataArray[i];

      ctx.fillStyle = `rgb(${barHeight + 100},50,150)`;
      ctx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }

    animationIdRef.current = requestAnimationFrame(draw);
  };

  const onFileChange = (e) => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (audioContextRef.current) audioContextRef.current.close();

    setAudioFile(URL.createObjectURL(e.target.files[0]));
  };

  const onPlay = () => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    setupAudio();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <input type="file" accept="audio/*" onChange={onFileChange} />
      {audioFile && (
        <>
          <audio
            src={audioFile}
            controls
            ref={audioRef}
            onPlay={onPlay}
            className="w-full"
          />
          <canvas ref={canvasRef} width={600} height={200} className="border" />
        </>
      )}
    </div>
  );
}
