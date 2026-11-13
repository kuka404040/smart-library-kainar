import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  BookOpen,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  FileText,
  RotateCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Book, Language } from '../types';
import { translations } from '../i18n/translations';

interface OnlineReaderModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onBackToDetail?: () => void;
  lang: Language;
}

export const OnlineReaderModal: React.FC<OnlineReaderModalProps> = ({
  book,
  isOpen,
  onClose,
  onBackToDetail,
  lang,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75, 100, 125, 150, 200
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>('1');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const t = translations[lang] || translations.kk;

  // Primary URL for direct embedded reading
  const rawPdfUrl = book?.pdf_url || book?.pdfUrl;
  const rawReadingUrl = book?.reading_url || book?.readingUrl || rawPdfUrl || book?.source_url || book?.sourceUrl;
  const sourceUrl = book?.source_url || book?.sourceUrl || (book?.grade ? 'https://okulyk.kz/' : undefined);

  // Safe proxied URL for fetching document bytes
  const proxiedPdfUrl = rawPdfUrl
    ? rawPdfUrl.startsWith('http://') || rawPdfUrl.startsWith('https://')
      ? `/api/pdf-proxy?url=${encodeURIComponent(rawPdfUrl)}`
      : rawPdfUrl
    : null;

  // Reset state on book open
  useEffect(() => {
    if (isOpen && book) {
      setCurrentPage(1);
      setPageInput('1');
      setZoomLevel(100);
      setRotation(0);
      setPdfError(null);
      setIsLoadingPdf(true);
      pdfDocRef.current = null;
    }
  }, [isOpen, book]);

  // Load PDF Document with PDF.js (Canvas based - NEVER blocked by Chrome)
  useEffect(() => {
    if (!isOpen || !book || !proxiedPdfUrl) {
      setIsLoadingPdf(false);
      return;
    }

    let isCancelled = false;

    const initPdf = async () => {
      try {
        setIsLoadingPdf(true);
        setPdfError(null);

        // Ensure PDF.js is loaded
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          // If script tag is still resolving, wait briefly
          await new Promise((r) => setTimeout(r, 400));
        }

        const activePdfjs = (window as any).pdfjsLib;
        if (!activePdfjs) {
          throw new Error('PDF.js кітапханасы табылмады');
        }

        activePdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

        const loadingTask = activePdfjs.getDocument({
          url: proxiedPdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
        setIsLoadingPdf(false);
      } catch (err: unknown) {
        if (isCancelled) return;
        console.warn('PDF.js loading warning:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setPdfError(errMsg || 'Құжатты жүктеу мүмкін болмады');
        setIsLoadingPdf(false);
      }
    };

    initPdf();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, proxiedPdfUrl]);

  // Render current page on canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      const doc = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;

      try {
        setIsRenderingPage(true);

        // Cancel previous page render if active
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
        }

        const page = await doc.getPage(pageNum);
        const baseScale = 1.4;
        const currentScale = baseScale * (zoomLevel / 100);
        const viewport = page.getViewport({ scale: currentScale, rotation });

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;

        const renderContext = {
          canvasContext: ctx,
          transform,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', err);
        }
      } finally {
        setIsRenderingPage(false);
      }
    },
    [zoomLevel, rotation]
  );

  // Trigger page render when page or zoom/rotation changes
  useEffect(() => {
    if (!isLoadingPdf && pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, zoomLevel, rotation, isLoadingPdf, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalPages, onClose]);

  // Keep page input synchronized
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  if (!isOpen || !book) return null;

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleZoomReset = () => {
    setZoomLevel(100);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setCurrentPage(num);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const getLanguageLabel = (l?: string) => {
    if (l === 'kk') return 'ҚАЗ';
    if (l === 'ru') return 'РУС';
    if (l === 'en') return 'ENG';
    return '';
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-[#050914] text-[#e2e8f0] select-none transition-all ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1224] via-[#050914] to-[#03060c] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative flex flex-col w-full h-full rounded-2xl bg-[#091122]/95 border border-[#d4af37]/40 shadow-[0_0_60px_rgba(212,175,55,0.25)] overflow-hidden">
        {/* Top Header & Navigation Bar */}
        <header className="flex-none flex items-center justify-between px-3 sm:px-6 py-3 border-b border-[#1b2b48] bg-[#0c182d]/90 backdrop-blur-md gap-3">
          {/* Left: Back button & Book Info */}
          <div className="flex items-center gap-2 sm:gap-4 truncate">
            {onBackToDetail && (
              <button
                onClick={onBackToDetail}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#12213a] hover:bg-[#1a2f52] border border-[#21375d] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                title={t.backToBook}
              >
                <ArrowLeft className="w-4 h-4 text-[#d4af37]" />
                <span className="hidden md:inline">{t.backToBook}</span>
              </button>
            )}

            <div className="w-8 h-8 rounded-lg bg-[#142542] border border-[#d4af37]/40 flex items-center justify-center text-[#f3c68f] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="font-serif-title text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[180px] sm:max-w-md">
                  {book.title}
                </h2>
                {book.course > 0 && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#162746] text-[#f3c68f] border border-[#d4af37]/40">
                    {book.course} {t.courseLabel || 'курс'}
                  </span>
                )}
                {book.language && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-[#10243e] text-blue-300 border border-blue-500/30">
                    {getLanguageLabel(book.language)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-sm">
                {book.author} {book.publisher ? `· ${book.publisher}` : ''} {book.year ? `(${book.year})` : ''}
              </p>
            </div>
          </div>

          {/* Center / Right: Reading Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Page Navigation */}
            {totalPages > 0 && (
              <div className="flex items-center bg-[#070d1a] border border-[#1d3052] rounded-xl p-0.5 text-xs">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1 || isLoadingPdf}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#14223d] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title={t.prevPage}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <form onSubmit={handlePageInputSubmit} className="flex items-center px-2">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputSubmit}
                    className="w-10 text-center font-mono text-[11px] text-white font-bold bg-[#0e1c33] border border-[#233a61] rounded px-1 py-0.5 outline-none focus:border-[#d4af37]"
                  />
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-400 font-mono text-[11px]">{totalPages}</span>
                </form>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || isLoadingPdf}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#14223d] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  title={t.nextPage}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center bg-[#070d1a] border border-[#1d3052] rounded-xl p-0.5 text-xs">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50 || isLoadingPdf}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#14223d] disabled:opacity-30 cursor-pointer"
                title={t.zoomOut}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleZoomReset}
                className="px-2 font-mono text-[11px] text-[#f3c68f] hover:text-white cursor-pointer"
                title={t.zoomReset}
              >
                {zoomLevel}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200 || isLoadingPdf}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#14223d] disabled:opacity-30 cursor-pointer"
                title={t.zoomIn}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRotate}
                disabled={isLoadingPdf}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#14223d] disabled:opacity-30 cursor-pointer"
                title="Бұру / Повернуть"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Direct Open in New Tab Button (Always available for convenience) */}
            {rawPdfUrl && (
              <a
                href={rawPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#122038] hover:bg-[#192c4d] border border-[#233a63] text-slate-300 hover:text-[#f3c68f] text-xs font-medium transition-colors"
                title="Бөлек қойындыда ашу"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'kk' ? 'Бөлек қойынды' : 'В новой вкладке'}</span>
              </a>
            )}

            {/* Direct Official Link */}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#122038] hover:bg-[#192c4d] border border-[#233a63] text-slate-300 hover:text-[#f3c68f] text-xs font-medium transition-colors"
                title={t.openInNewTab}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'kk' ? 'Ресми сайт' : 'Офиц. сайт'}</span>
              </a>
            )}

            {/* Direct PDF Download if available */}
            {rawPdfUrl && (
              <a
                href={proxiedPdfUrl || rawPdfUrl}
                download={`${book.title}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 p-2 rounded-xl bg-[#122038] hover:bg-[#192c4d] border border-[#233a63] text-slate-300 hover:text-emerald-300 transition-colors"
                title={t.downloadPdf}
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-[#122038] hover:bg-[#192c4d] border border-[#233a63] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? t.exitFullscreen : t.fullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 hover:text-white transition-colors cursor-pointer"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Document Viewer Canvas Area (Chrome-Block Free) */}
        <div className="relative flex-1 w-full h-full bg-[#03060c] overflow-auto flex flex-col items-center justify-start p-4 sm:p-6 custom-scrollbar">
          {isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center my-auto space-y-4 py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37] animate-spin" />
                <BookOpen className="w-6 h-6 text-[#f3c68f] absolute inset-0 m-auto" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white">
                  {lang === 'kk' ? 'Оқулық жүктелуде...' : 'Учебник загружается...'}
                </p>
                <p className="text-xs text-slate-400">
                  {lang === 'kk'
                    ? 'Қауіпсіз цифрлық ридер парақтарды дайындауда'
                    : 'Цифровой ридер подготавливает страницы документа'}
                </p>
              </div>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center my-auto p-8 max-w-lg text-center space-y-5 rounded-2xl bg-[#091224] border border-[#253d66] shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-950/50 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif-title text-base sm:text-lg font-bold text-white">
                  {lang === 'kk' ? 'Құжатты тікелей оқу' : 'Просмотр документа'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'kk'
                    ? 'Бұл оқулықты тікелей жаңа қойындыда ашуға немесе ресми қайнар көзден оқуға болады.'
                    : 'Вы можете открыть данный учебник в отдельной вкладке или перейти к первоисточнику.'}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
                {rawPdfUrl && (
                  <a
                    href={rawPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f3c68f] text-[#080d19] font-bold text-xs shadow-lg hover:brightness-110 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{lang === 'kk' ? 'Бөлек қойындыда ашу' : 'Открыть в новой вкладке'}</span>
                  </a>
                )}

                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#142340] border border-[#2b4470] text-[#f3c68f] font-semibold text-xs shadow-lg hover:bg-[#1a2f55] transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t.openOfficialSource || 'Ресми сайтқа өту'}</span>
                  </a>
                )}
              </div>
            </div>
          ) : rawPdfUrl ? (
            <div className="relative flex flex-col items-center justify-center my-auto transition-all duration-200">
              {/* Spinner while page changes */}
              {isRenderingPage && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#081224]/90 border border-[#d4af37]/40 text-[#f3c68f] text-xs shadow-xl backdrop-blur-md">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Парақ жүктелуде...</span>
                </div>
              )}

              {/* Native HTML5 Canvas rendering (100% bypasses Chrome iframe & plugin blocks) */}
              <div className="rounded-xl shadow-[0_15px_45px_rgba(0,0,0,0.85)] border border-[#1e3458] overflow-hidden bg-white">
                <canvas ref={canvasRef} className="block max-w-full" />
              </div>

              {/* Bottom indicator watermark */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>
                  ҚАЙНАР КОЛЛЕДЖІ · {currentPage} / {totalPages} БЕТ
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0f1d38] border border-[#d4af37]/50 flex items-center justify-center text-[#f3c68f] shadow-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif-title text-lg font-bold text-white">
                  {lang === 'kk' ? 'Оқулыққа арналған PDF сілтемесі дайындалуда' : 'Ссылка для онлайн-чтения подготавливается'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {lang === 'kk'
                    ? 'Бұл оқулықты тікелей оқу үшін әкімшілік панель арқылы PDF файлы немесе оқу сілтемесі тіркеледі.'
                    : 'Для данного учебника администратор может указать прямую ссылку на PDF или файл через панель библиотекаря.'}
                </p>
              </div>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f3c68f] text-[#080d19] font-bold text-xs shadow-lg hover:brightness-110 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.openOfficialSource || 'Ресми қайнар көзден оқу'}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Mobile bottom quick bar */}
        <footer className="sm:hidden flex-none px-3 py-2 border-t border-[#1a2b48] bg-[#0c182d] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoadingPdf}
              className="p-1.5 rounded-lg bg-[#14233e] text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white text-[11px]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoadingPdf}
              className="p-1.5 rounded-lg bg-[#14233e] text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {rawPdfUrl && (
              <a
                href={rawPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-[#14233e] text-[#f3c68f]"
                title="Ашу"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-[#14233e] text-slate-300"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
