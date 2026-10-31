import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  KeyRound,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { CatalogBookCard } from '@/features/catalog/CatalogBookCard';
import { fetchOpdsFeed } from '@/lib/opds';
import { toast } from '@/store/toast';

import type { OpdsFeedResult, OpdsNavigationLink } from '@/types';
import type { BaseCatalogViewProps } from './types';

const PUBLIC_NEW_RELEASES_URL = 'https://standardebooks.org/feeds/atom/new-releases';
const PATRONS_FEED_URL = 'https://standardebooks.org/feeds/opds';
const PATRON_EMAIL_STORAGE_KEY = 'myshelf_se_patron_email';

export const StandardEbooksView: React.FC<BaseCatalogViewProps> = ({
  existingBookTitles,
  downloadingId,
  onDownloadBook,
  onOpenDetails,
  onReadBook,
  refreshTrigger,
  onLoadingChange,
}) => {
  const [result, setResult] = useState<OpdsFeedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; is401: boolean } | null>(null);
  const [history, setHistory] = useState<{ title: string; url: string }[]>([]);
  const [url, setUrl] = useState<string>(PUBLIC_NEW_RELEASES_URL);

  // Patrons Circle email for authentication if user is a patron
  const [patronEmail, setPatronEmail] = useState<string>(() => {
    return localStorage.getItem(PATRON_EMAIL_STORAGE_KEY) || '';
  });
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [tempEmail, setTempEmail] = useState('');

  const loadStandardEbooks = useCallback(
    async (targetUrl: string, emailToUse?: string) => {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);

      const activeEmail = emailToUse !== undefined ? emailToUse : patronEmail;
      const headers: Record<string, string> = {};

      if (activeEmail.trim() && targetUrl.includes('standardebooks.org')) {
        headers['Authorization'] = `Basic ${btoa(activeEmail.trim() + ':')}`;
      }

      try {
        const res = await fetchOpdsFeed(targetUrl, { headers });
        setResult(res);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Gagal memuat katalog Standard Ebooks';
        const is401 =
          errMsg.includes('401') ||
          (typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            (err as { status: unknown }).status === 401);

        setError({
          message: errMsg,
          is401: !!is401,
        });
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [patronEmail, onLoadingChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStandardEbooks(url);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStandardEbooks, url, refreshTrigger]);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempEmail.trim();
    if (!clean) {
      localStorage.removeItem(PATRON_EMAIL_STORAGE_KEY);
      setPatronEmail('');
      setShowEmailInput(false);
      toast.info('Email Patrons Circle dihapus');
      void loadStandardEbooks(url, '');
      return;
    }
    localStorage.setItem(PATRON_EMAIL_STORAGE_KEY, clean);
    setPatronEmail(clean);
    setShowEmailInput(false);
    toast.success('Email Patrons Circle disimpan');
    void loadStandardEbooks(url, clean);
  };

  const handleSwitchToPublicFeed = () => {
    setHistory([]);
    setUrl(PUBLIC_NEW_RELEASES_URL);
  };

  const handleSwitchToPatronsFeed = () => {
    setHistory([]);
    setUrl(PATRONS_FEED_URL);
  };

  const handleNavigateSub = (sub: OpdsNavigationLink) => {
    if (result) {
      setHistory((prev) => [...prev, { title: result.title || 'Standard Ebooks', url }]);
    }
    setUrl(sub.href);
  };

  const handleBackHistory = () => {
    if (history.length === 0) return;
    const prevHistory = [...history];
    const last = prevHistory.pop();
    if (last) {
      setHistory(prevHistory);
      setUrl(last.url);
    }
  };

  const isPatronsFeed = url.includes('/feeds/opds');

  return (
    <div className="space-y-4">
      {/* Banner Standard Ebooks */}
      <div className="bg-surface-container/60 border-outline-variant/30 flex flex-col items-start justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h3 className="text-on-surface text-sm font-bold">Standard Ebooks</h3>
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
              Kualitas Terbaik
            </span>
            {patronEmail && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={10} /> Patrons Circle Aktif
              </span>
            )}
          </div>
          <p className="text-on-surface-variant max-w-2xl text-xs leading-relaxed">
            Buku domain publik terkurasi dengan tipografi modern, sampul seni berkualitas tinggi,
            dan format EPUB yang disempurnakan secara profesional.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href="https://standardebooks.org"
            target="_blank"
            rel="noreferrer"
            className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <span>standardebooks.org</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Feed Presets & Patron Circle Email Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSwitchToPublicFeed}
            className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              !isPatronsFeed
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/30 border'
            }`}
          >
            ✨ Rilisan Terbaru (Publik)
          </button>
          <button
            type="button"
            onClick={handleSwitchToPatronsFeed}
            className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              isPatronsFeed
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/30 border'
            }`}
          >
            ⭐ Koleksi Patrons Circle
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setTempEmail(patronEmail);
            setShowEmailInput((prev) => !prev);
          }}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-outline-variant/30 flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors"
        >
          <KeyRound size={12} className={patronEmail ? 'text-primary' : ''} />
          <span>{patronEmail ? 'Ubah Email Donatur' : 'Login Patrons Circle'}</span>
        </button>
      </div>

      {/* Inline Input Email Patrons Circle */}
      {showEmailInput && (
        <form
          onSubmit={handleSaveEmail}
          className="bg-surface-container/70 border-outline-variant/40 flex flex-col gap-2 rounded-2xl border p-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex-1 space-y-0.5">
            <p className="text-on-surface text-xs font-semibold">
              Email Patrons Circle Standard Ebooks
            </p>
            <p className="text-on-surface-variant text-[11px]">
              Jika Anda telah berdonasi ke Standard Ebooks, masukkan email donatur Anda untuk
              membuka semua feed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={tempEmail}
              onChange={(e) => setTempEmail(e.target.value)}
              placeholder="email@anda.com"
              className="bg-surface border-outline-variant/40 text-on-surface focus:border-primary w-full rounded-xl border px-3 py-1.5 text-xs focus:outline-hidden sm:w-60"
            />
            <Button variant="filled" size="sm" type="submit" className="shrink-0 text-xs">
              Simpan
            </Button>
            <Button
              variant="text"
              size="sm"
              type="button"
              onClick={() => setShowEmailInput(false)}
              className="shrink-0 text-xs"
            >
              Batal
            </Button>
          </div>
        </form>
      )}

      {/* Breadcrumb Navigation for Nested Subsections */}
      {history.length > 0 && (
        <div className="text-on-surface-variant flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleBackHistory}
            className="text-primary flex cursor-pointer items-center gap-1 font-medium hover:underline"
          >
            <ArrowLeft size={13} />
            <span>Kembali</span>
          </button>
          <ChevronRight size={13} className="text-outline-variant" />
          <span className="text-on-surface truncate font-semibold">
            {result?.title || 'Koleksi'}
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* ENHANCED ERROR VIEW (401 & NETWORK ERROR) */}
      {/* ======================================================== */}
      {error && (
        <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm transition-all duration-300 dark:bg-amber-950/20">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <div className="shrink-0 rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                {error.is401 ? <Lock size={22} /> : <AlertCircle size={22} />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-on-surface text-sm font-bold sm:text-base">
                    {error.is401
                      ? 'Akses Terbatas: Memerlukan Patrons Circle'
                      : 'Gagal Memuat Katalog Standard Ebooks'}
                  </h4>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-300">
                    {error.is401 ? 'HTTP 401 Unauthorized' : 'Error'}
                  </span>
                </div>
                <p className="text-on-surface-variant text-xs leading-relaxed sm:text-sm">
                  {error.is401
                    ? 'Standard Ebooks membatasi feed OPDS lengkap khusus untuk anggota donatur (Patrons Circle). Anda dapat beralih ke koleksi Rilisan Terbaru yang 100% gratis dan terbuka untuk publik, atau masukkan email donatur Anda jika sudah bergabung.'
                    : error.message}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-amber-500/20 pt-1">
              {error.is401 && (
                <>
                  <Button
                    variant="filled"
                    size="sm"
                    icon={<Sparkles size={14} />}
                    onClick={handleSwitchToPublicFeed}
                    className="text-xs"
                  >
                    Buka Rilisan Terbaru (Gratis)
                  </Button>
                  <Button
                    variant="outlined"
                    size="sm"
                    icon={<KeyRound size={13} />}
                    onClick={() => {
                      setTempEmail(patronEmail);
                      setShowEmailInput(true);
                    }}
                    className="text-xs"
                  >
                    Masukkan Email Donatur
                  </Button>
                  <a
                    href="https://standardebooks.org/donate#patrons-circle"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium hover:underline"
                  >
                    <span>Tentang Patrons Circle</span>
                    <ExternalLink size={12} />
                  </a>
                </>
              )}

              {!error.is401 && (
                <>
                  <Button
                    variant="filled"
                    size="sm"
                    icon={<RefreshCw size={13} />}
                    onClick={() => void loadStandardEbooks(url)}
                    className="text-xs"
                  >
                    Coba Lagi
                  </Button>
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={handleSwitchToPublicFeed}
                    className="text-xs"
                  >
                    Kembali ke Rilisan Terbaru
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subsections (Categories/Sub-catalogs) */}
      {result?.subsections && result.subsections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-on-surface-variant flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            <FolderOpen size={14} className="text-primary" />
            <span>Kategori Koleksi</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.subsections.map((sub, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleNavigateSub(sub)}
                className="bg-surface-container hover:bg-surface-container-high border-outline-variant/30 text-on-surface flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium shadow-xs transition-colors"
              >
                <span>{sub.title}</span>
                <ChevronRight size={13} className="text-on-surface-variant" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard Ebooks Books Grid */}
      {result?.books && result.books.length > 0 ? (
        <div className="space-y-3">
          <div className="text-on-surface-variant flex items-center justify-between px-1 text-xs">
            <h3 className="font-semibold tracking-wider uppercase">
              {result.title || 'Daftar Buku'} ({result.books.length})
            </h3>
            <span className="text-[11px] opacity-75">
              {!isPatronsFeed ? 'Koleksi Publik Terbuka' : 'Feed Patrons Circle'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {result.books.map((book) => {
              const isDownloaded = existingBookTitles.has(book.title.trim().toLowerCase());
              const isDownloading = downloadingId === book.id;
              return (
                <CatalogBookCard
                  key={book.id}
                  book={book}
                  isDownloaded={isDownloaded}
                  isDownloading={isDownloading}
                  onDownload={onDownloadBook}
                  onOpenDetails={onOpenDetails}
                  onRead={onReadBook}
                />
              );
            })}
          </div>
        </div>
      ) : !loading &&
        result &&
        (!result.subsections || result.subsections.length === 0) &&
        !error ? (
        <div className="text-on-surface-variant py-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Tidak ada buku dalam feed ini.</p>
        </div>
      ) : null}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-3 border-t-transparent" />
          <p className="text-on-surface-variant text-xs font-medium">
            Memuat katalog Standard Ebooks...
          </p>
        </div>
      )}
    </div>
  );
};
