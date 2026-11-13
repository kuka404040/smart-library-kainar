import express, { type Request, type Response, type NextFunction } from "express";
import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";
import { SCHOOL_TEXTBOOKS } from "../src/data/schoolTextbooks.ts";
import { KAINAR_COLLEGE_BOOKS } from "../src/data/kainarCollegeData.ts";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const AUTH_SECRET = process.env.AUTH_SECRET || ADMIN_PASSWORD || "smart-library-secret-2026";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// ================= DATA TYPES =================
export interface BookRecord {
  id: number;
  title: string;
  author: string;
  subject: string;
  category: string;
  course: number;
  book_type: string;
  total_copies: number;
  available_copies: number;
  description: string;
  cover_color: string;
  cover_url: string | null;
  isbn: string | null;
  created_at: string;
  grade?: number | null;
  specialty?: string | null;
  language?: string | null;
  publisher?: string | null;
  year?: number | null;
  reading_url?: string | null;
  source_url?: string | null;
  pdf_url?: string | null;
  pages?: number | null;
}

export interface IssueRecord {
  id: number;
  book_id: number;
  course: number;
  group_name: string;
  head_name: string | null;
  quantity: number;
  returned_quantity: number;
  status: string; // "active" | "partial" | "returned"
  issue_date: string;
  return_date: string | null;
  notes: string | null;
}

const initialCollegeBooks: BookRecord[] = [
  {
    id: 1,
    title: "Python тілінде бағдарламалау негіздері",
    author: "А. Е. Серікбаев, Н. О. Жұмаділова",
    subject: "Бағдарламалау және алгоритмдер",
    category: "Ақпараттық технологиялар",
    course: 1,
    grade: null,
    language: "kk",
    publisher: "Фолиант",
    year: 2021,
    book_type: "special",
    total_copies: 40,
    available_copies: 38,
    description: "Python 3 тілінің синтаксисі, алгоритмдік құрылымдар, деректер құрылымы, модульдер және объектіге бағытталған бағдарламалау негіздері. Колледж студенттеріне арналған.",
    cover_color: "navy",
    cover_url: null,
    isbn: "978-601-240-101-2",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Қазақстанның қазіргі заман тарихы",
    author: "Қ. С. Қаражанов, Б. Т. Төлебаев",
    subject: "Қазақстан тарихы",
    category: "Гуманитарлық және әлеуметтік",
    course: 1,
    grade: null,
    language: "kk",
    publisher: "Қазақ университеті",
    year: 2020,
    book_type: "general",
    total_copies: 50,
    available_copies: 45,
    description: "Қазақстанның мемлекеттілік қалыптасуы, Тәуелсіздік кезеңі, әлеуметтік-экономикалық және мәдени даму тарихына арналған академиялық оқулық.",
    cover_color: "gold",
    cover_url: null,
    isbn: "978-601-310-442-1",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Деректер қорын жобалау және SQL тілі",
    author: "М. Қ. Оразалиев, Г. Б. Сәрсенбаева",
    subject: "Деректер қоры және SQL",
    category: "Ақпараттық технологиялар",
    course: 2,
    grade: null,
    language: "kk",
    publisher: "Бастау",
    year: 2022,
    book_type: "special",
    total_copies: 35,
    available_copies: 32,
    description: "Реляциялық деректер қорын нормализациялау, ER-диаграммалар, PostgreSQL мен SQLite-те күрделі сұраныстар мен индекстер құру тәжірибесі.",
    cover_color: "emerald",
    cover_url: null,
    isbn: "978-601-722-890-4",
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: "Компьютерлік архитектура және микропроцессорлар",
    author: "Д. А. Паттерсон, Дж. Л. Хеннесси",
    subject: "Компьютерлік архитектура және аппараттық қамтамасыз ету",
    category: "Инженерлік-техникалық",
    course: 2,
    grade: null,
    language: "kk",
    publisher: "Дәуір",
    year: 2019,
    book_type: "special",
    total_copies: 30,
    available_copies: 28,
    description: "Компьютер құрылғысы, процессор архитектурасы (RISC/CISC, ARM), жедел жад, кэш-жады деңгейлері және перифериялық шиналардың өзара байланысы.",
    cover_color: "indigo",
    cover_url: null,
    isbn: "978-601-815-320-7",
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    title: "Жоғары математика: Сызықтық алгебра және анализ",
    author: "С. Т. Төлеуов, Р. М. Мұхтаров",
    subject: "Жоғары математика және дискретті математика",
    category: "Жаратылыстану ғылымдары",
    course: 1,
    grade: null,
    language: "kk",
    publisher: "Эверо",
    year: 2021,
    book_type: "general",
    total_copies: 60,
    available_copies: 52,
    description: "Матрицалар мен анықтауыштар, сызықтық теңдеулер жүйесі, шектер теориясы, дифференциалдық және интегралдық есептеулер.",
    cover_color: "crimson",
    cover_url: null,
    isbn: "978-601-204-712-9",
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    title: "Компьютерлік желілер: CISCO және TCP/IP негіздері",
    author: "Э. Таненбаум, Д. Уэзеролл",
    subject: "Компьютерлік желілер және қауіпсіздік",
    category: "Ақпараттық технологиялар",
    course: 3,
    grade: null,
    language: "kk",
    publisher: "Питер / Фолиант",
    year: 2020,
    book_type: "special",
    total_copies: 25,
    available_copies: 20,
    description: "OSI 7 деңгейлі моделі, TCP/IP стектері, маршруттау хаттамалары (OSPF, BGP), VLAN және желілік қауіпсіздік саясаты.",
    cover_color: "amber",
    cover_url: null,
    isbn: "978-601-332-901-5",
    created_at: new Date().toISOString(),
  },
  {
    id: 7,
    title: "Веб-қосымшаларды әзірлеу: React, TypeScript және Node.js",
    author: "Б. К. Баймұхамедов, Ш. Н. Искакова",
    subject: "Веб-технологиялар және интерфейс әзірлеу",
    category: "Ақпараттық технологиялар",
    course: 3,
    grade: null,
    language: "kk",
    publisher: "Бастау",
    year: 2023,
    book_type: "special",
    total_copies: 30,
    available_copies: 26,
    description: "Заманауи фронтенд архитектурасы, компоненттік стиль, REST API интеграциясы, күйді басқару және full-stack қосымшалар құру.",
    cover_color: "navy",
    cover_url: null,
    isbn: "978-601-540-331-6",
    created_at: new Date().toISOString(),
  },
  {
    id: 8,
    title: "Инженерлік физика және қолданбалы электроника",
    author: "М. Т. Садықов, К. А. Әбішев",
    subject: "Физика және электротехника",
    category: "Жаратылыстану ғылымдары",
    course: 2,
    grade: null,
    language: "kk",
    publisher: "Ғылым",
    year: 2020,
    book_type: "general",
    total_copies: 40,
    available_copies: 34,
    description: "Электромагнетизм, жартылай өткізгіш аспаптар, диодтар, транзисторлар және микроэлектрондық сұлбалардың физикалық негіздері.",
    cover_color: "emerald",
    cover_url: null,
    isbn: "978-601-654-119-0",
    created_at: new Date().toISOString(),
  },
  {
    id: 9,
    title: "Кәсіпкерлік қызмет және экономика негіздері",
    author: "Ж. А. Омарова, Б. Н. Нұрпейісов",
    subject: "Экономика және кәсіпкерлік негіздері",
    category: "Экономика және менеджмент",
    course: 4,
    grade: null,
    language: "kk",
    publisher: "Экономика",
    year: 2022,
    book_type: "general",
    total_copies: 35,
    available_copies: 31,
    description: "Бизнес-жоспарлау, стартаптарды қаржыландыру, маркетингтік стратегия және еңбек нарығындағы бәсекеге қабілеттілік.",
    cover_color: "gold",
    cover_url: null,
    isbn: "978-601-445-982-3",
    created_at: new Date().toISOString(),
  },
  {
    id: 10,
    title: "Ақпараттық қауіпсіздік және криптография негіздері",
    author: "А. С. Әлімжанов",
    subject: "Ақпараттық қауіпсіздік",
    category: "Ақпараттық технологиялар",
    course: 4,
    grade: null,
    language: "kk",
    publisher: "Дәуір",
    year: 2021,
    book_type: "special",
    total_copies: 25,
    available_copies: 22,
    description: "Шифрлау алгоритмдері (AES, RSA), электрондық цифрлық қолтаңба, осалдықтарды талдау және ақпараттық инфрақұрылымды қорғау.",
    cover_color: "indigo",
    cover_url: null,
    isbn: "978-601-998-120-4",
    created_at: new Date().toISOString(),
  },
];

