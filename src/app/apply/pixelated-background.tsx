"use client";

import { useEffect, useRef, useState } from "react";
import house from "../../../public/house.jpg";

// Pixel sizes of the stacked layers, coarsest on top. The sharp photo sits underneath them all.
// How much of each layer one pass of the mouse wears away: coarse layers go first,
// so a spot gets steadily less pixelated before it comes into focus.
const LEVELS = [
  { pixel: 32, perPass: 0.95 },
  { pixel: 16, perPass: 0.9 },
  { pixel: 8, perPass: 0.8 },
  { pixel: 4, perPass: 0.7 },
];
const BRUSH_RADIUS_PX = 90;
const BRUSH_SPACING_PX = BRUSH_RADIUS_PX / 2;
// One pass lands about this many overlapping stamps on each spot, so each stamp wears away
// a share that compounds to perPass. Stamps are kept few and strong, because very faint
// stamps stop having any effect once the canvas rounds them to whole 8-bit alpha steps.
const STAMPS_PER_PASS = (BRUSH_RADIUS_PX * 2) / BRUSH_SPACING_PX;
// Where the dog is in the photo, as a fraction of its width and height
const DOG = { x: 0.17, y: 0.67 };
// The page column (max-w-4xl, px-5), so the dog can be tucked behind the postcard
const COLUMN_PX = 896;
const GUTTER_PX = 20;
// Zooming in further than this makes the sharp photo visibly soft
const MAX_ZOOM = 2;

type Placement = { x: number; y: number; width: number; height: number };

// Where to draw the photo, in viewport pixels: covering the whole window, zoomed in just enough
// (up to MAX_ZOOM) for the dog to sit behind the left part of the postcard instead of beside it
function placePhoto(photo: HTMLImageElement, w: number, h: number): Placement {
  const nw = photo.naturalWidth;
  const nh = photo.naturalHeight;
  const column = Math.min(w, COLUMN_PX);
  const dogX = (w - column) / 2 + GUTTER_PX + 0.3 * (column - GUTTER_PX * 2);
  const dogY = 0.65 * h;
  const cover = Math.max(w / nw, h / nh);
  const scale = Math.min(Math.max(cover, dogX / (DOG.x * nw)), cover * MAX_ZOOM);
  const width = nw * scale;
  const height = nh * scale;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return {
    x: clamp(dogX - DOG.x * width, w - width),
    y: clamp(dogY - DOG.y * height, h - height),
    width,
    height,
  };
}

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
  // Hidden until every layer is drawn, so the sharp photo never flashes into view on its own
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = layersRef.current!;
    const sharp = document.createElement("canvas");
    sharp.className = "absolute inset-0 h-full w-full";
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

    // Draws the photo onto a canvas whose pixels are kx by ky viewport pixels' worth
    function drawPhoto(canvas: HTMLCanvasElement, at: Placement) {
      const kx = canvas.width / window.innerWidth;
      const ky = canvas.height / window.innerHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(photo, at.x * kx, at.y * ky, at.width * kx, at.height * ky);
      return ctx;
    }

    function paint(layer: Layer, w: number, h: number, at: Placement) {
      // Shrink the photo, then let the canvas stretch it back up with hard pixel edges
      layer.canvas.width = Math.ceil(w / layer.pixel);
      layer.canvas.height = Math.ceil(h / layer.pixel);
      const ctx = drawPhoto(layer.canvas, at);
      const sw = layer.canvas.width;
      const sh = layer.canvas.height;
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(layer.worn, 0, 0, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    }

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // A hidden or collapsed window has no size, and drawing a 0×0 canvas throws
      if (w === 0 || h === 0) return;
      const at = placePhoto(photo, w, h);
      sharp.width = Math.round(w * window.devicePixelRatio);
      sharp.height = Math.round(h * window.devicePixelRatio);
      drawPhoto(sharp, at);
      for (const layer of layers) {
        const old = layer.worn;
        layer.worn = document.createElement("canvas");
        layer.worn.width = w;
        layer.worn.height = h;
        if (old.width > 0 && old.height > 0) layer.worn.getContext("2d")!.drawImage(old, 0, 0, w, h);
        paint(layer, w, h, at);
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
      // Sharp photo at the bottom, then the finest layer, so the coarsest ends up on top
      container.appendChild(sharp);
      for (const layer of [...layers].reverse()) container.appendChild(layer.canvas);
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onPointerMove);
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    };
    photo.src = house.src;

    return () => {
      cancelled = true;
      sharp.remove();
      for (const layer of layers) layer.canvas.remove();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={layersRef}
      aria-hidden="true"
      className={`fixed inset-0 -z-10 overflow-hidden transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
    />
  );
}
