import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  GripVertical,
  Hand,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { MEDIA } from '../game/assets';
import {
  CATALOG_BOOKS,
  CatalogBook,
  OCEAN_BOOKS,
  OCEAN_DIVISIONS,
  OceanBook,
  WORKSHOPS,
} from '../game/knigogradData';
import { FeedbackState, KnigogradSave, TaskProgress } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';
import { MissionBanner } from './MissionBanner';
import { ProjectShowcase3D } from './ProjectShowcase3D';
import { WorkshopStepper } from './WorkshopStepper';

interface Workshop1ViewProps {
  taskIdx: number;
  isShowcase: boolean;
  progress: TaskProgress[];
  save: KnigogradSave;
  onSelectTask: (idx: number) => void;
  onOpenShowcase: () => void;
  onNextWorkshop: () => void;
  onRecordMistake: (taskIdx: number) => void;
  onUseHint: (taskIdx: number, hintTitle: string, hintBody: string) => void;
  onCompleteTask: (
    taskIdx: number,
    feedback: Omit<FeedbackState, 'bibliksAwarded' | 'alreadyDone'>,
    extraSave?: Partial<KnigogradSave>
  ) => void;
  onShowError: (title: string, body: string) => void;
}

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  code: string;
  department: string;
  cover: string;
  isTarget?: boolean;
  isMisplaced?: boolean;
}

const DESIGN_SHELF_BOOKS: ShelfBook[] = [
  { id: 's4-1', title: 'История шрифта и книги', author: 'В. Белый', code: '85.15 / Б43', department: 'Графика', cover: MEDIA.coverFontHistory },
  { id: 's4-2', title: 'Плакат как искусство', author: 'Е. Бекова', code: '85.15 / Б42', department: 'Графика', cover: MEDIA.coverPoster },
  { id: 's4-6', title: 'Маршруты города', author: 'Н. Савина', code: '26.8 / С13', department: 'Географические науки', cover: MEDIA.coverRoutes, isMisplaced: true },
  { id: 's4-4', title: 'Модульная сетка', author: 'М. Миронова', code: '85.15 / М64', department: 'Графика', cover: MEDIA.coverGrid },
  { id: 's4-5', title: 'Теория цвета', author: 'М. Миронова', code: '85.15 / М64', department: 'Графика', cover: MEDIA.coverColor },
  { id: 's4-3', title: 'Язык формы', author: 'М. Миронова', code: '85.15 / М64', department: 'Графика', cover: MEDIA.coverForm, isTarget: true },
  { id: 's4-8', title: 'Искусство путешествовать', author: 'А. Ветров', code: '26.8 / В39', department: 'Географические науки', cover: MEDIA.coverTravel, isMisplaced: true },
  { id: 's4-7', title: 'Дизайн и город', author: 'П. Чернов', code: '85.15 / Ч49', department: 'Графика', cover: MEDIA.coverDesignCity },
];

const TRAVEL_SHELF_BOOKS: ShelfBook[] = [
  { id: 's2-1', title: 'Морские открытия', author: 'П. Орлов', code: '26.8 / О-66', department: 'Географические науки', cover: MEDIA.oceanDiscoveries },
  { id: 's2-2', title: 'Экспедиция на дно океана', author: 'Е. Крылова', code: '26.8 / К85', department: 'Географические науки', cover: MEDIA.oceanExpedition },
];

