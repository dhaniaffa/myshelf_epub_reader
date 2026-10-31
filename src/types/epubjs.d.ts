import type {
  Contents as BaseContents,
  Book as BaseEpubBook,
  Rendition as BaseRendition,
  Section as BaseSection,
} from 'epubjs';
import type { PackagingMetadataObject } from 'epubjs/types/packaging';

export interface ExtendedPackagingMetadata extends Partial<PackagingMetadataObject> {
  date?: string;
  published?: string;
  [key: string]: unknown;
}

export interface ExtendedSection extends BaseSection {
  href?: string;
  find(query: string): Promise<Array<{ cfi: string; excerpt: string }>>;
  load(request?: (url: string) => Promise<unknown>): Promise<Document>;
  unload(): void;
  output?: string;
}

export interface ExtendedSpine {
  spineItems: ExtendedSection[];
  get(target?: string | number): ExtendedSection | undefined;
  hooks?: {
    serialize?: {
      register: (callback: (output: string, section: ExtendedSection) => void) => void;
    };
    content?: unknown;
  };
}

export interface ExtendedEpubBook extends Omit<BaseEpubBook, 'spine'> {
  spine: ExtendedSpine;
  archive?: {
    getBlob?: (url: string) => Promise<Blob>;
  };
  destroy(): void;
}

export interface ExtendedRendition extends BaseRendition {
  getContents(): BaseContents[];
  spread(spreadVal: string, minWidth?: number): void;
  currentLocation(): {
    start: { cfi: string; index?: number; href?: string; location?: number; percentage?: number };
    end: { cfi: string; index?: number; href?: string; location?: number; percentage?: number };
    atStart?: boolean;
    atEnd?: boolean;
  };
  manager?: {
    isRendered(): boolean;
    updateLayout(): void;
  };
}
