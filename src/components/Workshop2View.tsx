import React, { useState } from 'react';
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
  { id: 'dry', text: 'Отчёт о посещении мастерской № 4' },
  { id: 'clickbait', text: 'ШОК! Вы не поверите, что сделали с краской!' },
  { id: 'strong', text: 'От эскиза до плаката: как рождается авторская афиша' },
] as const;

const LAYOUT_PHOTOS = [
  { id: 'print', label: 'Печать плаката', img: MEDIA.studioPrint },
  { id: 'music', label: 'Вечерний фестиваль', img: MEDIA.studioMusic },
  { id: 'arch', label: 'Городская архитектура', img: MEDIA.studioArch },
] as const;

const LAYOUT_PRESETS = [
  {
    id: 'textover',
    label: 'Текст поверх фото',
    desc: 'Мелкий шрифт на пёстром фоне — трудно читать',
    icon: Layers,
  },
  {
    id: 'columns',
    label: 'Две чистые колонки',
    desc: 'Текст слева, фото справа, удобный шрифт',
    icon: Columns,
  },
  {
    id: 'giant',
    label: 'Крупный шрифт на всю ширину',
    desc: 'Слишком большой текст растянут под картинкой',
    icon: ImageIcon,
  },
] as const;

const LAYOUT_CAPTIONS = [
  { id: 'none', text: 'Без подписи' },
  { id: 'wrong', text: 'Фото: из интернета' },
  { id: 'good', text: 'Печать афиши в мастерской. Фото: Алексей Климов' },
] as const;

const LAYOUT_STEPS = [
  { idx: 0, label: '1. Заголовок', prompt: 'Выбери понятный и живой заголовок к статье о печати плакатов:' },
  { idx: 1, label: '2. Фотография', prompt: 'Выбери иллюстрацию, которая подходит к тексту статьи:' },
  { idx: 2, label: '3. Раскладка', prompt: 'Выбери вариант, который удобнее всего читать:' },
  { idx: 3, label: '4. Подпись', prompt: 'Выбери правильную подпись с именем фотографа (Алексей Климов):' },
] as const;

