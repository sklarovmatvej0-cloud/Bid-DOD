import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Columns,
  FileText,
  Grid,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Mail,
  Mic,
  Paperclip,
  Pause,
  Play,
  Printer,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { MEDIA } from '../game/assets';
import {
  EDITORIAL_EDITS,
  EDITORIAL_PITCHES,
  PROOF_DEFECTS,
  ProofDefect,
  WORKSHOPS,
} from '../game/knigogradData';
import { FeedbackState, KnigogradSave, TaskProgress } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';
import { MissionBanner } from './MissionBanner';
import { ProjectShowcase3D } from './ProjectShowcase3D';
import { WorkshopStepper } from './WorkshopStepper';

interface Workshop2ViewProps {
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

const LAYOUT_HEADLINES = [
  { id: 'dry', text: 'Отчёт о проведении выставки книжной графики № 4' },
  { id: 'clickbait', text: 'ШОК! Вы не поверите, что нашли в старых книгах!' },
  { id: 'strong', text: 'Искусство книги: от гравюры до цифрового зина' },
] as const;

const LAYOUT_PHOTOS = [
  { id: 'print', label: 'Офортный станок и гравюра', img: MEDIA.studioPrint },
  { id: 'music', label: 'Вечерняя сцена фестиваля', img: MEDIA.studioMusic },
  { id: 'arch', label: 'Фасады старого центра', img: MEDIA.studioArch },
] as const;

const LAYOUT_PRESETS = [
  {
    id: 'textover',
    label: 'Текст поверх фотографии',
    desc: 'Строки сливаются с пёстрым фоном снимка — низкая читаемость',
    icon: Layers,
  },
  {
    id: 'columns',
    label: 'Модульный разворот в 2 колонки',
    desc: 'Сбалансированный разворот: статьи в две колонки слева, фото и справка справа',
    icon: Columns,
  },
  {
    id: 'giant',
    label: 'Сплошной набор крупным кеглем',
    desc: 'Одна широкая колонка огромным шрифтом — нарушает пропорции полосы',
    icon: ImageIcon,
  },
] as const;

const LAYOUT_CAPTIONS = [
  { id: 'none', text: 'Без подписи и указания автора' },
  { id: 'wrong', text: 'Фото: из открытых источников сети' },
  { id: 'good', text: 'Печать книжной гравюры на офортном станке. Фото: Алексей Климов' },
] as const;

const LAYOUT_STEPS = [
  { idx: 0, label: '1. Заголовок', prompt: 'Выбери точный журнальный заголовок для главного материала о выставке книги:' },
  { idx: 1, label: '2. Иллюстрация', prompt: 'Подбери фотографию, раскрывающую тему создания книжной гравюры:' },
  { idx: 2, label: '3. Сетка полосы', prompt: 'Выбери композицию журнального разворота по стандартам удобочитаемости:' },
  { idx: 3, label: '4. Автор фото', prompt: 'Укажи полную подпись к иллюстрации с именем фотографа (Алексей Климов):' },
] as const;

const PROOF_PAGES: { idx: number; label: string; defId: ProofDefect['id']; question: string }[] = [
  {
    idx: 0,
    label: '1. Обложка',
    defId: 'age',
    question: 'Какой знак возрастной маркировки должен стоять на обложке по паспорту номера?',
  },
  {
    idx: 1,
    label: '2. Содержание',
    defId: 'page',
    question: 'На какой странице открывается главный материал «Искусство книги: от гравюры до цифрового зина»?',
  },
  {
    idx: 2,
    label: '3. Стр. 8–9',
    defId: 'author',
    question: 'Кого необходимо указать автором фотографии на развороте стр. 8–9?',
  },
  {
    idx: 3,
    label: '4. Стр. 14',
    defId: 'caption',
    question: 'Какая подпись соответствует фотографии литературного фестиваля на странице 14?',
  },
];

export const Workshop2View: React.FC<Workshop2ViewProps> = ({
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
  const wsMeta = WORKSHOPS[1];

  /* ---- Task 0: Editorial Inbox + Flatplan ---- */
  const [activePitchIdx, setActivePitchIdx] = useState(0);
  const [placedLeadId, setPlacedLeadId] = useState<string | null>(null);
  const [placedBriefId, setPlacedBriefId] = useState<string | null>(null);
  const [trashedIds, setTrashedIds] = useState<string[]>([]);
  const [deskFeedback, setDeskFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [draggedPitchId, setDraggedPitchId] = useState<string | null>(null);
  const [overFlatplanSlot, setOverFlatplanSlot] = useState<'lead' | 'brief' | 'trash' | null>(null);

  /* ---- Task 1: Dictaphone + Manuscript Redaction ---- */
  const [editStepIdx, setEditStepIdx] = useState(0);
  const [solvedEdits, setSolvedEdits] = useState<Record<string, string>>({});
  const [editFeedback, setEditFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [tapePlaying, setTapePlaying] = useState(false);

  const INTERVIEW_AUDIO_TEXT =
    'Для выставки мы отобрали двенадцать редких изданий из фонда библиотеки и дополнили их авторскими иллюстрациями студентов. Каждую гравюру печатали вручную на офортном станке в две краски — тёмно-синюю и киноварь. На подготовку всей экспозиции у команды ушло три недели, а открытие назначили на пятницу в восемнадцать ноль-ноль.';

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [taskIdx]);

  const handleToggleTape = () => {
    soundEngine.playSelectTick();
    if (tapePlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setTapePlaying(false);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(INTERVIEW_AUDIO_TEXT);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.98;
      utterance.onend = () => setTapePlaying(false);
      utterance.onerror = () => setTapePlaying(false);
      setTapePlaying(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setTapePlaying(true);
    }
  };

  /* ---- Task 2: InDesign-style Page Studio ---- */
  const [layoutStep, setLayoutStep] = useState<number>(0);
  const [layoutHeadline, setLayoutHeadline] = useState<'dry' | 'clickbait' | 'strong'>('dry');
  const [layoutPhoto, setLayoutPhoto] = useState<'print' | 'music' | 'arch'>('arch');
  const [layoutPreset, setLayoutPreset] = useState<'textover' | 'columns' | 'giant'>('textover');
  const [layoutCaption, setLayoutCaption] = useState<'none' | 'wrong' | 'good'>('none');
  const [showLayoutGrid, setShowLayoutGrid] = useState(true);

  /* ---- Task 3: Pre-Press Inspection Table ---- */
  const [proofPage, setProofPage] = useState<number>(0);
  const [inspectedPages, setInspectedPages] = useState<Record<string, boolean>>({});
  const [fixedDefects, setFixedDefects] = useState<Record<ProofDefect['id'], string>>({
    age: PROOF_DEFECTS.age.bad,
    page: PROOF_DEFECTS.page.bad,
    author: PROOF_DEFECTS.author.bad,
    caption: PROOF_DEFECTS.caption.bad,
  });

  /* ---- Showcase Page Flip ---- */
  const [readerPage, setReaderPage] = useState<number>(0);

  /* ---- Task 0 Handlers ---- */
  const isPitchSorted = (id: string) =>
    placedLeadId === id || placedBriefId === id || trashedIds.includes(id);

  const sortedCount = (placedLeadId ? 1 : 0) + (placedBriefId ? 1 : 0) + trashedIds.length;

  const advanceToNextUnsorted = (
    nextLead: string | null,
    nextBrief: string | null,
    nextTrash: string[]
  ) => {
    const nextIdx = EDITORIAL_PITCHES.findIndex(
      (p) => p.id !== nextLead && p.id !== nextBrief && !nextTrash.includes(p.id)
    );
    if (nextIdx !== -1) {
      setActivePitchIdx(nextIdx);
    }
  };

  const checkTask0AutoWin = (
    leadId: string | null,
    briefId: string | null,
    trashList: string[]
  ) => {
    if (leadId === 'print' && briefId === 'music' && trashList.length >= 2) {
      setTimeout(() => {
        onCompleteTask(0, {
          success: true,
          title: 'Макет выпуска журнала «Культура · № 01» сформирован!',
          body: 'На главный разворот (стр. 08–09) поставлена статья «Искусство книги: от гравюры до цифрового зина», на полосу репортажа (стр. 14) — «За кулисами литературного фестиваля», а материалы с нарушением авторских прав и скрытой рекламой отклонены.',
          lesson:
            'При формировании номера редактор оценивает соответствие теме и объёму рубрики, проверяет разрешение правообладателей на иллюстрации и отсекает скрытую рекламу.',
          nextActionLabel: 'Перейти к редактуре статьи (шаг 2)',
          onNext: 'next_task',
        });
      }, 360);
    }
  };

  const handleDecidePitch = (pitchId: string, decision: 'lead' | 'brief' | 'trash') => {
    const pitch = EDITORIAL_PITCHES.find((p) => p.id === pitchId);
    if (!pitch || isPitchSorted(pitchId)) return;

    if (decision === 'trash') {
      if (pitch.idealSlot !== null) {
        onRecordMistake(0);
        setDeskFeedback({
          ok: false,
          text: `Статья «${pitch.title}» проверена и с разрешением на фото — её нужно поставить в журнал, а не отклонять.`,
        });
        return;
      }
      soundEngine.playStampThud();
      const nextTrash = trashedIds.includes(pitchId) ? trashedIds : [...trashedIds, pitchId];
      setTrashedIds(nextTrash);
      setDeskFeedback({
        ok: true,
        text: `Верно! Заявка «${pitch.title}» отклонена: ${
          pitch.id === 'arch'
            ? 'чужие фото без согласия авторов публиковать нельзя.'
            : 'скрытую рекламу за бесплатный кофе в журнал не берём.'
        }`,
      });
      advanceToNextUnsorted(placedLeadId, placedBriefId, nextTrash);
      checkTask0AutoWin(placedLeadId, placedBriefId, nextTrash);
      return;
    }

    if (pitch.idealSlot === null) {
      onRecordMistake(0);
      setDeskFeedback({ ok: false, text: pitch.rejectHint });
      return;
    }

    if (pitch.idealSlot !== decision) {
      onRecordMistake(0);
      setDeskFeedback({
        ok: false,
        text: `Статья «${pitch.title}» подходит для журнала, но обрати внимание на её объём (${pitch.kind}): поставь её в другую рубрику.`,
      });
      return;
    }

    soundEngine.playPaperSlide();
    const nextLead = decision === 'lead' ? pitchId : placedLeadId;
    const nextBrief = decision === 'brief' ? pitchId : placedBriefId;
    if (decision === 'lead') setPlacedLeadId(pitchId);
    if (decision === 'brief') setPlacedBriefId(pitchId);
    setDeskFeedback({
      ok: true,
      text: `Отлично! «${pitch.title}» добавлена в номер (${decision === 'lead' ? 'стр. 8' : 'стр. 14'}).`,
    });
    advanceToNextUnsorted(nextLead, nextBrief, trashedIds);
    checkTask0AutoWin(nextLead, nextBrief, trashedIds);
  };

  /* ---- Task 1 Handlers ---- */
  const activeEditItem = EDITORIAL_EDITS[editStepIdx] ?? EDITORIAL_EDITS[0];
  const solvedEditCount = Object.keys(solvedEdits).length;

  const handleAnswerEdit = (opt: (typeof EDITORIAL_EDITS)[number]['options'][number]) => {
    if (!opt.isCorrect) {
      onRecordMistake(1);
      setEditFeedback({ ok: false, text: activeEditItem.why });
      return;
    }

    soundEngine.playSuccessChime();
    const nextSolved = { ...solvedEdits, [activeEditItem.id]: opt.id };
    setSolvedEdits(nextSolved);
    setEditFeedback({ ok: true, text: `Верно! ${activeEditItem.why}` });

    const nextUnsolvedIdx = EDITORIAL_EDITS.findIndex((item) => !nextSolved[item.id]);
    if (nextUnsolvedIdx !== -1) {
      setTimeout(() => {
        setEditStepIdx(nextUnsolvedIdx);
        setEditFeedback(null);
      }, 750);
    } else {
      setTimeout(() => {
        onCompleteTask(1, {
          success: true,
          title: 'Рукопись статьи вычитана и сверена со стенограммой!',
          body: 'Ты восстановил точные факты по интервью куратора Анны Морозовой (12 редких изданий из фонда библиотеки, ручная печать гравюр на офортном станке в две краски), убрал речевые плеоназмы («три недели времени», «первый дебютный», «18:00 часов вечера») и сохранил удачный авторский абзац.',
          lesson:
            'Литературный редактор сверяет фактические данные с первоисточником, устраняет речевую избыточность и бережно относится к точным авторским формулировкам.',
          nextActionLabel: 'Перейти к вёрстке разворота (шаг 3)',
          onNext: 'next_task',
        });
      }, 750);
    }
  };

  /* ---- Task 2 Check ---- */
  const handleCheckTask2 = () => {
    if (layoutHeadline !== 'strong') {
      onRecordMistake(2);
      setLayoutStep(0);
      onShowError(
        'Проверь шаг 1 · Заголовок',
        'Подбери живой и понятный заголовок по теме статьи — без сухого «отчёта» и кликбейта.'
      );
      return;
    }
    if (layoutPhoto !== 'print') {
      onRecordMistake(2);
      setLayoutStep(1);
      onShowError(
        'Проверь шаг 2 · Фотография',
        'Выбери иллюстрацию, которая соответствует теме статьи о печати плаката.'
      );
      return;
    }
    if (layoutPreset !== 'columns') {
      onRecordMistake(2);
      setLayoutStep(2);
      onShowError(
        'Проверь шаг 3 · Раскладка',
        'Выбери самую удобную для чтения раскладку — две чистые колонки.'
      );
      return;
    }
    if (layoutCaption !== 'good') {
      onRecordMistake(2);
      setLayoutStep(3);
      onShowError(
        'Проверь шаг 4 · Подпись под фото',
        'Укажи под иллюстрацией корректную подпись с именем фотографа Алексея Климова.'
      );
      return;
    }

    onCompleteTask(
      2,
      {
        success: true,
        title: 'Страница журнала оформлена!',
        body: 'Понятный заголовок, подходящая иллюстрация, удобная раскладка в две колонки и точная подпись с именем фотографа.',
        lesson:
          'Хорошая вёрстка помогает читателю: текст легко читается, картинка дополняет смысл, а автор снимка всегда указан.',
        nextActionLabel: 'Проверить страницы перед печатью (шаг 4)',
        onNext: 'next_task',
      },
      { magazineHeadline: LAYOUT_HEADLINES[2].text }
    );
  };

  /* ---- Task 3 Check ---- */
  const fixedCount = PROOF_PAGES.filter(
    (p) => fixedDefects[p.defId] === PROOF_DEFECTS[p.defId].good
  ).length;

  const handleCheckTask3 = () => {
    const remaining = PROOF_PAGES.filter(
      (p) => fixedDefects[p.defId] !== PROOF_DEFECTS[p.defId].good
    );
    if (remaining.length === 0) {
      onCompleteTask(3, {
        success: true,
        title: 'Журнал «Культура · № 01» подписан в печать!',
        body: 'Ты нашёл и исправил все 4 неточности по памятке номера: знак 12+, страницу 8, имя фотографа Алексея Климова и подпись под снимком фестиваля.',
        lesson:
          'Выпускающий редактор проверяет макет перед типографией — после печати исправить ошибку в тираже уже нельзя.',
        nextActionLabel: 'Полистать готовый журнал',
        onNext: 'showcase',
      });
    } else {
      onRecordMistake(3);
      const first = remaining[0];
      setProofPage(first.idx);
      onShowError(
        `На странице «${first.label}» осталась ошибка`,
        PROOF_DEFECTS[first.defId].why
      );
    }
  };

  const handleHintClick = () => {
    const hints = [
      {
        title: 'Подсказка · Шаг 1',
        body: '«Искусство книги: от гравюры до цифрового зина» — на главный разворот (стр. 08–09). «За кулисами литературного фестиваля» — в рубрику репортажа (стр. 14). «Необычные фасады» (чужие фото без разрешения) и «Кофейня Зерно» (скрытая реклама) — отклонить.',
      },
      {
        title: 'Подсказка · Шаг 2',
        body: 'Сверь со стенограммой интервью куратора Анны Морозовой: 1) 12 редких изданий из фонда библиотеки и студенческие иллюстрации; 2) ручная печать гравюр на офортном станке в две краски (тёмно-синюю и киноварь); 3) третий фрагмент написан грамотно — оставь без правки; 4) убери лишние слова «времени», «первый дебютный» и «часов вечера».',
      },
      {
        title: 'Подсказка · Шаг 3',
        body: '1. Заголовок «Искусство книги: от гравюры до цифрового зина», 2. Иллюстрация «Офортный станок и гравюра», 3. Сетка «Модульный разворот в 2 колонки», 4. Подпись с именем фотографа Алексея Климова.',
      },
      {
        title: 'Подсказка · Шаг 4',
        body: 'Сверь каждую полосу с паспортом номера: Обложка → 12+, Содержание → Стр. 8, Разворот стр. 8–9 → Фото: Алексей Климов, Стр. 14 → «Вечерняя сцена и гости литературного фестиваля».',
      },
    ];
    onUseHint(taskIdx, hints[taskIdx].title, hints[taskIdx].body);
  };

  /* ================= SHOWCASE: FINISHED 4-PAGE MAGAZINE ================= */
  if (isShowcase) {
    const pages = [
      {
        label: 'Обложка',
        content: (
          <div className="relative rounded-2xl overflow-hidden bg-[#13294b] text-white min-h-[380px] flex flex-col justify-between p-6 sm:p-8 shadow-xl">
            <img
              src={MEDIA.studioPrint}
              alt="Обложка журнала Культура"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="relative flex items-center justify-between">
              <span className="font-mono-tabular text-xs font-extrabold tracking-widest bg-[#c41e2e] px-3 py-1 rounded">
                № 01 · КУЛЬТУРА И МЕДИА
              </span>
              <span className="font-mono-tabular text-xs font-extrabold bg-white text-[#13294b] px-2.5 py-1 rounded">
                12+
              </span>
            </div>
            <div className="relative space-y-2 max-w-lg">
              <div className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">
                КУЛЬТУРА
              </div>
              <p className="text-base sm:text-lg font-bold text-[#7dd3fc]">
                {save.magazineHeadline}
              </p>
              <div className="text-xs text-white/85">
                Также в номере: За кулисами литературного фестиваля (стр. 14)
              </div>
            </div>
          </div>
        ),
      },
      {
        label: 'Содержание',
        content: (
          <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#13294b]/12 min-h-[380px] space-y-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
              Журнал «Культура» · Содержание номера
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#13294b]">В этом выпуске</h2>
            <div className="divide-y divide-[#13294b]/10 text-sm">
              <div className="py-3 flex justify-between gap-4">
                <div>
                  <div className="font-bold text-[#13294b]">{save.magazineHeadline}</div>
                  <div className="text-xs text-[#13294b]/65">Мария Соколова · Фото: Алексей Климов</div>
                </div>
                <span className="font-mono-tabular font-extrabold text-[#c41e2e]">Стр. 8</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <div>
                  <div className="font-bold text-[#13294b]">За кулисами литературного фестиваля</div>
                  <div className="text-xs text-[#13294b]/65">Илья Родин · Фото: Анна Лебедева</div>
                </div>
                <span className="font-mono-tabular font-extrabold text-[#c41e2e]">Стр. 14</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        label: 'Стр. 8–9 · Главный разворот',
        content: (
          <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#13294b]/12 min-h-[380px] grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                Тема номера · Разворот стр. 08–09
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b] leading-snug">
                {save.magazineHeadline}
              </h2>
              <p className="text-sm text-[#13294b]/80 leading-relaxed">
                В экспозицию вошли двенадцать редких изданий из фонда библиотеки и серия
                студенческих иллюстраций. Каждую гравюру печатали вручную на офортном станке в две
                краски — тёмно-синюю и киноварь.
              </p>
              <p className="text-sm text-[#13294b]/80 leading-relaxed">
                Сочетание классической книжной гравюры и современной типографики помогает читателю
                увидеть, как меняется визуальный язык книги. На подготовку экспозиции ушло три
                недели, а открытие выставки пройдёт в пятницу в 18:00.
              </p>
            </div>
            <figure className="space-y-2">
              <img
                src={MEDIA.studioPrint}
                alt="Офортный станок и печать книжной гравюры"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
              />
              <figcaption className="text-xs text-[#13294b]/70 font-semibold">
                Печать книжной гравюры на офортном станке. Фото: Алексей Климов
              </figcaption>
            </figure>
          </div>
        ),
      },
      {
        label: 'Стр. 14 · Репортаж',
        content: (
          <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#13294b]/12 min-h-[380px] grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <figure className="space-y-2">
              <img
                src={MEDIA.studioMusic}
                alt="Вечерняя сцена и гости литературного фестиваля"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
              />
              <figcaption className="text-xs text-[#13294b]/70 font-semibold">
                Вечерняя сцена и гости литературного фестиваля. Фото: Анна Лебедева
              </figcaption>
            </figure>
            <div className="space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#135c75]">
                Фоторепортаж · Стр. 14
              </div>
              <h2 className="font-display font-extrabold text-xl text-[#13294b]">
                За кулисами литературного фестиваля
              </h2>
              <p className="text-sm text-[#13294b]/80 leading-relaxed">
                За три часа до старта команда подготовила сцену, настроила свет во внутреннем дворе
                и встретила первых гостей вечерних чтений.
              </p>
            </div>
          </div>
        ),
      },
    ];

    return (
      <div className="h-full overflow-y-auto desk-scroll px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-5 animate-card-in">
          <div className="rounded-3xl bg-[#c41e2e] text-white p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-white/85">
                Готовый результат · Проф-трек 02
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
                Выпуск журнала «Культура · № 01»
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectTask(0)}
                className="min-h-[42px] px-4 rounded-xl bg-white/15 hover:bg-white/25 text-xs sm:text-sm font-bold whitespace-nowrap"
              >
                К заданиям
              </button>
              <button
                type="button"
                onClick={onNextWorkshop}
                className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#0f223d] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 whitespace-nowrap shadow-sm"
              >
                Дальше: Креативный менеджер
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ProjectShowcase3D
            workshop={2}
            save={save}
            magazinePage={readerPage}
            onFlipMagazinePage={() => setReaderPage((p) => (p + 1) % pages.length)}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {pages.map((p, idx) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    soundEngine.playPaperSlide();
                    setReaderPage(idx);
                  }}
                  className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    readerPage === idx
                      ? 'bg-[#13294b] text-white'
                      : 'bg-white border border-[#13294b]/12 text-[#13294b]'
                  }`}
                >
                  {idx + 1}. {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={readerPage === 0}
                onClick={() => setReaderPage((p) => Math.max(0, p - 1))}
                className="min-h-[38px] px-3 rounded-xl bg-white border border-[#13294b]/15 disabled:opacity-40 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Назад
              </button>
              <button
                type="button"
                disabled={readerPage === pages.length - 1}
                onClick={() => setReaderPage((p) => Math.min(pages.length - 1, p + 1))}
                className="min-h-[38px] px-3 rounded-xl bg-[#13294b] text-white disabled:opacity-40 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap"
              >
                Вперёд <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {pages[readerPage].content}
        </div>
      </div>
    );
  }

  /* ================= ACTIVE TASKS ================= */
  const allDone = progress.every((p) => p.completed);
  const activePitch = EDITORIAL_PITCHES[activePitchIdx] ?? EDITORIAL_PITCHES[0];
  const leadPitch = placedLeadId ? EDITORIAL_PITCHES.find((p) => p.id === placedLeadId) : null;
  const briefPitch = placedBriefId ? EDITORIAL_PITCHES.find((p) => p.id === placedBriefId) : null;
  const currentProofTab = PROOF_PAGES[proofPage] ?? PROOF_PAGES[0];
  const currentProofDefect = PROOF_DEFECTS[currentProofTab.defId];

  const getDraftLine = (item: (typeof EDITORIAL_EDITS)[number]) => {
    const chosenId = solvedEdits[item.id];
    if (!chosenId) return null;
    return item.options.find((o) => o.id === chosenId)?.text ?? null;
  };

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
                    ? 'bg-[#c41e2e] text-white shadow-xs'
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
              Готовый журнал
            </button>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 min-h-0 overflow-y-auto desk-scroll px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-4 animate-card-in" key={`w2-t${taskIdx}`}>
          <WorkshopStepper
            trackTitle={WORKSHOPS[1].title}
            taskTitles={WORKSHOPS[1].tasks.map((t) => t.title)}
            activeIdx={taskIdx}
            progress={progress}
            accentColor="#c41e2e"
            onSelectTask={onSelectTask}
          />

          {/* ============ TASK 0: EDITORIAL INBOX + REALISTIC VISUAL MAGAZINE ISSUE MOCKUP ============ */}
          {taskIdx === 0 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepPlan}
                imageAlt="Отбор статей в макет номера журнала"
                stepLabel="Проф-трек 02 · Редактор-издатель · Шаг 1 из 4"
                title="Макет номера: сформируй развороты журнала «Культура · № 01»"
                goal="Редакция выпускает первый номер молодёжного журнала «Культура». Справа перед тобой — живой пополосный макет журнала (обложка, содержание, главный разворот стр. 08–09 и полоса репортажа стр. 14). Изучи 4 письма авторов во «Входящих», поставь 2 проверенных материала на свои страницы в журнал и отклони 2 заявки с нарушением авторских прав и скрытой рекламой."
                steps={[
                  { text: 'Прочитай сопроводительные письма авторов и проверь права на фото', done: sortedCount > 0 },
                  { text: 'Заполни в макете журнала разворот стр. 08–09 и репортаж на стр. 14', done: Boolean(placedLeadId && placedBriefId) },
                  { text: 'Отклони 2 заявки с чужими снимками без прав и скрытой рекламой', done: trashedIds.length >= 2 },
                ]}
                resultPreview="Пополосный макет журнала заполнен: обложка, содержание и развороты автоматически собраны."
                accentColor="#c41e2e"
                proTip={{
                  term: 'Пополосный макет',
                  text: 'Схема всего номера журнала по страницам (полосам), где заранее расписано, какая статья и фото стоят на каждой странице.',
                }}
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 6 COLS: EDITORIAL MAILBOX INBOX */}
                <div className="lg:col-span-6 bg-white rounded-3xl border border-[#13294b]/12 shadow-md overflow-hidden">
                  {/* Email Client Toolbar */}
                  <div className="bg-[#13294b] text-white px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold">
                      <Mail className="w-4 h-4 text-[#7dd3fc]" />
                      <span>Редакционная почта · Портфель номера № 01</span>
                    </div>
                    <span className="font-mono-tabular text-xs font-bold text-[#7dd3fc]">
                      Разобрано {sortedCount} из 4
                    </span>
                  </div>

                  {/* Inbox Message Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#13294b]/10 bg-[#f6f8fc]">
                    {EDITORIAL_PITCHES.map((p, idx) => {
                      const sorted = isPitchSorted(p.id);
                      const isCurrent = activePitchIdx === idx;
                      const isRejected = trashedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          draggable={!sorted}
                          onDragStart={(e) => {
                            setDraggedPitchId(p.id);
                            setActivePitchIdx(idx);
                            e.dataTransfer.setData('text/plain', p.id);
                          }}
                          onDragEnd={() => {
                            setDraggedPitchId(null);
                            setOverFlatplanSlot(null);
                          }}
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setActivePitchIdx(idx);
                            setDeskFeedback(null);
                          }}
                          className={`px-3 py-2.5 text-left border-r border-[#13294b]/8 last:border-r-0 transition-all relative ${
                            isCurrent
                              ? 'bg-white shadow-xs'
                              : sorted
                                ? 'bg-[#f1f6f3] opacity-80'
                                : 'hover:bg-white/70'
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute top-0 inset-x-0 h-[3px] bg-[#c41e2e]" />
                          )}
                          <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#13294b]/55">
                            <span>Письмо {idx + 1}</span>
                            {sorted ? (
                              isRejected ? (
                                <XCircle className="w-3.5 h-3.5 text-[#c41e2e]" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#157a4f]" />
                              )
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-[#c41e2e]" />
                            )}
                          </div>
                          <div className="text-xs font-extrabold text-[#13294b] truncate mt-0.5">
                            {p.by}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Opened Email Letter Body */}
                  <div className="p-5 space-y-4">
                    <div
                      draggable={!isPitchSorted(activePitch.id)}
                      onDragStart={(e) => {
                        setDraggedPitchId(activePitch.id);
                        e.dataTransfer.setData('text/plain', activePitch.id);
                      }}
                      onDragEnd={() => {
                        setDraggedPitchId(null);
                        setOverFlatplanSlot(null);
                      }}
                      className={`rounded-2xl border border-[#13294b]/12 bg-[#fcfdff] p-4 space-y-3.5 ${
                        !isPitchSorted(activePitch.id) ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-full sm:w-40 aspect-[4/3] rounded-xl overflow-hidden bg-[#eef2f8] border border-[#13294b]/10 shrink-0 relative">
                          <img
                            src={activePitch.img}
                            alt={activePitch.title}
                            draggable={false}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold inline-flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> Исходник фото
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#fde8ea] text-[#c41e2e] text-[11px] font-extrabold">
                              {activePitch.kind}
                            </span>
                            {!isPitchSorted(activePitch.id) && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#135c75] font-bold">
                                <GripVertical className="w-3.5 h-3.5" /> Перетащи на полосу →
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-extrabold text-base sm:text-lg text-[#13294b] leading-snug">
                            {activePitch.title}
                          </h3>
                          <div className="text-xs font-bold text-[#13294b]/70">
                            Автор: <span className="text-[#13294b]">{activePitch.by}</span>
                          </div>
                          <p className="text-xs text-[#13294b]/75 leading-relaxed">
                            {activePitch.summary}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#f0f7ff] border border-[#0284c7]/25 p-3.5 space-y-1">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0284c7]">
                          Сопроводительное письмо автора:
                        </div>
                        <p className="text-xs sm:text-sm text-[#13294b] leading-relaxed font-medium">
                          {activePitch.emailText}
                        </p>
                      </div>
                    </div>

                    {deskFeedback && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold ${
                          deskFeedback.ok
                            ? 'bg-[#e9f7ef] text-[#157a4f] animate-card-in'
                            : 'bg-[#fde8ea] text-[#c41e2e] animate-stage-shake'
                        }`}
                      >
                        {deskFeedback.text}
                      </div>
                    )}

                    {isPitchSorted(activePitch.id) ? (
                      <div className="rounded-2xl bg-[#e9f7ef] px-4 py-3 text-sm font-extrabold text-[#157a4f] flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>
                          {placedLeadId === activePitch.id
                            ? 'Размещена на главном развороте журнала (стр. 08–09).'
                            : placedBriefId === activePitch.id
                              ? 'Размещена на полосе спецрепортажа (стр. 14).'
                              : 'Заявка отклонена по стандартам редакции.'}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={Boolean(placedLeadId)}
                          onClick={() => handleDecidePitch(activePitch.id, 'lead')}
                          className="min-h-[44px] px-3 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] disabled:opacity-40 text-white text-xs font-extrabold transition-colors"
                        >
                          {placedLeadId ? 'Стр. 08–09 заняты' : 'В разворот (стр. 08–09)'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(placedBriefId)}
                          onClick={() => handleDecidePitch(activePitch.id, 'brief')}
                          className="min-h-[44px] px-3 rounded-xl bg-[#135c75] hover:bg-[#187595] disabled:opacity-40 text-white text-xs font-extrabold transition-colors"
                        >
                          {placedBriefId ? 'Стр. 14 занята' : 'В репортаж (стр. 14)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecidePitch(activePitch.id, 'trash')}
                          className="min-h-[44px] px-3 rounded-xl bg-[#fde8ea] hover:bg-[#c41e2e] text-[#c41e2e] hover:text-white text-xs font-extrabold transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT 6 COLS: REALISTIC VISUAL MULTI-PAGE MAGAZINE ISSUE MOCKUP */}
                <aside className="lg:col-span-6 bg-[#182438] text-white rounded-3xl p-4 sm:p-5 border border-[#2c3d5b] shadow-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#7dd3fc]">
                        Интерактивный макет номера · Пополосный план
                      </div>
                      <div className="font-display font-extrabold text-sm sm:text-base text-white">
                        Журнал «КУЛЬТУРА · № 01» (живой предпросмотр полос)
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 font-mono-tabular text-[11px] font-bold text-[#7dd3fc]">
                      Собрано полос: {(leadPitch ? 2 : 0) + (briefPitch ? 1 : 0) + 1} / 4
                    </span>
                  </div>

                  {/* TOP MINI-SPREAD: COVER (PAGE 01) + TABLE OF CONTENTS (PAGE 02) */}
                  <div className="grid grid-cols-2 gap-2.5 bg-[#0f1826] p-2.5 rounded-2xl border border-white/10">
                    {/* Miniature Cover Page 01 */}
                    <div className="relative rounded-xl overflow-hidden bg-[#13294b] aspect-[4/3] p-3 flex flex-col justify-between border border-white/15">
                      <img
                        src={leadPitch ? leadPitch.img : MEDIA.studioPrint}
                        alt="Обложка номера"
                        referrerPolicy="no-referrer"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                          leadPitch ? 'opacity-45' : 'opacity-20 grayscale'
                        }`}
                      />
                      <div className="relative flex items-center justify-between text-[9px] font-mono-tabular font-extrabold">
                        <span className="px-1.5 py-0.5 rounded bg-[#c41e2e] text-white">
                          ОБЛОЖКА · № 01
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white text-[#13294b]">12+</span>
                      </div>
                      <div className="relative space-y-0.5">
                        <div className="font-display font-extrabold text-base tracking-tight leading-none">
                          КУЛЬТУРА
                        </div>
                        <div className="text-[10px] font-bold text-[#7dd3fc] line-clamp-1">
                          {leadPitch
                            ? `Тема номера: ${leadPitch.title}`
                            : 'Поставь статью на стр. 08–09 → анонс появится на обложке'}
                        </div>
                      </div>
                    </div>

                    {/* Miniature Table of Contents Page 02 */}
                    <div className="rounded-xl bg-[#fbfaf6] text-[#13294b] p-3 flex flex-col justify-between border border-[#d6d1c4]">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#13294b]/15 pb-1">
                          <span className="font-display font-extrabold text-[11px] uppercase tracking-wider text-[#c41e2e]">
                            Содержание
                          </span>
                          <span className="font-mono-tabular text-[9px] font-bold text-[#13294b]/60">
                            СТР. 02
                          </span>
                        </div>
                        <div className="mt-2 space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`truncate font-bold ${
                                leadPitch ? 'text-[#13294b]' : 'text-[#13294b]/40 italic'
                              }`}
                            >
                              {leadPitch ? leadPitch.title : 'Главная тема номера...'}
                            </span>
                            <span className="font-mono-tabular font-extrabold text-[#c41e2e] shrink-0">
                              08
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`truncate font-bold ${
                                briefPitch ? 'text-[#13294b]' : 'text-[#13294b]/40 italic'
                              }`}
                            >
                              {briefPitch ? briefPitch.title : 'Спецрепортаж...'}
                            </span>
                            <span className="font-mono-tabular font-extrabold text-[#135c75] shrink-0">
                              14
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-[#13294b]/10 text-[9px] font-mono-tabular text-[#13294b]/55 flex justify-between">
                        <span>Редакция БИД</span>
                        <span>Тираж 1 000 экз.</span>
                      </div>
                    </div>
                  </div>

                  {/* SPREAD SLOT 1: PAGES 08-09 LEAD FEATURE (REALISTIC 2-PAGE MAGAZINE SPREAD) */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverFlatplanSlot('lead');
                    }}
                    onDragLeave={() => setOverFlatplanSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOverFlatplanSlot(null);
                      const id = e.dataTransfer.getData('text/plain') || draggedPitchId;
                      if (id) handleDecidePitch(id, 'lead');
                    }}
                    className={`rounded-2xl p-3 border-2 transition-all ${
                      leadPitch
                        ? 'bg-[#fbfaf6] text-[#13294b] border-[#157a4f] shadow-lg'
                        : overFlatplanSlot === 'lead'
                          ? 'bg-[#e0f2fe] text-[#13294b] border-[#0284c7] scale-[1.01]'
                          : 'bg-[#fbfaf6]/95 text-[#13294b] border-dashed border-[#7dd3fc]/55'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold border-b border-[#13294b]/15 pb-1.5 mb-2.5">
                      <span className="text-[#c41e2e] uppercase tracking-wider">
                        РАЗВОРОТ СТР. 08–09 · Главная тема номера (6 500 зн.)
                      </span>
                      {leadPitch ? (
                        <span className="text-[#157a4f] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Разворот свёрстан
                        </span>
                      ) : (
                        <span className="font-mono-tabular text-[10px] text-[#135c75]">
                          Ждёт большой материал
                        </span>
                      )}
                    </div>

                    {leadPitch ? (
                      <div className="grid grid-cols-12 gap-3 items-center animate-stamp-pop">
                        {/* Left Page 08 of Spread */}
                        <div className="col-span-6 pr-2 border-r border-[#13294b]/15 space-y-1.5">
                          <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#c41e2e]">
                            Книжная культура · Интервью
                          </div>
                          <div className="font-display font-extrabold text-xs sm:text-sm text-[#13294b] leading-tight">
                            {leadPitch.title}
                          </div>
                          <div className="text-[10px] font-bold text-[#135c75]">
                            Текст: {leadPitch.by}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] text-[#13294b]/75 leading-tight">
                            <p className="line-clamp-3">
                              <strong className="text-[#c41e2e] font-display text-xs mr-0.5">В</strong>
                              экспозицию вошли редкие издания из фонда библиотеки и авторские гравюры...
                            </p>
                            <p className="line-clamp-3">
                              Оттиски выполнялись вручную на офортном станке в две краски — синюю и киноварь.
                            </p>
                          </div>
                        </div>
                        {/* Right Page 09 of Spread */}
                        <div className="col-span-6 space-y-1">
                          <img
                            src={leadPitch.img}
                            alt={leadPitch.title}
                            className="w-full h-24 rounded-lg object-cover shadow-xs"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono-tabular text-[#13294b]/65">
                            <span>Фото: Алексей Климов (права ✓)</span>
                            <span>СТР. 09</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-3 items-center py-2 opacity-75">
                        <div className="col-span-6 pr-2 border-r border-dashed border-[#13294b]/20 space-y-1.5">
                          <div className="h-2.5 w-24 rounded bg-[#13294b]/15" />
                          <div className="h-3.5 w-full rounded bg-[#13294b]/20" />
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <div className="h-10 rounded bg-[#13294b]/10" />
                            <div className="h-10 rounded bg-[#13294b]/10" />
                          </div>
                        </div>
                        <div className="col-span-6 flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-[#13294b]/25 bg-[#f0f4fa] p-2 text-center">
                          <span className="text-[11px] font-extrabold text-[#13294b]/70">
                            Перетащи сюда главную статью или нажми «В разворот (стр. 08–09)»
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PAGE SLOT 2: PAGE 14 SPECIAL REPORTAGE */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverFlatplanSlot('brief');
                    }}
                    onDragLeave={() => setOverFlatplanSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOverFlatplanSlot(null);
                      const id = e.dataTransfer.getData('text/plain') || draggedPitchId;
                      if (id) handleDecidePitch(id, 'brief');
                    }}
                    className={`rounded-2xl p-3 border-2 transition-all ${
                      briefPitch
                        ? 'bg-[#fbfaf6] text-[#13294b] border-[#157a4f] shadow-lg'
                        : overFlatplanSlot === 'brief'
                          ? 'bg-[#e0f2fe] text-[#13294b] border-[#0284c7] scale-[1.01]'
                          : 'bg-[#fbfaf6]/95 text-[#13294b] border-dashed border-[#7dd3fc]/55'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold border-b border-[#13294b]/15 pb-1.5 mb-2">
                      <span className="text-[#135c75] uppercase tracking-wider">
                        ПОЛОСА СТР. 14 · Рубрика «Спецрепортаж» (2 400 зн.)
                      </span>
                      {briefPitch ? (
                        <span className="text-[#157a4f] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Полоса собрана
                        </span>
                      ) : (
                        <span className="font-mono-tabular text-[10px] text-[#135c75]">
                          Ждёт репортаж на 1 полосу
                        </span>
                      )}
                    </div>

                    {briefPitch ? (
                      <div className="flex items-center gap-3 animate-stamp-pop">
                        <img
                          src={briefPitch.img}
                          alt={briefPitch.title}
                          className="w-24 h-16 rounded-lg object-cover shrink-0 shadow-xs"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#135c75]">
                            События города · Фото: Анна Лебедева (права ✓)
                          </div>
                          <div className="font-display font-extrabold text-xs sm:text-sm text-[#13294b] truncate">
                            {briefPitch.title}
                          </div>
                          <div className="text-[11px] text-[#13294b]/70">
                            Репортаж: {briefPitch.by} · 1 полоса
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 rounded-xl border border-dashed border-[#13294b]/25 bg-[#f0f4fa] text-center text-[11px] text-[#13294b]/70 font-extrabold">
                        Перетащи сюда короткий репортаж или нажми «В репортаж (стр. 14)»
                      </div>
                    )}
                  </div>

                  {/* REJECTED FOLDER */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverFlatplanSlot('trash');
                    }}
                    onDragLeave={() => setOverFlatplanSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOverFlatplanSlot(null);
                      const id = e.dataTransfer.getData('text/plain') || draggedPitchId;
                      if (id) handleDecidePitch(id, 'trash');
                    }}
                    className={`rounded-2xl p-3 border-2 transition-all ${
                      overFlatplanSlot === 'trash'
                        ? 'bg-[#fde8ea] text-[#c41e2e] border-[#c41e2e] scale-[1.01]'
                        : 'bg-white/10 border-dashed border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-[#fda4af] mb-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        Отклонено редакцией ({trashedIds.length} / 2)
                      </span>
                      <span className="text-[10px] text-white/65">Брак по правам и джинса</span>
                    </div>
                    {trashedIds.length === 0 ? (
                      <div className="py-1.5 text-center text-[11px] text-white/60 font-semibold">
                        Перетащи сюда материалы с чужими фото без прав или скрытой рекламой
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {trashedIds.map((id) => {
                          const item = EDITORIAL_PITCHES.find((p) => p.id === id);
                          if (!item) return null;
                          return (
                            <div
                              key={id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#c41e2e]/30 border border-[#fda4af]/40 text-white text-[11px] font-bold flex items-center justify-between animate-stamp-pop"
                            >
                              <span className="truncate">{item.title}</span>
                              <span className="font-mono-tabular text-[9px] text-[#fda4af] shrink-0 ml-1.5">
                                {item.id === 'arch' ? 'НЕТ ПРАВ' : 'РЕКЛАМА'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}

          {/* ============ TASK 1: CURATOR INTERVIEW TRANSCRIPT + MANUSCRIPT FACT-CHECKING ============ */}
          {taskIdx === 1 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepEdit}
                imageAlt="Литературное редактирование и сверка фактов по интервью"
                stepLabel="Проф-трек 02 · Редактор-издатель · Шаг 2 из 4"
                title="Редактура и фактчекинг: сверь текст статьи со стенограммой интервью"
                goal="Главный материал номера «Искусство книги: от гравюры до цифрового зина» поступил на редакторский стол. Корреспондент торопился сдать черновик и допустил фактические искажения и речевые повторы. Сверь все 4 абзаца рукописи с расшифровкой интервью куратора выставки Анны Морозовой. Обрати внимание: один из абзацев уже написан точно и грамотно — его менять не нужно."
                steps={[
                  { text: 'Прочитай стенограмму интервью куратора выставки Анны Морозовой', done: true },
                  { text: `Проверь и отредактируй все 4 абзаца статьи (${solvedEditCount} из 4)`, done: solvedEditCount === 4 },
                  { text: 'Утверди чистовой вариант текста для передачи на вёрстку', done: progress[1].completed },
                ]}
                resultPreview="Факты сверены с первоисточником, речевые повторы устранены, авторский стиль сохранён."
                accentColor="#c41e2e"
                proTip={{
                  term: 'Фактчекинг',
                  text: 'Проверка дат, имён, цифр и цитат по первоисточнику (например, стенограмме интервью), чтобы в печать не попала ошибка.',
                }}
                onHint={handleHintClick}
              />

              {/* Visual Dictaphone Tape Strip with Curator Interview Transcript */}
              <div className="rounded-2xl bg-[#13294b] text-white p-4 sm:p-5 shadow-md space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleToggleTape}
                      className="min-h-[36px] px-3 rounded-full bg-[#c41e2e] hover:bg-[#dc2638] text-white inline-flex items-center gap-1.5 text-xs font-extrabold shrink-0 shadow-sm transition-colors"
                      title={tapePlaying ? 'Пауза записи' : 'Прослушать стенограмму интервью'}
                    >
                      {tapePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{tapePlaying ? 'Пауза' : 'Прослушать'}</span>
                    </button>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#7dd3fc]">
                        <Mic className="w-3.5 h-3.5 text-[#ff6b78]" />
                        <span>Стенограмма интервью · Анна Морозова, куратор выставки редкой книги</span>
                      </div>
                      <div className="text-[11px] font-mono-tabular text-white/65">
                        INTERVIEW_CURATOR_MOROZOVA.WAV · Первоисточник для сверки фактов
                      </div>
                    </div>
                  </div>

                  {/* Animated Visual Waveform */}
                  <div className="flex items-center gap-1 h-6 px-3 rounded-lg bg-white/10" aria-hidden="true">
                    {[0.4, 0.9, 0.6, 1, 0.5, 0.85, 0.45, 0.95, 0.7, 0.55, 0.9, 0.4].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full bg-[#38bdf8] ${
                          tapePlaying ? 'animate-wave-bar' : 'opacity-65'
                        }`}
                        style={{
                          height: `${Math.round(h * 18)}px`,
                          animationDelay: `${i * 75}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <blockquote className="rounded-xl bg-white/10 border border-[#7dd3fc]/25 px-4 py-3 text-xs sm:text-sm leading-relaxed text-white font-medium">
                  «Для выставки мы отобрали <strong className="text-[#7dd3fc]">двенадцать редких изданий из фонда библиотеки</strong> и дополнили их <strong className="text-[#7dd3fc]">авторскими иллюстрациями студентов</strong>. Каждую гравюру печатали <strong className="text-[#7dd3fc]">вручную на офортном станке в две краски — тёмно-синюю и киноварь</strong>. На подготовку всей экспозиции у команды ушло <strong className="text-[#7dd3fc]">три недели</strong>, а открытие назначили на <strong className="text-[#7dd3fc]">пятницу в 18:00</strong>».
                </blockquote>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: REAL MANUSCRIPT DOCUMENT WITH INLINE MARKUP */}
                <div className="lg:col-span-7 bg-[#fdfcf8] rounded-3xl p-5 sm:p-7 border border-[#13294b]/15 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-[#13294b]/12 pb-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#13294b]/75">
                      <FileText className="w-4 h-4 text-[#c41e2e]" />
                      <span>Рукопись_Искусство_книги_Разворот_08_09.docx</span>
                    </div>
                    <span className="font-mono-tabular text-xs font-extrabold text-[#157a4f]">
                      Вычитано абзацев: {solvedEditCount} / 4
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#c41e2e]">
                      Главная тема номера · Автор: Мария Соколова
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-[#13294b]">
                      Искусство книги: от гравюры до цифрового зина
                    </h3>
                  </div>

                  {/* Interactive Article Paragraphs */}
                  <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-[#13294b]">
                    {EDITORIAL_EDITS.map((item, idx) => {
                      const solvedText = getDraftLine(item);
                      const isCurrent = editStepIdx === idx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setEditStepIdx(idx);
                            setEditFeedback(null);
                          }}
                          className={`w-full text-left rounded-xl p-3.5 border-2 transition-all block ${
                            isCurrent
                              ? 'bg-[#f0f7ff] border-[#0284c7] shadow-xs'
                              : solvedText
                                ? 'bg-[#effaf3] border-[#157a4f]/30'
                                : 'bg-white border-[#13294b]/10 hover:border-[#13294b]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono-tabular text-[10px] font-extrabold uppercase tracking-wider text-[#13294b]/55">
                              Абзац #{idx + 1} · {item.category}
                            </span>
                            {solvedText ? (
                              <span className="text-[11px] font-extrabold text-[#157a4f] inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Вычитано
                              </span>
                            ) : isCurrent ? (
                              <span className="text-[11px] font-extrabold text-[#0284c7]">
                                На проверке
                              </span>
                            ) : null}
                          </div>

                          {solvedText ? (
                            <div className="space-y-1">
                              {item.hasError && (
                                <div className="text-xs line-through text-[#c41e2e]/75">
                                  {item.original}
                                </div>
                              )}
                              <div className="font-bold text-[#157a4f]">
                                {item.hasError ? solvedText : item.original}
                              </div>
                            </div>
                          ) : (
                            <div className="font-semibold text-[#13294b]">{item.original}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT 5 COLS: REDACTION REVIEW PANEL */}
                <aside className="lg:col-span-5 bg-white rounded-3xl p-5 border border-[#13294b]/12 shadow-md space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#13294b]/10 pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                      Редакторская правка · Абзац #{editStepIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#135c75]">
                      {activeEditItem.category}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#f0f7ff] border border-[#0284c7]/25 p-3.5 space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0284c7]">
                      Текст в черновике корреспондента:
                    </div>
                    <p className="text-sm font-bold text-[#13294b] leading-snug">
                      «{activeEditItem.original}»
                    </p>
                  </div>

                  {editFeedback && (
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold ${
                        editFeedback.ok
                          ? 'bg-[#e9f7ef] text-[#157a4f] animate-card-in'
                          : 'bg-[#fde8ea] text-[#c41e2e] animate-stage-shake'
                      }`}
                    >
                      {editFeedback.text}
                    </div>
                  )}

                  {solvedEdits[activeEditItem.id] ? (
                    <div className="rounded-2xl bg-[#e9f7ef] px-4 py-3.5 text-sm font-extrabold text-[#157a4f] flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Абзац утверждён! Выбери следующий фрагмент в рукописи слева.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]/60">
                        Выбери редакторское решение:
                      </div>
                      {activeEditItem.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAnswerEdit(opt)}
                          className="w-full p-3.5 rounded-xl bg-[#f5f8fc] hover:bg-[#13294b] hover:text-white border-2 border-[#13294b]/10 hover:border-[#13294b] text-left text-xs sm:text-sm font-bold text-[#13294b] transition-colors"
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}

          {/* ============ TASK 2: CLEAN TWO-PAGE MAGAZINE SPREAD STUDIO (NO OVERLAPPING!) ============ */}
          {taskIdx === 2 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepLayout}
                imageAlt="Вёрстка журнального разворота"
                stepLabel="Проф-трек 02 · Технический редактор · Шаг 3 из 4"
                title="Вёрстка разворота: оформи главный материал номера (стр. 08–09)"
                goal="Вычитанная статья поступает на вёрстку. Перед тобой разворот полос 08–09 журнала «Культура». Настрой все 4 элемента макета: выбери точный журнальный заголовок, тематическую фотографию из офортной студии, удобную двухколонную сетку разворота и подпись с указанием автора снимка Алексея Климова."
                steps={[
                  { text: 'Установи точный заголовок и снимок печатного станка', done: layoutHeadline === 'strong' && layoutPhoto === 'print' },
                  { text: 'Выбери модульный разворот в 2 колонки без наложения текста на фото', done: layoutPreset === 'columns' },
                  { text: 'Добавь подпись с именем фотографа Алексея Климова и утверди разворот', done: layoutCaption === 'good' && progress[2].completed },
                ]}
                resultPreview="Журнальный разворот стр. 08–09 свёрстан чисто, читаемо и по издательским стандартам."
                accentColor="#c41e2e"
                proTip={{
                  term: 'Модульная сетка',
                  text: 'Невидимые направляющие линии и колонки на странице, благодаря которым текст, заголовки и фотографии стоят ровно и легко читаются.',
                }}
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: REALISTIC TWO-PAGE MAGAZINE SPREAD ARTBOARD */}
                <div className="lg:col-span-7 rounded-3xl bg-[#182334] p-4 sm:p-5 border border-[#2d3d59] shadow-2xl space-y-3">
                  {/* Artboard Top Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-white/85 text-xs">
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <span className="px-2 py-0.5 rounded bg-[#c41e2e] text-white font-bold text-[10px]">
                        InLayout Studio
                      </span>
                      <span className="text-[11px] text-white/80">
                        Разворот полос 08–09 · Нажимай на элементы макета или переключай вкладки справа
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLayoutGrid((g) => !g)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                        showLayoutGrid
                          ? 'bg-[#38bdf8]/20 text-[#7dd3fc] border border-[#38bdf8]/40'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Направляющие колонок</span>
                    </button>
                  </div>

                  {/* Layout Warning Banner (Cleanly outside the magazine paper so nothing overlaps!) */}
                  {layoutPreset !== 'columns' && (
                    <div className="rounded-xl bg-[#c41e2e]/25 border border-[#fda4af]/40 px-3.5 py-2 text-xs text-white flex items-center justify-between gap-2">
                      <span>
                        {layoutPreset === 'textover'
                          ? '⚠ Сейчас выбран режим «Текст поверх фотографии»: строки сливаются с фоном снимка.'
                          : '⚠ Сейчас выбран режим «Сплошной крупный кегль»: слишком длинная строка нарушает удобочитаемость.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playSelectTick();
                          setLayoutPreset('columns');
                          setLayoutStep(2);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-extrabold shrink-0"
                      >
                        Включить 2 колонки
                      </button>
                    </div>
                  )}

                  {/* Authentic Two-Page Open Magazine Spread */}
                  <div className="relative bg-[#fbfaf6] rounded-2xl shadow-2xl border border-[#d6d1c4] overflow-hidden">
                    {/* Center Magazine Spine Crease Shadow (Desktop) */}
                    <div
                      className="hidden md:block pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 bg-gradient-to-r from-black/[0.04] via-black/[0.12] to-black/[0.03] z-10"
                      aria-hidden="true"
                    />

                    {/* Subtle Column Margin Guides (behind text, z-0, never obscuring content) */}
                    {showLayoutGrid && (
                      <div
                        className="pointer-events-none absolute inset-4 grid grid-cols-12 gap-3 z-0 opacity-45"
                        aria-hidden="true"
                      >
                        <div className="col-span-3 border-x border-dashed border-[#0284c7]/35" />
                        <div className="col-span-3 border-x border-dashed border-[#0284c7]/35" />
                        <div className="col-span-6 border-x border-dashed border-[#0284c7]/35" />
                      </div>
                    )}

                    {/* Top Running Headers of Spread (Pages 08 & 09) */}
                    <div className="relative z-10 px-5 pt-4 pb-2 border-b border-[#13294b]/15 flex items-center justify-between text-[10px] font-mono-tabular font-extrabold text-[#13294b]/65">
                      <span>08 · ЖУРНАЛ «КУЛЬТУРА» · ГЛАВНАЯ ТЕМА</span>
                      <span>ВЫСТАВКА РЕДКОЙ КНИГИ · 09</span>
                    </div>

                    {/* SPREAD CONTENT BODY */}
                    <div className="relative z-10 p-5 sm:p-6">
                      {layoutPreset === 'columns' && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                          {/* LEFT PAGE (PAGE 08): RUBRIC, HEADLINE, BYLINE & 2 TEXT COLUMNS */}
                          <div className="md:col-span-6 space-y-3 md:pr-2">
                            {/* Clickable Headline Zone (Step 0) */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setLayoutStep(0);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') setLayoutStep(0);
                              }}
                              className={`rounded-xl p-2.5 -mx-2 transition-all border-2 cursor-pointer ${
                                layoutStep === 0
                                  ? 'border-[#0284c7] bg-[#f0f7ff]'
                                  : 'border-transparent hover:border-[#13294b]/15'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#c41e2e] mb-1">
                                <span>Рубрика: Искусство книги</span>
                                <span className="font-mono-tabular text-[#0284c7]">
                                  {layoutHeadline === 'strong' ? '✓ Заголовок точный' : '1. Сменить заголовок'}
                                </span>
                              </div>
                              <h3 className="font-display font-extrabold text-base sm:text-xl leading-tight text-[#13294b]">
                                {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                              </h3>
                              <div className="text-[11px] font-bold text-[#13294b]/65 mt-1">
                                Автор: Мария Соколова · Интервью: Анна Морозова
                              </div>
                            </div>

                            {/* Clickable Two-Column Article Text (Step 2) */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setLayoutStep(2);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') setLayoutStep(2);
                              }}
                              className={`rounded-xl p-2.5 -mx-2 transition-all border-2 cursor-pointer space-y-2.5 ${
                                layoutStep === 2
                                  ? 'border-[#0284c7] bg-[#f0f7ff]/70'
                                  : 'border-transparent hover:border-[#13294b]/15'
                              }`}
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] sm:text-xs text-[#13294b]/90 leading-relaxed">
                                <p>
                                  <span className="float-left font-display font-extrabold text-2xl leading-none mr-1.5 mt-0.5 text-[#c41e2e]">
                                    В
                                  </span>
                                  экспозицию вошли двенадцать редких изданий из фонда библиотеки и
                                  серия студенческих иллюстраций. Каждую гравюру печатали вручную на
                                  офортном станке в две краски — тёмно-синюю и киноварь.
                                </p>
                                <p>
                                  Сочетание классической книжной гравюры и современной типографики
                                  помогает читателю увидеть, как меняется визуальный язык книги.
                                  Открытие выставки пройдёт в пятницу в 18:00.
                                </p>
                              </div>

                              <blockquote className="border-l-2 border-[#c41e2e] pl-3 py-1 text-[11px] font-extrabold italic text-[#13294b] bg-[#13294b]/[0.03] rounded-r-lg">
                                «Каждую гравюру печатали вручную на офортном станке в две краски —
                                тёмно-синюю и киноварь»
                              </blockquote>
                            </div>
                          </div>

                          {/* RIGHT PAGE (PAGE 09): FRAMED ILLUSTRATION, CAPTION & EXHIBITION PASSPORT */}
                          <div className="md:col-span-6 space-y-3 md:pl-2">
                            {/* Clickable Photo Frame (Step 1) */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setLayoutStep(1);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const pId = e.dataTransfer.getData('text/plain') as 'print' | 'music' | 'arch';
                                if (pId === 'print' || pId === 'music' || pId === 'arch') {
                                  soundEngine.playPaperSlide();
                                  setLayoutPhoto(pId);
                                }
                              }}
                              className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                layoutStep === 1
                                  ? 'border-[#0284c7] ring-2 ring-[#38bdf8]/40'
                                  : 'border-[#13294b]/15 hover:border-[#13294b]/40'
                              }`}
                            >
                              <img
                                src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                                alt="Иллюстрация разворота"
                                referrerPolicy="no-referrer"
                                className="w-full aspect-[4/3] object-cover"
                              />
                            </div>

                            {/* Clickable Photo Caption Bar (Step 3) */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setLayoutStep(3);
                              }}
                              className={`px-3 py-2 rounded-xl border-2 text-[11px] font-bold cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                layoutStep === 3
                                  ? 'border-[#0284c7] bg-[#f0f7ff] text-[#13294b]'
                                  : layoutCaption === 'good'
                                    ? 'border-[#157a4f]/35 bg-[#e9f7ef] text-[#157a4f]'
                                    : 'border-[#c41e2e]/30 bg-[#fde8ea]/50 text-[#c41e2e]'
                              }`}
                            >
                              <span className="truncate">
                                {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                              </span>
                              <span className="font-mono-tabular text-[9px] uppercase shrink-0">
                                4. Подпись
                              </span>
                            </div>

                            {/* Editorial Sidebar Fact Box on Page 09 */}
                            <div className="rounded-xl bg-[#13294b]/[0.04] border border-[#13294b]/12 p-3 space-y-1">
                              <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#135c75]">
                                Справка редакции · Паспорт выставки
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] text-[#13294b]">
                                <div>
                                  <div className="font-mono-tabular font-extrabold text-xs text-[#c41e2e]">12 книг</div>
                                  <div className="text-[#13294b]/65">редкий фонд</div>
                                </div>
                                <div>
                                  <div className="font-mono-tabular font-extrabold text-xs text-[#135c75]">2 краски</div>
                                  <div className="text-[#13294b]/65">ручной офорт</div>
                                </div>
                                <div>
                                  <div className="font-mono-tabular font-extrabold text-xs text-[#157a4f]">ПТ · 18:00</div>
                                  <div className="text-[#13294b]/65">открытие зала</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {layoutPreset === 'textover' && (
                        <div
                          onClick={() => setLayoutStep(2)}
                          className="relative rounded-xl overflow-hidden min-h-[290px] p-5 flex flex-col justify-between border-2 border-[#c41e2e]/50 cursor-pointer"
                        >
                          <img
                            src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                            alt="Фоновое фото на весь разворот"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35" />
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayoutStep(0);
                            }}
                            className="relative z-10 space-y-1"
                          >
                            <span className="px-2 py-0.5 rounded bg-[#c41e2e] text-white text-[10px] font-extrabold uppercase">
                              Неудачная вёрстка: текст поверх пёстрого фото
                            </span>
                            <h3 className="font-display font-extrabold text-lg sm:text-2xl text-white drop-shadow">
                              {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                            </h3>
                          </div>
                          <div className="relative z-10 space-y-2 bg-black/35 backdrop-blur-[1px] p-3.5 rounded-xl text-white/85 text-xs leading-snug">
                            <p>
                              В экспозицию вошли двенадцать редких изданий из фонда библиотеки и
                              серия студенческих иллюстраций. Каждую гравюру печатали вручную на
                              офортном станке в две краски — тёмно-синюю и киноварь. На пёстром
                              фотофоне мелкие строки текста теряют контраст и утомляют глаза.
                            </p>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayoutStep(3);
                              }}
                              className="pt-1.5 border-t border-white/20 text-[11px] font-bold text-[#7dd3fc]"
                            >
                              Подпись: {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                            </div>
                          </div>
                        </div>
                      )}

                      {layoutPreset === 'giant' && (
                        <div className="space-y-3">
                          <div
                            onClick={() => setLayoutStep(0)}
                            className="cursor-pointer"
                          >
                            <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#13294b]">
                              {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                            </h3>
                          </div>
                          <div
                            onClick={() => setLayoutStep(1)}
                            className="rounded-xl overflow-hidden border border-[#13294b]/15 cursor-pointer"
                          >
                            <img
                              src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                              alt="Иллюстрация статьи"
                              referrerPolicy="no-referrer"
                              className="w-full h-36 object-cover"
                            />
                          </div>
                          <div
                            onClick={() => setLayoutStep(3)}
                            className="px-3 py-1.5 rounded-lg bg-[#f0f7ff] border border-[#0284c7]/30 text-xs font-bold text-[#13294b] cursor-pointer"
                          >
                            Подпись: {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                          </div>
                          <div
                            onClick={() => setLayoutStep(2)}
                            className="p-3 rounded-xl border-2 border-dashed border-[#c41e2e]/45 bg-[#fde8ea]/35 cursor-pointer space-y-1"
                          >
                            <div className="text-[10px] font-extrabold uppercase text-[#c41e2e]">
                              Нарушение сетки: одна сверхширокая колонка крупным кеглем
                            </div>
                            <p className="text-base sm:text-lg leading-snug text-[#13294b] font-medium">
                              В экспозицию вошли двенадцать редких изданий из фонда библиотеки и
                              серия студенческих иллюстраций. Каждую гравюру печатали вручную на
                              офортном станке в две краски.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Spread Folio Footer */}
                    <div className="relative z-10 px-5 py-2.5 border-t border-[#13294b]/15 bg-[#f5f3ec] flex items-center justify-between text-[10px] font-mono-tabular font-bold text-[#13294b]/60">
                      <span>СТР. 08 · ИЗДАТЕЛЬСКОЕ ДЕЛО (42.03.03)</span>
                      <span>ГОСТ Р 7.0.4 · 300 DPI · CMYK · СТР. 09</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT 5 COLS: PROPERTIES INSPECTOR & LIVE PREFLIGHT CHECKLIST */}
                <aside className="lg:col-span-5 bg-white rounded-3xl p-5 border border-[#13294b]/12 shadow-md space-y-4">
                  {/* Live Technical Quality Meters */}
                  <div className="rounded-2xl bg-[#f4f7fc] p-3 border border-[#13294b]/10 grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">1. Заголовок:</span>
                      <span className={layoutHeadline === 'strong' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {layoutHeadline === 'strong' ? '✓ В стиле' : 'Черновик'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">2. Снимок:</span>
                      <span className={layoutPhoto === 'print' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {layoutPhoto === 'print' ? '✓ По теме' : 'Не тот сюжет'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">3. Сетка:</span>
                      <span className={layoutPreset === 'columns' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {layoutPreset === 'columns' ? '✓ 2 колонки' : 'Сбой сетки'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">4. Автор фото:</span>
                      <span className={layoutCaption === 'good' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {layoutCaption === 'good' ? '✓ Указан' : 'Не указан'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {LAYOUT_STEPS.map((st) => {
                      const active = layoutStep === st.idx;
                      const stepOk =
                        (st.idx === 0 && layoutHeadline === 'strong') ||
                        (st.idx === 1 && layoutPhoto === 'print') ||
                        (st.idx === 2 && layoutPreset === 'columns') ||
                        (st.idx === 3 && layoutCaption === 'good');
                      return (
                        <button
                          key={st.label}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setLayoutStep(st.idx);
                          }}
                          className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold transition-colors text-left flex items-center justify-between gap-1 ${
                            active
                              ? 'bg-[#c41e2e] text-white'
                              : stepOk
                                ? 'bg-[#e9f7ef] text-[#157a4f]'
                                : 'bg-[#f4f7fc] text-[#13294b]/75 hover:bg-[#e6edf8]'
                          }`}
                        >
                          <span className="truncate">{st.label}</span>
                          {stepOk && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="font-display font-extrabold text-sm text-[#13294b]">
                      {LAYOUT_STEPS[layoutStep].prompt}
                    </div>

                    {layoutStep === 0 && (
                      <div className="space-y-2">
                        {LAYOUT_HEADLINES.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playSelectTick();
                              setLayoutHeadline(h.id);
                            }}
                            className={`w-full px-4 py-3 rounded-xl text-left text-xs sm:text-sm font-bold transition-colors ${
                              layoutHeadline === h.id
                                ? 'bg-[#13294b] text-white'
                                : 'bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b]'
                            }`}
                          >
                            {h.text}
                          </button>
                        ))}
                      </div>
                    )}

                    {layoutStep === 1 && (
                      <div className="space-y-2.5">
                        {LAYOUT_PHOTOS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                            onClick={() => {
                              soundEngine.playSelectTick();
                              setLayoutPhoto(p.id);
                            }}
                            className={`w-full p-2.5 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all cursor-grab active:cursor-grabbing ${
                              layoutPhoto === p.id
                                ? 'border-[#c41e2e] bg-[#13294b] text-white'
                                : 'border-transparent bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={p.img}
                                alt={p.label}
                                draggable={false}
                                referrerPolicy="no-referrer"
                                className="w-20 aspect-[4/3] object-cover rounded-xl shrink-0"
                              />
                              <span className="text-sm font-extrabold truncate">{p.label}</span>
                            </div>
                            <GripVertical className="w-4 h-4 opacity-50 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {layoutStep === 2 && (
                      <div className="space-y-2">
                        {LAYOUT_PRESETS.map((preset) => {
                          const Icon = preset.icon;
                          const active = layoutPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setLayoutPreset(preset.id);
                              }}
                              className={`w-full px-4 py-3 rounded-xl text-left transition-colors flex items-center gap-3 ${
                                active
                                  ? 'bg-[#13294b] text-white'
                                  : 'bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b]'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-extrabold">{preset.label}</div>
                                <div
                                  className={`text-[11px] ${
                                    active ? 'text-white/75' : 'text-[#13294b]/65'
                                  }`}
                                >
                                  {preset.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {layoutStep === 3 && (
                      <div className="space-y-2">
                        {LAYOUT_CAPTIONS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playSelectTick();
                              setLayoutCaption(c.id);
                            }}
                            className={`w-full px-4 py-3 rounded-xl text-left text-xs sm:text-sm font-bold transition-colors ${
                              layoutCaption === c.id
                                ? 'bg-[#13294b] text-white'
                                : 'bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b]'
                            }`}
                          >
                            {c.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#13294b]/10 flex items-center justify-between gap-2">
                    {layoutStep > 0 ? (
                      <button
                        type="button"
                        onClick={() => setLayoutStep((s) => s - 1)}
                        className="min-h-[42px] px-4 rounded-xl bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" /> Назад
                      </button>
                    ) : (
                      <div />
                    )}

                    {layoutStep < 3 ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playSelectTick();
                          setLayoutStep((s) => s + 1);
                        }}
                        className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5"
                      >
                        Дальше <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckTask2}
                        className="min-h-[44px] px-5 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                      >
                        Утвердить страницу →
                      </button>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}

          {/* ============ TASK 3: PRE-PRESS PROOFING TABLE ============ */}
          {taskIdx === 3 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepPrint}
                imageAlt="Проверка страниц журнала перед печатью"
                stepLabel="Проф-трек 02 · Выпускающий редактор · Шаг 4 из 4"
                title="Предпечатная сверка: проверь 4 сигнальные полосы перед типографией"
                goal="Перед запуском офсетного станка выпускающий редактор проверяет сигнальный экземпляр номера. После отправки макета в типографию исправить опечатку в тираже уже невозможно! Сверь обложку, содержание, разворот стр. 8–9 и полосу стр. 14 с паспортом выпуска сверху и устрани 4 расхождения."
                steps={[
                  { text: 'Сверь каждую из 4 сигнальных полос с паспортом номера сверху', done: true },
                  { text: `Исправь расхождения на всех 4 полосах (${fixedCount} из 4)`, done: fixedCount === 4 },
                  { text: 'Нажми «Подписать номер в печать» для отправки в типографию', done: progress[3].completed },
                ]}
                resultPreview="Журнал «Культура · № 01» прошёл препресс-контроль и подписан в печать."
                accentColor="#c41e2e"
                proTip={{
                  term: 'Сигнальный экземпляр и препресс',
                  text: 'Финальная сверка всех страниц перед отправкой в типографию: проверяют возрастную маркировку, тираж, заголовки и подписи к фото.',
                }}
                onHint={handleHintClick}
              />

              {/* Technical Spec Strip + CMYK Color Bars */}
              <div className="rounded-2xl bg-[#13294b] text-white px-5 py-3 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-display font-extrabold text-[#7dd3fc]">Паспорт выпуска:</span>
                  <span>Маркировка: 12+</span>
                  <span className="text-white/35">·</span>
                  <span>Стр. 8: «Искусство книги: от гравюры до цифрового зина» (Фото: Алексей Климов)</span>
                  <span className="text-white/35">·</span>
                  <span>Стр. 14: «За кулисами литературного фестиваля»</span>
                </div>
                <div className="flex items-center gap-1" title="Типографская шкала CMYK">
                  <span className="w-3 h-3 rounded-xs bg-[#00aeef]" />
                  <span className="w-3 h-3 rounded-xs bg-[#ec008c]" />
                  <span className="w-3 h-3 rounded-xs bg-[#fff200]" />
                  <span className="w-3 h-3 rounded-xs bg-[#111827] border border-white/30" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 3 COLS: PAGE THUMBNAIL STRIP */}
                <div className="lg:col-span-3 space-y-2.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]/65 px-1">
                    Сигнальные полосы
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    {PROOF_PAGES.map((tab) => {
                      const isCurrent = proofPage === tab.idx;
                      const touched = inspectedPages[tab.defId];
                      return (
                        <button
                          key={tab.label}
                          type="button"
                          onClick={() => {
                            soundEngine.playPaperSlide();
                            setProofPage(tab.idx);
                          }}
                          className={`p-3 rounded-2xl text-left border-2 transition-all flex items-center justify-between gap-2 ${
                            isCurrent
                              ? 'bg-[#13294b] text-white border-[#13294b] shadow-md'
                              : touched
                                ? 'bg-[#e9f7ef] text-[#157a4f] border-[#157a4f]/25'
                                : 'bg-white text-[#13294b] border-[#13294b]/12 hover:bg-[#f4f7fc]'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-extrabold">{tab.label}</div>
                            <div
                              className={`text-[10px] font-mono-tabular mt-0.5 ${
                                isCurrent ? 'text-[#7dd3fc]' : 'text-current/70'
                              }`}
                            >
                              {fixedDefects[tab.defId]}
                            </div>
                          </div>
                          {touched && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckTask3}
                    className="w-full min-h-[46px] px-4 rounded-2xl bg-[#157a4f] hover:bg-[#116440] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Подписать в печать ({Object.keys(inspectedPages).length}/4)
                  </button>
                </div>

                {/* RIGHT 9 COLS: PRE-PRESS PROOFING SHEET + CORRECTION OPTIONS */}
                <div className="lg:col-span-9 bg-white rounded-3xl p-5 sm:p-6 border border-[#13294b]/12 shadow-md space-y-5">
                  {/* Press Proof Sheet Frame */}
                  <div className="relative rounded-2xl bg-[#f5f7fb] p-4 sm:p-5 border border-[#13294b]/15">
                    {proofPage === 0 && (
                      <div className="relative rounded-xl overflow-hidden bg-[#13294b] text-white min-h-[240px] p-6 flex flex-col justify-between">
                        <img
                          src={MEDIA.studioPrint}
                          alt="Обложка журнала Культура"
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover opacity-40"
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="font-mono-tabular text-xs font-extrabold bg-[#c41e2e] px-3 py-1 rounded">
                            КУЛЬТУРА · № 01
                          </span>
                          <span className="px-4 py-1.5 rounded-xl font-mono-tabular text-base font-extrabold border-2 bg-white text-[#13294b] border-[#38bdf8] shadow">
                            {fixedDefects.age} ✎
                          </span>
                        </div>
                        <div className="relative space-y-1">
                          <div className="font-display font-extrabold text-3xl sm:text-4xl">КУЛЬТУРА</div>
                          <div className="text-sm text-[#7dd3fc] font-bold">
                            Искусство книги: от гравюры до цифрового зина · За кулисами фестиваля
                          </div>
                        </div>
                      </div>
                    )}

                    {proofPage === 1 && (
                      <div className="bg-white rounded-xl p-5 border border-[#13294b]/10 space-y-4">
                        <div className="border-b border-[#13294b]/10 pb-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                              Журнал «Культура» · № 01
                            </div>
                            <h3 className="font-display font-extrabold text-xl text-[#13294b] mt-1">
                              Содержание номера
                            </h3>
                          </div>
                          <span className="px-2.5 py-1 rounded border border-[#13294b]/20 font-mono-tabular text-[10px] font-bold text-[#13294b]/60">
                            КОНТРОЛЬНЫЙ ОТТИСК
                          </span>
                        </div>
                        <div className="divide-y divide-[#13294b]/10">
                          <div className="py-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="font-display font-bold text-base text-[#13294b]">
                                Искусство книги: от гравюры до цифрового зина
                              </div>
                              <div className="text-xs text-[#13294b]/65">Мария Соколова · Главная тема номера</div>
                            </div>
                            <span className="px-3.5 py-1.5 rounded-xl font-mono-tabular text-sm font-extrabold border-2 bg-[#f0f7ff] border-[#0284c7] text-[#13294b]">
                              {fixedDefects.page} ✎
                            </span>
                          </div>
                          <div className="py-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="font-display font-bold text-base text-[#13294b]">
                                За кулисами литературного фестиваля
                              </div>
                              <div className="text-xs text-[#13294b]/65">Илья Родин · Спецрепортаж</div>
                            </div>
                            <span className="font-mono-tabular text-sm font-extrabold text-[#13294b]">
                              Стр. 14
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {proofPage === 2 && (
                      <div className="bg-white rounded-xl p-5 border border-[#13294b]/10 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold text-[#c41e2e]">
                            РАЗВОРОТ СТР. 8–9 · ГЛАВНАЯ ТЕМА
                          </div>
                          <h3 className="font-display font-extrabold text-xl text-[#13294b] leading-snug">
                            Искусство книги: от гравюры до цифрового зина
                          </h3>
                          <p className="text-sm text-[#13294b]/80 leading-relaxed">
                            В экспозицию вошли двенадцать редких изданий из фонда библиотеки и серия
                            студенческих иллюстраций. Каждую гравюру печатали вручную на офортном
                            станке в две краски.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <img
                            src={MEDIA.studioPrint}
                            alt="Офортный станок в печатной студии"
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] object-cover rounded-xl shadow-sm"
                          />
                          <div className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border-2 bg-[#f0f7ff] border-[#0284c7] text-[#13294b] flex items-center justify-between">
                            <span>{fixedDefects.author}</span>
                            <span>✎</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {proofPage === 3 && (
                      <div className="bg-white rounded-xl p-5 border border-[#13294b]/10 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                        <div className="space-y-2">
                          <img
                            src={MEDIA.studioMusic}
                            alt="Вечерняя сцена и гости литературного фестиваля"
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] object-cover rounded-xl shadow-sm"
                          />
                          <div className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border-2 bg-[#f0f7ff] border-[#0284c7] text-[#13294b] flex items-center justify-between">
                            <span>{fixedDefects.caption}</span>
                            <span>✎</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold text-[#135c75]">
                            СТР. 14 · СПЕЦРЕПОРТАЖ
                          </div>
                          <h3 className="font-display font-extrabold text-xl text-[#13294b] leading-snug">
                            За кулисами литературного фестиваля
                          </h3>
                          <p className="text-sm text-[#13294b]/80 leading-relaxed">
                            За три часа до старта команда подготовила сцену, настроила свет во дворе
                            и встретила первых гостей вечерней программы.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Direct Question & 3 Options Right Underneath the Proof Sheet */}
                  <div className="space-y-3">
                    <div className="font-display font-extrabold text-sm sm:text-base text-[#13294b]">
                      {currentProofTab.question}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {currentProofDefect.alts.map((alt) => {
                        const selected = fixedDefects[currentProofTab.defId] === alt;
                        return (
                          <button
                            key={alt}
                            type="button"
                            onClick={() => {
                              soundEngine.playPencilMark();
                              setInspectedPages((prev) => ({
                                ...prev,
                                [currentProofTab.defId]: true,
                              }));
                              setFixedDefects((prev) => ({
                                ...prev,
                                [currentProofTab.defId]: alt,
                              }));
                            }}
                            className={`min-h-[46px] px-4 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold transition-colors ${
                              selected
                                ? 'bg-[#13294b] text-white shadow-xs'
                                : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b]'
                            }`}
                          >
                            {alt}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-1">
                      {proofPage < PROOF_PAGES.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playPaperSlide();
                            setProofPage((p) => p + 1);
                          }}
                          className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5"
                        >
                          Следующая страница <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCheckTask3}
                          className="min-h-[44px] px-6 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Подписать номер в печать
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
