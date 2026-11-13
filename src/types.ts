export type Language = 'kk' | 'ru' | 'en';

export type BookType = 'general' | 'special';

export interface Book {
  id: number;
  title: string;
  author: string;
  subject: string;
  category: string;
  course: number; // 0 for all courses / school, 1-4 for college
  book_type: BookType;
  total_copies: number;
  available_copies: number;
  description: string;
  cover_color: string;
  cover_url?: string | null;
  isbn?: string | null;
  created_at?: string;

  // Specialty & Department fields
  specialty?: string | null; // e.g. 'general', 'emergency', 'it', 'traffic', 'pedagogy', 'fire_safety', 'accounting', 'law', 'translation'
  specialties?: string[] | null;

  // Grade 10 & 11 and Online Reading fields
  grade?: number | null; // 10 or 11 (or null/undefined for college)
  language?: 'kk' | 'ru' | 'en';
  publisher?: string | null;
  year?: number | null;
  reading_url?: string | null;
  readingUrl?: string | null;
  source_url?: string | null;
  sourceUrl?: string | null;
  pdf_url?: string | null;
  pdfUrl?: string | null;
  pages?: number | null;
}

export type SpecialtyKey =
  | 'all'
  | 'general'
  | 'emergency'
  | 'it'
  | 'traffic'
  | 'pedagogy'
  | 'fire_safety'
  | 'accounting'
  | 'law'
  | 'translation';

export type IssueStatus = 'active' | 'partial' | 'returned';

export interface IssueRecord {
  id: number;
  book_id: number;
  book_title?: string;
  book_author?: string;
  course: number;
  group_name: string;
  head_name: string;
  quantity: number;
  returned_quantity: number;
  status: IssueStatus;
  issue_date: string;
  return_date?: string | null;
  notes?: string;
}

export interface AISearchResult {
  book: Book;
  score: number;
  explanation: {
    kk: string;
    ru: string;
  };
}

export interface CollegeGroup {
  course: number;
  name: string;
}

export interface LibraryStats {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  activeIssues: number;
  totalIssuedCopies: number;
}
