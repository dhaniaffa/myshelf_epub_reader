import type {
  PageViewport,
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
  TextLayer,
} from 'pdfjs-dist';

export type PdfDocumentProxy = PDFDocumentProxy;
export type PdfPageProxy = PDFPageProxy;
export type PdfDocumentLoadingTask = PDFDocumentLoadingTask;
export type PdfRenderTask = RenderTask;
export type PdfPageViewport = PageViewport;
export type PdfTextLayer = TextLayer;

export type PdfTextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>;
export type PdfTextItem = PdfTextContent['items'][number];

export interface PdfDocumentInfo {
  Title?: string;
  Author?: string;
  CreationDate?: string;
  ModDate?: string;
  Producer?: string;
  Creator?: string;
  PDFFormatVersion?: string;
  [key: string]: unknown;
}

export interface PdfOutlineNode {
  title: string;
  bold?: boolean;
  italic?: boolean;
  color?: Uint8ClampedArray;
  dest?: string | unknown[] | null;
  url?: string | null;
  unsafeUrl?: string;
  newWindow?: boolean;
  count?: number;
  items?: PdfOutlineNode[];
}
