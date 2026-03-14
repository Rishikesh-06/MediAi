import { useEffect, useRef } from "react";

const ECGLine = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = 80;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawECG = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = "hsla(152, 100%, 45%, 0.4)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "hsla(152, 100%, 45%, 0.6)";
      ctx.shadowBlur = 10;

      const mid = canvas.height / 2;
      const period = 200;

      for (let x = 0; x < canvas.width; x++) {
        const pos = (x + offset) % period;
        let y = mid;
        if (pos > 60 && pos < 70) y = mid - 5;
        else if (pos > 70 && pos < 80) y = mid + 3;
        else if (pos > 80 && pos < 85) y = mid - 30;
        else if (pos > 85 && pos < 90) y = mid + 15;
        else if (pos > 90 && pos < 95) y = mid - 3;
        else if (pos > 120 && pos < 140) y = mid - 8;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      offset += 1.5;
      animationId = requestAnimationFrame(drawECG);
    };
    drawECG();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-20 opacity-60" />;
};

export default ECGLine;
