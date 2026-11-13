import React from 'react';
import { X, BookOpen, Sparkles, BookUp, Edit3, Eye, ExternalLink, Globe, Award, Calendar } from 'lucide-react';
import { Book, Language } from '../types';
import { translations } from '../i18n/translations';

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  isLibrarian: boolean;
  onQuickIssue?: (book: Book) => void;
  onEditBook?: (book: Book) => void;
  onOpenReader?: (book: Book) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  lang,
  isLibrarian,
  onQuickIssue,
  onEditBook,
  onOpenReader,
}) => {
  if (!isOpen || !book) return null;
  const t = translations[lang] || translations.kk;
  const isAvailable = book.available_copies > 0;
  const issuedCopies = book.total_copies - book.available_copies;
  const hasReadingUrl = Boolean(book.reading_url || book.readingUrl || book.pdf_url || book.pdfUrl || book.source_url || book.sourceUrl);

  const getLanguageLabel = (l?: string) => {
    if (l === 'kk') return lang === 'kk' ? 'Қазақ тілінде' : 'На казахском';
    if (l === 'ru') return lang === 'kk' ? 'Орыс тілінде' : 'На русском';
    if (l === 'en') return lang === 'kk' ? 'Ағылшын тілінде' : 'На английском';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03060e]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-gradient-to-b from-[#0e1b33] via-[#091325] to-[#060c18] border border-[#d4af37]/50 shadow-[0_0_60px_rgba(212,175,55,0.25)] p-6 sm:p-8 overflow-hidden my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182846] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
          {/* Left Book Visual Representation */}
          <div className="sm:col-span-5 flex justify-center">
            <div className="w-48 h-68 rounded-xl bg-gradient-to-br from-[#132342] via-[#0d182e] to-[#080f1d] border-2 border-[#d4af37]/70 shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-[#d4af37] via-[#b8860b] to-[#785408]" />

              {/* Cover image if available */}
              {book.cover_url && (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
                />
              )}

              <div className="pl-2 relative z-10">
                <div className="flex justify-between items-center text-[10px] text-[#f3c68f] font-mono">
                  <span>
                    {book.grade
                      ? `${book.grade} ${t.gradeLabel || 'сынып'}`
                      : book.course > 0
                      ? `${book.course} ${t.courseLabel}`
                      : (lang === 'kk' ? 'Жалпы' : 'Все курсы')}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                </div>
                <div className="mt-8 text-center">
                  <BookOpen className="w-10 h-10 mx-auto text-[#f3c68f] mb-3" />
                  <div className="font-serif text-sm font-bold text-white line-clamp-3 leading-tight">
                    {book.title}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-2 font-light">
                    {book.author}
                  </div>
                </div>
              </div>

              <div className="pl-2 pt-2 border-t border-[#d4af37]/20 flex justify-between items-center text-[10px] relative z-10">
                <span className="text-slate-400">
                  {book.grade
                    ? (lang === 'kk' ? 'Мектеп оқулығы' : 'Школьный учебник')
                    : book.book_type === 'special'
                    ? (lang === 'kk' ? 'Арнайы пән' : 'Спец. курс')
                    : (lang === 'kk' ? 'Жалпы білім' : 'Общеобраз.')}
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {book.available_copies} / {book.total_copies}
                </span>
              </div>
            </div>
          </div>

          {/* Right Details */}
          <div className="sm:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
                <span className="text-[#f3c68f] font-semibold uppercase tracking-wider">{book.category}</span>
                <span>·</span>
                <span>{book.subject}</span>
                {book.specialty && (
                  <>
                    <span>·</span>
                    <span className="text-[#f3c68f] font-medium bg-[#162544] px-2 py-0.5 rounded border border-[#d4af37]/30">
                      {(t as any)[`spec_${book.specialty}`] || book.specialty}
                    </span>
                  </>
                )}
                {book.course > 0 ? (
                  <>
                    <span>·</span>
                    <span className="text-blue-300 font-semibold">{book.course} {t.courseLabel}</span>
                  </>
                ) : (
                  <>
                    <span>·</span>
                    <span className="text-blue-300 font-semibold">1 {t.courseLabel}</span>
                  </>
                )}
              </div>
              <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-white leading-tight">
                {book.title}
              </h2>
              <p className="text-sm text-slate-300 mt-1 font-light">
                {book.author}
              </p>
            </div>

            {/* Copies Matrix */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-[#081120] border border-[#182946]">
              <div className="p-1.5">
                <div className="text-[10px] text-slate-400">{t.totalCopies}</div>
                <div className="font-mono text-base font-bold text-white">{book.total_copies}</div>
              </div>
              <div className="p-1.5 border-x border-[#182946]">
                <div className="text-[10px] text-slate-400">{t.availableCopies}</div>
                <div className="font-mono text-base font-bold text-emerald-400">{book.available_copies}</div>
              </div>
              <div className="p-1.5">
                <div className="text-[10px] text-slate-400">{t.issuedCopies}</div>
                <div className="font-mono text-base font-bold text-amber-400">{issuedCopies}</div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-300">
                {t.description}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-h-32 overflow-y-auto pr-1">
                {book.description || (lang === 'kk' ? 'Сипаттамасы көрсетілмеген.' : 'Описание не указано.')}
              </p>
            </div>

            {/* Extended metadata (Publisher, Year, Language, ISBN, Source) */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
              {book.publisher && (
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                  <span className="text-slate-500">{t.publisher || 'Баспасы'}:</span>{' '}
                  <span className="font-medium text-slate-200 truncate">{book.publisher}</span>
                </div>
              )}
              {book.year && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-slate-500">{t.year || 'Жылы'}:</span>{' '}
                  <span className="font-mono text-slate-200">{book.year}</span>
                </div>
              )}
              {book.language && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-500">{t.languageFilter || 'Тілі'}:</span>{' '}
                  <span className="font-medium text-slate-200">{getLanguageLabel(book.language)}</span>
                </div>
              )}
              {book.isbn && (
                <div>
                  <span className="text-slate-500">ISBN:</span>{' '}
                  <span className="font-mono text-slate-300">{book.isbn}</span>
                </div>
              )}
            </div>

            {/* Official Source Link if available */}
            {(book.source_url || book.sourceUrl) && (
              <div className="pt-1">
                <a
                  href={book.source_url || book.sourceUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#f3c68f] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{lang === 'kk' ? 'OKULYK.KZ ресми парағы' : 'Официальная страница на OKULYK.KZ'}</span>
                </a>
              </div>
            )}

            {/* Actions for Online Reading & Librarian */}
            <div className="pt-4 border-t border-[#182946] flex flex-wrap items-center justify-between gap-2.5">
              {/* Prominent Online Reading Button */}
              {hasReadingUrl ? (
                <button
                  onClick={() => {
                    onOpenReader?.(book);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3c68f] to-[#d4af37] text-slate-950 font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4 text-slate-950" />
                  <span>{t.readOnline || 'Онлайн оқу'}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {isLibrarian && (
                  <>
                    <button
                      onClick={() => {
                        onEditBook?.(book);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#142340] hover:bg-[#1a2d52] border border-[#2a4574] text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.editBookTitle}</span>
                    </button>

                    <button
                      onClick={() => {
                        onQuickIssue?.(book);
                        onClose();
                      }}
                      disabled={!isAvailable}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isAvailable
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-md'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <BookUp className="w-3.5 h-3.5" />
                      <span>{t.quickIssue}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#091122] hover:bg-[#111e38] border border-[#1b2b48] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
