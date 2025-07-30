import React, { useEffect, useRef } from "react";

const SHAPES = ["circle", "starburst", "wave", "triangle", "square", "spiral", "fractal"];

function Visualizer({ data, times, audioRef }) {
  const canvasRef = useRef(null);
  const noiseCanvasRef = useRef(null);
  const shapesRef = useRef([]);
  const animationRef = useRef(null);
  const gradientShiftRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const noiseCanvas = noiseCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const noiseCtx = noiseCanvas.getContext("2d");

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      noiseCanvas.width = canvas.width;
      noiseCanvas.height = canvas.height;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const audio = audioRef.current;
    if (!audio || !data || data.length === 0) return;

    // Draw noise overlay with flickering grain
    function drawNoise(ctx, width, height) {
      const imageData = noiseCtx.createImageData(width, height);
      const buffer = new Uint32Array(imageData.data.buffer);

      const alphaBase = 50; // brighter grain (out of 255)
      const flicker = Math.floor(40 * Math.sin(Date.now() * 0.08)); // faster flicker, bigger amplitude

      for (let i = 0; i < buffer.length; i++) {
        const shade = Math.floor(Math.random() * 255);
        const alpha = Math.min(255, Math.max(0, alphaBase + flicker));
        buffer[i] =
          (alpha << 24) | // alpha
          (shade << 16) | // red
          (shade << 8) | // green
          shade; // blue
      }
      noiseCtx.putImageData(imageData, 0, 0);
      ctx.globalAlpha = 0.18; // stronger grain overlay
      ctx.drawImage(noiseCanvas, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // Draw various shapes with some variation
    function drawShape(shape) {
      const {
        x,
        y,
        radius,
        hue,
        sat,
        light,
        alpha,
        shape: shapeType,
        rotation = 0,
        detail = 5,
      } = shape;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
      ctx.strokeStyle = `hsl(${(hue + 30) % 360}, ${sat}%, ${Math.min(light + 30, 90)}%)`;
      ctx.lineWidth = 2;
      ctx.translate(x, y);
      ctx.rotate(rotation);

      switch (shapeType) {
        case "circle":
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "starburst":
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(
              radius * Math.cos(((18 + i * 72) * Math.PI) / 180),
              radius * Math.sin(((18 + i * 72) * Math.PI) / 180)
            );
            ctx.lineTo(
              (radius / 2) * Math.cos(((54 + i * 72) * Math.PI) / 180),
              (radius / 2) * Math.sin(((54 + i * 72) * Math.PI) / 180)
            );
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case "wave":
          ctx.beginPath();
          for (let i = -radius; i <= radius; i += 5) {
            ctx.lineTo(i, Math.sin(i * 0.3 * detail) * radius * 0.5);
          }
          ctx.lineTo(radius, radius);
          ctx.lineTo(-radius, radius);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case "triangle":
          ctx.beginPath();
          ctx.moveTo(0, -radius);
          ctx.lineTo(radius, radius);
          ctx.lineTo(-radius, radius);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case "square":
          ctx.beginPath();
          ctx.rect(-radius, -radius, radius * 2, radius * 2);
          ctx.fill();
          ctx.stroke();
          break;

        case "spiral":
          ctx.beginPath();
          const turns = 3 + detail;
          for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * turns * 2 * Math.PI;
            const r = (radius * i) / 100;
            const px = r * Math.cos(angle);
            const py = r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          break;

        case "fractal":
          // simple recursive tree fractal
          function drawBranch(len, depth) {
            if (depth === 0) return;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -len);
            ctx.stroke();

            ctx.translate(0, -len);
            ctx.save();

            ctx.rotate(0.3);
            drawBranch(len * 0.7, depth - 1);

            ctx.restore();
            ctx.save();

            ctx.rotate(-0.3);
            drawBranch(len * 0.7, depth - 1);

            ctx.restore();
            ctx.translate(0, len);
          }
          ctx.strokeStyle = `hsl(${(hue + 60) % 360}, ${sat}%, ${Math.min(light + 20, 90)}%)`;
          ctx.lineWidth = 1;
          drawBranch(radius * 0.7, 4);
          break;

        default:
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }

    // Spawn shapes dynamically with seeded randomness based on music data
    function spawn(dataPoint) {
      if (!dataPoint) return;

      const { vol = 0.3, cent = 0.5, beat, chroma = [], mfcc = [] } = dataPoint;
      const spawnCount = beat ? 30 : Math.floor(vol * 15) + 1;

      // Average chroma gives hue base; mfcc affects detail and size
      const avgChroma = chroma.reduce((a, b) => a + b, 0) / (chroma.length || 1);
      const baseHue = (avgChroma * 360 + cent * 150) % 360;
      const baseSat = 80 + Math.random() * 20;
      const baseLight = 55 + Math.random() * 30;

      for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = vol * 4 + (beat ? 5 : 2);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const radius = Math.abs((mfcc[0] ?? 0.5)) * 30 + vol * 40 + 10;
        const rotation = Math.random() * Math.PI * 2;
        const detail = 3 + Math.floor(Math.random() * 4);

        shapesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx,
          vy,
          radius,
          hue: baseHue + Math.random() * 40,
          sat: baseSat,
          light: baseLight,
          alpha: 1,
          createdAt: Date.now(),
          lifespan: 2000 + Math.random() * 1800,
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          rotation,
          detail,
        });
      }
    }

    function animate() {
      const width = canvas.width;
      const height = canvas.height;

      // Animate bright, fast, stepped gradient background
      let gradientShift = gradientShiftRef.current;
      gradientShift += 6; // faster shift
      gradientShiftRef.current = gradientShift;

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, `hsl(${gradientShift % 360}, 90%, 30%)`);
      grad.addColorStop(0.25, `hsl(${(gradientShift + 90) % 360}, 95%, 35%)`);
      grad.addColorStop(0.5, `hsl(${(gradientShift + 180) % 360}, 90%, 30%)`);
      grad.addColorStop(0.75, `hsl(${(gradientShift + 270) % 360}, 95%, 35%)`);
      grad.addColorStop(1, `hsl(${gradientShift % 360}, 90%, 30%)`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Overlay noisy grain texture with flickering
      drawNoise(ctx, width, height);

      // Clear shapes only partially for a slight trail effect
      // ctx.clearRect(0, 0, width, height); // removed to preserve trail

      // Sync shapes spawn to music time
      const time = audio.currentTime;
      const index = times.findIndex((t) => t >= time);
      const dataPoint = data[index] || null;

      spawn(dataPoint);

      const now = Date.now();

      shapesRef.current = shapesRef.current.filter((shape) => {
        shape.x += shape.vx;
        shape.y += shape.vy;

        // Bounce off edges
        if (shape.x < 0 || shape.x > width) shape.vx *= -1;
        if (shape.y < 0 || shape.y > height) shape.vy *= -1;

        const age = now - shape.createdAt;
        shape.alpha = 1 - age / shape.lifespan;

        if (shape.alpha <= 0) return false;

        drawShape(shape);
        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    }

    audio.play().catch((err) => console.warn("Audio play error:", err));
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      shapesRef.current = [];
    };
  }, [data, times, audioRef]);

  return (
    <>
      {/* Main visualizer canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -2,
          background: "black",
          width: "100vw",
          height: "100vh",
        }}
      />
      {/* Offscreen canvas for noise texture */}
      <canvas
        ref={noiseCanvasRef}
        style={{
          display: "none",
        }}
      />
    </>
  );
}

export default Visualizer;

