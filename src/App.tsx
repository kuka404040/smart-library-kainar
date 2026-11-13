import React, { useState, useEffect, useMemo } from 'react';
import { Book, Language, LibraryStats, BookType, AISearchResult, SpecialtyKey } from './types';
import { translations } from './i18n/translations';
import { INITIAL_BOOKS, CATEGORY_OPTIONS } from './data/collegeData';
import { SCHOOL_TEXTBOOKS } from './data/schoolTextbooks';
import { KAINAR_SPECIALTIES, KAINAR_COLLEGE_BOOKS } from './data/kainarCollegeData';
import { CollegeLogo } from './components/CollegeLogo';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { BookCard } from './components/BookCard';
import { BookLoader } from './components/BookLoader';
import { AISmartSearchModal } from './components/AISmartSearchModal';
import { LibrarianToolbar } from './components/LibrarianToolbar';
import { LibrarianLoginModal } from './components/LibrarianLoginModal';
import { IssueBookModal } from './components/IssueBookModal';
import { ReturnBookModal } from './components/ReturnBookModal';
import { HistoryModal } from './components/HistoryModal';
import { AddEditBookModal } from './components/AddEditBookModal';
import { BookDetailModal } from './components/BookDetailModal';
import { OnlineReaderModal } from './components/OnlineReaderModal';
import {
  Sparkles,
  BookOpen,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  ArrowRight,
  Shield,
  School,
  Globe2,
  Bookmark,
  ShieldAlert,
  Code2,
  Car,
  Flame,
  Calculator,
  Scale,
  Languages,
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('kk');
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<LibraryStats>({
    totalBooks: 94,
    totalCopies: 2900,
    availableCopies: 2861,
    activeIssues: 3,
    totalIssuedCopies: 39,
  });

  // Loading States
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingBooks, setFetchingBooks] = useState(false);

  // Librarian Auth
  const [isLibrarian, setIsLibrarian] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyKey>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all'); // all, kk, ru, en
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<number>(-1); // -1 = all
  const [selectedType, setSelectedType] = useState<string>('all'); // all, general, special
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAISearchModal, setShowAISearchModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [selectedBookForReader, setSelectedBookForReader] = useState<Book | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [preselectedBookForIssue, setPreselectedBookForIssue] = useState<Book | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const t = translations[lang];

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check URL strictly for /admin
  useEffect(() => {
    const checkAdminAccess = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();

      const isAdminUrl =
        path.includes('/admin') ||
        hash.includes('admin') ||
        search.includes('admin');

      const savedToken = localStorage.getItem('smart_lib_token');
      if (savedToken) {
        setIsLibrarian(true);
      } else if (isAdminUrl) {
        setShowLoginModal(true);
      }
    };

    checkAdminAccess();
    window.addEventListener('popstate', checkAdminAccess);
    window.addEventListener('hashchange', checkAdminAccess);

    return () => {
      window.removeEventListener('popstate', checkAdminAccess);
      window.removeEventListener('hashchange', checkAdminAccess);
    };
  }, []);

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    // If user opened via /admin and cancelled, reset URL to clean path without reloading
    if (window.location.pathname.includes('/admin') || window.location.hash.includes('admin')) {
      window.history.replaceState({}, '', '/');
    }
  };

  // Fetch Books & Stats from API
  const refreshData = async () => {
    try {
      setFetchingBooks(true);
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }

      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.warn('API error, using initial books:', err);
      // Fallback in case backend is initializing
      setBooks([
        ...INITIAL_BOOKS.map((b, idx) => ({ ...b, id: idx + 1 })),
        ...SCHOOL_TEXTBOOKS,
        ...KAINAR_COLLEGE_BOOKS,
      ]);
    } finally {
      setFetchingBooks(false);
    }
  };

  useEffect(() => {
    refreshData().finally(() => {
      // Allow the 3D book loader to show gracefully
      setTimeout(() => setInitialLoading(false), 1400);
    });
  }, []);

  // Server-side Password Login Verification
  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('smart_lib_token', data.token);
        setIsLibrarian(true);
        showToast(
          lang === 'kk' ? 'Кітапханашы режимі сәтті қосылды!' : 'Режим библиотекаря активирован!',
          'success'
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smart_lib_token');
    setIsLibrarian(false);
    showToast(
      lang === 'kk' ? 'Кітапханашы сессиясы аяқталды.' : 'Сессия библиотекаря завершена.',
      'success'
    );
  };

  // AI Smart Search Handler
  const handleAISearch = async (query: string): Promise<AISearchResult[]> => {
    const res = await fetch('/api/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('AI Search failed');
    const data = await res.json();
    return data.results || [];
  };
   // AI Chat Handler
const handleAIChat = async (
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  try {
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'AI Chat қатесі орын алды');
    }

    if (!data.reply) {
      throw new Error('AI жауап қайтармады');
    }

    return data.reply;
  } catch (error) {
    console.error('AI Chat Error:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('AI-чатпен байланысу мүмкін болмады');
  }
};
  // Computed filter options
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.subject && b.subject.trim()) set.add(b.subject.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const uniquePublishers = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.publisher && b.publisher.trim()) set.add(b.publisher.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  // Specialty book counts
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = { all: books.length };
    books.forEach((b) => {
      if (b.specialty) {
        counts[b.specialty] = (counts[b.specialty] || 0) + 1;
      }
      if (b.grade != null && !b.specialty) {
        counts['general'] = (counts['general'] || 0) + 1;
      }
    });
    return counts;
  }, [books]);

  const renderSpecialtyIcon = (key: string) => {
    switch (key) {
      case 'general':
        return <GraduationCap className="w-4 h-4 shrink-0 text-[#f3c68f]" />;
      case 'emergency':
        return <ShieldAlert className="w-4 h-4 shrink-0 text-orange-400" />;
      case 'it':
        return <Code2 className="w-4 h-4 shrink-0 text-cyan-400" />;
      case 'traffic':
        return <Car className="w-4 h-4 shrink-0 text-emerald-400" />;
      case 'pedagogy':
        return <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />;
      case 'fire_safety':
        return <Flame className="w-4 h-4 shrink-0 text-rose-400" />;
      case 'accounting':
        return <Calculator className="w-4 h-4 shrink-0 text-amber-400" />;
      case 'law':
        return <Scale className="w-4 h-4 shrink-0 text-blue-400" />;
      case 'translation':
        return <Languages className="w-4 h-4 shrink-0 text-teal-400" />;
      default:
        return <BookOpen className="w-4 h-4 shrink-0 text-[#d4af37]" />;
    }
  };

  // Filtered books logic
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Specialty filter
      if (selectedSpecialty !== 'all') {
        if (selectedSpecialty === 'general') {
          const isGeneral = book.specialty === 'general' || book.grade != null;
          if (!isGeneral) return false;
        } else {
          if (book.specialty !== selectedSpecialty) return false;
        }
      }

      // Language filter
      if (selectedLanguage !== 'all' && book.language !== selectedLanguage) {
        return false;
      }

      // Subject filter
      if (selectedSubject !== 'all' && book.subject !== selectedSubject) {
        return false;
      }

      // Publisher filter
      if (selectedPublisher !== 'all' && book.publisher !== selectedPublisher) {
        return false;
      }

      // Course filter (college 1-4)
      if (selectedCourse !== -1) {
        if (selectedCourse === 1) {
          const isCourse1 =
            book.course === 1 ||
            book.grade === 10 ||
            book.grade === 11 ||
            book.course === 0 ||
            book.specialty === 'general';
          if (!isCourse1) return false;
        } else {
          if (book.course !== selectedCourse) return false;
        }
      }

      // Type filter
      if (selectedType !== 'all' && book.book_type !== selectedType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && book.category !== selectedCategory) {
        return false;
      }

      // Availability filter
      if (onlyAvailable && book.available_copies <= 0) {
        return false;
      }

      // Search query (title, author, subject, publisher, isbn)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = book.title?.toLowerCase().includes(q);
        const matchesAuthor = book.author?.toLowerCase().includes(q);
        const matchesSubject = book.subject?.toLowerCase().includes(q);
        const matchesPublisher = book.publisher?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesSubject && !matchesPublisher) {
          return false;
        }
      }

      return true;
    });
  }, [
    books,
    selectedSpecialty,
    selectedLanguage,
    selectedSubject,
    selectedPublisher,
    selectedCourse,
    selectedType,
    selectedCategory,
    onlyAvailable,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setSelectedLanguage('all');
    setSelectedSubject('all');
    setSelectedPublisher('all');
    setSelectedCourse(-1);
    setSelectedType('all');
    setSelectedCategory('all');
    setOnlyAvailable(false);
  };

  const handleOpenReader = (book: Book) => {
    setSelectedBookForReader(book);
    setShowReaderModal(true);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-[#e2e8f0] flex flex-col font-sans selection:bg-[#d4af37]/30 selection:text-[#f3c68f]">
      {/* 3D Initial Book Loader */}
      <BookLoader
        isLoading={initialLoading}
        lang={lang}
        onFinish={() => setInitialLoading(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0e1c33] border border-[#d4af37]/60 text-white text-xs shadow-2xl animate-fade-in">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        isLibrarian={isLibrarian}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        onReplayLoader={() => setInitialLoading(true)}
      />

      {/* Librarian Workspace Ribbon (When authorized) */}
      {isLibrarian && (
        <LibrarianToolbar
          lang={lang}
          onOpenAddBook={() => {
            setBookToEdit(null);
            setShowAddBookModal(true);
          }}
          onOpenIssueBook={() => {
            setPreselectedBookForIssue(null);
            setShowIssueModal(true);
          }}
          onOpenReturnBook={() => setShowReturnModal(true)}
          onOpenHistory={() => setShowHistoryModal(true)}
          stats={stats}
        />
      )}

      {/* Hero Section with Search & AI Smart Search Button */}
      <HeroSection
        lang={lang}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAISearch={() => setShowAISearchModal(true)}
        stats={stats}
      />

      {/* Main Content Area: Catalog & Filters */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Kainar College Specialties Navigator */}
        <section className="bg-gradient-to-r from-[#0c1830] via-[#0f1d38] to-[#0a1426] border border-[#d4af37]/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2e4e] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#f3c68f] shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold font-serif text-white tracking-wide flex items-center gap-2 flex-wrap">
                  <span>{t.specialtiesTitle || 'Қайнар жоғары колледжінің мамандықтары'}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#f3c68f] border border-[#d4af37]/30">
                    8 Мамандық + 1 курс
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {lang === 'kk'
                    ? 'Мамандық бойынша оқулықтар мен әдістемелік құралдарды таңдаңыз'
                    : lang === 'ru'
                    ? 'Выберите специальность для просмотра профильных учебников и пособий'
                    : 'Select a specialty to browse dedicated curriculum and professional textbooks'}
                </p>
              </div>
            </div>

            {selectedSpecialty !== 'all' && (
              <button
                onClick={() => setSelectedSpecialty('all')}
                className="self-start sm:self-center text-xs text-[#f3c68f] hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#142340] border border-[#d4af37]/30 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.allSpecialties || 'Барлық мамандықтар'}</span>
              </button>
            )}
          </div>

          {/* Specialty Chips Grid / Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
            {/* All specialties button */}
            <button
              onClick={() => setSelectedSpecialty('all')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border text-left ${
                selectedSpecialty === 'all'
                  ? 'bg-gradient-to-r from-[#d4af37]/25 to-[#f3c68f]/10 border-[#d4af37] text-white shadow-md ring-1 ring-[#d4af37]/50'
                  : 'bg-[#091122]/80 hover:bg-[#101e38] border-[#1a2d4c] text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#d4af37] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{t.allSpecialties || 'Барлық бөлімдер'}</div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#162744] text-slate-400">
                {specialtyCounts.all || books.length}
              </span>
            </button>

            {/* Each specialty button */}
            {KAINAR_SPECIALTIES.map((sp) => {
              const count = specialtyCounts[sp.key] || 0;
              const isActive = selectedSpecialty === sp.key;
              const displayName = lang === 'kk' ? sp.shortKk : lang === 'ru' ? sp.shortRu : sp.shortEn;

              return (
                <button
                  key={sp.key}
                  onClick={() => setSelectedSpecialty(isActive ? 'all' : sp.key)}
                  title={lang === 'kk' ? sp.nameKk : lang === 'ru' ? sp.nameRu : sp.nameEn}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-[#172d54] to-[#1a335f] border-[#d4af37] text-[#f3c68f] shadow-lg ring-1 ring-[#d4af37]/60'
                      : 'bg-[#091122]/80 hover:bg-[#0e1a33] border-[#182844] text-slate-300 hover:text-white'
                  }`}
                >
                  {renderSpecialtyIcon(sp.key)}
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold">{displayName}</div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-[#d4af37]/20 text-[#f3c68f] font-bold' : 'bg-[#13223d] text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interactive Filter Bar */}
        <div className="bg-[#091122]/90 border border-[#1a2d4c] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          {/* Row 1: Course & Language */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Course Segmented Control Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="hidden sm:inline">{lang === 'kk' ? 'Курс:' : 'Курс:'}</span>
              </span>

              <button
                onClick={() => setSelectedCourse(-1)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedCourse === -1
                    ? 'bg-[#182b4a] text-[#f3c68f] border border-[#d4af37]/40 shadow-sm'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.allCourses}
              </button>

              {[1, 2, 3, 4].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCourse(c)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedCourse === c
                      ? 'bg-[#182b4a] text-[#f3c68f] border border-[#d4af37]/40 shadow-sm'
                      : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                  }`}
                >
                  {c} {t.courseLabel}
                </button>
              ))}
            </div>

            {/* Language Selection Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{lang === 'kk' ? 'Тіл:' : lang === 'ru' ? 'Язык:' : 'Lang:'}</span>
              </span>

              <button
                onClick={() => setSelectedLanguage('all')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedLanguage === 'all'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.allLanguages}
              </button>

              <button
                onClick={() => setSelectedLanguage('kk')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedLanguage === 'kk'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.langKazakh}
              </button>

              <button
                onClick={() => setSelectedLanguage('ru')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedLanguage === 'ru'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.langRussian}
              </button>

              <button
                onClick={() => setSelectedLanguage('en')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedLanguage === 'en'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.langEnglish}
              </button>
            </div>
          </div>

          {/* Row 2: Discipline Type (General vs Special) */}
          <div className="pt-3 border-t border-[#16243d] flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{lang === 'kk' ? 'Пән түрі:' : 'Тип:'}</span>
              </span>

              <button
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === 'all'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.allTypes}
              </button>

              <button
                onClick={() => setSelectedType('special')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === 'special'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.typeSpecial}
              </button>

              <button
                onClick={() => setSelectedType('general')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === 'general'
                    ? 'bg-[#14233e] text-blue-200 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-[#0a1220] border border-transparent'
                }`}
              >
                {t.typeGeneral}
              </button>
            </div>
          </div>

          {/* Row 3: Dropdowns for Subject, Publisher, Category + Availability & Reset */}
          <div className="pt-3 border-t border-[#16243d] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Subject Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">{t.filterBySubject}:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#0a1220] border border-[#1e2f4f] text-slate-200 focus:border-[#d4af37] outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="all">{t.allSubjects}</option>
                  {uniqueSubjects.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Publisher Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">{t.filterByPublisher}:</span>
                <select
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#0a1220] border border-[#1e2f4f] text-slate-200 focus:border-[#d4af37] outline-none cursor-pointer max-w-[170px] truncate"
                >
                  <option value="all">{t.allPublishers}</option>
                  {uniquePublishers.map((p, idx) => (
                    <option key={idx} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">{t.category}:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#0a1220] border border-[#1e2f4f] text-slate-200 focus:border-[#d4af37] outline-none cursor-pointer max-w-[160px] truncate"
                >
                  <option value="all">{t.allCategories}</option>
                  {CATEGORY_OPTIONS.map((c, idx) => (
                    <option key={idx} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Only in stock checkbox toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="rounded border-[#1e2f4f] bg-[#0a1220] text-[#d4af37] focus:ring-0 cursor-pointer"
                />
                <span>{t.onlyAvailable}</span>
              </label>
            </div>

            {/* Found Count & Reset */}
            <div className="flex items-center gap-3">
              <span className="text-[#f3c68f] font-mono font-semibold">
                {filteredBooks.length} {t.booksCount}
              </span>

              {(selectedSpecialty !== 'all' ||
                selectedLanguage !== 'all' ||
                selectedSubject !== 'all' ||
                selectedPublisher !== 'all' ||
                selectedCourse !== -1 ||
                selectedType !== 'all' ||
                selectedCategory !== 'all' ||
                onlyAvailable ||
                searchQuery.trim()) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-[#f3c68f] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.resetFilters}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Books Catalog Grid */}
        {filteredBooks.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-[#091224]/50 border border-dashed border-[#1a2e50] space-y-4">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-white">
                {lang === 'kk' ? 'Кітаптар табылмады' : lang === 'ru' ? 'Книги не найдены' : 'No books found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {lang === 'kk'
                  ? 'Сұранысыңыз немесе таңдалған сүзгілер бойынша оқулықтар табылған жоқ.'
                  : lang === 'ru'
                  ? 'По вашему запросу или выбранным критериям учебники не найдены.'
                  : 'No textbooks found matching your search query or filters.'}
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-[#142340] hover:bg-[#1a2f54] text-[#f3c68f] text-xs font-semibold cursor-pointer border border-[#d4af37]/30"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                lang={lang}
                isLibrarian={isLibrarian}
                onSelect={(b) => setSelectedBookForDetail(b)}
                onEdit={(b) => {
                  setBookToEdit(b);
                  setShowAddBookModal(true);
                }}
                onDelete={async (b) => {
                  if (!window.confirm(t.deleteConfirm)) return;
                  try {
                    const token = localStorage.getItem('smart_lib_token') || 'librarian_authorized';
                    const res = await fetch(`/api/books/${b.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      showToast(t.bookDeletedSuccess, 'success');
                      refreshData();
                    }
                  } catch (e) {
                    console.error('Delete error', e);
                  }
                }}
                onQuickIssue={(b) => {
                  setPreselectedBookForIssue(b);
                  setShowIssueModal(true);
                }}
                onOpenReader={handleOpenReader}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer with Kainar Higher College Identity */}
      <footer className="border-t border-[#142340] bg-[#050811] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <CollegeLogo size="sm" />
            <div>
              <div className="font-serif text-sm font-bold text-slate-200 tracking-wide">
                SMART LIBRARY · ҚАЙНАР ЖОҒАРЫ КОЛЛЕДЖІ
              </div>
              <p className="text-xs text-[#d4af37]/90 mt-0.5 font-medium">
                {t.kainarCollegeInfo}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 text-slate-400 text-xs">
            <span>{t.appSubtitle}</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="text-slate-400">Семей қ., Қазақстан Республикасы</span>
          </div>
        </div>
      </footer>

      {/* Modals Container */}
      <LibrarianLoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLoginModal}
        lang={lang}
        onLogin={handleLogin}
      />

      <AISmartSearchModal
        isOpen={showAISearchModal}
        onClose={() => setShowAISearchModal(false)}
        lang={lang}
        onSelectBook={(b) => setSelectedBookForDetail(b)}
        onSearch={handleAISearch}
        onChat={handleAIChat}
      />

      <IssueBookModal
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false);
          setPreselectedBookForIssue(null);
        }}
        lang={lang}
        books={books}
        initialBook={preselectedBookForIssue}
        onIssueSuccess={() => {
          showToast(t.issueSuccess, 'success');
          refreshData();
        }}
      />

      <ReturnBookModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        lang={lang}
        onReturnSuccess={() => {
          showToast(t.returnSuccess, 'success');
          refreshData();
        }}
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        lang={lang}
      />

      <AddEditBookModal
        isOpen={showAddBookModal}
        onClose={() => {
          setShowAddBookModal(false);
          setBookToEdit(null);
        }}
        lang={lang}
        bookToEdit={bookToEdit}
        onSaveSuccess={() => {
          showToast(t.bookSavedSuccess, 'success');
          refreshData();
        }}
        onDeleteSuccess={() => {
          showToast(t.bookDeletedSuccess, 'success');
          refreshData();
        }}
      />

      <BookDetailModal
        book={selectedBookForDetail}
        isOpen={!!selectedBookForDetail}
        onClose={() => setSelectedBookForDetail(null)}
        lang={lang}
        isLibrarian={isLibrarian}
        onQuickIssue={(b) => {
          setPreselectedBookForIssue(b);
          setShowIssueModal(true);
        }}
        onEditBook={(b) => {
          setBookToEdit(b);
          setShowAddBookModal(true);
        }}
        onOpenReader={handleOpenReader}
      />

      {/* Full-featured Online Textbook Reader Modal */}
      <OnlineReaderModal
        book={selectedBookForReader}
        isOpen={showReaderModal}
        onClose={() => setShowReaderModal(false)}
        onBackToDetail={() => {
          setShowReaderModal(false);
          if (selectedBookForReader) {
            setSelectedBookForDetail(selectedBookForReader);
          }
        }}
        lang={lang}
      />
    </div>
  );
}