// Combine college books + 84 verified school textbooks + 60 Kainar specialty books
const memoryBooks: BookRecord[] = [
  ...initialCollegeBooks.map((b) => ({
    ...b,
    specialty: b.category === "Ақпараттық технологиялар" ? "it" : "general",
  })),
  ...SCHOOL_TEXTBOOKS.map((b) => ({
    ...b,
    course: 1,
    specialty: "general",
    created_at: b.created_at || new Date().toISOString(),
    reading_url: b.reading_url || b.readingUrl || null,
    source_url: b.source_url || b.sourceUrl || null,
    pdf_url: b.pdf_url || b.pdfUrl || null,
    cover_url: b.cover_url || null,
    isbn: b.isbn || null,
  })),
  ...KAINAR_COLLEGE_BOOKS.map((b) => ({
    ...b,
    created_at: b.created_at || new Date().toISOString(),
    reading_url: b.reading_url || b.readingUrl || null,
    source_url: b.source_url || b.sourceUrl || null,
    pdf_url: b.pdf_url || b.pdfUrl || null,
    cover_url: b.cover_url || null,
    isbn: b.isbn || null,
  })),
];

const day = 86400000;
const memoryIssues: IssueRecord[] = [
  {
    id: 1,
    book_id: 1,
    course: 1,
    group_name: "ПБ-11",
    head_name: "Қайрат Асылбекұлы",
    quantity: 25,
    returned_quantity: 23,
    status: "partial",
    issue_date: new Date(Date.now() - 5 * day).toISOString(),
    return_date: null,
    notes: "Оқу семестріне берілді (2 кітап қарызда)",
  },
  {
    id: 2,
    book_id: 2,
    course: 1,
    group_name: "БҚЕ-11",
    head_name: "Әлихан Нұрлан",
    quantity: 5,
    returned_quantity: 0,
    status: "active",
    issue_date: new Date(Date.now() - 2 * day).toISOString(),
    return_date: null,
    notes: "Тарих сабағына",
  },
  {
    id: 3,
    book_id: 3,
    course: 2,
    group_name: "ПР-22",
    head_name: "Диана Маратқызы",
    quantity: 10,
    returned_quantity: 10,
    status: "returned",
    issue_date: new Date(Date.now() - 14 * day).toISOString(),
    return_date: new Date(Date.now() - 1 * day).toISOString(),
    notes: "Зертханалық жұмысқа толық қайтарылды",
  },
];

let nextBookId = Math.max(...memoryBooks.map((b) => b.id)) + 1;
let nextIssueId = 4;

// ================= DATABASE CONNECTION WITH AUTO FALLBACK =================
let useNeon = false;
let sql: any = null;

if (process.env.DATABASE_URL) {
  try {
    sql = neon(process.env.DATABASE_URL);
    useNeon = true;
    console.log("[Smart Library] DATABASE_URL анықталды, Neon қосылуда...");
  } catch (err) {
    console.warn("[Smart Library] Neon init failed, using in-memory mock:", err);
    useNeon = false;
  }
} else {
  console.log("[Smart Library] DATABASE_URL орнатылмаған. Жадтағы жедел деректер қоры (in-memory mock) іске қосылды.");
}

const q = async (text: string, params: any[] = []): Promise<any[]> => {
  if (!useNeon || !sql) {
    throw new Error("Neon database not active");
  }
  return (await sql.query(text, params)) as any[];
};

// ================= STATELESS AUTH =================
function signToken(): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

