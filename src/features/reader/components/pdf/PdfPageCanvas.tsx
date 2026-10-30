import React, { useEffect, useRef, useState } from 'react';

import { READER_EVENTS } from '@/config';
import { pdfjsLib } from '@/lib/pdf';
import { resolvePdfDestination } from './pdfUtils';

export interface PdfLinkItem {
  id: string;
  rect: [number, number, number, number];
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dest?: any;
  title?: string;
}

export interface PdfPageCanvasProps {
  pageNumber: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any;
  width: number;
  height: number;
  canvasFilterStyle: React.CSSProperties;
  onJumpToPage?: (pageNumber: number) => void;
}

/**
 * Efficient per-page canvas component with TextLayer (selection/copy) and AnnotationLayer (links).
 */
export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({
  pageNumber,
  pdfDoc,
  width,
  height,
  canvasFilterStyle,
  onJumpToPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textLayerInstanceRef = useRef<any>(null);
  const [linkAnnotations, setLinkAnnotations] = useState<PdfLinkItem[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!canvasRef.current || !pdfDoc) return;
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
        }
        if (textLayerInstanceRef.current) {
          try {
            textLayerInstanceRef.current.cancel();
          } catch {
            // ignore
          }
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);

        const task = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = task;
        await task.promise;
        ctx.restore();

        if (isCancelled) return;

        // 1. Render TextLayer for text selection & copy-paste interaction
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
          textLayerDiv.style.setProperty('--total-scale-factor', `${viewport.scale}`);

          const textContent = await page.getTextContent();
          if (isCancelled) return;

          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          textLayerInstanceRef.current = textLayer;
          await textLayer.render();
        }

        if (isCancelled) return;

        // 2. Extract Link Annotations (Web Links & Intra-document Links)
        try {
          const annotList = await page.getAnnotations({ intent: 'display' });
          if (isCancelled) return;

          const links: PdfLinkItem[] = [];
          for (const annot of annotList) {
            if (annot.subtype === 'Link' && annot.rect) {
              const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(annot.rect);
              const left = Math.min(vx1, vx2);
              const top = Math.min(vy1, vy2);
              const w = Math.abs(vx2 - vx1);
              const h = Math.abs(vy2 - vy1);
              const url = annot.url || annot.unsafeUrl;

              links.push({
                id: annot.id || Math.random().toString(36),
                rect: [left, top, w, h],
                url,
                dest: annot.dest,
                title: url || 'Tautan dokumen internal',
              });
            }
          }
          setLinkAnnotations(links);
        } catch (annotErr) {
          console.warn('Failed to load PDF annotation links:', annotErr);
        }
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.name !== 'RenderingCancelledException') {
          console.warn(`Failed to render PDF page ${pageNumber}:`, err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
      if (textLayerInstanceRef.current) {
        try {
          textLayerInstanceRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pageNumber, pdfDoc, width, height]);

  const handleLinkClick = async (e: React.MouseEvent, link: PdfLinkItem) => {
    e.stopPropagation();
    e.preventDefault();
    if (link.url) {
      window.dispatchEvent(
        new CustomEvent(READER_EVENTS.followLink, {
          detail: {
            href: link.url,
            text: link.title || '',
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
      return;
    }
    if (link.dest && onJumpToPage) {
      const targetPage = await resolvePdfDestination(pdfDoc, link.dest);
      if (targetPage) {
        onJumpToPage(targetPage);
      }
    }
  };

  return (
    <div className="relative h-full w-full select-text">
      {/* PDF Graphics Canvas */}
      <canvas
        ref={canvasRef}
        style={canvasFilterStyle}
        className="pointer-events-none block h-full w-full rounded-md object-contain"
      />

      {/* Interactive Text Layer (Selectable & Copy-Paste) */}
      <div
        ref={textLayerRef}
        className="textLayer"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      />

      {/* Hyperlink / Annotation Layer (Web Links & Chapter Navigation) */}
      <div className="annotationLayer">
        {linkAnnotations.map((link) => (
          <a
            key={link.id}
            href={link.url || '#'}
            onClick={(e) => handleLinkClick(e, link)}
            target={link.url ? '_blank' : undefined}
            rel={link.url ? 'noopener noreferrer' : undefined}
            style={{
              left: `${link.rect[0]}px`,
              top: `${link.rect[1]}px`,
              width: `${link.rect[2]}px`,
              height: `${link.rect[3]}px`,
            }}
            className="hover:bg-primary/20 hover:ring-primary/40 pointer-events-auto absolute cursor-pointer rounded-xs transition-all hover:ring-1"
            title={link.title}
          />
        ))}
      </div>
    </div>
  );
};
