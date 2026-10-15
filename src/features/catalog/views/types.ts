import type { CatalogBook } from '@/types';

export interface BaseCatalogViewProps {
  existingBookTitles: Set<string>;
  downloadingId: string | null;
  onDownloadBook: (book: CatalogBook) => Promise<void>;
  onOpenDetails: (book: CatalogBook) => void;
  onReadBook: (book: CatalogBook) => void;
  refreshTrigger?: number;
  onLoadingChange?: (loading: boolean) => void;
}