export const Workshop1View: React.FC<Workshop1ViewProps> = ({
  taskIdx,
  isShowcase,
  progress,
  save,
  onSelectTask,
  onOpenShowcase,
  onNextWorkshop,
  onRecordMistake,
  onUseHint,
  onCompleteTask,
  onShowError,
}) => {
  const wsMeta = WORKSHOPS[0];

  /* ---- Task 0: Visual Book Catalog ---- */
  const [searchQuery, setSearchQuery] = useState('');
  const [themeChip, setThemeChip] = useState('Все');
  const [yearChip, setYearChip] = useState('Все');
  const [openedBook, setOpenedBook] = useState<CatalogBook | null>(null);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CATALOG_BOOKS.filter((book) => {
      const okTheme = themeChip === 'Все' || book.theme === themeChip;
      const okYear = yearChip === 'Все' || String(book.year) === yearChip;
      const okQ =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.about.toLowerCase().includes(q);
      return okTheme && okYear && okQ;
    });
  }, [searchQuery, themeChip, yearChip]);

  /* ---- Task 1: Real Drag-and-Drop Systematic Bookshelf ---- */
  const [foundTargetBook, setFoundTargetBook] = useState(false);
  const [movedMisplacedIds, setMovedMisplacedIds] = useState<string[]>([]);
  const [selectedShelfBookId, setSelectedShelfBookId] = useState<string | null>(null);
  const [draggedShelfBookId, setDraggedShelfBookId] = useState<string | null>(null);
  const [shelfOverZone, setShelfOverZone] = useState<'reader' | 'travel' | null>(null);
  const totalMisplacedCount = DESIGN_SHELF_BOOKS.filter((b) => b.isMisplaced).length;

  /* ---- Task 2: Spot-the-Difference Desk ---- */
  const [fixedYear, setFixedYear] = useState(false);
  const [fixedTopic, setFixedTopic] = useState(false);
  const [deskToast, setDeskToast] = useState<string | null>(null);

  /* ---- Task 3: Drag-and-Drop Ocean Exhibition ---- */
  const [sections, setSections] = useState<Record<'life' | 'research' | 'expedition', string[]>>(
    () =>
      save.exhibitionSections.life.length ||
      save.exhibitionSections.research.length ||
      save.exhibitionSections.expedition.length
        ? save.exhibitionSections
        : { life: [], research: [], expedition: [] }
  );
  const [inspectedOceanId, setInspectedOceanId] = useState<string>('life');
  const [draggedOceanId, setDraggedOceanId] = useState<string | null>(null);
  const [overOceanSection, setOverOceanSection] = useState<string | null>(null);
  const [showcaseBook, setShowcaseBook] = useState<OceanBook | null>(null);

  const inspectedOcean = OCEAN_BOOKS.find((b) => b.id === inspectedOceanId) ?? OCEAN_BOOKS[0];
  const assignedIds = useMemo(
    () => new Set([...sections.life, ...sections.research, ...sections.expedition]),
    [sections]
  );
  const totalPlacedOcean = sections.life.length + sections.research.length + sections.expedition.length;

  const assignOceanBook = (bookId: string, secId: 'life' | 'research' | 'expedition') => {
    soundEngine.playPaperSlide();
    setSections((prev) => {
      const cleaned = {
        life: prev.life.filter((id) => id !== bookId),
        research: prev.research.filter((id) => id !== bookId),
        expedition: prev.expedition.filter((id) => id !== bookId),
      };
      if (cleaned[secId].length >= 2) return prev;
      return { ...cleaned, [secId]: [...cleaned[secId], bookId] };
    });
  };

  const removeOceanBook = (bookId: string) => {
    soundEngine.playSelectTick();
    setSections((prev) => ({
      life: prev.life.filter((id) => id !== bookId),
      research: prev.research.filter((id) => id !== bookId),
      expedition: prev.expedition.filter((id) => id !== bookId),
    }));
  };

  /* ---- Task 0 Check ---- */
  const handleGiveBookToReader = (book: CatalogBook) => {
    setOpenedBook(null);
    if (book.id === 'b0') {
      onCompleteTask(0, {
        success: true,
        title: 'Точно в цель! «Язык формы» (85.15 / М64)',
        body: 'Поиск по каталогу выполнен точно: книга «Язык формы» найдена и не спутана с другим изданием того же автора и года («Модульная сетка»).',
        lesson:
          'При информационном поиске важно сопоставлять автора, год издания и аннотацию, чтобы безошибочно отличить похожие издания друг от друга.',
        nextActionLabel: 'Перейти к расстановке фонда (шаг 2)',
        onNext: 'next_task',
      });
    } else if (book.id === 'b2') {
      onRecordMistake(0);
      onShowError(
        'Почти, но это другое издание того же автора',
        '«Модульная сетка» тоже написана Мариной Мироновой в 2023 году, но в её аннотации указано, что она о модульных сетках и таблицах. Сравни другие её книги в каталоге!'
      );
    } else {
      onRecordMistake(0);
      onShowError(
        'Читатель ищет другую книгу',
        'Перечитай запрос читателя: обрати внимание на фамилию автора, год издания и тему книги. Используй поиск или фильтры каталога и изучи аннотации.'
      );
    }
  };

  /* ---- Task 1 Drop / Place Handlers ---- */
  const handleDropToReader = (bookId: string | null) => {
    setShelfOverZone(null);
    setDraggedShelfBookId(null);
    if (!bookId) return;
    const book = DESIGN_SHELF_BOOKS.find((b) => b.id === bookId);
    if (!book) return;

    if (book.isTarget) {
      soundEngine.playSuccessChime();
      setFoundTargetBook(true);
      setSelectedShelfBookId(null);
      if (movedMisplacedIds.length >= totalMisplacedCount) {
        triggerTask1Win();
      }
    } else {
      onRecordMistake(1);
      onShowError(
        'Читатель заказывал другое издание',
        `Ты выбрал «${book.title}» (${book.author}). Вспомни, какую именно книгу Марины Мироновой о шрифтах и плакатах ты подобрал в каталоге на шаге 1!`
      );
    }
  };

  const handleDropToTravel = (bookId: string | null) => {
    setShelfOverZone(null);
    setDraggedShelfBookId(null);
    if (!bookId) return;
    const book = DESIGN_SHELF_BOOKS.find((b) => b.id === bookId);
    if (!book) return;

    if (book.isMisplaced) {
      if (movedMisplacedIds.includes(book.id)) return;
      soundEngine.playStampThud();
      const nextMoved = [...movedMisplacedIds, book.id];
      setMovedMisplacedIds(nextMoved);
      setSelectedShelfBookId(null);
      if (foundTargetBook && nextMoved.length >= totalMisplacedCount) {
        triggerTask1Win();
      }
    } else {
      onRecordMistake(1);
      onShowError(
        'Это издание стоит в своём отраслевом отделе',
        `Книга «${book.title}» относится к отделу 85.15 («Графика») и должна остаться на верхнем стеллаже. Проверь отраслевые индексы ББК и тематику остальных книг!`
      );
    }
  };

  const triggerTask1Win = () => {
    setTimeout(() => {
      onCompleteTask(1, {
        success: true,
        title: 'Заказ выполнен, а расстановка фонда исправлена!',
        body: 'Издание «Язык формы» (85.15 / М64) выдано читателю по заказу, а книги «Маршруты города» и «Искусство путешествовать» (индекс ББК 26.8) перенесены в профильный раздел «Географические науки».',
        lesson:
          'В библиотеках применяется систематико-алфавитная расстановка фонда: книги распределяются по отраслевым разделам таблиц ББК (85.15 — графика, 26.8 — географические науки), а внутри каждого раздела располагаются в алфавитном порядке авторов и заглавий.',
        nextActionLabel: 'Сверить запись в каталоге (шаг 3)',
        onNext: 'next_task',
      });
    }, 280);
  };

  /* ---- Task 2 Bibliographic Record Verification ---- */
  const handleStickyFieldClick = (field: 'author' | 'title' | 'year' | 'topic') => {
    if (field === 'author' || field === 'title') {
      soundEngine.playErrorThud();
      onRecordMistake(2);
      setDeskToast(
        field === 'author'
          ? 'Автор (Елена Крылова) указан верно — совпадает с титульным листом книги!'
          : 'Заглавие («Экспедиция на дно океана») указано без ошибок!'
      );
      return;
    }

    if (field === 'year' && !fixedYear) {
      soundEngine.playPencilMark();
      setFixedYear(true);
      setDeskToast('Ошибка №1 исправлена! Год издания уточнён: 2022.');
      if (fixedTopic) triggerTask2Win();
    }

    if (field === 'topic' && !fixedTopic) {
      soundEngine.playPencilMark();
      setFixedTopic(true);
      setDeskToast('Ошибка №2 исправлена! Предметная рубрика: «Глубоководные экспедиции».');
      if (fixedYear) triggerTask2Win();
    }
  };

  const triggerTask2Win = () => {
    setTimeout(() => {
      onCompleteTask(2, {
        success: true,
        title: 'Библиографическая запись сверена!',
        body: 'Библиографическая запись исправлена: уточнён год издания (2022) и предметная рубрика («Глубоководные экспедиции»).',
        lesson: 'При каталогизации специалист проверяет сведения о книге и определяет её тематику. Это помогает читателям находить нужные издания.',
        nextActionLabel: 'Собрать виртуальную выставку (шаг 4)',
        onNext: 'next_task',
      });
    }, 300);
  };

  /* ---- Task 3 Exhibition Check ---- */
  const handleCheckTask3 = () => {
    if (totalPlacedOcean < 6) {
      onShowError(
        'Заполни все 6 рамок выставки',
        `Сейчас в залах ${totalPlacedOcean} из 6 книг. Перетащи по 2 подходящие книги в каждый из трёх залов справа.`
      );
      return;
    }

    const wrongBooks: string[] = [];
    const wrongSection: string[] = [];
    (['life', 'research', 'expedition'] as const).forEach((secId) => {
      sections[secId].forEach((bId) => {
        const b = OCEAN_BOOKS.find((x) => x.id === bId);
        if (!b) return;
        if (b.section === null) wrongBooks.push(`«${b.title}»`);
        else if (b.section !== secId) wrongSection.push(`«${b.title}»`);
      });
    });

    if (wrongBooks.length === 0 && wrongSection.length === 0) {
      onCompleteTask(
        3,
        {
          success: true,
          title: 'Виртуальная выставка «Тайны океанских глубин» собрана!',
          body: 'Ты оставил за бортом 4 лишние книги (про мелководье, дайвинг и клады) и точно заполнил все 3 зала!',
          lesson:
            'Куратор виртуальной выставки отбирает материалы строго по смыслу, а не просто по красивой обложке.',
          nextActionLabel: 'Открыть готовую выставку',
          onNext: 'showcase',
        },
        { exhibitionSections: sections }
      );
    } else {
      onRecordMistake(3);
      let msg = '';
      if (wrongBooks.length > 0) {
        msg += `Убери лишние книги (они не про большие глубины): ${wrongBooks.join(', ')}. `;
      }
      if (wrongSection.length > 0) {
        msg += `Перенеси в другой зал: ${wrongSection.join(', ')}.`;
      }
      onShowError('Подправь подборку выставки', msg.trim());
    }
  };

  const handleHintClick = () => {
    const hints = [
      {
        title: 'Подсказка · Шаг 1',
        body: 'Отфильтруй каталог по тематике «Дизайн» и году «2023» (или введи фамилию «Миронова» в строку поиска). Сравни две найденные книги и выдай ту, в аннотации которой говорится о шрифтах и композиции плакатов.',
      },
      {
        title: 'Подсказка · Шаг 2',
        body: '1) Выдай читателю «Язык формы» (85.15 / М64) на кафедру справа. 2) На верхнем стеллаже отдела 85.15 стоят 2 книги из отдела 26.8 («Маршруты города» и «Искусство путешествовать») — перенеси обе на нижний стеллаж «Отдел 26.8 · Географические науки».',
      },
      {
        title: 'Подсказка · Шаг 3',
        body: 'В библиографической записи справа кликни по двум неверным полям: «Год издания: 2019» (в книге 2022) и «Предметная рубрика: Коралловые рифы и пляжи».',
      },
      {
        title: 'Подсказка · Шаг 4',
        body: '4 издания не подходят по теме больших глубин: «Мир коралловых рифов», «Необычные обитатели океана», «Загадки затонувших кораблей» и «Подводные путешествия». Остальные 6 перетащи в 3 раздела выставки.',
      },
    ];
    onUseHint(taskIdx, hints[taskIdx].title, hints[taskIdx].body);
  };

  /* ================= SHOWCASE ================= */
  if (isShowcase) {
    const curatedBySection = (secId: 'life' | 'research' | 'expedition') => {
      const savedIds = save.exhibitionSections[secId];
      if (savedIds && savedIds.length === 2) {
        return savedIds
          .map((id) => OCEAN_BOOKS.find((b) => b.id === id))
          .filter((b): b is OceanBook => Boolean(b));
      }
      return OCEAN_BOOKS.filter((b) => b.section === secId);
    };

    return (
      <div className="h-full overflow-y-auto desk-scroll px-4 sm:px-6 lg:px-8 py-6 bg-[#071a2f] text-white">
        <div className="max-w-6xl mx-auto space-y-6 animate-card-in">
          <div className="rounded-3xl bg-gradient-to-r from-[#0e3a59] to-[#135c75] p-6 sm:p-8 border border-white/15 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs font-extrabold uppercase tracking-widest text-[#7dd3fc]">
                Готовый результат · Профессия 01
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl">
                Виртуальная выставка «Тайны океанских глубин»
              </h1>
              <p className="text-sm text-white/85">
                Нажми на любую обложку, чтобы открыть её в твоей онлайн-экспозиции.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectTask(0)}
                className="min-h-[44px] px-4 rounded-xl bg-white/15 hover:bg-white/25 text-xs sm:text-sm font-bold whitespace-nowrap"
              >
                К заданиям
              </button>
              <button
                type="button"
                onClick={onNextWorkshop}
                className="min-h-[44px] px-5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 whitespace-nowrap shadow-sm"
              >
                Дальше: Редактор-издатель
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ProjectShowcase3D
            workshop={1}
            save={save}
            onSelectOceanBook={(book) => setShowcaseBook(book)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {OCEAN_DIVISIONS.map((div) => (
              <div
                key={div.id}
                className="rounded-2xl bg-white/8 border border-white/15 overflow-hidden flex flex-col"
              >
                <div className="px-4 py-3.5" style={{ backgroundColor: div.color }}>
                  <h2 className="font-display font-bold text-base text-white">{div.title}</h2>
                  <p className="text-xs text-white/80">{div.desc}</p>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {curatedBySection(div.id).map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelectTick();
                        setShowcaseBook(book);
                      }}
                      className="group bg-white/10 hover:bg-white/18 rounded-xl p-2 text-left transition-all hover:-translate-y-1 border border-white/10"
                    >
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full aspect-[3/4] object-cover rounded-lg mb-2 shadow-md"
                      />
                      <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                        {book.title}
                      </div>
                      <div className="text-[11px] text-white/65">{book.year}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showcaseBook && (
          <div
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
            onClick={() => setShowcaseBook(null)}
          >
            <div
              className="max-w-lg w-full bg-white text-[#13294b] rounded-2xl overflow-hidden shadow-2xl animate-card-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#135c75] text-white px-5 py-3 flex items-center justify-between">
                <span className="font-display font-bold text-sm">Экспонат выставки</span>
                <button
                  type="button"
                  onClick={() => setShowcaseBook(null)}
                  className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex flex-col sm:flex-row gap-4">
                <img
                  src={showcaseBook.cover}
                  alt={showcaseBook.title}
                  className="w-36 h-48 object-cover rounded-xl shadow-md shrink-0 mx-auto sm:mx-0"
                />
                <div className="space-y-2">
                  <h3 className="font-display font-extrabold text-lg">{showcaseBook.title}</h3>
                  <div className="text-xs font-bold text-[#135c75]">
                    {showcaseBook.author} · {showcaseBook.year}
                  </div>
                  <p className="text-sm text-[#13294b]/80 leading-relaxed">{showcaseBook.desc}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= ACTIVE TASKS ================= */
  const allDone = progress.every((p) => p.completed);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Stepper */}
      <div className="shrink-0 bg-white border-b border-[#13294b]/10 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {wsMeta.tasks.map((t, idx) => {
            const done = progress[idx].completed;
            const active = taskIdx === idx;
            return (
              <button
                key={t.title}
                type="button"
                onClick={() => onSelectTask(idx)}
                className={`min-h-[36px] px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#135c75] text-white shadow-xs'
                    : done
                      ? 'bg-[#e9f7ef] text-[#157a4f]'
                      : 'bg-[#f2f5fa] text-[#13294b]/75 hover:bg-[#e5ebf6]'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <span className="font-mono-tabular">{idx + 1}.</span>}
                <span>{t.title}</span>
              </button>
            );
          })}
          {allDone && (
            <button
              type="button"
              onClick={onOpenShowcase}
              className="min-h-[36px] px-3.5 rounded-xl bg-[#e0f2fe] text-[#0369a1] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Готовая выставка
            </button>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto desk-scroll px-4 sm:px-6 py-4 ${
          taskIdx === 3 ? 'bg-[#eef6fc] text-[#13294b]' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-4 animate-card-in" key={`w1-t${taskIdx}`}>
          <WorkshopStepper
            trackTitle={WORKSHOPS[0].title}
            taskTitles={WORKSHOPS[0].tasks.map((t) => t.title)}
            activeIdx={taskIdx}
            progress={progress}
            accentColor="#135c75"
            onSelectTask={onSelectTask}
          />

          {/* ============ TASK 0: ILLUSTRATED CATALOG SEARCH ============ */}
          {taskIdx === 0 && (
            <>
              <MissionBanner
                image={MEDIA.sceneLibraryDesk}
                imageAlt="Читатель у кафедры выдачи библиотеки"
                stepLabel="Проф-трек 01 · Инфоресурсы БИД · Шаг 1 из 4"
                title="Выполни запрос читателя в электронном каталоге"
                goal="Читатель обратился к библиотекарю: «Помогите найти книгу Марины Мироновой 2023 года. Точное название не помню, но в ней подробно разбираются работа со шрифтом и композиция плакатов». Найди нужное издание среди 12 книг фонда."
                steps={[
                  { text: 'Определи по запросу нужную тематику, год или автора в фильтрах', done: themeChip !== 'Все' || yearChip !== 'Все' || searchQuery.trim().length > 0 },
                  { text: 'Открой карточки подходящих книг и сравни их аннотации', done: Boolean(openedBook) || progress[0].completed },
                  { text: 'Выдай читателю подходящее издание', done: progress[0].completed },
                ]}
                resultPreview="Читатель получает точно подобранную книгу, а не похожее издание того же автора."
                accentColor="#135c75"
                proTip={{
                  term: 'Электронный каталог',
                  text: 'Электронный каталог помогает находить книги по автору, названию, году издания и теме. В библиотеках Белгородской области используется АБИС «OPAC-Global».',
                }}
                onHint={handleHintClick}
              />

              {/* Authentic OPAC Search Terminal & Reader Request Slip */}
              <div className="rounded-2xl bg-[#13294b] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#135c75] text-[#7dd3fc] font-mono-tabular font-extrabold">
                    Электронный каталог
                  </span>
                  <span className="font-semibold text-white/90">
                    Запрос читателя: <strong className="text-[#7dd3fc]">Марина Миронова · 2023 г. · шрифты и композиция плакатов</strong>
                  </span>
                </div>
                <span className="font-mono-tabular text-xs font-extrabold text-[#7dd3fc]">
                  Найдено записей: {filteredBooks.length} из {CATALOG_BOOKS.length}
                </span>
              </div>

              {/* Clean Filter Bar */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#13294b]/10 shadow-xs flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[190px]">
                  <Search className="w-4 h-4 text-[#13294b]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по автору или слову..."
                    className="w-full min-h-[40px] pl-10 pr-4 rounded-xl bg-[#f4f7fc] border border-[#13294b]/12 text-sm text-[#13294b] outline-none focus:border-[#135c75]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Все', 'Дизайн', 'Искусство', 'Медиа', 'Путешествия'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelectTick();
                        setThemeChip(t);
                      }}
                      className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-colors ${
                        themeChip === t
                          ? 'bg-[#135c75] text-white'
                          : 'bg-[#f4f7fc] text-[#13294b] hover:bg-[#e5eef9]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Все', '2024', '2023', '2022', '2021'].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelectTick();
                        setYearChip(y);
                      }}
                      className={`min-h-[38px] px-3 rounded-xl font-mono-tabular text-xs font-bold transition-colors ${
                        yearChip === y
                          ? 'bg-[#c41e2e] text-white'
                          : 'bg-[#f4f7fc] text-[#13294b] hover:bg-[#fde2e4]'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* 12 Illustrated Book Covers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playPaperSlide();
                      setOpenedBook(book);
                    }}
                    className="group bg-white rounded-2xl p-2.5 border border-[#13294b]/10 hover:border-[#135c75] shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 text-left"
                  >
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full aspect-square object-cover rounded-xl mb-2.5"
                    />
                    <div className="font-display font-bold text-xs text-[#13294b] leading-snug line-clamp-2 group-hover:text-[#135c75]">
                      {book.title}
                    </div>
                    <div className="text-[11px] text-[#13294b]/65 mt-0.5 truncate">{book.author}</div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono-tabular font-extrabold text-[#135c75]">
                      <span>{book.year}</span>
                      <span>{book.code}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Book Inspect Popover (Styled as Authentic Catalog Card + Reader Issue Button) */}
              {openedBook && (
                <div
                  className="fixed inset-0 z-40 bg-[#0d1c34]/65 backdrop-blur-[2px] flex items-center justify-center p-4"
                  onClick={() => setOpenedBook(null)}
                >
                  <div
                    className="max-w-lg w-full bg-[#fdfbf5] rounded-3xl overflow-hidden shadow-2xl border-2 border-[#135c75]/35 animate-card-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-[#13294b] text-white px-5 py-3 flex items-center justify-between text-xs font-extrabold">
                      <span>КАРТОЧКА ЭЛЕКТРОННОГО КАТАЛОГА · Шифр {openedBook.code}</span>
                      <span className="font-mono-tabular text-[#7dd3fc]">ГОСТ Р 7.0.100</span>
                    </div>
                    <div className="p-5 flex gap-4 items-start">
                      <img
                        src={openedBook.cover}
                        alt={openedBook.title}
                        className="w-28 h-28 rounded-2xl object-cover shadow-md shrink-0"
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="text-xs font-mono-tabular font-extrabold text-[#135c75]">
                          Раздел: {openedBook.theme} · Год: {openedBook.year} · Индекс ББК: {openedBook.code}
                        </div>
                        <h3 className="font-display font-extrabold text-lg text-[#13294b] leading-tight">
                          {openedBook.title}
                        </h3>
                        <div className="text-xs font-bold text-[#13294b]/75">
                          Автор: {openedBook.author}
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-4">
                      <div className="rounded-2xl bg-white border border-[#13294b]/12 p-4 text-sm text-[#13294b] leading-relaxed">
                        <strong>О чём книга:</strong> {openedBook.about}
                      </div>
                    </div>
                    <div className="px-5 pb-5 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenedBook(null)}
                        className="min-h-[44px] px-4 rounded-xl bg-[#e9eef6] hover:bg-[#dce4f2] text-[#13294b] text-xs font-bold"
                      >
                        Закрыть
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGiveBookToReader(openedBook)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white text-sm font-extrabold shadow-sm"
                      >
                        Отдать книгу читателю!
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ============ TASK 1: SYSTEMATIC BBK BOOKSHELF ============ */}
          {taskIdx === 1 && (
            <>
              <MissionBanner
                image={MEDIA.w1StepShelves}
                imageAlt="Библиотекарь расставляет книги по отраслевым отделам фонда"
                stepLabel="Проф-трек 01 · Инфоресурсы БИД · Шаг 2 из 4"
                title="Выдай заказанную книгу и проверь систематическую расстановку фонда"
                goal="В библиотеке книги стоят по систематическому принципу — по отраслевым индексам ББК. Выдай читателю книгу, найденную на шаге 1, и проверь верхний стеллаж: 2 издания нарушают порядок расстановки и относятся к другому отраслевому отделу — перенеси их на нужный стеллаж."
                steps={[
                  { text: 'Перенеси заказанную на шаге 1 книгу на кафедру выдачи справа', done: foundTargetBook },
                  { text: 'Проверь индексы ББК и тематику книг на верхнем стеллаже', done: movedMisplacedIds.length > 0 },
                  { text: `Перенеси на нижний стеллаж оба несоответствующих разделу издания (${movedMisplacedIds.length} из ${totalMisplacedCount})`, done: movedMisplacedIds.length >= totalMisplacedCount },
                ]}
                resultPreview="Читатель получил книгу по заказу, а все издания расставлены строго по отраслевым отделам ББК."
                accentColor="#135c75"
                proTip={{
                  term: 'Индекс ББК',
                  text: 'Индекс ББК обозначает тематический раздел, к которому относится книга. Шифр хранения помогает найти её на полке.',
                }}
                onHint={handleHintClick}
              />

              {/* BBK Classification Legend Strip */}
              <div className="rounded-2xl bg-[#13294b] text-white px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-display font-extrabold text-[#7dd3fc]">Памятка систематической расстановки ББК:</span>
                  <span><strong className="font-mono-tabular text-[#7dd3fc]">85.15</strong> — Графика (верхний стеллаж)</span>
                  <span className="text-white/35">·</span>
                  <span><strong className="font-mono-tabular text-[#86efac]">26.8</strong> — Географические науки (нижний стеллаж)</span>
                </div>
                <span className="text-[11px] text-white/75 font-semibold">
                  Сверяй шифр на ярлыке каждой книги!
                </span>
              </div>

              {/* Helper banner if user clicked a book instead of dragging */}
              {selectedShelfBookId && (
                <div className="rounded-2xl bg-[#e0f2fe] border border-[#0284c7]/40 text-[#13294b] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md animate-card-in">
                  <div className="text-sm font-extrabold inline-flex items-center gap-2">
                    <Hand className="w-4 h-4" />
                    Выбрано издание «
                    {DESIGN_SHELF_BOOKS.find((b) => b.id === selectedShelfBookId)?.title}» (
                    {DESIGN_SHELF_BOOKS.find((b) => b.id === selectedShelfBookId)?.code}) — куда его перенести?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDropToReader(selectedShelfBookId)}
                      className="min-h-[38px] px-4 rounded-xl bg-[#157a4f] text-white text-xs font-extrabold"
                    >
                      На кафедру выдачи
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDropToTravel(selectedShelfBookId)}
                      className="min-h-[38px] px-4 rounded-xl bg-[#13294b] text-white text-xs font-extrabold"
                    >
                      В отдел 26.8 «Географические науки» ↓
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* LEFT 8 COLS: REAL WOODEN BOOKCASE WITH SYSTEMATIC BBK SECTIONS */}
                <div className="lg:col-span-8 rounded-3xl bg-[#5b3b22] p-4 sm:p-5 border-4 border-[#3d2514] shadow-2xl space-y-5">
                  {/* SHELF 1: SECTION 85.15 GRAPHICS */}
                  <div className="rounded-2xl bg-[#2d1c10] p-4 pb-0 shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-lg bg-[#f6e4bc] text-[#3d2514] font-display font-extrabold text-xs">
                        СТЕЛЛАЖ: Отдел 85.15 · Графика
                      </span>
                      <span className="text-xs text-[#f6e4bc]/80 font-semibold">
                        Перетаскивай книги мышкой или кликни для выбора
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end pb-1">
                      {DESIGN_SHELF_BOOKS.map((book) => {
                        const isRemoved =
                          (book.isTarget && foundTargetBook) ||
                          movedMisplacedIds.includes(book.id);
                        const isPicked = selectedShelfBookId === book.id;
                        return (
                          <div
                            key={book.id}
                            draggable={!isRemoved}
                            onDragStart={(e) => {
                              setDraggedShelfBookId(book.id);
                              e.dataTransfer.setData('text/plain', book.id);
                            }}
                            onDragEnd={() => {
                              setDraggedShelfBookId(null);
                              setShelfOverZone(null);
                            }}
                            onClick={() => {
                              if (isRemoved) return;
                              soundEngine.playSelectTick();
                              setSelectedShelfBookId((prev) => (prev === book.id ? null : book.id));
                            }}
                            className={`rounded-xl bg-white p-1.5 shadow-lg transition-all select-none ${
                              isRemoved
                                ? 'opacity-15 scale-90 pointer-events-none'
                                : isPicked
                                  ? 'ring-4 ring-[#38bdf8] -translate-y-2 cursor-grab'
                                  : 'hover:-translate-y-1.5 cursor-grab active:cursor-grabbing'
                            }`}
                          >
                            <div className="relative">
                              <img
                                src={book.cover}
                                alt={book.title}
                                draggable={false}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#13294b] text-[#7dd3fc] font-mono-tabular text-[10px] font-extrabold shadow">
                                {book.code}
                              </span>
                            </div>
                            <div className="mt-1.5 text-[11px] font-extrabold text-[#13294b] leading-tight line-clamp-1">
                              {book.title}
                            </div>
                            <div className="text-[10px] text-[#13294b]/60 truncate">
                              {book.author}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-3.5 -mx-4 mt-1 bg-gradient-to-b from-[#9c6b43] to-[#6e4728] rounded-b-xl border-t border-[#c49266]" />
                  </div>

                  {/* SHELF 2: SECTION 26.8 GEOGRAPHY & TRAVEL DROP ZONE */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setShelfOverZone('travel');
                    }}
                    onDragLeave={() => setShelfOverZone(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain') || draggedShelfBookId;
                      handleDropToTravel(id);
                    }}
                    onClick={() => {
                      if (selectedShelfBookId) handleDropToTravel(selectedShelfBookId);
                    }}
                    className={`rounded-2xl p-4 pb-0 shadow-inner transition-all ${
                      shelfOverZone === 'travel'
                        ? 'bg-[#194a33] ring-4 ring-[#86efac]'
                        : draggedShelfBookId
                          ? 'bg-[#253a2d] ring-2 ring-dashed ring-[#86efac]/70'
                          : 'bg-[#2d1c10]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-lg bg-[#d9f3e6] text-[#14532d] font-display font-extrabold text-xs">
                        СТЕЛЛАЖ: Отдел 26.8 · Географические науки
                      </span>
                      <span className="text-xs text-[#86efac] font-bold">
                        {movedMisplacedIds.length >= totalMisplacedCount
                          ? '✓ Расстановка отдела восстановлена!'
                          : `Перенесено: ${movedMisplacedIds.length} из ${totalMisplacedCount}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pb-1">
                      {TRAVEL_SHELF_BOOKS.map((book) => (
                        <div key={book.id} className="rounded-xl bg-white/95 p-1.5 shadow-md">
                          <div className="relative">
                            <img
                              src={book.cover}
                              alt={book.title}
                              draggable={false}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#157a4f] text-white font-mono-tabular text-[10px] font-extrabold">
                              {book.code}
                            </span>
                          </div>
                          <div className="mt-1.5 text-[11px] font-extrabold text-[#13294b] line-clamp-1">
                            {book.title}
                          </div>
                          <div className="text-[10px] text-[#13294b]/60 truncate">{book.author}</div>
                        </div>
                      ))}

                      {movedMisplacedIds.map((mId) => {
                        const movedBook = DESIGN_SHELF_BOOKS.find((b) => b.id === mId);
                        if (!movedBook) return null;
                        return (
                          <div
                            key={movedBook.id}
                            className="rounded-xl bg-white p-1.5 shadow-xl ring-2 ring-[#86efac] animate-stamp-pop"
                          >
                            <div className="relative">
                              <img
                                src={movedBook.cover}
                                alt={movedBook.title}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#157a4f] text-white font-mono-tabular text-[10px] font-extrabold">
                                {movedBook.code}
                              </span>
                            </div>
                            <div className="mt-1.5 text-[11px] font-extrabold text-[#157a4f] line-clamp-1">
                              {movedBook.title}
                            </div>
                            <div className="text-[10px] text-[#13294b]/60 truncate">
                              {movedBook.author}
                            </div>
                          </div>
                        );
                      })}

                      {movedMisplacedIds.length < totalMisplacedCount && (
                        <div
                          className={`${
                            movedMisplacedIds.length === 0 ? 'col-span-2' : 'col-span-1'
                          } min-h-[118px] rounded-xl border-2 border-dashed border-[#86efac]/70 bg-[#157a4f]/20 flex flex-col items-center justify-center p-3 text-center text-[#d9f3e6]`}
                        >
                          <ArrowDown className="w-5 h-5 mb-1 text-[#86efac]" />
                          <div className="text-xs font-extrabold leading-snug">
                            Перенеси сюда издания из этого отдела
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="h-3.5 -mx-4 mt-1 bg-gradient-to-b from-[#9c6b43] to-[#6e4728] rounded-b-xl border-t border-[#c49266]" />
                  </div>
                </div>

                {/* RIGHT 4 COLS: READER HANDOFF DROP ZONE */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setShelfOverZone('reader');
                  }}
                  onDragLeave={() => setShelfOverZone(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain') || draggedShelfBookId;
                    handleDropToReader(id);
                  }}
                  onClick={() => {
                    if (selectedShelfBookId) handleDropToReader(selectedShelfBookId);
                  }}
                  className={`lg:col-span-4 rounded-3xl p-5 border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 transition-all ${
                    foundTargetBook
                      ? 'bg-[#e9f7ef] border-[#157a4f]'
                      : shelfOverZone === 'reader'
                        ? 'bg-[#e0f2fe] border-[#0284c7] scale-[1.01]'
                        : draggedShelfBookId
                          ? 'bg-[#f4faff] border-[#135c75] ring-2 ring-[#7dd3fc]/60'
                          : 'bg-white border-[#135c75]/45'
                  }`}
                >
                  <img
                    src={MEDIA.sceneLibraryDesk}
                    alt="Кафедра выдачи читателю"
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[4/3] object-cover rounded-2xl shadow-sm"
                  />
                  <div className="space-y-1.5">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#135c75]">
                      Кафедра выдачи читателю
                    </div>
                    <h3 className="font-display font-extrabold text-base text-[#13294b]">
                      {foundTargetBook
                        ? '✓ Издание «Язык формы» выдано!'
                        : 'Выдай заказанную книгу'}
                    </h3>
                    <p className="text-xs text-[#13294b]/72 leading-relaxed">
                      {foundTargetBook
                        ? movedMisplacedIds.length >= totalMisplacedCount
                          ? 'Все задачи выполнены!'
                          : 'Теперь перенеси на нижний стеллаж книги, не относящиеся к отделу дизайна.'
                        : 'Перетащи сюда книгу Марины Мироновой о шрифтах и композиции плакатов, которую ты нашёл в каталоге на шаге 1.'}
                    </p>
                  </div>
                  {foundTargetBook && (
                    <div className="w-24 rounded-xl bg-white p-1.5 shadow-md border border-[#157a4f]/30 animate-stamp-pop">
                      <img
                        src={MEDIA.coverForm}
                        alt="Язык формы"
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ============ TASK 2: BIBLIOGRAPHIC RECORD VERIFICATION ============ */}
          {taskIdx === 2 && (
            <>
              <MissionBanner
                image={MEDIA.w1StepCatalog}
                imageAlt="Сверка библиографической записи в электронном каталоге"
                stepLabel="Проф-трек 01 · Инфоресурсы БИД · Шаг 3 из 4"
                title="Сверь библиографическую запись с самой книгой"
                goal="Перед публикацией в электронном каталоге библиотекарь проверяет описание издания по титульному листу. В записи справа допущены 2 фактические ошибки — найди их и кликни по неверным полям, чтобы исправить."
                steps={[
                  { text: 'Изучи выходные данные на титульной карточке книги слева', done: true },
                  { text: 'Найди первое расхождение в библиографической записи справа', done: fixedYear || fixedTopic },
                  { text: 'Найди и исправь второе расхождение', done: fixedYear && fixedTopic },
                ]}
                resultPreview="Библиографическая запись полностью соответствует изданию и готова к публикации в каталоге."
                accentColor="#135c75"
                proTip={{
                  term: 'Библиографическая запись',
                  text: 'Сведения о книге в электронном каталоге, которые помогают её найти. Библиографическое описание составляют по ГОСТ Р 7.0.100-2018.',
                }}
                onHint={handleHintClick}
              />

              {deskToast && (
                <div className="rounded-xl bg-white border border-[#135c75]/30 px-4 py-3 text-sm font-bold text-[#13294b] shadow-xs animate-card-in">
                  {deskToast}
                </div>
              )}

              <div className="rounded-3xl bg-[#eef3fa] p-5 sm:p-6 border border-[#13294b]/12 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* LEFT: REAL BOOK TITLE PAGE & IMPRINT */}
                <div className="bg-[#fdfbf7] rounded-2xl p-5 shadow-lg border border-[#13294b]/15 flex flex-col justify-between gap-4">
                  <div className="flex flex-col sm:flex-row gap-5 items-center">
                    <img
                      src={MEDIA.oceanExpedition}
                      alt="Издание Экспедиция на дно океана"
                      className="w-36 aspect-[3/4] object-cover rounded-xl shadow-lg shrink-0"
                    />
                    <div className="space-y-2.5 text-sm">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#135c75]">
                        Титульный лист · выходные данные книги
                      </div>
                      <div className="font-display font-extrabold text-lg text-[#13294b] leading-snug">
                        Экспедиция на дно океана
                      </div>
                      <div className="space-y-1.5 text-sm text-[#13294b] pt-1 border-t border-[#13294b]/10">
                        <div>
                          <strong>Автор:</strong> Елена Крылова
                        </div>
                        <div>
                          <strong>Год издания:</strong>{' '}
                          <span className="font-mono-tabular font-extrabold text-[#13294b]">
                            2022
                          </span>
                        </div>
                        <div>
                          <strong>Предметная рубрика:</strong>{' '}
                          <span className="font-bold text-[#13294b]">
                            Глубоководные экспедиции
                          </span>
                        </div>
                        <div>
                          <strong>Шифр ББК:</strong>{' '}
                          <span className="font-mono-tabular font-bold text-[#135c75]">
                            26.8 / К85
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live ISBD / ГОСТ Р 7.0.100 Bibliographic Description String */}
                  <div className="rounded-xl bg-white border border-[#13294b]/12 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#135c75]">
                      <span>Библиографическое описание по ГОСТ Р 7.0.100-2018</span>
                      <span className="font-mono-tabular">ISBD</span>
                    </div>
                    <p className="font-mono-tabular text-xs text-[#13294b] leading-relaxed">
                      Крылова, Е. Экспедиция на дно океана / Елена Крылова. — Москва,{' '}
                      <strong className={fixedYear ? 'text-[#157a4f]' : 'text-[#c41e2e] underline'}>
                        {fixedYear ? '2022' : '2019'}
                      </strong>
                      . — Рубрика:{' '}
                      <strong className={fixedTopic ? 'text-[#157a4f]' : 'text-[#c41e2e] underline'}>
                        {fixedTopic ? 'Глубоководные экспедиции' : 'Коралловые рифы и пляжи'}
                      </strong>
                      .
                    </p>
                  </div>
                </div>

                {/* RIGHT: AUTHENTIC BIBLIOGRAPHIC CATALOG RECORD */}
                <div className="bg-[#fdfbf5] rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-[#135c75]/30 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-[#c41e2e]/35 pb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#135c75]">
                        Библиографическая запись · нажми на поле с ошибкой
                      </span>
                      <span className="font-mono-tabular text-xs font-extrabold text-[#13294b]">
                        Исправлено: {(fixedYear ? 1 : 0) + (fixedTopic ? 1 : 0)} / 2
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStickyFieldClick('title')}
                      className="w-full p-3.5 rounded-xl bg-white hover:bg-[#f4f7fc] text-left border border-[#13294b]/12 transition-colors flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-[11px] font-bold text-[#135c75]">Заглавие (поле 200$a)</div>
                        <div className="font-display font-bold text-sm text-[#13294b]">
                          Экспедиция на дно океана
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#13294b]/45">Сверить</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStickyFieldClick('author')}
                      className="w-full p-3.5 rounded-xl bg-white hover:bg-[#f4f7fc] text-left border border-[#13294b]/12 transition-colors flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-[11px] font-bold text-[#135c75]">Автор (поле 700$a)</div>
                        <div className="font-display font-bold text-sm text-[#13294b]">
                          Елена Крылова
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#13294b]/45">Сверить</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStickyFieldClick('year')}
                      className={`w-full p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between gap-2 ${
                        fixedYear
                          ? 'bg-[#e9f7ef] border-[#157a4f]'
                          : 'bg-white hover:bg-[#fff0f0] border-[#135c75]/25 hover:border-[#c41e2e]'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-bold text-[#135c75]">Год издания (поле 210$d)</div>
                        <div className="font-mono-tabular font-extrabold text-sm flex items-center gap-2">
                          {fixedYear ? (
                            <>
                              <span className="line-through text-[#c41e2e]">2019</span>
                              <span className="text-[#157a4f]">→ 2022 ✓</span>
                            </>
                          ) : (
                            <span className="text-[#13294b]">2019</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#135c75]">
                        {fixedYear ? 'Исправлено' : 'Исправить'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStickyFieldClick('topic')}
                      className={`w-full p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between gap-2 ${
                        fixedTopic
                          ? 'bg-[#e9f7ef] border-[#157a4f]'
                          : 'bg-white hover:bg-[#fff0f0] border-[#135c75]/25 hover:border-[#c41e2e]'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-bold text-[#135c75]">Предметная рубрика (поле 606$a)</div>
                        <div className="font-display font-bold text-sm flex flex-wrap items-center gap-2">
                          {fixedTopic ? (
                            <>
                              <span className="line-through text-[#c41e2e]">Коралловые рифы и пляжи</span>
                              <span className="text-[#157a4f]">→ Глубоководные экспедиции ✓</span>
                            </>
                          ) : (
                            <span className="text-[#13294b]">Коралловые рифы и пляжи</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#135c75]">
                        {fixedTopic ? 'Исправлено' : 'Исправить'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ TASK 3: DRAG-AND-DROP OCEAN VIRTUAL EXHIBITION ============ */}
          {taskIdx === 3 && (
            <>
              <MissionBanner
                image={MEDIA.w1StepExhibition}
                imageAlt="Виртуальная выставка Тайны океанских глубин"
                stepLabel="Проф-трек 01 · Инфоресурсы БИД · Шаг 4 из 4"
                title="Отбери 6 изданий для виртуальной книжной выставки"
                goal="В фонде 10 книг об океане, но выставка посвящена строго большим глубинам (4 книги о пляжах, рифах и дайвинге не подходят по теме). Читай аннотации слева и перетащи 6 нужных книг в 3 раздела справа."
                steps={[
                  { text: 'Открывай обложки слева и читай аннотации', done: true },
                  { text: 'Перетащи по 2 книги в каждый из 3 разделов выставки', done: totalPlacedOcean === 6 },
                  { text: 'Нажми «Открыть готовую выставку!»', done: progress[3].completed },
                ]}
                resultPreview="Сформированы все 3 тематических раздела виртуальной выставки «Тайны океанских глубин»."
                accentColor="#135c75"
                proTip={{
                  term: 'Виртуальная выставка',
                  text: 'Тематическая онлайн-подборка изданий с обложками и краткими аннотациями, которая помогает читателям выбрать книги по интересам.',
                }}
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT: 10 REAL OCEAN COVERS + LIVE BRIEF STRIP */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Live Book Inspector */}
                  <div className="rounded-2xl bg-white border border-[#13294b]/12 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start">
                    <img
                      src={inspectedOcean.cover}
                      alt={inspectedOcean.title}
                      className="w-24 h-32 object-cover rounded-xl shadow-md shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="font-display font-extrabold text-base text-[#135c75]">
                        {inspectedOcean.title}
                      </div>
                      <p className="text-xs sm:text-sm text-[#13294b]/80 leading-relaxed">
                        {inspectedOcean.desc}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {OCEAN_DIVISIONS.map((div) => (
                          <button
                            key={div.id}
                            type="button"
                            disabled={sections[div.id].length >= 2 && !sections[div.id].includes(inspectedOcean.id)}
                            onClick={() => assignOceanBook(inspectedOcean.id, div.id)}
                            className="min-h-[34px] px-3 rounded-lg text-[11px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
                            style={{ backgroundColor: div.color }}
                          >
                            + В «{div.title.split(' ')[0]}...»
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Draggable Book Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {OCEAN_BOOKS.map((book) => {
                      const isUsed = assignedIds.has(book.id);
                      const isSelected = inspectedOceanId === book.id;
                      return (
                        <div
                          key={book.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedOceanId(book.id);
                            setInspectedOceanId(book.id);
                            e.dataTransfer.setData('text/plain', book.id);
                          }}
                          onDragEnd={() => {
                            setDraggedOceanId(null);
                            setOverOceanSection(null);
                          }}
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setInspectedOceanId(book.id);
                          }}
                          className={`group rounded-2xl p-2 text-left transition-all cursor-grab active:cursor-grabbing select-none border-2 shadow-2xs ${
                            isSelected
                              ? 'bg-[#e0f2fe] border-[#0284c7]'
                              : isUsed
                                ? 'bg-[#ecfdf3] border-[#86efac] opacity-80'
                                : 'bg-white border-[#13294b]/10 hover:border-[#0284c7]/40'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={book.cover}
                              alt={book.title}
                              draggable={false}
                              className="w-full aspect-[3/4] object-cover rounded-xl mb-1.5"
                            />
                            <span className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-[#13294b]/70 text-white flex items-center justify-center">
                              {isUsed ? <Check className="w-3.5 h-3.5 text-[#86efac]" /> : <GripVertical className="w-3.5 h-3.5" />}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-[#13294b] leading-tight line-clamp-2">
                            {book.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT: 3 DRAG-AND-DROP EXHIBITION GALLERY FRAMES */}
                <div className="lg:col-span-5 space-y-3">
                  {OCEAN_DIVISIONS.map((div) => {
                    const placedIds = sections[div.id];
                    const isOver = overOceanSection === div.id;
                    return (
                      <div
                        key={div.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setOverOceanSection(div.id);
                        }}
                        onDragLeave={() => setOverOceanSection(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setOverOceanSection(null);
                          const id = e.dataTransfer.getData('text/plain') || draggedOceanId;
                          if (id) assignOceanBook(id, div.id);
                          setDraggedOceanId(null);
                        }}
                        className={`rounded-2xl overflow-hidden border-2 transition-all bg-white shadow-xs ${
                          isOver
                            ? 'border-[#0284c7] scale-[1.015] shadow-md'
                            : draggedOceanId && placedIds.length < 2
                              ? 'border-[#0284c7]/50'
                              : 'border-[#13294b]/12'
                        }`}
                      >
                        <div
                          className="px-4 py-2.5 flex items-center justify-between gap-2"
                          style={{ backgroundColor: div.color }}
                        >
                          <div>
                            <div className="font-display font-bold text-xs sm:text-sm text-white">
                              {div.title}
                            </div>
                            <div className="text-[11px] text-white/85">{div.desc}</div>
                          </div>
                          <span className="font-mono-tabular text-xs font-extrabold bg-black/25 text-white px-2.5 py-1 rounded-lg">
                            {placedIds.length} / 2
                          </span>
                        </div>

                        <div className="p-3 grid grid-cols-2 gap-2.5">
                          {[0, 1].map((slotIdx) => {
                            const bId = placedIds[slotIdx];
                            const book = bId ? OCEAN_BOOKS.find((x) => x.id === bId) : null;
                            if (!book) {
                              return (
                                <div
                                  key={slotIdx}
                                  className={`min-h-[82px] rounded-xl border-2 border-dashed flex items-center justify-center text-center p-2 text-[11px] font-bold transition-colors ${
                                    isOver
                                      ? 'border-[#0284c7] bg-[#e0f2fe] text-[#0369a1]'
                                      : draggedOceanId
                                        ? 'border-[#0284c7]/45 bg-[#f0f9ff] text-[#135c75]'
                                        : 'border-[#13294b]/20 bg-[#f8fafc] text-[#13294b]/55'
                                  }`}
                                >
                                  Перетащи обложку сюда
                                </div>
                              );
                            }
                            return (
                              <div
                                key={book.id}
                                className="rounded-xl bg-[#f4f7fc] border border-[#13294b]/10 p-2 flex items-center gap-2 relative group"
                              >
                                <img
                                  src={book.cover}
                                  alt={book.title}
                                  className="w-11 h-15 object-cover rounded-lg shrink-0"
                                />
                                <div className="text-[11px] font-bold text-[#13294b] leading-tight line-clamp-3 pr-4">
                                  {book.title}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeOceanBook(book.id)}
                                  title="Убрать книгу"
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 hover:bg-[#c41e2e] text-white flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleCheckTask3}
                    className="w-full min-h-[50px] rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-display font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-xl transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Проверить и открыть выставку ({totalPlacedOcean}/6) →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
