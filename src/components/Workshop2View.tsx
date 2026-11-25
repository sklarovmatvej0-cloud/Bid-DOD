import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Columns,
  Image as ImageIcon,
  Layers,
  Mic,
  Printer,
  Sparkles,
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

  /* ---- Task 0: Focused One-Card-at-a-Time Article Selection ---- */
  const [activePitchIdx, setActivePitchIdx] = useState(0);
  const [placedLeadId, setPlacedLeadId] = useState<string | null>(null);
  const [placedBriefId, setPlacedBriefId] = useState<string | null>(null);
  const [trashedIds, setTrashedIds] = useState<string[]>([]);
  const [deskFeedback, setDeskFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  /* ---- Task 1: One Sentence at a Time Proofreading ---- */
  const [editStepIdx, setEditStepIdx] = useState(0);
  const [solvedEdits, setSolvedEdits] = useState<Record<string, string>>({});
  const [editFeedback, setEditFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  /* ---- Task 2: 4-Step Visual Page Designer ---- */
  const [layoutStep, setLayoutStep] = useState<number>(0);
  const [layoutHeadline, setLayoutHeadline] = useState<'dry' | 'clickbait' | 'strong'>('dry');
  const [layoutPhoto, setLayoutPhoto] = useState<'print' | 'music' | 'arch'>('arch');
  const [layoutPreset, setLayoutPreset] = useState<'textover' | 'columns' | 'giant'>('textover');
  const [layoutCaption, setLayoutCaption] = useState<'none' | 'wrong' | 'good'>('none');

  /* ---- Task 3: Focused 4-Page Pre-Print Check ---- */
  const [proofPage, setProofPage] = useState<number>(0);
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
    if (!pitch) return;

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

  /* ---- Task 1 Handlers (Instant One-Sentence-at-a-Time Flow) ---- */
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact Stepper */}
      <div className="shrink-0 bg-white border-b border-[#13294b]/10 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {wsMeta.tasks.map((t, idx) => {
            const done = progress[idx].completed;
            const active = taskIdx === idx;
            return (
              <button
                key={t.title}
                type="button"
                onClick={() => onSelectTask(idx)}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#c41e2e] text-white'
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
              className="min-h-[38px] px-3.5 rounded-xl bg-[#fff4d4] text-[#8a4d03] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Готовый журнал
            </button>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 min-h-0 overflow-y-auto desk-scroll px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto space-y-5 animate-card-in" key={`w2-t${taskIdx}`}>
          {/* ============ TASK 0: SIMPLE ONE-CARD ARTICLE SELECTION ============ */}
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

              {/* Compact 1-Line Status Bar (Replaces Heavy Competing Sidebar) */}
              <div className="rounded-2xl bg-[#13294b] text-white px-5 py-3.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  <span>
                    <strong className="text-[#ffd66b]">Главная (стр. 8):</strong>{' '}
                    {leadPitch ? `✓ ${leadPitch.title}` : 'свободно'}
                  </span>
                  <span>
                    <strong className="text-[#ffd66b]">Короткая (стр. 14):</strong>{' '}
                    {briefPitch ? `✓ ${briefPitch.title}` : 'свободно'}
                  </span>
                  <span>
                    <strong className="text-[#ffd66b]">Отклонено:</strong> {trashedIds.length} из 2
                  </span>
                </div>
                <span className="font-mono-tabular font-extrabold text-[#ffd66b]">
                  Разобрано {sortedCount} из 4
                </span>
              </div>

              {/* Clean Tabs for 4 Articles */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {EDITORIAL_PITCHES.map((p, idx) => {
                  const sorted = isPitchSorted(p.id);
                  const isCurrent = activePitchIdx === idx;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelectTick();
                        setActivePitchIdx(idx);
                        setDeskFeedback(null);
                      }}
                      className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#c41e2e] text-white shadow-sm'
                          : sorted
                            ? 'bg-[#e9f7ef] text-[#157a4f]'
                            : 'bg-white text-[#13294b] border border-[#13294b]/15 hover:bg-[#f4f7fc]'
                      }`}
                    >
                      {sorted && <Check className="w-4 h-4" />}
                      <span>Заявка {idx + 1}</span>
                    </button>
                  );
                })}
              </div>

              {/* Single Focused Card */}
              <div className="bg-white rounded-3xl border border-[#13294b]/12 shadow-md p-5 sm:p-7 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5 aspect-[4/3] rounded-2xl overflow-hidden bg-[#f4f7fc] border border-[#13294b]/10">
                    <img
                      src={activePitch.img}
                      alt={activePitch.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="md:col-span-7 space-y-3">
                    <div className="text-xs font-extrabold text-[#c41e2e]">
                      {activePitch.kind} · Автор: {activePitch.by}
                    </div>
                    <h3 className="font-display font-extrabold text-2xl text-[#13294b] leading-tight">
                      {activePitch.title}
                    </h3>
                    <div className="rounded-2xl bg-[#fff8eb] border border-[#f2d08b] p-4 space-y-1">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#9c5a08]">
                        Что написал автор:
                      </div>
                      <p className="text-sm sm:text-base text-[#13294b] leading-relaxed font-medium">
                        {activePitch.emailText}
                      </p>
                    </div>
                  </div>
                </div>

                {deskFeedback && (
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-sm font-bold animate-card-in ${
                      deskFeedback.ok
                        ? 'bg-[#e9f7ef] text-[#157a4f]'
                        : 'bg-[#fde8ea] text-[#c41e2e]'
                    }`}
                  >
                    {deskFeedback.text}
                  </div>
                )}

                {isPitchSorted(activePitch.id) ? (
                  <div className="rounded-2xl bg-[#e9f7ef] px-4 py-3.5 text-sm font-extrabold text-[#157a4f] flex items-center gap-2">
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
                  <div className="space-y-2.5 pt-3 border-t border-[#13294b]/10">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]/60">
                      Твоё решение:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        disabled={Boolean(placedLeadId)}
                        onClick={() => handleDecidePitch(activePitch.id, 'lead')}
                        className="min-h-[50px] px-4 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] disabled:opacity-40 text-white text-xs sm:text-sm font-extrabold transition-colors"
                      >
                        {placedLeadId ? 'Стр. 8 уже занята' : 'На главную (стр. 8)'}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(placedBriefId)}
                        onClick={() => handleDecidePitch(activePitch.id, 'brief')}
                        className="min-h-[50px] px-4 rounded-xl bg-[#135c75] hover:bg-[#187595] disabled:opacity-40 text-white text-xs sm:text-sm font-extrabold transition-colors"
                      >
                        {placedBriefId ? 'Стр. 14 уже занята' : 'В короткую рубрику (стр. 14)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecidePitch(activePitch.id, 'trash')}
                        className="min-h-[50px] px-4 rounded-xl bg-[#fde8ea] hover:bg-[#c41e2e] text-[#c41e2e] hover:text-white text-xs sm:text-sm font-extrabold transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Отклонить заявку
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============ TASK 1: ONE-SENTENCE-AT-A-TIME PROOFREADING ============ */}
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

              {/* Top Reference Strip: Interview Quote */}
              <div className="rounded-3xl bg-[#13294b] text-white p-5 sm:p-6 shadow-md space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                  <Mic className="w-4 h-4 text-[#ff6b78]" />
                  <span>Что сказала художница в интервью:</span>
                </div>
                <blockquote className="text-sm sm:text-base leading-relaxed text-white font-medium">
                  «Эскиз плаката я нарисовала сама, а трафареты мы вырезали вдвоём с мастером.
                  Печатали в три цвета — за весь день получилось ровно шесть экземпляров».
                </blockquote>
              </div>

              {/* 4 Sentence Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {EDITORIAL_EDITS.map((item, idx) => {
                  const solved = Boolean(solvedEdits[item.id]);
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
                      className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#c41e2e] text-white shadow-sm'
                          : solved
                            ? 'bg-[#e9f7ef] text-[#157a4f]'
                            : 'bg-white text-[#13294b] border border-[#13294b]/15 hover:bg-[#f4f7fc]'
                      }`}
                    >
                      {solved && <Check className="w-4 h-4" />}
                      <span>Предложение {idx + 1}</span>
                    </button>
                  );
                })}
              </div>

              {/* Single Clean Proofreading Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#13294b]/12 shadow-md space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                    Предложение {editStepIdx + 1} из 4 · {activeEditItem.category}
                  </span>
                  <span className="font-mono-tabular text-xs font-extrabold text-[#157a4f]">
                    Готово: {solvedEditCount} / 4
                  </span>
                </div>

                <div className="rounded-2xl bg-[#fff8eb] border border-[#f2d08b] p-4 sm:p-5 space-y-1.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#9c5a08]">
                    В черновике статьи написано:
                  </div>
                  <p className="text-base sm:text-lg font-display font-extrabold text-[#13294b] leading-snug">
                    «{activeEditItem.original}»
                  </p>
                </div>

                {editFeedback && (
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-sm font-bold animate-card-in ${
                      editFeedback.ok
                        ? 'bg-[#e9f7ef] text-[#157a4f]'
                        : 'bg-[#fde8ea] text-[#c41e2e]'
                    }`}
                  >
                    {editFeedback.text}
                  </div>
                )}

                {solvedEdits[activeEditItem.id] ? (
                  <div className="rounded-2xl bg-[#e9f7ef] px-4 py-3.5 text-sm font-extrabold text-[#157a4f] flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      Исправлено верно:{' '}
                      {
                        activeEditItem.options.find((o) => o.id === solvedEdits[activeEditItem.id])
                          ?.text
                      }
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]/60">
                      Как правильно написать?
                    </div>
                    <div className="space-y-2.5">
                      {activeEditItem.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAnswerEdit(opt)}
                          className="w-full p-4 rounded-2xl bg-[#f5f8fc] hover:bg-[#13294b] hover:text-white border-2 border-[#13294b]/10 hover:border-[#13294b] text-left text-sm sm:text-base font-bold text-[#13294b] transition-colors"
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============ TASK 2: STEP-BY-STEP MAGAZINE PAGE DESIGNER ============ */}
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT 7 COLS: LIVE MAGAZINE PAGE PREVIEW */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-[#13294b]/15 shadow-lg min-h-[440px] flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-[#13294b]/12 pb-2.5 text-xs font-mono-tabular font-bold text-[#c41e2e]">
                      <span>ЖУРНАЛ «КУЛЬТУРА» · МАСТЕРСКАЯ</span>
                      <span>СТР. 8</span>
                    </div>

                    {layoutPreset === 'textover' && (
                      <div className="relative rounded-2xl overflow-hidden aspect-[4/3] p-5 flex flex-col justify-end">
                        <img
                          src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                          alt="Иллюстрация статьи"
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="relative bg-black/35 p-3.5 rounded-xl text-white">
                          <h3 className="font-display font-extrabold text-base leading-snug">
                            {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                          </h3>
                          <p className="mt-2 text-[10px] leading-snug text-white/90">
                            Художница нарисовала эскиз, а трафареты сделала вместе с мастером.
                            Плакаты печатали в три цвета и за день получили шесть экземпляров.
                          </p>
                          {layoutCaption !== 'none' && (
                            <div className="mt-2 text-[10px] text-white/80">
                              {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {layoutPreset === 'giant' && (
                      <div className="space-y-4">
                        <figure className="space-y-1.5">
                          <img
                            src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                            alt="Иллюстрация статьи"
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] max-h-56 object-cover rounded-2xl"
                          />
                          {layoutCaption !== 'none' && (
                            <figcaption className="text-xs text-[#13294b]/65">
                              {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                            </figcaption>
                          )}
                        </figure>
                        <h3 className="font-display font-extrabold text-2xl leading-tight text-[#13294b]">
                          {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                        </h3>
                        <p className="text-xl leading-snug text-[#13294b]/85">
                          Художница нарисовала эскиз, а трафареты сделала вместе с мастером.
                          Плакаты печатали в три цвета и за день получили шесть экземпляров.
                        </p>
                      </div>
                    )}

                    {layoutPreset === 'columns' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                        <div className="space-y-3">
                          <h3 className="font-display font-extrabold text-xl leading-snug text-[#13294b]">
                            {LAYOUT_HEADLINES.find((h) => h.id === layoutHeadline)?.text}
                          </h3>
                          <p className="text-sm text-[#13294b]/85 leading-relaxed">
                            Художница нарисовала эскиз, а трафареты сделала вместе с мастером.
                            Плакаты печатали в три цвета и за день получили шесть экземпляров.
                          </p>
                          <p className="text-sm text-[#13294b]/85 leading-relaxed">
                            Шелкография позволяет печатать плотным, насыщенным слоем краски.
                            Открытие выставки прошло в 19:00 и стало дебютом студии.
                          </p>
                        </div>
                        <figure className="space-y-2">
                          <img
                            src={LAYOUT_PHOTOS.find((p) => p.id === layoutPhoto)?.img}
                            alt="Иллюстрация статьи"
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] object-cover rounded-2xl shadow-sm"
                          />
                          {layoutCaption !== 'none' && (
                            <figcaption className="text-xs font-semibold text-[#13294b]/70">
                              {LAYOUT_CAPTIONS.find((c) => c.id === layoutCaption)?.text}
                            </figcaption>
                          )}
                        </figure>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-5 border-t border-[#13294b]/10 text-xs text-[#13294b]/55">
                    Так будет выглядеть страница 8 в журнале «Культура»
                  </div>
                </div>

                {/* RIGHT 5 COLS: ONE SETTING STEP AT A TIME (4 CLEAN TABS) */}
                <aside className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#13294b]/12 shadow-sm space-y-5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {LAYOUT_STEPS.map((st) => {
                      const active = layoutStep === st.idx;
                      return (
                        <button
                          key={st.label}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setLayoutStep(st.idx);
                          }}
                          className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold transition-colors text-left ${
                            active
                              ? 'bg-[#c41e2e] text-white'
                              : 'bg-[#f4f7fc] text-[#13294b]/75 hover:bg-[#e6edf8]'
                          }`}
                        >
                          {st.label}
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
                            onClick={() => {
                              soundEngine.playSelectTick();
                              setLayoutPhoto(p.id);
                            }}
                            className={`w-full p-2.5 rounded-2xl border-2 flex items-center gap-3 text-left transition-all ${
                              layoutPhoto === p.id
                                ? 'border-[#c41e2e] bg-[#13294b] text-white'
                                : 'border-transparent bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b]'
                            }`}
                          >
                            <img
                              src={p.img}
                              alt={p.label}
                              referrerPolicy="no-referrer"
                              className="w-20 aspect-[4/3] object-cover rounded-xl shrink-0"
                            />
                            <span className="text-sm font-extrabold">{p.label}</span>
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
                        className="min-h-[44px] px-4 rounded-xl bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1"
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
                        className="min-h-[44px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5"
                      >
                        Дальше <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckTask2}
                        className="min-h-[46px] px-5 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                      >
                        Утвердить страницу →
                      </button>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}

          {/* ============ TASK 3: FOCUSED TOP-TO-BOTTOM 4-PAGE PRE-PRINT CHECK ============ */}
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

              {/* Clean Reference Strip */}
              <div className="rounded-2xl bg-[#13294b] text-white px-5 py-3.5 text-xs sm:text-sm flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="font-display font-extrabold text-[#ffd66b]">Памятка номера:</span>
                <span>Возраст: 12+</span>
                <span className="text-white/35">·</span>
                <span>Стр. 8: «От эскиза до плаката» (Фото: Алексей Климов)</span>
                <span className="text-white/35">·</span>
                <span>Стр. 14: «За кулисами фестиваля»</span>
              </div>

              {/* Clean Page Tabs + Primary Submit */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {PROOF_PAGES.map((tab) => {
                    const isFixed = fixedDefects[tab.defId] === PROOF_DEFECTS[tab.defId].good;
                    const isCurrent = proofPage === tab.idx;
                    return (
                      <button
                        key={tab.label}
                        type="button"
                        onClick={() => {
                          soundEngine.playPaperSlide();
                          setProofPage(tab.idx);
                        }}
                        className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
                          isCurrent
                            ? 'bg-[#c41e2e] text-white'
                            : isFixed
                              ? 'bg-[#e9f7ef] text-[#157a4f]'
                              : 'bg-white text-[#13294b] border border-[#13294b]/15 hover:bg-[#f4f7fc]'
                        }`}
                      >
                        {isFixed && <CheckCircle2 className="w-4 h-4" />}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleCheckTask3}
                  className="min-h-[44px] px-5 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" />
                  Подписать в печать ({fixedCount}/4)
                </button>
              </div>

              {/* Single Clean Page Preview + Direct Question Underneath */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#13294b]/12 shadow-md space-y-6">
                {proofPage === 0 && (
                  <div className="relative rounded-2xl overflow-hidden bg-[#13294b] text-white min-h-[280px] p-6 flex flex-col justify-between">
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
                      <span
                        className={`px-4 py-2 rounded-xl font-mono-tabular text-base font-extrabold border-2 ${
                          fixedDefects.age === PROOF_DEFECTS.age.good
                            ? 'bg-[#157a4f] border-[#86efac] text-white'
                            : 'bg-white text-[#c41e2e] border-[#c41e2e]'
                        }`}
                      >
                        {fixedDefects.age}
                      </span>
                    </div>
                    <div className="relative space-y-1">
                      <div className="font-display font-extrabold text-4xl">КУЛЬТУРА</div>
                      <div className="text-sm text-[#ffd66b] font-bold">
                        От эскиза до плаката · За кулисами фестиваля
                      </div>
                    </div>
                  </div>
                )}

                {proofPage === 1 && (
                  <div className="space-y-4">
                    <div className="border-b border-[#13294b]/10 pb-3">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                        Журнал «Культура» · № 01
                      </div>
                      <h3 className="font-display font-extrabold text-2xl text-[#13294b] mt-1">
                        Содержание номера
                      </h3>
                    </div>
                    <div className="divide-y divide-[#13294b]/10">
                      <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-display font-bold text-base text-[#13294b]">
                            От эскиза до плаката
                          </div>
                          <div className="text-xs text-[#13294b]/65">Мария Соколова · Главная статья</div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-xl font-mono-tabular text-sm font-extrabold border-2 ${
                            fixedDefects.page === PROOF_DEFECTS.page.good
                              ? 'bg-[#e9f7ef] border-[#157a4f] text-[#157a4f]'
                              : 'bg-[#fde8ea] border-[#c41e2e] text-[#c41e2e]'
                          }`}
                        >
                          {fixedDefects.page}
                        </span>
                      </div>
                      <div className="py-4 flex items-center justify-between gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2.5">
                      <div className="text-xs font-extrabold text-[#c41e2e]">
                        СТР. 8 · ГЛАВНАЯ СТАТЬЯ
                      </div>
                      <h3 className="font-display font-extrabold text-2xl text-[#13294b] leading-snug">
                        От эскиза до плаката
                      </h3>
                      <p className="text-sm text-[#13294b]/80 leading-relaxed">
                        Художница нарисовала эскиз, а трафареты сделала вместе с мастером. Плакаты
                        печатали в три цвета и за день получили шесть экземпляров.
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      <img
                        src={MEDIA.studioPrint}
                        alt="Печать плаката в мастерской"
                        referrerPolicy="no-referrer"
                        className="w-full aspect-[4/3] object-cover rounded-2xl shadow-sm"
                      />
                      <div
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-extrabold border-2 ${
                          fixedDefects.author === PROOF_DEFECTS.author.good
                            ? 'bg-[#e9f7ef] border-[#157a4f] text-[#157a4f]'
                            : 'bg-[#fde8ea] border-[#c41e2e] text-[#c41e2e]'
                        }`}
                      >
                        {fixedDefects.author}
                      </div>
                    </div>
                  </div>
                )}

                {proofPage === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2.5">
                      <img
                        src={MEDIA.studioMusic}
                        alt="Вечерний двор и гости фестиваля"
                        referrerPolicy="no-referrer"
                        className="w-full aspect-[4/3] object-cover rounded-2xl shadow-sm"
                      />
                      <div
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-extrabold border-2 ${
                          fixedDefects.caption === PROOF_DEFECTS.caption.good
                            ? 'bg-[#e9f7ef] border-[#157a4f] text-[#157a4f]'
                            : 'bg-[#fde8ea] border-[#c41e2e] text-[#c41e2e]'
                        }`}
                      >
                        {fixedDefects.caption}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="text-xs font-extrabold text-[#135c75]">
                        СТР. 14 · ФОТОРЕПОРТАЖ
                      </div>
                      <h3 className="font-display font-extrabold text-2xl text-[#13294b] leading-snug">
                        За кулисами фестиваля
                      </h3>
                      <p className="text-sm text-[#13294b]/80 leading-relaxed">
                        За три часа до старта команда подготовила площадку, зажгла огни во дворе и
                        встретила первых гостей вечерней программы.
                      </p>
                    </div>
                  </div>
                )}

                {/* Direct Question & 3 Options Right Underneath the Page */}
                <div className="pt-5 border-t border-[#13294b]/10 space-y-3">
                  <div className="font-display font-extrabold text-base text-[#13294b]">
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
                            setFixedDefects((prev) => ({
                              ...prev,
                              [currentProofTab.defId]: alt,
                            }));
                          }}
                          className={`min-h-[48px] px-4 py-3 rounded-xl text-left text-xs sm:text-sm font-bold transition-colors ${
                            selected
                              ? 'bg-[#13294b] text-white'
                              : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b]'
                          }`}
                        >
                          {alt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    {proofPage < PROOF_PAGES.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPaperSlide();
                          setProofPage((p) => p + 1);
                        }}
                        className="min-h-[44px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5"
                      >
                        Следующая страница <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckTask3}
                        className="min-h-[46px] px-6 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-sm"
                      >
                        <Printer className="w-4 h-4" />
                        Подписать номер в печать ({fixedCount}/4)
                      </button>
                    )}
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