const PROOF_PAGES: { idx: number; label: string; defId: ProofDefect['id']; question: string }[] = [
  {
    idx: 0,
    label: '1. Обложка',
    defId: 'age',
    question: 'Какой возрастной знак должен стоять на обложке по памятке?',
  },
  {
    idx: 1,
    label: '2. Содержание',
    defId: 'page',
    question: 'На какой странице на самом деле начинается статья «От эскиза до плаката»?',
  },
  {
    idx: 2,
    label: '3. Стр. 8',
    defId: 'author',
    question: 'Кого нужно указать автором снимка на странице 8?',
  },
  {
    idx: 3,
    label: '4. Стр. 14',
    defId: 'caption',
    question: 'Какая подпись подходит к иллюстрации фестиваля на странице 14?',
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
          title: 'План номера журнала «Культура» готов!',
          body: 'На главную страницу (стр. 8) встала статья «От эскиза до плаката», в короткую рубрику (стр. 14) — «За кулисами фестиваля», а две заявки с нарушениями отклонены.',
          lesson:
            'Редактор проверяет каждую заявку по трём простым правилам: подходит ли объём, есть ли разрешение на фото и нет ли скрытой рекламы.',
          nextActionLabel: 'Перейти к проверке текста (шаг 2)',
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
          title: 'Все 4 предложения проверены!',
          body: 'Ты сверил факты и цифры с интервью художницы, убрал лишние повторы («19:00 часов вечера», «первым дебютом») и не испортил верную фразу о шелкографии.',
          lesson:
            'Редактор проверяет факты по словам героя, убирает лишние слова и бережно сохраняет правильные фразы.',
          nextActionLabel: 'Перейти к оформлению страницы (шаг 3)',
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
        body: '«От эскиза до плаката» — на главную (стр. 8). «За кулисами фестиваля» — в короткую рубрику (стр. 14). «Необычные здания» (чужие фото без разрешения) и «Кофейня Зерно» (скрытая реклама) — отклонить.',
      },
      {
        title: 'Подсказка · Шаг 2',
        body: '1) Трафареты делали вдвоём с мастером; 2) 3 цвета и 6 экземпляров; 3) фразу про шелкографию оставь без правки; 4) убери лишние повторы «часов вечера» и «первым».',
      },
      {
        title: 'Подсказка · Шаг 3',
        body: '1. Заголовок «От эскиза до плаката...», 2. Иллюстрация «Печать плаката», 3. Раскладка «Две чистые колонки», 4. Подпись с именем фотографа Алексея Климова.',
      },
      {
        title: 'Подсказка · Шаг 4',
        body: 'Сверь каждую страницу с памяткой сверху: Обложка → 12+, Содержание → Стр. 8, Стр. 8 → Фото: Алексей Климов, Стр. 14 → «Вечерний двор и гости фестиваля».',
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
              <p className="text-base sm:text-lg font-bold text-[#ffd66b]">
                {save.magazineHeadline}
              </p>
              <div className="text-xs text-white/85">
                Также в номере: За кулисами фестиваля (стр. 14)
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
                  <div className="font-bold text-[#13294b]">За кулисами фестиваля</div>
                  <div className="text-xs text-[#13294b]/65">Илья Родин · Фото: Анна Лебедева</div>
                </div>
                <span className="font-mono-tabular font-extrabold text-[#c41e2e]">Стр. 14</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        label: 'Стр. 8 · Главная статья',
        content: (
          <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#13294b]/12 min-h-[380px] grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                Мастерская · Стр. 8
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b] leading-snug">
                {save.magazineHeadline}
              </h2>
              <p className="text-sm text-[#13294b]/80 leading-relaxed">
                Художница нарисовала эскиз, а трафареты сделала вместе с мастером. Плакаты печатали
                в три цвета и за день получили шесть экземпляров.
              </p>
              <p className="text-sm text-[#13294b]/80 leading-relaxed">
                Шелкография позволяет печатать плотным, насыщенным слоем краски. Открытие выставки
                прошло в 19:00 и стало дебютом студии.
              </p>
            </div>
            <figure className="space-y-2">
              <img
                src={MEDIA.studioPrint}
                alt="Печать плаката в мастерской"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
              />
              <figcaption className="text-xs text-[#13294b]/70 font-semibold">
                Печать афиши в мастерской. Фото: Алексей Климов
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
                alt="Вечерний двор и гости фестиваля"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
              />
              <figcaption className="text-xs text-[#13294b]/70 font-semibold">
                Вечерний двор и гости фестиваля. Фото: Анна Лебедева
              </figcaption>
            </figure>
            <div className="space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#135c75]">
                Фоторепортаж · Стр. 14
              </div>
              <h2 className="font-display font-extrabold text-xl text-[#13294b]">
                За кулисами фестиваля
              </h2>
              <p className="text-sm text-[#13294b]/80 leading-relaxed">
                За три часа до старта команда подготовила площадку, зажгла огни во дворе и встретила
                первых гостей вечерней программы.
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
              <div className="text-xs font-extrabold uppercase tracking-widest text-[#ffd66b]">
                Готовый результат · Мастерская 2
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
                className="min-h-[42px] px-5 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] text-[#13294b] text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 whitespace-nowrap"
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
              className="min-h-[36px] px-3.5 rounded-xl bg-[#fff4d4] text-[#8a4d03] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap"
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
          {/* ============ TASK 0: EDITORIAL INBOX + MAGAZINE FLATPLAN ============ */}
          {taskIdx === 0 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepPlan}
                imageAlt="Отбор статей в новый номер журнала"
                stepLabel="Мастерская 2 · Шаг 1 из 4"
                title="Выбери 2 статьи в журнал и отклони 2 неподходящие"
                goal="В новом номере есть 2 места: для большой статьи (стр. 8) и короткого репортажа (стр. 14). Прочитай заметку автора и реши, брать материал в журнал или отклонить."
                steps={[
                  { text: 'Прочитай, что написал автор на карточке', done: sortedCount > 0 },
                  { text: 'Поставь 2 подходящие статьи в номер', done: Boolean(placedLeadId && placedBriefId) },
                  { text: 'Отклони 2 заявки с нарушениями', done: trashedIds.length >= 2 },
                ]}
                resultPreview="План номера собран."
                accentColor="#c41e2e"
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: EDITORIAL MAILBOX INBOX */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-[#13294b]/12 shadow-md overflow-hidden">
                  {/* Email Client Toolbar */}
                  <div className="bg-[#13294b] text-white px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold">
                      <Mail className="w-4 h-4 text-[#ffd66b]" />
                      <span>Входящие заявки редакции · «Культура № 01»</span>
                    </div>
                    <span className="font-mono-tabular text-xs font-bold text-[#ffd66b]">
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
                            <span>Заявка {idx + 1}</span>
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
                  <div className="p-5 sm:p-6 space-y-4">
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
                      className={`rounded-2xl border border-[#13294b]/12 bg-[#fcfdff] p-4 space-y-4 ${
                        !isPitchSorted(activePitch.id) ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-full sm:w-44 aspect-[4/3] rounded-xl overflow-hidden bg-[#eef2f8] border border-[#13294b]/10 shrink-0 relative">
                          <img
                            src={activePitch.img}
                            alt={activePitch.title}
                            draggable={false}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold inline-flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> Вложение
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#fde8ea] text-[#c41e2e] text-[11px] font-extrabold">
                              {activePitch.kind}
                            </span>
                            {!isPitchSorted(activePitch.id) && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#13294b]/45 font-bold">
                                <GripVertical className="w-3.5 h-3.5" /> Можно перетянуть в макет →
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#13294b] leading-snug">
                            {activePitch.title}
                          </h3>
                          <div className="text-xs font-bold text-[#13294b]/70">
                            От кого: <span className="text-[#13294b]">{activePitch.by}</span>
                          </div>
                          <p className="text-xs text-[#13294b]/75 leading-relaxed">
                            {activePitch.summary}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#fff8eb] border border-[#f2d08b] p-3.5 space-y-1">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#9c5a08]">
                          Письмо автора в редакцию:
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
                            ? 'Поставлена на главную страницу (стр. 8).'
                            : placedBriefId === activePitch.id
                              ? 'Поставлена в короткую рубрику (стр. 14).'
                              : 'Эта заявка отклонена.'}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          disabled={Boolean(placedLeadId)}
                          onClick={() => handleDecidePitch(activePitch.id, 'lead')}
                          className="min-h-[46px] px-3.5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] disabled:opacity-40 text-white text-xs font-extrabold transition-colors"
                        >
                          {placedLeadId ? 'Стр. 8 уже занята' : 'На главную (стр. 8)'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(placedBriefId)}
                          onClick={() => handleDecidePitch(activePitch.id, 'brief')}
                          className="min-h-[46px] px-3.5 rounded-xl bg-[#135c75] hover:bg-[#187595] disabled:opacity-40 text-white text-xs font-extrabold transition-colors"
                        >
                          {placedBriefId ? 'Стр. 14 уже занята' : 'На стр. 14 (короткая)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecidePitch(activePitch.id, 'trash')}
                          className="min-h-[46px] px-3.5 rounded-xl bg-[#fde8ea] hover:bg-[#c41e2e] text-[#c41e2e] hover:text-white text-xs font-extrabold transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Отклонить заявку
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT 5 COLS: LIVE FLATPLAN OF ISSUE #01 */}
                <aside className="lg:col-span-5 bg-[#eef2f8] rounded-3xl p-4 sm:p-5 border border-[#13294b]/12 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]">
                      Макет номера «Культура · № 01»
                    </div>
                    <span className="font-mono-tabular text-[11px] font-bold text-[#135c75]">
                      Flatplan
                    </span>
                  </div>

                  {/* Page 8 Slot */}
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
                    className={`rounded-2xl p-3.5 border-2 transition-all ${
                      leadPitch
                        ? 'bg-white border-[#157a4f] shadow-sm'
                        : overFlatplanSlot === 'lead'
                          ? 'bg-[#fff8d6] border-[#c41e2e] scale-[1.01]'
                          : 'bg-white/80 border-dashed border-[#13294b]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold mb-2">
                      <span className="text-[#13294b]">СТР. 8 · Главная статья (большой объём)</span>
                      {leadPitch && <span className="text-[#157a4f]">✓ В макете</span>}
                    </div>
                    {leadPitch ? (
                      <div className="flex items-center gap-3 animate-stamp-pop">
                        <img
                          src={leadPitch.img}
                          alt={leadPitch.title}
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-xs text-[#13294b] truncate">
                            {leadPitch.title}
                          </div>
                          <div className="text-[11px] text-[#13294b]/65">{leadPitch.by}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 text-center text-xs text-[#13294b]/55 font-bold">
                        Перетащи сюда большую статью или нажми кнопку слева
                      </div>
                    )}
                  </div>

                  {/* Page 14 Slot */}
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
                    className={`rounded-2xl p-3.5 border-2 transition-all ${
                      briefPitch
                        ? 'bg-white border-[#157a4f] shadow-sm'
                        : overFlatplanSlot === 'brief'
                          ? 'bg-[#fff8d6] border-[#135c75] scale-[1.01]'
                          : 'bg-white/80 border-dashed border-[#13294b]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold mb-2">
                      <span className="text-[#135c75]">СТР. 14 · Короткий репортаж</span>
                      {briefPitch && <span className="text-[#157a4f]">✓ В макете</span>}
                    </div>
                    {briefPitch ? (
                      <div className="flex items-center gap-3 animate-stamp-pop">
                        <img
                          src={briefPitch.img}
                          alt={briefPitch.title}
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-xs text-[#13294b] truncate">
                            {briefPitch.title}
                          </div>
                          <div className="text-[11px] text-[#13294b]/65">{briefPitch.by}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 text-center text-xs text-[#13294b]/55 font-bold">
                        Перетащи сюда короткий материал
                      </div>
                    )}
                  </div>

                  {/* Rejected Folder */}
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
                    className={`rounded-2xl p-3.5 border-2 transition-all ${
                      overFlatplanSlot === 'trash'
                        ? 'bg-[#fde8ea] border-[#c41e2e] scale-[1.01]'
                        : 'bg-white/75 border-dashed border-[#c41e2e]/35'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-[#c41e2e] mb-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        Отклонённые заявки ({trashedIds.length} / 2)
                      </span>
                    </div>
                    {trashedIds.length === 0 ? (
                      <div className="py-2 text-center text-xs text-[#13294b]/50 font-semibold">
                        Сюда попадают материалы с нарушениями
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {trashedIds.map((id) => {
                          const item = EDITORIAL_PITCHES.find((p) => p.id === id);
                          if (!item) return null;
                          return (
                            <div
                              key={id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#fde8ea] text-[#c41e2e] text-xs font-bold flex items-center justify-between animate-stamp-pop"
                            >
                              <span className="truncate">{item.title}</span>
                              <span className="font-mono-tabular text-[10px] shrink-0 ml-2">ОТКЛ.</span>
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

          {/* ============ TASK 1: DICTAPHONE + FULL MANUSCRIPT REDACTION ============ */}
          {taskIdx === 1 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepEdit}
                imageAlt="Проверка текста статьи по интервью"
                stepLabel="Мастерская 2 · Шаг 2 из 4"
                title="Исправь ошибки в 4 предложениях статьи"
                goal="Сверь каждое предложение с цитатой художницы из интервью. Будь внимателен: одно предложение написано верно — его исправлять не нужно."
                steps={[
                  { text: 'Прочитай цитату из интервью сверху', done: true },
                  { text: `Проверь по очереди 4 предложения (${solvedEditCount} из 4)`, done: solvedEditCount === 4 },
                  { text: 'Выбери правильный вариант для каждого предложения', done: progress[1].completed },
                ]}
                resultPreview="Текст статьи проверен и готов к оформлению."
                accentColor="#c41e2e"
                onHint={handleHintClick}
              />

              {/* Visual Dictaphone Tape Strip (Zero-Audio Friendly!) */}
              <div className="rounded-2xl bg-[#13294b] text-white p-4 sm:p-5 shadow-md space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTapePlaying((p) => !p)}
                      className="w-9 h-9 rounded-full bg-[#c41e2e] hover:bg-[#dc2638] text-white flex items-center justify-center shrink-0 shadow-sm transition-colors"
                      title={tapePlaying ? 'Пауза расшифровки' : 'Запустить расшифровку записи'}
                    >
                      {tapePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                        <Mic className="w-3.5 h-3.5 text-[#ff6b78]" />
                        <span>Диктофон · Расшифровка интервью художницы</span>
                      </div>
                      <div className="text-[11px] font-mono-tabular text-white/65">
                        REC_04_INTERVIEW.WAV · 00:18 / 00:42
                      </div>
                    </div>
                  </div>

                  {/* Animated Visual Waveform */}
                  <div className="flex items-center gap-1 h-6 px-3 rounded-lg bg-white/10" aria-hidden="true">
                    {[0.4, 0.9, 0.6, 1, 0.5, 0.85, 0.45, 0.95, 0.7, 0.55, 0.9, 0.4].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full bg-[#ffd66b] ${
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

                <blockquote className="rounded-xl bg-white/8 border border-white/10 px-4 py-2.5 text-xs sm:text-sm leading-relaxed text-white font-medium">
                  «Эскиз плаката я нарисовала сама, а трафареты мы вырезали вдвоём с мастером.
                  Печатали в три цвета — за весь день получилось ровно шесть экземпляров».
                </blockquote>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: REAL MANUSCRIPT DOCUMENT WITH INLINE MARKUP */}
                <div className="lg:col-span-7 bg-[#fdfcf8] rounded-3xl p-5 sm:p-7 border border-[#13294b]/15 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-[#13294b]/12 pb-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#13294b]/75">
                      <FileText className="w-4 h-4 text-[#c41e2e]" />
                      <span>Рукопись_Статья_Стр8_Черновик.docx</span>
                    </div>
                    <span className="font-mono-tabular text-xs font-extrabold text-[#157a4f]">
                      Проверено: {solvedEditCount} / 4
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#c41e2e]">
                      Репортаж из печатной мастерской
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-[#13294b]">
                      От эскиза до плаката
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
                          className={`w-full text-left rounded-xl p-3 border-2 transition-all block ${
                            isCurrent
                              ? 'bg-[#fff8d6] border-[#e59c2d] shadow-xs'
                              : solvedText
                                ? 'bg-[#effaf3] border-[#157a4f]/30'
                                : 'bg-white border-[#13294b]/10 hover:border-[#13294b]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono-tabular text-[10px] font-extrabold uppercase tracking-wider text-[#13294b]/55">
                              Фрагмент #{idx + 1} · {item.category}
                            </span>
                            {solvedText ? (
                              <span className="text-[11px] font-extrabold text-[#157a4f] inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Вычитано
                              </span>
                            ) : isCurrent ? (
                              <span className="text-[11px] font-extrabold text-[#b76506]">
                                Редактируется
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
                              <div className="font-bold text-[#157a4f]">{solvedText}</div>
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
                      Правка редактора · #{editStepIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#13294b]/60">
                      {activeEditItem.category}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#fff8eb] border border-[#f2d08b] p-3.5 space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#9c5a08]">
                      Фраза в рукописи:
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
                      <span>Исправлено верно! Выбери следующий фрагмент в рукописи.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]/60">
                        Выбери правку для рукописи:
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

          {/* ============ TASK 2: INTERACTIVE NEWSPAPER & MAGAZINE PAGE STUDIO ============ */}
          {taskIdx === 2 && (
            <>
              <MissionBanner
                image={MEDIA.w2StepLayout}
                imageAlt="Оформление страницы журнала на компьютере"
                stepLabel="Мастерская 2 · Шаг 3 из 4"
                title="Оформи страницу журнала за 4 простых шага"
                goal="Выбирай по одному элементу справа (заголовок, иллюстрация, раскладка и подпись). Страница слева обновится сразу."
                steps={[
                  { text: 'Выбери заголовок и иллюстрацию к статье о плакатах', done: layoutHeadline === 'strong' && layoutPhoto === 'print' },
                  { text: 'Подбери удобную для чтения раскладку', done: layoutPreset === 'columns' },
                  { text: 'Добавь подпись фотографа и утверди страницу', done: layoutCaption === 'good' && progress[2].completed },
                ]}
                resultPreview="Страница журнала оформлена аккуратно и готова к проверке."
                accentColor="#c41e2e"
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: REALISTIC NEWSPAPER/MAGAZINE ARTBOARD (CLICKABLE ZONES!) */}
                <div className="lg:col-span-7 rounded-3xl bg-[#1a2436] p-4 sm:p-5 border border-[#2d3b55] shadow-2xl space-y-3">
                  {/* Artboard Top Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-white/80 text-xs">
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <span className="px-2 py-0.5 rounded bg-[#c41e2e] text-white font-bold text-[10px]">
                        InLayout Pro
                      </span>
                      <span className="text-[11px] text-white/75">
                        Полоса № 08 · Кликни по любому блоку на полосе, чтобы настроить его
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
                      <span>Модульная сетка</span>
                    </button>
                  </div>

                  {/* Top Millimeter Ruler */}
                  <div className="hidden sm:flex justify-between px-4 text-[9px] font-mono-tabular text-white/40 border-b border-white/10 pb-1">
                    {[0, 30, 60, 90, 120, 150, 180, 210].map((mm) => (
                      <span key={mm}>{mm} мм</span>
                    ))}
                  </div>

                  {/* Authentic Newspaper/Magazine Sheet */}
                  <div className="relative bg-[#fbfaf6] rounded-xl p-5 sm:p-6 shadow-xl min-h-[430px] flex flex-col justify-between overflow-hidden border border-[#d6d1c4]">
                    {showLayoutGrid && (
                      <div
                        className="pointer-events-none absolute inset-x-5 inset-y-4 grid grid-cols-12 gap-3 z-10"
                        aria-hidden="true"
                      >
                        <div className="col-span-6 border border-dashed border-[#38bdf8]/45 bg-[#38bdf8]/[0.02] rounded" />
                        <div className="col-span-6 border border-dashed border-[#38bdf8]/45 bg-[#38bdf8]/[0.02] rounded" />
                      </div>
                    )}

                    <div className="relative z-0 space-y-3.5">
                      {/* Newspaper / Magazine Running Head & Masthead */}
                      <div className="border-b-2 border-[#13294b] pb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-display font-extrabold text-base tracking-tight text-[#13294b]">
                            КУЛЬТУРА
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#c41e2e]">
                            РУБРИКА: ПЕЧАТНАЯ МАСТЕРСКАЯ
                          </span>
                        </div>
                        <span className="font-mono-tabular text-[11px] font-extrabold text-[#13294b]/70">
                          ВЫПУСК № 01 · ПОЛОСА 08
                        </span>
                      </div>

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
                        className={`rounded-xl p-2.5 -mx-1 transition-all border-2 ${
                          layoutStep === 0
                            ? 'border-[#c41e2e] bg-[#fff4d4]/45 shadow-xs'
                            : 'border-transparent hover:border-[#13294b]/20'
                        }`}
                        title="Нажми, чтобы выбрать заголовок полосы"
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#c41e2e] mb-0.5">
                          <span>1. Заголовок полосы · Автор: Мария Соколова</span>
                          <span className="font-mono-tabular">
                            {layoutHeadline === 'strong' ? '✓ В тон статьи' : 'Нажми для смены'}
                          </span>
                        </div>
                        <h3 className="font-display font-extrabold text-lg sm:text-2xl leading-tight text-[#13294b]">
                          {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                        </h3>
                      </div>

                      {/* Layout Body Area (Step 1: Photo, Step 2: Grid Preset, Step 3: Caption) */}
                      {layoutPreset === 'textover' && (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const pId = e.dataTransfer.getData('text/plain') as 'print' | 'music' | 'arch';
                            if (pId === 'print' || pId === 'music' || pId === 'arch') {
                              soundEngine.playPaperSlide();
                              setLayoutPhoto(pId);
                            }
                          }}
                          className="relative rounded-xl overflow-hidden aspect-[16/10] w-full p-4 flex flex-col justify-end border-2 border-[#c41e2e]/40"
                        >
                          <img
                            src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                            alt="Иллюстрация статьи"
                            referrerPolicy="no-referrer"
                            onClick={() => setLayoutStep(1)}
                            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                          />
                          <div
                            onClick={() => setLayoutStep(2)}
                            className="relative bg-black/45 p-3.5 rounded-xl text-white cursor-pointer"
                          >
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#ffd66b] mb-1">
                              ⚠ Раскладка «Текст поверх фото» — низкий контраст текста
                            </div>
                            <p className="text-[11px] leading-snug text-white/90">
                              Художница нарисовала эскиз, а трафареты сделала вместе с мастером.
                              Плакаты печатали в три цвета и за день получили шесть экземпляров.
                              Шелкография позволяет печатать плотным, насыщенным слоем краски.
                            </p>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayoutStep(3);
                              }}
                              className="mt-2 pt-1.5 border-t border-white/20 text-[10px] text-[#ffd66b] font-bold"
                            >
                              4. Подпись: {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                            </div>
                          </div>
                        </div>
                      )}

                      {layoutPreset === 'giant' && (
                        <div className="space-y-3">
                          <div
                            onClick={() => setLayoutStep(1)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const pId = e.dataTransfer.getData('text/plain') as 'print' | 'music' | 'arch';
                              if (pId === 'print' || pId === 'music' || pId === 'arch') {
                                soundEngine.playPaperSlide();
                                setLayoutPhoto(pId);
                              }
                            }}
                            className={`rounded-xl overflow-hidden border-2 cursor-pointer ${
                              layoutStep === 1 ? 'border-[#c41e2e]' : 'border-transparent'
                            }`}
                          >
                            <img
                              src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                              alt="Иллюстрация статьи"
                              referrerPolicy="no-referrer"
                              className="w-full aspect-[16/9] max-h-40 object-cover"
                            />
                          </div>
                          <div
                            onClick={() => setLayoutStep(3)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                              layoutStep === 3
                                ? 'bg-[#fff4d4] border-[#c41e2e] text-[#13294b]'
                                : 'bg-white border-[#13294b]/15 text-[#13294b]/75'
                            }`}
                          >
                            4. Подпись: {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                          </div>
                          <div
                            onClick={() => setLayoutStep(2)}
                            className="p-2.5 rounded-xl border border-dashed border-[#c41e2e]/50 bg-[#fde8ea]/40 cursor-pointer"
                          >
                            <div className="text-[10px] font-extrabold uppercase text-[#c41e2e] mb-1">
                              ⚠ Слишком крупный кегль на всю ширину полосы (строка длиннее нормы ГОСТ)
                            </div>
                            <p className="text-lg leading-snug text-[#13294b]">
                              Художница нарисовала эскиз, а трафареты сделала вместе с мастером.
                              Плакаты печатали в три цвета и за день получили шесть экземпляров.
                            </p>
                          </div>
                        </div>
                      )}

                      {layoutPreset === 'columns' && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                          {/* Left 6 Cols: Newspaper Article Columns with Drop Cap & Pull-Quote */}
                          <div
                            onClick={() => setLayoutStep(2)}
                            className={`sm:col-span-6 space-y-2.5 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                              layoutStep === 2
                                ? 'border-[#c41e2e] bg-[#fff4d4]/30'
                                : 'border-transparent hover:border-[#13294b]/15'
                            }`}
                            title="3. Модульная двухколонная вёрстка"
                          >
                            <p className="text-xs sm:text-[13px] text-[#13294b]/90 leading-relaxed text-justify">
                              <span className="float-left font-display font-extrabold text-3xl leading-none mr-2 mt-0.5 text-[#c41e2e]">
                                Х
                              </span>
                              удожница нарисовала эскиз, а трафареты сделала вместе с мастером.
                              Плакаты печатали в три цвета и за день получили шесть экземпляров.
                            </p>
                            <blockquote className="border-l-2 border-[#c41e2e] pl-2.5 py-0.5 text-[11px] font-extrabold italic text-[#13294b]">
                              «Печатали в три цвета — получилось ровно шесть авторских оттисков»
                            </blockquote>
                            <p className="text-xs sm:text-[13px] text-[#13294b]/90 leading-relaxed text-justify">
                              Шелкография позволяет печатать плотным, насыщенным слоем краски.
                              Открытие выставки прошло в 19:00 и стало дебютом студии.
                            </p>
                          </div>

                          {/* Right 6 Cols: Photo Frame + Credit Caption + Issue Teaser Box */}
                          <div className="sm:col-span-6 space-y-2.5">
                            <div
                              onClick={() => setLayoutStep(1)}
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
                                  ? 'border-[#c41e2e] ring-2 ring-[#ffd66b]'
                                  : 'border-[#13294b]/15 hover:border-[#13294b]/40'
                              }`}
                              title="2. Главное фото полосы (кликни или перетащи фото справа)"
                            >
                              <img
                                src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                                alt="Иллюстрация статьи"
                                referrerPolicy="no-referrer"
                                className="w-full aspect-[4/3] object-cover"
                              />
                              <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/65 text-white font-mono-tabular text-[9px] font-bold">
                                2. Иллюстрация
                              </span>
                            </div>

                            {/* Clickable Photo Caption Bar */}
                            <div
                              onClick={() => setLayoutStep(3)}
                              className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-bold cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                layoutStep === 3
                                  ? 'border-[#c41e2e] bg-[#fff4d4]'
                                  : layoutCaption === 'good'
                                    ? 'border-[#157a4f]/35 bg-[#e9f7ef] text-[#157a4f]'
                                    : 'border-[#13294b]/15 bg-white text-[#13294b]/75'
                              }`}
                              title="4. Подпись и автор фотографии"
                            >
                              <span className="truncate">
                                {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                              </span>
                              <span className="font-mono-tabular text-[9px] uppercase shrink-0">
                                4. Подпись
                              </span>
                            </div>

                            {/* Secondary Editorial Teaser Block (Like in a Real Magazine Issue) */}
                            <div className="rounded-lg bg-[#13294b]/[0.04] border border-[#13294b]/12 p-2 flex items-center gap-2.5">
                              <img
                                src={MEDIA.studioMusic}
                                alt="Анонс стр. 14"
                                className="w-11 h-9 rounded object-cover shrink-0"
                              />
                              <div className="min-w-0 leading-tight">
                                <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#135c75]">
                                  Далее в номере · Стр. 14
                                </div>
                                <div className="text-[11px] font-bold text-[#13294b] truncate">
                                  За кулисами вечернего фестиваля
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Newspaper Folio Footer */}
                    <div className="pt-2.5 mt-3 border-t border-[#13294b]/15 flex items-center justify-between text-[10px] font-mono-tabular font-bold text-[#13294b]/60">
                      <span>08 · ЖУРНАЛ «КУЛЬТУРА» · ИЗДАТЕЛЬСКОЕ ДЕЛО БИД</span>
                      <span>ГОСТ Р 7.0.4 · 300 DPI · CMYK</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT 5 COLS: PROPERTIES INSPECTOR & LIVE PREFLIGHT CHECKLIST */}
                <aside className="lg:col-span-5 bg-white rounded-3xl p-5 border border-[#13294b]/12 shadow-md space-y-4">
                  {/* Live Technical Quality Meters */}
                  <div className="rounded-2xl bg-[#f4f7fc] p-3 border border-[#13294b]/10 grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">Заголовок:</span>
                      <span className={layoutHeadline === 'strong' ? 'text-[#157a4f]' : 'text-[#b76506]'}>
                        {layoutHeadline === 'strong' ? '✓ Точный' : 'Черновик'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">Снимок:</span>
                      <span className={layoutPhoto === 'print' ? 'text-[#157a4f]' : 'text-[#b76506]'}>
                        {layoutPhoto === 'print' ? '✓ По теме' : 'Другая тема'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">Сетка:</span>
                      <span className={layoutPreset === 'columns' ? 'text-[#157a4f]' : 'text-[#b76506]'}>
                        {layoutPreset === 'columns' ? '✓ 2 колонки' : 'Трудно читать'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white">
                      <span className="text-[#13294b]/70">Автор фото:</span>
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
                stepLabel="Мастерская 2 · Шаг 4 из 4"
                title="Проверь 4 страницы журнала перед печатью"
                goal="Сверь выделенный элемент на каждой странице с памяткой номера и выбери верный вариант прямо под страницей."
                steps={[
                  { text: 'Сверь страницу с памяткой номера сверху', done: true },
                  { text: `Исправь неточности на всех 4 страницах (${fixedCount} из 4)`, done: fixedCount === 4 },
                  { text: 'Нажми «Подписать номер в печать»', done: progress[3].completed },
                ]}
                resultPreview="Журнал «Культура · № 01» подписан в печать."
                accentColor="#c41e2e"
                onHint={handleHintClick}
              />

              {/* Technical Spec Strip + CMYK Color Bars */}
              <div className="rounded-2xl bg-[#13294b] text-white px-5 py-3 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-display font-extrabold text-[#ffd66b]">Памятка номера:</span>
                  <span>Возраст: 12+</span>
                  <span className="text-white/35">·</span>
                  <span>Стр. 8: «От эскиза до плаката» (Фото: Алексей Климов)</span>
                  <span className="text-white/35">·</span>
                  <span>Стр. 14: «За кулисами фестиваля»</span>
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
                                isCurrent ? 'text-[#ffd66b]' : 'text-current/70'
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
                  {/* Press Proof Sheet Frame with Crop Marks */}
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
                          <span className="px-4 py-1.5 rounded-xl font-mono-tabular text-base font-extrabold border-2 bg-white text-[#13294b] border-[#ffd66b] shadow">
                            {fixedDefects.age} ✎
                          </span>
                        </div>
                        <div className="relative space-y-1">
                          <div className="font-display font-extrabold text-3xl sm:text-4xl">КУЛЬТУРА</div>
                          <div className="text-sm text-[#ffd66b] font-bold">
                            От эскиза до плаката · За кулисами фестиваля
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
                                От эскиза до плаката
                              </div>
                              <div className="text-xs text-[#13294b]/65">Мария Соколова · Главная статья</div>
                            </div>
                            <span className="px-3.5 py-1.5 rounded-xl font-mono-tabular text-sm font-extrabold border-2 bg-[#fff8d6] border-[#e59c2d] text-[#13294b]">
                              {fixedDefects.page} ✎
                            </span>
                          </div>
                          <div className="py-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="font-display font-bold text-base text-[#13294b]">
                                За кулисами фестиваля
                              </div>
                              <div className="text-xs text-[#13294b]/65">Илья Родин · Фоторепортаж</div>
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
                            СТР. 8 · ГЛАВНАЯ СТАТЬЯ
                          </div>
                          <h3 className="font-display font-extrabold text-xl text-[#13294b] leading-snug">
                            От эскиза до плаката
                          </h3>
                          <p className="text-sm text-[#13294b]/80 leading-relaxed">
                            Художница нарисовала эскиз, а трафареты сделала вместе с мастером. Плакаты
                            печатали в три цвета и за день получили шесть экземпляров.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <img
                            src={MEDIA.studioPrint}
                            alt="Печать плаката в мастерской"
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] object-cover rounded-xl shadow-sm"
                          />
                          <div className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border-2 bg-[#fff8d6] border-[#e59c2d] text-[#13294b] flex items-center justify-between">
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
                            alt="Вечерний двор и гости фестиваля"
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] object-cover rounded-xl shadow-sm"
                          />
                          <div className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border-2 bg-[#fff8d6] border-[#e59c2d] text-[#13294b] flex items-center justify-between">
                            <span>{fixedDefects.caption}</span>
                            <span>✎</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold text-[#135c75]">
                            СТР. 14 · ФОТОРЕПОРТАЖ
                          </div>
                          <h3 className="font-display font-extrabold text-xl text-[#13294b] leading-snug">
                            За кулисами фестиваля
                          </h3>
                          <p className="text-sm text-[#13294b]/80 leading-relaxed">
                            За три часа до старта команда подготовила площадку, зажгла огни во дворе и
                            встретила первых гостей вечерней программы.
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
