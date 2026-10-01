"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import house from "../../../public/house.jpg";

// Pixel sizes of the stacked layers, coarsest on top. The sharp photo sits underneath them all.
// How much of each layer one pass of the mouse wears away: coarse layers go first,
// so a spot gets steadily less pixelated before it comes into focus.
const LEVELS = [
  { pixel: 32, perPass: 0.85 },
  { pixel: 16, perPass: 0.7 },
  { pixel: 8, perPass: 0.55 },
  { pixel: 4, perPass: 0.45 },
];
const BRUSH_RADIUS_PX = 90;
const BRUSH_SPACING_PX = BRUSH_RADIUS_PX / 2;
// One pass lands about this many overlapping stamps on each spot, so each stamp wears away
// a share that compounds to perPass. Stamps are kept few and strong, because very faint
// stamps stop having any effect once the canvas rounds them to whole 8-bit alpha steps.
const STAMPS_PER_PASS = (BRUSH_RADIUS_PX * 2) / BRUSH_SPACING_PX;
// Matches object-[center_70%] on the sharp photo, so every layer is cropped the same way
const CROP_Y = 0.7;

type Layer = {
  pixel: number;
  // Opacity removed by one stamp of the brush
  strength: number;
  canvas: HTMLCanvasElement;
  // How much of this layer has been worn away, kept so it survives a window resize
  worn: HTMLCanvasElement;
};

// The house photo fills the page behind everything, pixelated.
// Wherever the mouse goes, the pixels get finer each time, until that spot is sharp.
export function PixelatedBackground() {
  const layersRef = useRef<HTMLDivElement>(null);
  // Until the pixelated layers are drawn, the sharp photo is blurred with CSS so it never flashes into focus
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = layersRef.current!;
    const layers: Layer[] = LEVELS.map(({ pixel, perPass }) => {
      const canvas = document.createElement("canvas");
      canvas.className = "absolute inset-0 h-full w-full";
      canvas.style.imageRendering = "pixelated";
      const strength = 1 - (1 - perPass) ** (1 / STAMPS_PER_PASS);
      return { pixel, strength, canvas, worn: document.createElement("canvas") };
    });
    const photo = new window.Image();
    let cancelled = false;
    let last: { x: number; y: number } | null = null;

    function paint(layer: Layer, w: number, h: number) {
      // Shrink the photo, then let the canvas stretch it back up with hard pixel edges
      const sw = Math.ceil(w / layer.pixel);
      const sh = Math.ceil(h / layer.pixel);
      layer.canvas.width = sw;
      layer.canvas.height = sh;
      const scale = Math.max(sw / photo.naturalWidth, sh / photo.naturalHeight);
      const dw = photo.naturalWidth * scale;
      const dh = photo.naturalHeight * scale;
      const ctx = layer.canvas.getContext("2d")!;
      ctx.drawImage(photo, (sw - dw) / 2, (sh - dh) * CROP_Y, dw, dh);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(layer.worn, 0, 0, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    }

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // A hidden or collapsed window has no size, and drawing a 0×0 canvas throws
      if (w === 0 || h === 0) return;
      for (const layer of layers) {
        const old = layer.worn;
        layer.worn = document.createElement("canvas");
        layer.worn.width = w;
        layer.worn.height = h;
        if (old.width > 0 && old.height > 0) layer.worn.getContext("2d")!.drawImage(old, 0, 0, w, h);
        paint(layer, w, h);
      }
      setReady(true);
    }

    function wear(x: number, y: number) {
      for (const layer of layers) {
        for (const [target, ratio] of [
          [layer.worn, 1],
          [layer.canvas, layer.canvas.width / layer.worn.width],
        ] as const) {
          const ctx = target.getContext("2d")!;
          const r = BRUSH_RADIUS_PX * ratio;
          const brush = ctx.createRadialGradient(x * ratio, y * ratio, 0, x * ratio, y * ratio, r);
          brush.addColorStop(0, `rgba(0,0,0,${layer.strength})`);
          brush.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalCompositeOperation = target === layer.canvas ? "destination-out" : "source-over";
          ctx.fillStyle = brush;
          ctx.fillRect(x * ratio - r, y * ratio - r, r * 2, r * 2);
          ctx.globalCompositeOperation = "source-over";
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      const x = e.clientX;
      const y = e.clientY;
      // Stamp the brush along the path so fast movements don't leave gaps
      const from = last ?? { x, y };
      const steps = Math.max(1, Math.round(Math.hypot(x - from.x, y - from.y) / BRUSH_SPACING_PX));
      for (let i = 1; i <= steps; i++) {
        wear(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps);
      }
      last = { x, y };
    }
    function onPointerLeave() {
      last = null;
    }

    photo.onload = () => {
      if (cancelled) return;
      // Finest layer first, so the coarsest ends up on top
      for (const layer of [...layers].reverse()) container.appendChild(layer.canvas);
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onPointerMove);
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    };
    photo.src = house.src;

    return () => {
      cancelled = true;
      for (const layer of layers) layer.canvas.remove();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
      <Image
        src={house}
        alt=""
        fill
        priority
        sizes="100vw"
        className={`object-cover object-[center_70%] ${ready ? "" : "blur-[24px]"}`}
      />
      <div ref={layersRef} className="absolute inset-0" />
    </div>
  );
}