function verifyToken(token: string): boolean {
  if (!AUTH_SECRET) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(expStr).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireLibrarianAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Кітапханашы рұқсаты талап етіледі (Unauthorized)" });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!verifyToken(token)) {
    res.status(401).json({ error: "Қате немесе ескірген токен" });
    return;
  }
  next();
}

// ================= POSTGRES SCHEMA INITIALIZER & MIGRATION =================
let initPromise: Promise<void> | null = null;

async function initPostgresDb() {
  if (!useNeon) return;
  await q(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      course INTEGER NOT NULL DEFAULT 1,
      book_type TEXT NOT NULL DEFAULT 'special',
      total_copies INTEGER NOT NULL DEFAULT 30,
      available_copies INTEGER NOT NULL DEFAULT 30,
      description TEXT,
      cover_color TEXT DEFAULT 'navy',
      cover_url TEXT,
      isbn TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
  await q(`
    CREATE TABLE IF NOT EXISTS issues (
      id SERIAL PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      course INTEGER NOT NULL,
      group_name TEXT NOT NULL,
      head_name TEXT,
      quantity INTEGER NOT NULL,
      returned_quantity INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      issue_date TIMESTAMPTZ DEFAULT now(),
      return_date TIMESTAMPTZ,
      notes TEXT
    )`);

  // Safe schema migrations for new fields
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS grade INTEGER`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'kk'`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS publisher TEXT`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS year INTEGER`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS reading_url TEXT`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS source_url TEXT`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS pdf_url TEXT`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS pages INTEGER`);
  await q(`ALTER TABLE books ADD COLUMN IF NOT EXISTS specialty TEXT`);

  const [{ cnt }] = await q("SELECT COUNT(*)::int AS cnt FROM books");
  if (cnt === 0) {
    for (const b of memoryBooks) {
      await q(
        `INSERT INTO books (title, author, subject, category, course, book_type, total_copies, available_copies, description, cover_color, isbn, grade, language, publisher, year, reading_url, source_url, pdf_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [b.title, b.author, b.subject, b.category, b.course, b.book_type, b.total_copies, b.available_copies, b.description, b.cover_color, b.isbn, b.grade || null, b.language || "kk", b.publisher || null, b.year || null, b.reading_url || null, b.source_url || null, b.pdf_url || null]
      );
    }
    for (const i of memoryIssues) {
      await q(
        `INSERT INTO issues (book_id, course, group_name, head_name, quantity, returned_quantity, status, issue_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [i.book_id, i.course, i.group_name, i.head_name, i.quantity, i.returned_quantity, i.status, i.issue_date, i.notes]
      );
    }
  } else {
    // Check if school textbooks were already migrated
    const [{ cnt: schoolCnt }] = await q("SELECT COUNT(*)::int AS cnt FROM books WHERE grade IS NOT NULL");
    if (!schoolCnt || schoolCnt === 0) {
      console.log("[Smart Library] Adding 84 school textbooks to existing PostgreSQL database...");
      for (const b of SCHOOL_TEXTBOOKS) {
        await q(
          `INSERT INTO books (title, author, subject, category, course, book_type, total_copies, available_copies, description, cover_color, cover_url, isbn, grade, language, publisher, year, reading_url, source_url, pdf_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            b.title,
            b.author,
            b.subject,
            b.category,
            b.course || 0,
            b.book_type || "general",
            b.total_copies || 30,
            b.available_copies || 30,
            b.description || "",
            b.cover_color || "navy",
            b.cover_url || null,
            b.isbn || null,
            b.grade || null,
            b.language || "kk",
            b.publisher || null,
            b.year || null,
            b.reading_url || b.readingUrl || b.pdf_url || b.pdfUrl || null,
            b.source_url || b.sourceUrl || null,
            b.pdf_url || b.pdfUrl || null,
          ]
        );
      }
      console.log("[Smart Library] 84 school textbooks successfully added to PostgreSQL!");
    }
  }
}

app.use("/api", async (_req, _res, next) => {
  if (useNeon) {
    try {
      initPromise ??= initPostgresDb().catch((e) => {
        console.warn("Postgres connection failed, switching to in-memory store:", e);
        useNeon = false;
        initPromise = null;
      });
      await initPromise;
    } catch {
      useNeon = false;
    }
  }
  next();
});

// ================= API ROUTES =================

// Auth
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (!password) {
    res.status(400).json({ error: "Құпиясөзді енгізіңіз" });
    return;
  }
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: signToken(), librarian: true });
  } else {
    res.status(401).json({ error: "Құпиясөз қате!" });
  }
});

// PDF Proxy to reliably serve documents and prevent client-side DNS resolution errors (e.g. books.okulyk.kz)
app.get("/api/pdf-proxy", async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).send("URL parameter is required");
    return;
  }

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    res.status(400).send("Invalid URL");
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });
    clearTimeout(timeout);

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).send(`Upstream error: ${upstreamRes.statusText}`);
      return;
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/pdf";
    res.setHeader("Content-Type", contentType.includes("pdf") ? "application/pdf" : contentType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.removeHeader("X-Frame-Options");

    const arrayBuffer = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: unknown) {
    console.error("PDF proxy error:", err);
    res.status(502).send("Құжатты жүктеу мүмкін болмады (Remote fetch error)");
  }
});

// Books: List all
app.get("/api/books", async (_req, res) => {
  if (useNeon) {
    try {
      const books = await q("SELECT * FROM books ORDER BY id DESC");
      res.json({ books });
      return;
    } catch (e) {
      console.warn("Neon books query failed, using in-memory:", e);
      useNeon = false;
    }
  }
  const books = [...memoryBooks].sort((a, b) => b.id - a.id);
  res.json({ books });
});

// Books: Single
app.get("/api/books/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (useNeon) {
    try {
      const [book] = await q("SELECT * FROM books WHERE id = $1", [id]);
      if (!book) {
        res.status(404).json({ error: "Кітап табылмады" });
        return;
      }
      res.json({ book });
      return;
    } catch (e) {
      console.warn("Neon book query failed, using in-memory:", e);
      useNeon = false;
    }
  }
  const book = memoryBooks.find((b) => b.id === id);
  if (!book) {
    res.status(404).json({ error: "Кітап табылмады" });
    return;
  }
  res.json({ book });
});

// Books: Create
app.post("/api/books", requireLibrarianAuth, async (req, res) => {
  const {
    title,
    author,
    subject,
    category,
    specialty,
    course,
    grade,
    language,
    publisher,
    year,
    book_type,
    total_copies,
    description,
    cover_color,
    cover_url,
    source_url,
    reading_url,
    pdf_url,
    isbn,
  } = req.body;

  if (!title || !author) {
    res.status(400).json({ error: "Атауы мен авторы толтырылуы тиіс" });
    return;
  }

  const copies = parseInt(total_copies) || 1;
  const parsedCourse = parseInt(course) || 0;
  const parsedGrade = grade ? parseInt(grade) : null;
  const parsedYear = year ? parseInt(year) : null;

  if (useNeon) {
    try {
      const [newBook] = await q(
        `INSERT INTO books (title, author, subject, category, course, book_type, total_copies, available_copies, description, cover_color, cover_url, isbn, grade, language, publisher, year, reading_url, source_url, pdf_url, specialty)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
        [
          title,
          author,
          subject || "Жалпы білім",
          category || "Жалпы білім беру",
          parsedCourse,
          book_type || "general",
          copies,
          copies,
          description || "",
          cover_color || "navy",
          cover_url || null,
          isbn || null,
          parsedGrade,
          language || "kk",
          publisher || null,
          parsedYear,
          reading_url || pdf_url || null,
          source_url || null,
          pdf_url || null,
          specialty || null,
        ]
      );
      res.status(201).json({ success: true, book: newBook });
      return;
    } catch (e) {
      console.warn("Neon book insert failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const newBook: BookRecord = {
    id: nextBookId++,
    title,
    author,
    subject: subject || "Жалпы білім",
    category: category || "Жалпы білім беру",
    specialty: specialty || "general",
    course: parsedCourse,
    grade: parsedGrade,
    language: language || "kk",
    publisher: publisher || null,
    year: parsedYear,
    book_type: book_type || "general",
    total_copies: copies,
    available_copies: copies,
    description: description || "",
    cover_color: cover_color || "navy",
    cover_url: cover_url || null,
    source_url: source_url || null,
    reading_url: reading_url || pdf_url || null,
    pdf_url: pdf_url || null,
    isbn: isbn || null,
    created_at: new Date().toISOString(),
  };
  memoryBooks.unshift(newBook);
  res.status(201).json({ success: true, book: newBook });
});

// Books: Update
app.put("/api/books/:id", requireLibrarianAuth, async (req, res) => {
  const id = Number(req.params.id);
  const {
    title,
    author,
    subject,
    category,
    specialty,
    course,
    grade,
    language,
    publisher,
    year,
    book_type,
    total_copies,
    description,
    cover_color,
    cover_url,
    source_url,
    reading_url,
    pdf_url,
    isbn,
  } = req.body;

  if (useNeon) {
    try {
      const [currentBook] = await q("SELECT * FROM books WHERE id = $1", [id]);
      if (!currentBook) {
        res.status(404).json({ error: "Кітап табылмады" });
        return;
      }

      const newTotal = parseInt(total_copies) || currentBook.total_copies;
      const issued = currentBook.total_copies - currentBook.available_copies;
      const newAvailable = Math.max(0, newTotal - issued);
      const parsedCourse = parseInt(course);
      const parsedGrade = grade !== undefined ? (grade ? parseInt(grade) : null) : currentBook.grade;
      const parsedYear = year !== undefined ? (year ? parseInt(year) : null) : currentBook.year;

      const [updatedBook] = await q(
        `UPDATE books
         SET title=$1, author=$2, subject=$3, category=$4, course=$5, book_type=$6,
             total_copies=$7, available_copies=$8, description=$9, cover_color=$10, cover_url=$11, isbn=$12,
             grade=$13, language=$14, publisher=$15, year=$16, reading_url=$17, source_url=$18, pdf_url=$19, specialty=$20
         WHERE id=$21 RETURNING *`,
        [
          title || currentBook.title,
          author || currentBook.author,
          subject || currentBook.subject,
          category || currentBook.category,
          Number.isNaN(parsedCourse) ? currentBook.course : parsedCourse,
          book_type || currentBook.book_type,
          newTotal,
          newAvailable,
          description !== undefined ? description : currentBook.description,
          cover_color || currentBook.cover_color,
          cover_url !== undefined ? cover_url : currentBook.cover_url,
          isbn !== undefined ? isbn : currentBook.isbn,
          parsedGrade,
          language !== undefined ? language : currentBook.language,
          publisher !== undefined ? publisher : currentBook.publisher,
          parsedYear,
          reading_url !== undefined ? reading_url : currentBook.reading_url,
          source_url !== undefined ? source_url : currentBook.source_url,
          pdf_url !== undefined ? pdf_url : currentBook.pdf_url,
          specialty !== undefined ? specialty : currentBook.specialty,
          id,
        ]
      );
      res.json({ success: true, book: updatedBook });
      return;
    } catch (e) {
      console.warn("Neon book update failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const bookIndex = memoryBooks.findIndex((b) => b.id === id);
  if (bookIndex === -1) {
    res.status(404).json({ error: "Кітап табылмады" });
    return;
  }

  const currentBook = memoryBooks[bookIndex];
  const newTotal = parseInt(total_copies) || currentBook.total_copies;
  const issued = currentBook.total_copies - currentBook.available_copies;
  const newAvailable = Math.max(0, newTotal - issued);
  const parsedCourse = parseInt(course);

  const updatedBook: BookRecord = {
    ...currentBook,
    title: title || currentBook.title,
    author: author || currentBook.author,
    subject: subject || currentBook.subject,
    category: category || currentBook.category,
    specialty: specialty !== undefined ? specialty : currentBook.specialty,
    course: Number.isNaN(parsedCourse) ? currentBook.course : parsedCourse,
    grade: grade !== undefined ? (grade ? parseInt(grade) : null) : currentBook.grade,
    language: language !== undefined ? language : currentBook.language,
    publisher: publisher !== undefined ? publisher : currentBook.publisher,
    year: year !== undefined ? (year ? parseInt(year) : null) : currentBook.year,
    book_type: book_type || currentBook.book_type,
    total_copies: newTotal,
    available_copies: newAvailable,
    description: description !== undefined ? description : currentBook.description,
    cover_color: cover_color || currentBook.cover_color,
    cover_url: cover_url !== undefined ? cover_url : currentBook.cover_url,
    source_url: source_url !== undefined ? source_url : currentBook.source_url,
    reading_url: reading_url !== undefined ? reading_url : currentBook.reading_url,
    pdf_url: pdf_url !== undefined ? pdf_url : currentBook.pdf_url,
    isbn: isbn !== undefined ? isbn : currentBook.isbn,
  };
  memoryBooks[bookIndex] = updatedBook;
  res.json({ success: true, book: updatedBook });
});

// Books: Delete
app.delete("/api/books/:id", requireLibrarianAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (useNeon) {
    try {
      const rows = await q("DELETE FROM books WHERE id = $1 RETURNING id", [id]);
      if (rows.length === 0) {
        res.status(404).json({ error: "Кітап табылмады" });
        return;
      }
      res.json({ success: true, message: "Кітап жойылды" });
      return;
    } catch (e) {
      console.warn("Neon book delete failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const idx = memoryBooks.findIndex((b) => b.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Кітап табылмады" });
    return;
  }
  memoryBooks.splice(idx, 1);
  res.json({ success: true, message: "Кітап жойылды" });
});

// Issue Book
app.post("/api/issue", requireLibrarianAuth, async (req, res) => {
  const { book_id, course, group_name, head_name, quantity, notes } = req.body;
  const qty = parseInt(quantity);
  const bookId = Number(book_id);

  if (!bookId || !group_name || isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: "Барлық өрістерді дұрыс толтырыңыз" });
    return;
  }

  if (useNeon) {
    try {
      const [book] = await q("SELECT * FROM books WHERE id = $1", [bookId]);
      if (!book) {
        res.status(404).json({ error: "Кітап табылмады" });
        return;
      }

      const rows = await q(
        `WITH upd AS (
           UPDATE books SET available_copies = available_copies - $1::int
           WHERE id = $2 AND available_copies >= $1::int
           RETURNING id
         )
         INSERT INTO issues (book_id, course, group_name, head_name, quantity, returned_quantity, status, issue_date, notes)
         SELECT id, $3::int, $4, $5, $1::int, 0, 'active', now(), $6 FROM upd
         RETURNING id`,
        [qty, bookId, parseInt(course) || 1, group_name, head_name || null, notes || null]
      );

      if (rows.length === 0) {
        res.status(400).json({
          error: `Қорда жеткілікті кітап жоқ! Қолжетімді: ${book.available_copies} дана`,
        });
        return;
      }
      res.status(201).json({ success: true, issue_id: rows[0].id });
      return;
    } catch (e) {
      console.warn("Neon issue failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const book = memoryBooks.find((b) => b.id === bookId);
  if (!book) {
    res.status(404).json({ error: "Кітап табылмады" });
    return;
  }
  if (book.available_copies < qty) {
    res.status(400).json({
      error: `Қорда жеткілікті кітап жоқ! Қолжетімді: ${book.available_copies} дана`,
    });
    return;
  }

  book.available_copies -= qty;
  const newIssue: IssueRecord = {
    id: nextIssueId++,
    book_id: bookId,
    course: parseInt(course) || book.course || 1,
    group_name,
    head_name: head_name || null,
    quantity: qty,
    returned_quantity: 0,
    status: "active",
    issue_date: new Date().toISOString(),
    return_date: null,
    notes: notes || null,
  };
  memoryIssues.unshift(newIssue);
  res.status(201).json({ success: true, issue_id: newIssue.id });
});

// Return Book
app.post("/api/return", requireLibrarianAuth, async (req, res) => {
  const { issue_id, return_quantity } = req.body;
  const qty = parseInt(return_quantity);
  const issueId = Number(issue_id);

  if (!issueId || isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: "Қайтарылатын дана санын көрсетіңіз" });
    return;
  }

  if (useNeon) {
    try {
      const [issue] = await q("SELECT * FROM issues WHERE id = $1", [issueId]);
      if (!issue) {
        res.status(404).json({ error: "Берілім жазбасы табылмады" });
        return;
      }

      const remaining = issue.quantity - issue.returned_quantity;
      if (qty > remaining) {
        res.status(400).json({
          error: `Қайтарылатын сан қарыздан (${remaining} дана) көп болмауы керек!`,
        });
        return;
      }

      const rows = await q(
        `WITH u AS (
           UPDATE issues
           SET returned_quantity = returned_quantity + $1::int,
               status = CASE WHEN returned_quantity + $1::int >= quantity THEN 'returned' ELSE 'partial' END,
               return_date = now()
           WHERE id = $2 AND quantity - returned_quantity >= $1::int
           RETURNING book_id, status, quantity, returned_quantity
         ), b AS (
           UPDATE books SET available_copies = available_copies + $1::int
           WHERE id IN (SELECT book_id FROM u)
           RETURNING id
         )
         SELECT status, quantity, returned_quantity FROM u`,
        [qty, issueId]
      );

      if (rows.length === 0) {
        res.status(409).json({ error: "Жазба өзгерген, қайта көріп шығыңыз" });
        return;
      }
      const r = rows[0];
      res.json({
        success: true,
        newStatus: r.status,
        returnedNow: qty,
        stillRemaining: r.quantity - r.returned_quantity,
      });
      return;
    } catch (e) {
      console.warn("Neon return failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const issue = memoryIssues.find((i) => i.id === issueId);
  if (!issue) {
    res.status(404).json({ error: "Берілім жазбасы табылмады" });
    return;
  }

  const remaining = issue.quantity - issue.returned_quantity;
  if (qty > remaining) {
    res.status(400).json({
      error: `Қайтарылатын сан қарыздан (${remaining} дана) көп болмауы керек!`,
    });
    return;
  }

  issue.returned_quantity += qty;
  issue.status = issue.returned_quantity >= issue.quantity ? "returned" : "partial";
  issue.return_date = new Date().toISOString();

  const book = memoryBooks.find((b) => b.id === issue.book_id);
  if (book) {
    book.available_copies = Math.min(book.total_copies, book.available_copies + qty);
  }

  res.json({
    success: true,
    newStatus: issue.status,
    returnedNow: qty,
    stillRemaining: issue.quantity - issue.returned_quantity,
  });
});

// Issues History
app.get("/api/history", async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";

  if (useNeon) {
    try {
      const issues = await q(`
        SELECT i.*, b.title AS book_title, b.author AS book_author
        FROM issues i
        JOIN books b ON i.book_id = b.id
        ${activeOnly ? "WHERE i.status IN ('active', 'partial')" : ""}
        ORDER BY i.id DESC
      `);
      res.json({ issues });
      return;
    } catch (e) {
      console.warn("Neon history query failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const booksMap = new Map(memoryBooks.map((b) => [b.id, b]));
  const issues = memoryIssues
    .filter((i) => (!activeOnly ? true : i.status === "active" || i.status === "partial"))
    .sort((a, b) => b.id - a.id)
    .map((i) => {
      const book = booksMap.get(i.book_id);
      return {
        ...i,
        book_title: book ? book.title : "Белгісіз кітап",
        book_author: book ? book.author : "",
      };
    });

  res.json({ issues });
});

// Stats
app.get("/api/stats", async (_req, res) => {
  if (useNeon) {
    try {
      const [booksStats] = await q(`
        SELECT COUNT(*)::int AS "totalBooks",
               COALESCE(SUM(total_copies),0)::int AS "totalCopies",
               COALESCE(SUM(available_copies),0)::int AS "availableCopies"
        FROM books`);
      const [issueStats] = await q(`
        SELECT COUNT(DISTINCT group_name)::int AS "activeGroups",
               COUNT(*)::int AS "activeIssues",
               COALESCE(SUM(quantity - returned_quantity),0)::int AS "totalIssuedCopies"
        FROM issues WHERE status IN ('active', 'partial')`);
      res.json({ ...booksStats, ...issueStats });
      return;
    } catch (e) {
      console.warn("Neon stats query failed, using in-memory:", e);
      useNeon = false;
    }
  }

  const totalBooks = memoryBooks.length;
  const totalCopies = memoryBooks.reduce((sum, b) => sum + b.total_copies, 0);
  const availableCopies = memoryBooks.reduce((sum, b) => sum + b.available_copies, 0);

  const activeIssuesList = memoryIssues.filter((i) => i.status === "active" || i.status === "partial");
  const activeGroupsSet = new Set(activeIssuesList.map((i) => i.group_name));
  const activeIssues = activeIssuesList.length;
  const totalIssuedCopies = activeIssuesList.reduce((sum, i) => sum + (i.quantity - i.returned_quantity), 0);

  res.json({
    totalBooks,
    totalCopies,
    availableCopies,
    activeGroups: activeGroupsSet.size,
    activeIssues,
    totalIssuedCopies,
  });
});

// Helper for catalogue
async function getCatalogueBooks(): Promise<BookRecord[]> {
  if (useNeon) {
    try {
      return (await q("SELECT * FROM books ORDER BY id DESC LIMIT 500")) as BookRecord[];
    } catch {
      useNeon = false;
    }
  }
  return memoryBooks;
}

// Fallback search when Gemini API key is not present or offline
function fallbackSmartSearch(allBooks: BookRecord[], query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const results: any[] = [];
  for (const book of allBooks) {
    let score = 0;
    const gradeStr = book.grade ? `${book.grade} сынып ${book.grade} класс` : "";
    const textToSearch = `${book.title} ${book.author} ${book.subject} ${book.category} ${book.publisher || ""} ${gradeStr} ${book.description} ${book.course} курс`.toLowerCase();

    for (const term of terms) {
      if (book.title.toLowerCase().includes(term)) score += 0.45;
      if (book.subject.toLowerCase().includes(term)) score += 0.35;
      if (book.grade && term.includes(String(book.grade))) score += 0.4;
      if (book.category.toLowerCase().includes(term)) score += 0.25;
      if (book.author.toLowerCase().includes(term)) score += 0.25;
      if (book.description.toLowerCase().includes(term)) score += 0.15;
    }

    if (score > 0) {
      const normalizedScore = Math.min(0.98, Math.max(0.4, Number((0.4 + score * 0.3).toFixed(2))));
      results.push({
        book,
        score: normalizedScore,
        explanation: {
          kk: book.grade
            ? `${book.grade}-сыныпқа арналған «${book.subject}» оқулығына сәйкес келеді.`
            : `«${book.subject}» пәніне және оқу бағдарламасына сәйкес келеді.`,
          ru: book.grade
            ? `Соответствует учебнику для ${book.grade} класса по дисциплине «${book.subject}».`
            : `Соответствует дисциплине «${book.subject}» и учебной программе.`,
        },
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

// ================= GEMINI AI SMART SEARCH =================
app.post("/api/ai-search", async (req: Request, res: Response) => {
  try {
    const userQuery = req.body?.query;

    if (typeof userQuery !== "string" || !userQuery.trim()) {
      res.json({ engine: "gemini", results: [] });
      return;
    }

    const cleanQuery = userQuery.trim().slice(0, 500);
    const allBooks = await getCatalogueBooks();

    if (allBooks.length === 0) {
      res.json({ engine: "gemini", results: [] });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if no Gemini key available
    if (!apiKey) {
      const fallbackResults = fallbackSmartSearch(allBooks, cleanQuery);
      res.json({
        engine: "smart-catalog",
        results: fallbackResults,
      });
      return;
    }

    const catalogue = allBooks.slice(0, 180).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      subject: book.subject,
      specialty: book.specialty || "general",
      category: book.category,
      course: book.course,
      grade: book.grade || null,
      language: book.language || "kk",
      publisher: book.publisher || "",
      description: book.description || "",
    }));

    const prompt = `
Сен Семей қаласындағы «Қайнар» жоғары колледжінің Smart Library цифрлық кітапханасындағы AI көмекшісісің.
Қорда колледждің 8 мамандығы (МЧС, IT, ЖҚҰ/Организация дорожного движения, Педагогика және психология, Өрт қауіпсіздігі, Есеп және аудит, Құқықтану/Юриспруденция, Аударма ісі) бойынша 1, 2, 3, 4 курстардың кәсіби оқулықтары және 1-курстың жалпы білім беру оқулықтары бар.

Студенттің немесе оқытушының сұранысына сәйкес кітаптарды каталогтан таңда.

СТУДЕНТ СҰРАНЫСЫ:
${cleanQuery}

КІТАПХАНА КАТАЛОГЫ:
${JSON.stringify(catalogue)}

ЕРЕЖЕЛЕР:
1. Тек берілген каталогтағы кітаптарды таңда.
2. Кітаптың атауын немесе авторын ойдан шығарма.
3. Сұраныстың мағынасын түсін (қазақша, орысша, ағылшынша).
4. Тек тақырыпқа және мамандыққа шынымен сәйкес кітаптарды таңда.
5. Ең көбі 6 кітап қайтар.
6. score мәні 0 мен 1 аралығында болсын.
7. Сәйкестігі төмен кітаптарды қоспа.
8. explanation_kk және explanation_ru өрістерінде кітаптың неге сәйкес келетінін қысқаша түсіндір.
9. Егер сәйкес кітап болмаса, бос results массивін қайтар.

ЖАУАП ТЕК JSON ФОРМАТЫНДА БОЛСЫН:
{
  "results": [
    {
      "id": 1,
      "score": 0.95,
      "explanation_kk": "Кітап сұранысқа сәйкес келеді.",
      "explanation_ru": "Книга соответствует запросу."
    }
  ]
}
`;

    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          },
        }),
        signal: AbortSignal.timeout(25000),
      }
    );

    if (!geminiResponse.ok) {
      console.warn("Gemini API call failed, falling back to smart catalog search");
      const fallbackResults = fallbackSmartSearch(allBooks, cleanQuery);
      res.json({
        engine: "smart-catalog",
        results: fallbackResults,
      });
      return;
    }

    const geminiData = await geminiResponse.json();
    const responseText =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text || "")
        .join("") || "";

    if (!responseText) {
      const fallbackResults = fallbackSmartSearch(allBooks, cleanQuery);
      res.json({ engine: "smart-catalog", results: fallbackResults });
      return;
    }

    const aiData = JSON.parse(responseText);
    const aiResults = Array.isArray(aiData.results) ? aiData.results : [];

    const booksById = new Map(allBooks.map((book) => [Number(book.id), book]));
    const usedIds = new Set<number>();

    const results = aiResults
      .slice(0, 6)
      .map((item: any) => {
        const id = Number(item.id);
        const book = booksById.get(id);

        if (!book || usedIds.has(id)) return null;
        usedIds.add(id);

        const score = Math.min(0.99, Math.max(0, Number(item.score) || 0));
        if (score < 0.35) return null;

        return {
          book,
          score,
          explanation: {
            kk:
              typeof item.explanation_kk === "string"
                ? item.explanation_kk.slice(0, 300)
                : `«${book.subject}» пәніне сәйкес келеді.`,
            ru:
              typeof item.explanation_ru === "string"
                ? item.explanation_ru.slice(0, 300)
                : `Соответствует дисциплине «${book.subject}».`,
          },
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score);

    res.json({
      engine: "gemini",
      results,
    });
  } catch (error) {
    console.error("AI search error, using fallback:", error);
    try {
      const allBooks = await getCatalogueBooks();
      const fallbackResults = fallbackSmartSearch(allBooks, String(req.body?.query || ""));
      res.json({ engine: "smart-catalog", results: fallbackResults });
    } catch {
      res.status(500).json({ error: "AI іздеу кезінде қате пайда болды" });
    }
  }
});

// ================= GEMINI AI CHAT =================
app.post("/api/ai-chat", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Хабарлама енгізіңіз" });
      return;
    }

    const validMessages = messages
      .slice(-20)
      .filter(
        (message: any) =>
          ["user", "assistant"].includes(message?.role) &&
          typeof message?.content === "string" &&
          message.content.trim().length > 0
      );

    if (validMessages.length === 0 || !validMessages.some((message: any) => message.role === "user")) {
      res.status(400).json({ error: "Жарамды сұрақ табылмады" });
      return;
    }

    const lastUserMessage = validMessages.filter((m: any) => m.role === "user").slice(-1)[0]?.content || "";

    // If no Gemini key, answer with built-in assistant knowledge
    if (!apiKey) {
      const isRu = /[а-яё]/i.test(lastUserMessage) && !/[әіңғүұқөһ]/i.test(lastUserMessage);
      const isAuthorQuestion = /(автор|әзірлеуші|кім жасады|разработчик|создатель)/i.test(lastUserMessage);

      if (isAuthorQuestion) {
        res.json({
          engine: "assistant",
          reply: isRu
            ? "Smart Library — цифровая библиотека Высшего колледжа «Қайнар» в г. Семей, созданная преподавателем специальных дисциплин Шаймардановым Куанышем Нурланулы. В системе представлены все 8 специальностей колледжа (МЧС, IT, ОДД, Педагогика и психология, Пожарная безопасность, Учёт и аудит, Юриспруденция, Переводческое дело), курсы с 1 по 4, и функция онлайн-чтения прямо внутри Smart Library."
            : "Smart Library — Семей қаласындағы Қайнар жоғары колледжінің цифрлық кітапханасы. Жоба авторы — колледждің арнайы пәндер оқытушысы Шаймарданов Қуаныш Нұрланұлы. Кітапханада колледждің 8 мамандығы бойынша (МЧС, IT, ЖҚҰ, Педагогика, Өрт қауіпсіздігі, Есеп және аудит, Құқықтану, Аударма ісі) 1-4 курстардың оқулықтары және онлайн оқу мүмкіндігі бар.",
        });
        return;
      }

      res.json({
        engine: "assistant",
        reply: isRu
          ? "Здравствуйте! Я интеллектуальный ассистент Smart Library Высшего колледжа «Қайнар» (г. Семей). Помогу с вопросами о библиотеке и книгах, а также с учёбой, наукой, программированием и повседневными вопросами. Чем могу помочь?"
          : "Сәлеметсіз бе! Мен Семей қаласындағы Қайнар жоғары колледжінің Smart Library цифрлық кітапханасының AI көмекшісімін. Кітапхана қызметтері, оқулықтар, сондай-ақ оқу, ғылым, бағдарламалау және күнделікті сұрақтар бойынша көмектесемін. Қандай сұрағыңыз бар?",
      });
      return;
    }

    const contents = validMessages.map((message: any) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content.trim().slice(0, 4000) }],
    }));

    // Real catalogue (Neon / in-memory) so the AI can only cite books that actually exist
    const catalogBooks = await getCatalogueBooks();
    const catalogueText = catalogBooks
      .slice(0, 250)
      .map(
        (b) =>
          `#${b.id} | ${b.title} | ${b.author} | ${b.subject} | ${b.category}${b.grade ? ` | ${b.grade}-сынып` : ""}${b.course ? ` | ${b.course}-курс` : ""} | ${b.language || "kk"} | қолжетімді: ${b.available_copies}/${b.total_copies}`
      )
      .join("\n");

    const systemPrompt = `
Сен Семей қаласындағы «Қайнар» жоғары колледжінің Smart Library цифрлық кітапханасының AI көмекшісісің. Сен студенттер мен оқытушыларға кітапхана қызметтері бойынша да, жалпы білім беру және күнделікті ақпараттық сұрақтар бойынша да көмектесесің.

СЕНІҢ МҮМКІНДІКТЕРІҢ:
Сен универсал көмекшісің. Кез келген тақырып бойынша еркін жауап бер — тек кітапхана емес: білім беру, информатика және бағдарламалау, математика, физика, тарих, география, ғылым және технология, құқық, экономика, тілдер мен аударма, өнер, спорт, денсаулық туралы жалпы ақпарат, күнделікті өмір, кеңестер, жалпы әңгіме («Сәлем, қалың қалай?» сияқты). Сұрақ кітапханаға қатысы жоқ болса да бас тартпа және әңгімені кітапханаға бұрмала.

ТІЛ ЖӘНЕ СТИЛЬ:
1. Пайдаланушы қай тілде (қазақ, орыс, ағылшын) жазса, сол тілде жауап бер.
2. Жауап түсінікті, мазмұнды және құрылымды болсын; қажет жерде мысал, тізім немесе код келтір.
3. Қарапайым сұраққа қысқа, күрделі сұраққа толық жауап бер.
4. Болжамды расталған факт ретінде көрсетпе. Білмесең немесе сенімсіз болсаң, ашық айт. Жаңа оқиғалар мен нақты сандарда қателесуің мүмкін екенін ескер.
5. Өзіңді қажет болғанда Қайнар колледжінің Smart Library AI көмекшісі ретінде таныстыр.

КІТАПХАНА ҚОРЫ ТУРАЛЫ ЕРЕЖЕЛЕР (МАҢЫЗДЫ):
- Колледждің 8 мамандығы бойынша оқулықтар бар: МЧС/төтенше жағдайлар, IT, жол қозғалысын ұйымдастыру, педагогика және психология, өрт қауіпсіздігі, есеп және аудит, құқықтану, аударма ісі; сонымен қатар 1-курстың жалпы білім беру пәндері. Оқулықтарды сайт ішінде «Онлайн оқу» режимінде ашуға болады, іздеу үшін «Кітап іздеу» және сүзгілер (мамандық/курс/тіл) бар.
- Кітапханадағы кітаптар, авторлар, даналар саны мен қолжетімділік туралы тек төмендегі КІТАПХАНА КАТАЛОГЫНАН жауап бер. Каталогта жоқ кітапты, авторды, ISBN-ді немесе даналар санын ЕШҚАШАН ойдан шығарма.
- Пайдаланушы кітапханадағы кітап сұраса, каталогтан сәйкес кітаптарды ата (атауы, авторы, курсы/сыныбы, қолжетімділігі). Сәйкес кітап табылмаса, оны ашық айт және «Кітап іздеу» мүмкіндігін ұсын.
- Каталогта жоқ, бірақ жалпы білім үшін белгілі кітаптар туралы әңгімелесуге болады, бірақ оларды «кітапханада бар» деп айтпа.

ЖОБА АВТОРЫ ЖӘНЕ КОЛЛЕДЖ ТУРАЛЫ:
Smart Library жүйесі Қайнар жоғары колледжі үшін (Семей қаласы) арнайы әзірленген. Авторы — колледж оқытушысы Шаймарданов Қуаныш Нұрланұлы.

КІТАПХАНА КАТАЛОГЫ (id | атауы | авторы | пән | санат | сынып/курс | тіл | қолжетімді дана):
${catalogueText || "(каталог бос)"}
`;

    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => "");
      console.error("Gemini chat HTTP error:", geminiResponse.status, model, errText.slice(0, 500));
      res.json({
        engine: "fallback",
        reply: "Smart Library көмекшісі: қазіргі уақытта 10-11 сынып оқулықтары мен колледж материалдары қолжетімді. Сұрағыңызды нақтылап көріңіз немесе жоғарыдағы кітаптар іздеуін қолданыңыз.",
        debug: { status: geminiResponse.status, model, error: errText.slice(0, 500) },
      });
      return;
    }

    const geminiData = await geminiResponse.json();
    const reply =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text || "")
        .join("")
        .trim() || "";

    if (!reply) {
      res.json({
        engine: "fallback",
        reply: "Сұрағыңызға рақмет! Қажетті оқулықты каталогтан немесе AI іздеу арқылы таба аласыз.",
      });
      return;
    }

    res.json({
      engine: "gemini",
      reply,
    });
  } catch (error) {
    console.error("Gemini chat error:", error);
    res.json({
      engine: "fallback",
      reply: "Smart Library көмекшісі: Кітапхана қоры (мектеп және колледж) қалыпты жұмыс істеп тұр. Сұрағыңызды қойыңыз немесе оқулықтар каталогын шолыңыз.",
    });
  }
});

export default app;
