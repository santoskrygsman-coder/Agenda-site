"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Crop,
  Move,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface ServicePhotoCropModalProps {
  open: boolean;
  sourceDataUrl: string;
  mimeType?: string;
  onCancel: () => void;
  onConfirmCrop: (croppedDataUrl: string) => void;
}

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 900; // Proporção 4:3 ideal para a Lupa HD e miniatura circular central

export default function ServicePhotoCropModal({
  open,
  sourceDataUrl,
  mimeType = "image/jpeg",
  onCancel,
  onConfirmCrop,
}: ServicePhotoCropModalProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });

  useEffect(() => {
    if (!open || !sourceDataUrl) return;
    setImgLoaded(false);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgElementRef.current = img;
      setNaturalSize({
        width: img.naturalWidth || img.width || 800,
        height: img.naturalHeight || img.height || 800,
      });
      setImgLoaded(true);
    };
    img.src = sourceDataUrl;
  }, [open, sourceDataUrl]);

  if (!open) return null;

  // Dimensões efetivas considerando rotação de 90/270 graus
  const isRotated90 = rotation % 180 !== 0;
  const effWidth = isRotated90 ? naturalSize.height : naturalSize.width;
  const effHeight = isRotated90 ? naturalSize.width : naturalSize.height;

  // Clamping do deslocamento para nunca deixar bordas vazias fora da área de corte
  const clampOffset = (
    rawX: number,
    rawY: number,
    currentZoom: number,
    vpWidth: number,
    vpHeight: number
  ) => {
    const baseScale = Math.max(vpWidth / effWidth, vpHeight / effHeight);
    const renderedW = effWidth * baseScale * currentZoom;
    const renderedH = effHeight * baseScale * currentZoom;

    const maxOffsetX = Math.max(0, (renderedW - vpWidth) / 2);
    const maxOffsetY = Math.max(0, (renderedH - vpHeight) / 2);

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, rawX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, rawY)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const next = clampOffset(
      dragStartRef.current.startOffsetX + dx,
      dragStartRef.current.startOffsetY + dy,
      zoom,
      rect.width,
      rect.height
    );
    setOffset(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(clampedZoom);
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      setOffset((prev) =>
        clampOffset(prev.x, prev.y, clampedZoom, rect.width, rect.height)
      );
    }
  };

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = imgElementRef.current;
    const vp = viewportRef.current;
    if (!img || !vp) return;

    const rect = vp.getBoundingClientRect();
    const vpW = rect.width || 320;
    const vpH = rect.height || 240;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fundo neutro suave caso a imagem tenha transparência
    ctx.fillStyle = "#EAD8CE";
    ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    // Escala entre o viewport da tela e o canvas HD final (1200x900)
    const ratioToOutput = OUTPUT_WIDTH / vpW;
    const baseScale = Math.max(vpW / effWidth, vpH / effHeight);
    const totalScale = baseScale * zoom * ratioToOutput;

    ctx.save();
    ctx.translate(
      OUTPUT_WIDTH / 2 + offset.x * ratioToOutput,
      OUTPUT_HEIGHT / 2 + offset.y * ratioToOutput
    );
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(totalScale, totalScale);
    ctx.drawImage(
      img,
      -naturalSize.width / 2,
      -naturalSize.height / 2,
      naturalSize.width,
      naturalSize.height
    );
    ctx.restore();

    const outMime =
      mimeType === "image/png"
        ? "image/png"
        : mimeType === "image/webp"
        ? "image/webp"
        : "image/jpeg";

    const croppedDataUrl =
      outMime === "image/png"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL(outMime, 0.88);

    onConfirmCrop(croppedDataUrl);
  };

  // Cálculo de estilo em tempo real para o elemento visual no viewport
  const vpWidthEstimate = viewportRef.current?.clientWidth || 320;
  const vpHeightEstimate = viewportRef.current?.clientHeight || 240;
  const baseScaleCss = Math.max(
    vpWidthEstimate / effWidth,
    vpHeightEstimate / effHeight
  );
  const drawW = naturalSize.width * baseScaleCss * zoom;
  const drawH = naturalSize.height * baseScaleCss * zoom;

  return (
    <div className="fixed inset-0 z-[70] bg-[#2D1C18]/85 backdrop-blur-[3px] flex items-center justify-center p-2.5 min-[375px]:p-3 overflow-y-auto">
      <div className="w-full max-w-[405px] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[24px] p-4 shadow-2xl space-y-3 my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E6D8CF]">
          <div className="flex items-center gap-2">
            <Crop size={17} className="text-[#B87472] shrink-0" />
            <h3 className="font-serif text-[17.5px] font-bold text-[#2D1C18]">
              Ajustar e recortar foto
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar recorte"
            className="w-9 h-9 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition touch-manipulation"
          >
            <X size={17} />
          </button>
        </div>

        <p className="text-[11.5px] text-[#5C4841] leading-snug flex items-center gap-1.5">
          <Move size={13} className="text-[#B87472] shrink-0" />
          <span>
            Arraste a foto com o dedo e ajuste o zoom para enquadrar os cílios
            no centro.
          </span>
        </p>

        {/* Área interativa de corte (Proporção 4:3 igual à Lupa HD + guia circular do card) */}
        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full aspect-[4/3] rounded-[16px] overflow-hidden bg-[#2D1C18] border-2 border-[#B87472] touch-none select-none cursor-grab active:cursor-grabbing shadow-inner"
        >
          {imgLoaded && (
            <img
              src={sourceDataUrl}
              alt="Enquadramento da foto"
              draggable={false}
              style={{
                width: `${drawW}px`,
                height: `${drawH}px`,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
              }}
              className="absolute top-1/2 left-1/2 max-w-none pointer-events-none select-none"
            />
          )}

          {/* Grade de terços + Guia circular central da miniatura do card */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Linhas de terços sutis */}
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-white/25" />
              <div className="border-r border-white/25" />
              <div />
            </div>

            {/* Círculo central indicando o recorte redondo da lista de serviços */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[66%] aspect-square rounded-full border-2 border-dashed border-[#FAF5F1]/85 shadow-[0_0_0_9999px_rgba(45,28,24,0.28)]" />
            </div>

            <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] font-semibold text-[#FAF5F1] px-1">
              <span className="bg-[#2D1C18]/75 px-2 py-0.5 rounded-full">
                Quadro inteiro: Lupa HD
              </span>
              <span className="bg-[#2D1C18]/75 px-2 py-0.5 rounded-full">
                Círculo: Ícone da lista
              </span>
            </div>
          </div>
        </div>

        {/* Controles de Zoom e Rotação */}
        <div className="bg-[#FAF5F1] border border-[#E4D5CB] rounded-[14px] p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              aria-label="Diminuir zoom"
              className="w-8 h-8 rounded-full bg-[#EADCD3] text-[#2D1C18] flex items-center justify-center active:scale-95 transition shrink-0 touch-manipulation"
            >
              <ZoomOut size={15} />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="flex-1 accent-[#B87472] h-2 cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              aria-label="Aumentar zoom"
              className="w-8 h-8 rounded-full bg-[#EADCD3] text-[#2D1C18] flex items-center justify-center active:scale-95 transition shrink-0 touch-manipulation"
            >
              <ZoomIn size={15} />
            </button>

            <span className="text-[11.5px] font-bold text-[#4E3B35] w-10 text-right shrink-0">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#ECE0D7]">
            <button
              type="button"
              onClick={handleRotate90}
              className="min-h-[34px] px-3 py-1 rounded-[10px] bg-[#F4EAE3] border border-[#E2D3C9] text-[#2D1C18] text-[11.5px] font-semibold flex items-center gap-1.5 active:scale-95 transition touch-manipulation"
            >
              <RotateCw size={13} className="text-[#B87472]" />
              <span>Girar 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="min-h-[34px] px-3 py-1 rounded-[10px] bg-[#F4EAE3] border border-[#E2D3C9] text-[#5C4841] text-[11.5px] font-semibold flex items-center gap-1.5 active:scale-95 transition touch-manipulation"
            >
              <RotateCcw size={13} />
              <span>Centralizar</span>
            </button>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[46px] rounded-full bg-[#EADCD3] text-[#2D1C18] font-semibold text-[13.5px] active:scale-[0.99] transition touch-manipulation"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[46px] rounded-full bg-[#B87472] hover:bg-[#A66361] text-white font-semibold text-[13.5px] flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition touch-manipulation"
          >
            <Check size={16} />
            <span>Confirmar recorte</span>
          </button>
        </div>
      </div>
    </div>
  );
}
