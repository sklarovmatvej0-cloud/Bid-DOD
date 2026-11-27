import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { MEDIA } from '../game/assets';
import {
  COMMUNITY_COMMENTS,
  CONCEPT_STEPS,
  EVENT_BUDGET_STEPS,
  SMM_CONSTRUCTOR_STEPS,
  SURVEY_STATS,
  WORKSHOPS,
} from '../game/knigogradData';
import { FeedbackState, KnigogradSave, TaskProgress } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';
import { MissionBanner } from './MissionBanner';
import { ProjectShowcase3D } from './ProjectShowcase3D';
import { AnimatedNumber } from './VisualEffects';
import { WorkshopStepper } from './WorkshopStepper';

interface Workshop3ViewProps {
  taskIdx: number;
  isShowcase: boolean;
  progress: TaskProgress[];
  save: KnigogradSave;
  onSelectTask: (idx: number) => void;
  onOpenShowcase: () => void;
  onOpenResults: () => void;
  onRecordMistake: (taskIdx: number) => void;
  onUseHint: (taskIdx: number, hintTitle: string, hintBody: string) => void;
  onCompleteTask: (
    taskIdx: number,
    feedback: Omit<FeedbackState, 'bibliksAwarded' | 'alreadyDone'>,
    extraSave?: Partial<KnigogradSave>
  ) => void;
  onShowError: (title: string, body: string) => void;
}

const ZONE_IMAGES: Record<string, string> = {
  main: MEDIA.sceneFestivalStage,
  zones: MEDIA.sceneFestivalComics,
  care: MEDIA.sceneSmmFestival,
};

const SMM_VISUAL_PREVIEWS: Record<string, string> = {
  best: MEDIA.w3SmmCards,
  wall: MEDIA.w3SmmTextwall,
};

export const Workshop3View: React.FC<Workshop3ViewProps> = ({
  taskIdx,
  isShowcase,
  progress,
  save,
  onSelectTask,
  onOpenShowcase,
  onOpenResults,
  onRecordMistake,
  onUseHint,
  onCompleteTask,
  onShowError,
}) => {
  const wsMeta = WORKSHOPS[2];

  /* ---- Task 0: Producer Concept & Poster Studio ---- */
  const [conceptStepIdx, setConceptStepIdx] = useState(0);
  const [conceptPicks, setConceptPicks] = useState<Record<string, string>>({});

  /* ---- Task 1: Festival Command Center + Budget & Timeline ---- */
  const [activeZoneIdx, setActiveZoneIdx] = useState(0);
  const [budgetPicks, setBudgetPicks] = useState<Record<string, string>>({});

  /* ---- Task 2: Tabbed SMM Studio + Realistic Smartphone ---- */
  const [smmStepIdx, setSmmStepIdx] = useState(0);
  const [smmCardSlide, setSmmCardSlide] = useState(0);
  const [smmPicks, setSmmPicks] = useState<Record<string, string>>({
    hook: 'dry',
    visual: 'wall',
    cta: 'weak',
    timing: 'late',
  });

  /* ---- Task 3: Community Inbox + Comment Thread ---- */
  const [chatIdx, setChatIdx] = useState(0);
  const [resolvedChats, setResolvedChats] = useState<
    Record<string, { reply: string; guestReaction: string }>
  >({});
  const [chatWarning, setChatWarning] = useState<string | null>(null);

  /* ---- Derived Metrics ---- */
  const budgetMetrics = EVENT_BUDGET_STEPS.reduce(
    (acc, step) => {
      const picked = step.options.find((o) => o.id === budgetPicks[step.id]);
      if (!picked) return acc;
      return {
        cost: acc.cost + picked.cost,
        vibe: acc.vibe + picked.vibe,
        org: acc.org + picked.org,
        count: acc.count + 1,
      };
    },
    { cost: 0, vibe: 0, org: 0, count: 0 }
  );

  const smmMetrics = SMM_CONSTRUCTOR_STEPS.reduce(
    (acc, step) => {
      const picked = step.options.find((o) => o.id === smmPicks[step.id]);
      if (!picked) return acc;
      return {
        likes: acc.likes + picked.likes,
        comments: acc.comments + picked.comments,
        regs: acc.regs + picked.regs,
      };
    },
    { likes: 0, comments: 0, regs: 0 }
  );

  /* ---- Check Task 0 ---- */
  const handleCheckTask0 = () => {
    if (Object.keys(conceptPicks).length < CONCEPT_STEPS.length) {
      onShowError(
        'Заполни все 3 пункта афиши',
        'Выбери формат, название и партнёров слева — они сразу появятся на живой афише справа!'
      );
      return;
    }

    for (let i = 0; i < CONCEPT_STEPS.length; i++) {
      const step = CONCEPT_STEPS[i];
      const chosen = step.options.find((o) => o.id === conceptPicks[step.id]);
      if (!chosen?.isBest) {
        onRecordMistake(0);
        setConceptStepIdx(i);
        onShowError('Афишу можно сделать ярче!', chosen?.feedback ?? 'Сверься с данными опроса аудитории.');
        return;
      }
    }

    onCompleteTask(
      0,
      {
        success: true,
        title: 'Афиша акции «Библионочь» готова!',
        body: 'Ты учёл результаты опроса аудитории и собрал сильную концепцию: интерактивный формат, понятное название и подходящих партнёров.',
        lesson:
          'На профиле «Креативный менеджмент в БИД» проекты создают на основе реальных интересов читателей, а не «для отчёта».',
        nextActionLabel: 'Распределить грант по площадкам (шаг 2)',
        onNext: 'next_task',
      },
      { festivalName: 'Библионочь: квиз, книги и мастер-классы' }
    );
  };

  /* ---- Check Task 1 ---- */
  const handleCheckTask1 = () => {
    if (budgetMetrics.count < 3) {
      onShowError(
        'Выбери площадки во всех 3 зонах',
        'Отметь по одному варианту в каждой из трёх зон «Библионочи»: Главный зал, Интерактивные зоны и Навигация.'
      );
      return;
    }
    if (budgetMetrics.cost > 300) {
      onRecordMistake(1);
      onShowError(
        `Перерасход гранта: ${budgetMetrics.cost} из 300 тыс. ₽`,
        'Слишком дорогой выбор в одной зоне забрал почти весь грант библиотеки. Выбери более сбалансированный вариант.'
      );
      return;
    }
    if (budgetMetrics.vibe < 80 || budgetMetrics.org < 80) {
      onRecordMistake(1);
      onShowError(
        'Нужно больше настроения и порядка',
        'Доведи Настроение и Порядок минимум до 80%, не выходя за грант библиотеки 300 тыс. ₽.'
      );
      return;
    }

    onCompleteTask(1, {
      success: true,
      title: `Грант библиотеки распределён! Использовано ${budgetMetrics.cost} из 300 тыс. ₽`,
      body: `Настроение гостей — ${budgetMetrics.vibe}%, порядок — ${budgetMetrics.org}%, и смета укладывается в выделенный грант.`,
      lesson:
        'Проектный менеджер держит баланс между интересной программой, удобством гостей и суммой гранта.',
      nextActionLabel: 'Подготовить анонс в соцсетях (шаг 3)',
      onNext: 'next_task',
    });
  };

  /* ---- Check Task 2 ---- */
  const handleCheckTask2 = () => {
    for (let i = 0; i < SMM_CONSTRUCTOR_STEPS.length; i++) {
      const step = SMM_CONSTRUCTOR_STEPS[i];
      const chosen = step.options.find((o) => o.id === smmPicks[step.id]);
      if (!chosen?.isBest) {
        onRecordMistake(2);
        setSmmStepIdx(i);
        onShowError(
          `Прогноз записи гостей сейчас: ${smmMetrics.regs} (цель — от 400)`,
          chosen?.feedback ?? 'Доработай этот блок поста слева и следи за прогнозом охвата на экране смартфона.'
        );
        return;
      }
    }

    onCompleteTask(2, {
      success: true,
      title: `Анонс «Библионочи» опубликован: прогноз ${smmMetrics.regs} записей гостей!`,
      body: 'Понятный заголовок, яркие карточки с расписанием площадок, чёткий призыв с кнопкой онлайн-записи и публикация за 5 дней с репостом партнёров.',
      lesson:
        'Хороший анонс в соцсетях сразу отвечает на вопросы читателя: что будет, когда приходить и как записаться.',
      nextActionLabel: 'Ответить читателям в комментариях (шаг 4)',
      onNext: 'next_task',
    });
  };

  /* ---- Task 3 Live Chat ---- */
  const currentComment = COMMUNITY_COMMENTS[chatIdx];
  const handleSendChatReply = (opt: (typeof COMMUNITY_COMMENTS)[number]['options'][number]) => {
    if (!opt.isBest) {
      onRecordMistake(3);
      setChatWarning(opt.feedback);
      return;
    }

    soundEngine.playSuccessChime();
    setChatWarning(null);
    const reactions: Record<string, string> = {
      cm1: 'Ольга ответила ❤️: «Спасибо за быстрый ответ! Обязательно придём с семьёй к 18:30!»',
      cm2: 'Алина ответила 👍: «Здорово, что прислушались! Обязательно придём на следующую акцию!»',
      cm3: 'Кира ответила 🤩: «Конечно, делитесь фото! Спасибо за такой тёплый вечер!»',
      cm4: 'Подписчики отметили 👍: «Спасибо за разъяснение — здорово, что вход бесплатный!»',
    };
    const nextResolved = {
      ...resolvedChats,
      [currentComment.id]: {
        reply: opt.label,
        guestReaction: reactions[currentComment.id] ?? 'Читатель доволен ответом! ❤️',
      },
    };
    setResolvedChats(nextResolved);

    const nextPending = COMMUNITY_COMMENTS.findIndex((c) => !nextResolved[c.id]);
    if (nextPending !== -1) {
      setTimeout(() => {
        setChatIdx(nextPending);
      }, 900);
    } else {
      setTimeout(() => {
        onCompleteTask(3, {
          success: true,
          title: 'Все 4 комментария отработаны отлично!',
          body: 'Ты чётко ответил на организационный вопрос, корректно разобрал замечание, спросил согласие на репост фото и спокойно опроверг слух о платном входе.',
          lesson:
            'Комьюнити-менеджер выстраивает доверительный диалог с читателями и формирует постоянное сообщество вокруг библиотеки.',
          nextActionLabel: 'Открыть готовую «Библионочь»',
          onNext: 'showcase',
        });
      }, 750);
    }
  };

  const handleHintClick = () => {
    const hints = [
      {
        title: 'Подсказка · Шаг 1',
        body: 'По опросу 76% хотят живое общение и интерактивы: выбери формат «Вечерняя акция «Библионочь»», название «Библионочь: квиз, книги и мастер-классы» и партнёров «Студенческий книжный клуб + локальный книжный магазин».',
      },
      {
        title: 'Подсказка · Шаг 2',
        body: 'Распредели грант библиотеки 300 тыс. ₽ сбалансированно: 1) Книжный квиз и встреча с автором (120 тыс.), 2) Фотозона, открытки и буккроссинг (105 тыс.), 3) Волонтёры, указатели и книжные призы (65 тыс.). Итого 290 тыс. ₽.',
      },
      {
        title: 'Подсказка · Шаг 3',
        body: 'Выбери понятный заголовок про «Библионочь» и свободный вход, яркие карточки с расписанием, призыв написать в комментариях и записаться по ссылке, и публикацию за 5 дней с репостом партнёров.',
      },
      {
        title: 'Подсказка · Шаг 4',
        body: 'Отвечай вежливо и по делу: сразу подскажи время и свободный вход, поблагодари за замечание и назови решение, попроси разрешение на репост фото и спокойно уточни, что вход бесплатный.',
      },
    ];
    onUseHint(taskIdx, hints[taskIdx].title, hints[taskIdx].body);
  };

  /* ================= SHOWCASE: LAUNCHED FESTIVAL ================= */
  if (isShowcase) {
    return (
      <div className="h-full overflow-y-auto desk-scroll px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-6 animate-card-in">
          <div className="rounded-3xl overflow-hidden bg-[#13294b] text-white shadow-2xl">
            <div className="relative h-64 sm:h-72">
              <img
                src={MEDIA.sceneSmmFestival}
                alt="Запущенный фестиваль БиблиоРитм"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#13294b] via-[#13294b]/40 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-[#7dd3fc]">
                    Готовый результат · Проф-трек 03
                  </div>
                  <h1 className="font-display font-extrabold text-2xl sm:text-4xl mt-1">
                    {save.festivalName}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTask(0)}
                    className="min-h-[42px] px-4 rounded-xl bg-white/15 hover:bg-white/25 text-xs sm:text-sm font-bold"
                  >
                    К заданиям
                  </button>
                  <button
                    type="button"
                    onClick={onOpenResults}
                    className="min-h-[42px] px-5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-sm"
                  >
                    <Award className="w-4 h-4" />
                    Мои итоги и профиль
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 pt-6">
              <ProjectShowcase3D workshop={3} save={save} />
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/10 p-4 space-y-2">
                <img
                  src={MEDIA.sceneFestivalStage}
                  alt="Главный зал"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
                <div className="font-display font-bold text-sm text-[#7dd3fc]">Главный зал</div>
                <p className="text-xs text-white/80">Книжный квиз с ведущим и творческая встреча с автором</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 space-y-2">
                <img
                  src={MEDIA.sceneFestivalComics}
                  alt="Интерактивные зоны"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
                <div className="font-display font-bold text-sm text-[#7dd3fc]">Интерактивные зоны</div>
                <p className="text-xs text-white/80">Фотозона, мастер-класс по открыткам и буккроссинг</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 space-y-2">
                <img
                  src={MEDIA.w3SmmCards}
                  alt="Анонс Библионочи в соцсетях"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
                <div className="font-display font-bold text-sm text-[#7dd3fc]">450+ регистраций</div>
                <p className="text-xs text-white/80">Понятный анонс и доброжелательные ответы читателям</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= ACTIVE TASKS ================= */
  const allDone = progress.every((p) => p.completed);
  const pickedFormat = CONCEPT_STEPS[0].options.find((o) => o.id === conceptPicks.format);
  const pickedName = CONCEPT_STEPS[1].options.find((o) => o.id === conceptPicks.name);
  const pickedPartner = CONCEPT_STEPS[2].options.find((o) => o.id === conceptPicks.partner);

  const activeHook = SMM_CONSTRUCTOR_STEPS[0].options.find((o) => o.id === smmPicks.hook);
  const activeVisual = SMM_CONSTRUCTOR_STEPS[1].options.find((o) => o.id === smmPicks.visual);
  const activeCta = SMM_CONSTRUCTOR_STEPS[2].options.find((o) => o.id === smmPicks.cta);
  const activeTiming = SMM_CONSTRUCTOR_STEPS[3].options.find((o) => o.id === smmPicks.timing);

  const activeConceptStep = CONCEPT_STEPS[conceptStepIdx] ?? CONCEPT_STEPS[0];
  const activeSmmStep = SMM_CONSTRUCTOR_STEPS[smmStepIdx] ?? SMM_CONSTRUCTOR_STEPS[0];
  const activeZone = EVENT_BUDGET_STEPS[activeZoneIdx] ?? EVENT_BUDGET_STEPS[0];

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
                    ? 'bg-[#13294b] text-white shadow-xs'
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
              Готовая «Библионочь»
            </button>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 min-h-0 overflow-y-auto desk-scroll px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-4 animate-card-in" key={`w3-t${taskIdx}`}>
          <WorkshopStepper
            trackTitle={WORKSHOPS[2].title}
            taskTitles={WORKSHOPS[2].tasks.map((t) => t.title)}
            activeIdx={taskIdx}
            progress={progress}
            accentColor="#13294b"
            onSelectTask={onSelectTask}
          />

          {/* ============ TASK 0: AUDIENCE INSIGHTS + INTERACTIVE EVENT POSTER & TICKET STUDIO ============ */}
          {taskIdx === 0 && (
            <>
              <MissionBanner
                image={MEDIA.sceneSmmFestival}
                imageAlt="Планирование культурного проекта в отделе креативного менеджмента"
                stepLabel="Проф-трек 03 · Креативный менеджер · Шаг 1 из 4"
                title="Концепция проекта: собери интерактивную афишу и программу «Библионочи»"
                goal="Библиотека готовит главное культурное событие весны — вечернюю акцию «Библионочь» для молодёжи и жителей города. Твоя роль — креативный менеджер: изучи аналитику опроса читателей и настрой 3 ключевых блока на интерактивной городской афише справа (формат программы, название события и профильных партнёров)."
                steps={[
                  { text: 'Изучи данные опроса читателей и выбери формат акции', done: Boolean(conceptPicks.format) },
                  { text: 'Подбери название для главной афиши и электронного билета', done: Boolean(conceptPicks.name) },
                  { text: 'Выбери профильных партнёров и утверди концепцию', done: Boolean(conceptPicks.partner) },
                ]}
                resultPreview="Собрана городская афиша и электронный пригласительный билет «Библионочи»."
                accentColor="#13294b"
                proTip={{
                  term: 'Концепция социокультурного проекта',
                  text: 'Замысел события, основанный на интересах аудитории: формат, запоминающееся название и партнёры, которые усилят программу.',
                }}
                onHint={handleHintClick}
              />

              {/* Full-Text Audience Insights Dashboard */}
              <div className="bg-white rounded-2xl p-4 border border-[#13294b]/10 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#135c75]">
                  <BarChart3 className="w-4 h-4" />
                  <span>Аналитика опроса гостей библиотеки</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {SURVEY_STATS.map((st) => (
                    <div
                      key={st.label}
                      className="rounded-xl bg-[#f6f8fc] border border-[#13294b]/8 p-3 flex flex-col justify-between gap-2"
                    >
                      <div className="text-xs font-bold text-[#13294b] leading-snug">
                        {st.label}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono-tabular font-extrabold">
                          <span className={st.percent > 50 ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                            {st.percent}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#e3e9f3] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${st.percent}%`,
                              backgroundColor: st.percent > 50 ? '#157a4f' : '#c41e2e',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: TABBED PRODUCER CONFIGURATOR */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-[#13294b]/12 shadow-md space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {CONCEPT_STEPS.map((st, idx) => {
                      const picked = Boolean(conceptPicks[st.id]);
                      const isCurrent = conceptStepIdx === idx;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setConceptStepIdx(idx);
                          }}
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all ${
                            isCurrent
                              ? 'bg-[#13294b] text-white shadow-xs'
                              : picked
                                ? 'bg-[#e9f7ef] text-[#157a4f]'
                                : 'bg-[#f4f7fc] text-[#13294b]/75 hover:bg-[#e7eef9]'
                          }`}
                        >
                          {picked && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">
                            {idx === 0 ? '1. Формат' : idx === 1 ? '2. Название' : '3. Партнёры'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="font-display font-extrabold text-sm sm:text-base text-[#13294b]">
                      {activeConceptStep.title}
                    </div>
                    <div className="space-y-2.5">
                      {activeConceptStep.options.map((opt) => {
                        const selected = conceptPicks[activeConceptStep.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playSelectTick();
                              setConceptPicks((prev) => ({
                                ...prev,
                                [activeConceptStep.id]: opt.id,
                              }));
                            }}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                              selected
                                ? 'bg-[#13294b] text-white border-[#13294b] shadow-sm'
                                : 'bg-[#f6f8fc] hover:bg-[#e8effa] text-[#13294b] border-transparent'
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-extrabold leading-snug">
                              {opt.label}
                            </div>
                            <div
                              className={`text-[11px] mt-1 ${
                                selected ? 'text-white/75' : 'text-[#13294b]/65'
                              }`}
                            >
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#13294b]/10 flex items-center justify-between gap-2">
                    {conceptStepIdx > 0 ? (
                      <button
                        type="button"
                        onClick={() => setConceptStepIdx((s) => s - 1)}
                        className="min-h-[42px] px-4 rounded-xl bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" /> Назад
                      </button>
                    ) : (
                      <div />
                    )}

                    {conceptStepIdx < CONCEPT_STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playSelectTick();
                          setConceptStepIdx((s) => s + 1);
                        }}
                        className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5"
                      >
                        Дальше <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckTask0}
                        className="min-h-[44px] px-5 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                      >
                        Утвердить афишу ({Object.keys(conceptPicks).length}/3) →
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT 5 COLS: INTERACTIVE CITY BILLBOARD POSTER & DIGITAL GUEST PASS */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-[#0a192f] via-[#13294b] to-[#163760] text-white shadow-2xl border-2 border-[#38bdf8]/45">
                    {/* Poster Visual Hero with Live Audience Match Indicator */}
                    <div className="relative aspect-[16/10] bg-[#0a182e]">
                      <img
                        src={
                          conceptPicks.format === 'lecture'
                            ? MEDIA.studioArch
                            : conceptPicks.format === 'closed'
                              ? MEDIA.w3SmmTextwall
                              : MEDIA.sceneSmmFestival
                        }
                        alt="Интерактивный макет городской афиши Библионочи"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] via-[#0a192f]/35 to-transparent" />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#c41e2e] text-white font-mono-tabular text-[10px] font-extrabold tracking-wider">
                          ГОРОДСКАЯ АФИША · БГИИК
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-black/65 text-[#7dd3fc] font-mono-tabular text-[10px] font-extrabold inline-flex items-center gap-1 border border-[#7dd3fc]/30">
                          <CalendarClock className="w-3 h-3" /> ПЯТНИЦА · 18:30
                        </span>
                      </div>

                      {/* Live Audience Fit Pill on Poster */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {conceptPicks.format === 'fest' ? (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-[#0284c7]/90 text-white text-[10px] font-extrabold">
                                18:30 Квиз
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#157a4f]/90 text-white text-[10px] font-extrabold">
                                19:30 Мастер-классы
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-white text-[10px] font-extrabold">
                                20:30 Буккроссинг
                              </span>
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/80 text-[10px] font-bold">
                              Нажми на блоки афиши ниже для настройки
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Clickable Poster Zones */}
                    <div className="p-5 space-y-3">
                      {/* Clickable Zone 2: Poster Title */}
                      <button
                        type="button"
                        onClick={() => setConceptStepIdx(1)}
                        className={`w-full text-left rounded-2xl p-3 border-2 transition-all ${
                          conceptStepIdx === 1
                            ? 'bg-white/15 border-[#38bdf8]'
                            : 'bg-white/6 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#7dd3fc] mb-0.5">
                          <span>2. Заголовок афиши</span>
                          <span>{pickedName?.isBest ? '✓ Ярко и понятно' : 'Изменить →'}</span>
                        </div>
                        <div className="font-display font-extrabold text-base sm:text-lg text-white leading-snug">
                          {pickedName ? pickedName.label : '← Выбери название события'}
                        </div>
                      </button>

                      {/* Clickable Zone 1: Event Format */}
                      <button
                        type="button"
                        onClick={() => setConceptStepIdx(0)}
                        className={`w-full text-left rounded-2xl p-3 border-2 transition-all ${
                          conceptStepIdx === 0
                            ? 'bg-white/15 border-[#38bdf8]'
                            : 'bg-white/6 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#7dd3fc] mb-0.5">
                          <span>1. Формат программы (по опросу 76% хотят интерактив)</span>
                          <span>{pickedFormat?.isBest ? '✓ Совпадает с опросом' : 'Изменить →'}</span>
                        </div>
                        <div className="text-xs font-bold text-white/95 leading-relaxed">
                          {pickedFormat ? pickedFormat.label : '← Выбери формат проведения'}
                        </div>
                      </button>

                      {/* Clickable Zone 3: Event Partners */}
                      <button
                        type="button"
                        onClick={() => setConceptStepIdx(2)}
                        className={`w-full text-left rounded-2xl p-3 border-2 transition-all ${
                          conceptStepIdx === 2
                            ? 'bg-white/15 border-[#38bdf8]'
                            : 'bg-white/6 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#86efac] mb-0.5">
                          <span>3. Партнёры и призовой фонд</span>
                          <span>{pickedPartner?.isBest ? '✓ Целевая аудитория' : 'Изменить →'}</span>
                        </div>
                        <div className="text-xs font-bold text-white/95 leading-relaxed">
                          {pickedPartner ? pickedPartner.label : '← Выбери партнёров акции'}
                        </div>
                      </button>

                      {/* Perforated Tear-Off Guest Ticket Stub */}
                      <div className="pt-3 border-t-2 border-dashed border-white/20 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#7dd3fc] font-extrabold">
                            ЭЛЕКТРОННЫЙ БИЛЕТ ГОСТЯ · ВХОД СВОБОДНЫЙ
                          </div>
                          <div className="text-xs font-bold text-white/85 inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#38bdf8]" /> Инфополис БИД · Главный холл
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-[#0284c7] text-white font-mono-tabular text-xs font-extrabold shrink-0">
                          {Object.keys(conceptPicks).length}/3 готово
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ TASK 1: COMMAND CENTER + GRANT BUDGET + INTERACTIVE ARCHITECTURAL FLOORPLAN ============ */}
          {taskIdx === 1 && (
            <>
              <MissionBanner
                image={MEDIA.sceneFestivalStage}
                imageAlt="Площадки и смета гранта библиотеки"
                stepLabel="Проф-трек 03 · Проектный менеджер · Шаг 2 из 4"
                title="Карта площадок и грант: оснасти 3 локации «Библионочи» на 300 000 ₽"
                goal="На проведение «Библионочи» получен грант — 300 000 ₽. Перед тобой интерактивная схема трёх пространств библиотеки: Главный зал, Творческие зоны и Входная группа с навигацией. Выбери оснащение для каждой локации так, чтобы не превысить лимит 300 тыс. ₽ и вывести показатели Настроения гостей и Порядка минимум на 80%."
                steps={[
                  { text: 'Оснасти Локацию 1 · Главный зал (18:30 — 20:00)', done: Boolean(budgetPicks.main) },
                  { text: 'Оснасти Локацию 2 · Интерактивные зоны (19:00 — 21:30)', done: Boolean(budgetPicks.zones) },
                  { text: 'Оснасти Локацию 3 · Навигация, волонтёры и призы', done: Boolean(budgetPicks.care) },
                ]}
                resultPreview="Все 3 пространства на карте библиотеки оснащены в пределах гранта 300 тыс. ₽."
                accentColor="#13294b"
                proTip={{
                  term: 'Грантовая смета',
                  text: 'План расходов выделенного бюджета: важно распределить деньги между техникой, активностями и комфортом гостей, не выходя за лимит.',
                }}
                onHint={handleHintClick}
              />

              {/* Live Grant & KPI Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div
                  className={`rounded-2xl p-4 border-2 shadow-xs transition-colors ${
                    budgetMetrics.cost > 300
                      ? 'bg-[#fde8ea] border-[#c41e2e] animate-stage-shake'
                      : 'bg-white border-[#13294b]/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#13294b]/75">
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#c41e2e]" /> Грант (лимит 300 тыс.)
                    </span>
                    <span
                      className={`font-mono-tabular text-base ${
                        budgetMetrics.cost > 300 ? 'text-[#c41e2e]' : 'text-[#13294b]'
                      }`}
                    >
                      <AnimatedNumber value={budgetMetrics.cost} /> / 300 т.₽
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (budgetMetrics.cost / 300) * 100)}%`,
                        backgroundColor: budgetMetrics.cost > 300 ? '#c41e2e' : '#0284c7',
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border-2 border-[#13294b]/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#13294b]/75">
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-[#c41e2e]" /> Настроение (нужно 80%+)
                    </span>
                    <span
                      className={`font-mono-tabular text-base ${
                        budgetMetrics.vibe >= 80 ? 'text-[#157a4f]' : 'text-[#0284c7]'
                      }`}
                    >
                      <AnimatedNumber value={budgetMetrics.vibe} />%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, budgetMetrics.vibe)}%`,
                        backgroundColor: budgetMetrics.vibe >= 80 ? '#157a4f' : '#0284c7',
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border-2 border-[#13294b]/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#13294b]/75">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#157a4f]" /> Порядок (нужно 80%+)
                    </span>
                    <span
                      className={`font-mono-tabular text-base ${
                        budgetMetrics.org >= 80 ? 'text-[#157a4f]' : 'text-[#135c75]'
                      }`}
                    >
                      <AnimatedNumber value={budgetMetrics.org} />%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, budgetMetrics.org)}%`,
                        backgroundColor: budgetMetrics.org >= 80 ? '#157a4f' : '#135c75',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: ZONE MAP SELECTOR + PROGRAM OPTIONS */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-[#13294b]/12 shadow-md space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {EVENT_BUDGET_STEPS.map((zone, idx) => {
                      const picked = Boolean(budgetPicks[zone.id]);
                      const isCurrent = activeZoneIdx === idx;
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setActiveZoneIdx(idx);
                          }}
                          className={`p-3 rounded-2xl text-left border-2 transition-all ${
                            isCurrent
                              ? 'bg-[#13294b] text-white border-[#13294b] shadow-xs'
                              : picked
                                ? 'bg-[#e9f7ef] text-[#157a4f] border-[#157a4f]/25'
                                : 'bg-[#f4f7fc] text-[#13294b] border-transparent hover:bg-[#e7eef9]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                            <span>Локация 0{idx + 1}</span>
                            {picked && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <div className="text-xs font-extrabold mt-0.5 line-clamp-1">
                            {zone.title.replace(/^\d+\.\s*/, '')}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center rounded-2xl bg-[#f6f8fc] p-3.5 border border-[#13294b]/10">
                    <img
                      src={ZONE_IMAGES[activeZone.id] ?? MEDIA.sceneSmmFestival}
                      alt={activeZone.title}
                      referrerPolicy="no-referrer"
                      className="w-full sm:w-32 aspect-[4/3] object-cover rounded-xl shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0284c7]">
                        Настройка пространства {activeZoneIdx + 1} из 3
                      </div>
                      <h3 className="font-display font-extrabold text-base text-[#13294b]">
                        {activeZone.title}
                      </h3>
                      <p className="text-xs text-[#13294b]/70">
                        Выбери оснащение площадки — изменения сразу отобразятся на архитектурной схеме справа.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeZone.options.map((opt) => {
                      const selected = budgetPicks[activeZone.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setBudgetPicks((prev) => ({ ...prev, [activeZone.id]: opt.id }));
                          }}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                            selected
                              ? 'bg-[#13294b] text-white border-[#13294b] shadow-sm'
                              : 'bg-[#f6f8fc] hover:bg-[#e8effa] text-[#13294b] border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs sm:text-sm font-extrabold leading-snug">
                              {opt.label}
                            </span>
                            <span
                              className={`font-mono-tabular text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                                selected
                                  ? 'bg-[#0284c7] text-white'
                                  : 'bg-white text-[#c41e2e] border border-[#13294b]/10'
                              }`}
                            >
                              {opt.cost} тыс. ₽
                            </span>
                          </div>
                          <div
                            className={`text-xs mt-1.5 leading-relaxed ${
                              selected ? 'text-white/80' : 'text-[#13294b]/70'
                            }`}
                          >
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT 5 COLS: INTERACTIVE ARCHITECTURAL FLOORPLAN MAP + EVENING GRANT LEDGER */}
                <aside className="lg:col-span-5 bg-[#13294b] text-white rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/12 pb-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#7dd3fc]">
                      <MapPin className="w-4 h-4" />
                      <span>Интерактивная карта площадок «Библионочи»</span>
                    </div>
                    <span className="font-mono-tabular text-xs text-white/80">
                      Остаток: <strong className="text-[#7dd3fc]">{300 - budgetMetrics.cost} т.₽</strong>
                    </span>
                  </div>

                  {/* Interactive Visual Architectural Floorplan Blueprint */}
                  <div className="rounded-2xl bg-[#0b182e] p-3 border border-[#38bdf8]/30 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#7dd3fc]/85">
                      <span>ПЛАН-СХЕМА ЭТАЖА БИБЛИОТЕКИ БИД</span>
                      <span>ГОТОВНОСТЬ: {budgetMetrics.count}/3 ЗОН</span>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      {/* Floorplan Room 1: Main Hall Stage */}
                      {(() => {
                        const z0 = EVENT_BUDGET_STEPS[0];
                        const p0 = z0.options.find((o) => o.id === budgetPicks[z0.id]);
                        const active = activeZoneIdx === 0;
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveZoneIdx(0)}
                            className={`col-span-7 rounded-xl p-2.5 text-left border-2 transition-all flex flex-col justify-between min-h-[104px] ${
                              active
                                ? 'bg-[#173661] border-[#38bdf8] shadow-md'
                                : p0?.isBest
                                  ? 'bg-[#157a4f]/25 border-[#4ade80]/50'
                                  : 'bg-white/5 border-white/15 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[9px] font-mono-tabular font-extrabold">
                              <span className="text-[#7dd3fc]">ЗАЛ 01 · СЦЕНА</span>
                              <span className="px-1.5 py-0.5 rounded bg-black/40 text-white">
                                {p0 ? `${p0.cost} т.₽` : '0 т.₽'}
                              </span>
                            </div>
                            <div className="text-[11px] font-extrabold text-white leading-tight my-1">
                              {p0 ? p0.timeLabel : 'Нажми, чтобы оснастить Главный зал'}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-mono-tabular text-white/75">
                              <span>⚡ Настроение +{p0 ? p0.vibe : 0}%</span>
                            </div>
                          </button>
                        );
                      })()}

                      {/* Floorplan Room 2: Interactive Workshops Courtyard */}
                      {(() => {
                        const z1 = EVENT_BUDGET_STEPS[1];
                        const p1 = z1.options.find((o) => o.id === budgetPicks[z1.id]);
                        const active = activeZoneIdx === 1;
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveZoneIdx(1)}
                            className={`col-span-5 rounded-xl p-2.5 text-left border-2 transition-all flex flex-col justify-between min-h-[104px] ${
                              active
                                ? 'bg-[#173661] border-[#38bdf8] shadow-md'
                                : p1?.isBest
                                  ? 'bg-[#157a4f]/25 border-[#4ade80]/50'
                                  : 'bg-white/5 border-white/15 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[9px] font-mono-tabular font-extrabold">
                              <span className="text-[#7dd3fc]">ЗАЛ 02 · АРТ-ЗОНЫ</span>
                              <span className="px-1.5 py-0.5 rounded bg-black/40 text-white">
                                {p1 ? `${p1.cost} т.₽` : '0 т.₽'}
                              </span>
                            </div>
                            <div className="text-[11px] font-extrabold text-white leading-tight my-1">
                              {p1 ? p1.timeLabel : 'Оснастить мастерские'}
                            </div>
                            <div className="text-[9px] font-mono-tabular text-white/75">
                              🎨 Интерактив +{p1 ? p1.vibe : 0}%
                            </div>
                          </button>
                        );
                      })()}

                      {/* Floorplan Room 3: Entrance Lobby, Wayfinding & Prize Desk */}
                      {(() => {
                        const z2 = EVENT_BUDGET_STEPS[2];
                        const p2 = z2.options.find((o) => o.id === budgetPicks[z2.id]);
                        const active = activeZoneIdx === 2;
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveZoneIdx(2)}
                            className={`col-span-12 rounded-xl p-2.5 text-left border-2 transition-all flex items-center justify-between gap-3 ${
                              active
                                ? 'bg-[#173661] border-[#38bdf8] shadow-md'
                                : p2?.isBest
                                  ? 'bg-[#157a4f]/25 border-[#4ade80]/50'
                                  : 'bg-white/5 border-white/15 hover:bg-white/10'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[9px] font-mono-tabular font-extrabold text-[#7dd3fc]">
                                ЛОКАЦИЯ 03 · ВХОДНОЙ ХОЛЛ, ГАРДЕРОБ, НАВИГАЦИЯ И ПРИЗЫ
                              </div>
                              <div className="text-[11px] font-extrabold text-white truncate mt-0.5">
                                {p2 ? p2.timeLabel : 'Нажми, чтобы настроить навигацию, волонтёров и призы'}
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-black/40 font-mono-tabular text-[10px] font-extrabold text-[#7dd3fc] shrink-0">
                              {p2 ? `${p2.cost} т.₽` : '0 т.₽'}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Evening Timeline Summary */}
                  <div className="space-y-2">
                    {EVENT_BUDGET_STEPS.map((zone, idx) => {
                      const picked = zone.options.find((o) => o.id === budgetPicks[zone.id]);
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => setActiveZoneIdx(idx)}
                          className={`w-full text-left rounded-2xl p-3 border transition-all ${
                            activeZoneIdx === idx
                              ? 'bg-white/15 border-[#38bdf8]'
                              : 'bg-white/8 border-white/10 hover:bg-white/12'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#7dd3fc]">
                            <span>{zone.title}</span>
                            <span className="font-mono-tabular text-white">
                              {picked ? `${picked.cost} т.₽` : '—'}
                            </span>
                          </div>
                          <div className="text-xs font-extrabold text-white mt-0.5">
                            {picked ? picked.timeLabel : 'Программа не выбрана'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckTask1}
                    className="w-full min-h-[48px] rounded-2xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-sm shadow-lg transition-colors"
                  >
                    Утвердить площадки «Библионочи» ({budgetMetrics.count}/3) →
                  </button>
                </aside>
              </div>
            </>
          )}

          {/* ============ TASK 2: INTERACTIVE SOCIAL MEDIA STUDIO + SWIPEABLE SMARTPHONE CAROUSEL ============ */}
          {taskIdx === 2 && (
            <>
              <MissionBanner
                image={MEDIA.sceneSmmReels}
                imageAlt="Подготовка анонса Библионочи в соцсетях"
                stepLabel="Проф-трек 03 · SMM-специалист · Шаг 3 из 4"
                title="SMM-анонс: оформи пост о «Библионочи» для соцсетей библиотеки"
                goal="Программа «Библионочи» готова — теперь о ней должны узнать читатели! Твоя роль — SMM-специалист библиотеки: собери публикацию для соцсетей из 4 элементов (цепляющий заголовок, визуальные карточки, призыв с кнопкой записи и время посева). Интерактивный экран смартфона справа показывает прогноз охвата: настрой пост так, чтобы прогноз составил от 400 записей гостей, и опубликуй анонс."
                steps={[
                  { text: 'Выбери информативный заголовок и карусель карточек с расписанием', done: smmPicks.hook === 'best' && smmPicks.visual === 'best' },
                  { text: 'Добавь призыв с кнопкой онлайн-записи и выбери время публикации', done: smmPicks.cta === 'best' && smmPicks.timing === 'best' },
                  { text: 'Доведи прогноз охвата до 400+ записей гостей и опубликуй анонс', done: smmMetrics.regs >= 400 },
                ]}
                resultPreview="Готовый SMM-пост с каруселью карточек, кнопкой онлайн-записи и прогнозом от 400 гостей."
                accentColor="#13294b"
                proTip={{
                  term: 'SMM-воронка и CTA',
                  text: 'Путь читателя от первого взгляда на пост до регистрации: цепляющий заголовок, понятные карточки, призыв к действию (CTA) и удачное время публикации.',
                }}
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: SOCIAL MEDIA CONTENT STUDIO + ANALYTICS FUNNEL */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-[#13294b]/12 shadow-md space-y-4">
                  {/* Live SMM Funnel Metrics Strip */}
                  <div className="rounded-2xl bg-[#f4f7fc] p-3 border border-[#13294b]/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold">
                    <div className="px-2.5 py-1.5 rounded-xl bg-white flex items-center justify-between">
                      <span className="text-[#13294b]/65">1. Заголовок:</span>
                      <span className={smmPicks.hook === 'best' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {smmPicks.hook === 'best' ? '✓ Цепляет' : 'Слабый'}
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-xl bg-white flex items-center justify-between">
                      <span className="text-[#13294b]/65">2. Визуал:</span>
                      <span className={smmPicks.visual === 'best' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {smmPicks.visual === 'best' ? '✓ Карточки' : 'Сплошной'}
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-xl bg-white flex items-center justify-between">
                      <span className="text-[#13294b]/65">3. Призыв:</span>
                      <span className={smmPicks.cta === 'best' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {smmPicks.cta === 'best' ? '✓ Ссылка' : 'Без кнопки'}
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-xl bg-white flex items-center justify-between">
                      <span className="text-[#13294b]/65">4. Посев:</span>
                      <span className={smmPicks.timing === 'best' ? 'text-[#157a4f]' : 'text-[#c41e2e]'}>
                        {smmPicks.timing === 'best' ? '✓ За 5 дней' : 'Поздно'}
                      </span>
                    </div>
                  </div>

                  {/* 4 Step Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {SMM_CONSTRUCTOR_STEPS.map((st, idx) => {
                      const isCurrent = smmStepIdx === idx;
                      const isBest = smmPicks[st.id] === 'best';
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setSmmStepIdx(idx);
                          }}
                          className={`min-h-[38px] px-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-between gap-1 ${
                            isCurrent
                              ? 'bg-[#13294b] text-white shadow-xs'
                              : isBest
                                ? 'bg-[#e9f7ef] text-[#157a4f]'
                                : 'bg-[#f4f7fc] text-[#13294b]/75 hover:bg-[#e5eefb]'
                          }`}
                        >
                          <span className="truncate">{st.title}</span>
                          {isBest && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display font-extrabold text-sm sm:text-base text-[#13294b]">
                        {activeSmmStep.title}
                      </div>
                      <span className="text-[11px] font-bold text-[#135c75]">
                        Можно нажимать прямо на блоки в смартфоне →
                      </span>
                    </div>

                    {activeSmmStep.id === 'visual' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeSmmStep.options.map((opt) => {
                          const selected = smmPicks[activeSmmStep.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setSmmPicks((prev) => ({ ...prev, [activeSmmStep.id]: opt.id }));
                                setSmmCardSlide(0);
                              }}
                              className={`rounded-2xl overflow-hidden border-2 text-left transition-all flex flex-col ${
                                selected
                                  ? 'border-[#13294b] ring-2 ring-[#38bdf8] shadow-sm'
                                  : 'border-[#13294b]/12 opacity-85 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={SMM_VISUAL_PREVIEWS[opt.id] ?? MEDIA.w3SmmCards}
                                alt={opt.label}
                                referrerPolicy="no-referrer"
                                className="w-full aspect-[4/3] object-cover"
                              />
                              <div
                                className={`p-3 text-xs font-bold leading-snug flex-1 ${
                                  selected ? 'bg-[#13294b] text-white' : 'bg-[#f4f7fc] text-[#13294b]'
                                }`}
                              >
                                {opt.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeSmmStep.options.map((opt) => {
                          const selected = smmPicks[activeSmmStep.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setSmmPicks((prev) => ({ ...prev, [activeSmmStep.id]: opt.id }));
                              }}
                              className={`w-full p-4 rounded-2xl border-2 text-left text-xs sm:text-sm font-bold transition-all ${
                                selected
                                  ? 'bg-[#13294b] text-white border-[#13294b] shadow-xs'
                                  : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b] border-transparent'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#13294b]/10 flex items-center justify-between gap-2">
                    {smmStepIdx > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSmmStepIdx((s) => s - 1)}
                        className="min-h-[42px] px-4 rounded-xl bg-[#f4f7fc] hover:bg-[#e7eef9] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" /> Назад
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {smmStepIdx < SMM_CONSTRUCTOR_STEPS.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setSmmStepIdx((s) => s + 1);
                          }}
                          className="min-h-[42px] px-4 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs font-extrabold inline-flex items-center gap-1.5"
                        >
                          Дальше <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCheckTask2}
                        className="min-h-[44px] px-5 rounded-xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                      >
                        Опубликовать анонс (прогноз: {smmMetrics.regs} записей) →
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT 5 COLS: INTERACTIVE SMARTPHONE FEED WITH SWIPEABLE SMM CARDS */}
                <div className="lg:col-span-5 flex flex-col items-center space-y-3">
                  <div className="w-full max-w-[365px] rounded-[34px] bg-[#0f172a] p-3 shadow-2xl border-4 border-[#273552] text-white">
                    {/* Phone Status Bar */}
                    <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-mono-tabular text-white/75">
                      <span>18:30</span>
                      <span className="w-16 h-3 rounded-full bg-black/75" />
                      <span>VK / TG · 5G</span>
                    </div>

                    <div className="rounded-[24px] bg-white text-[#13294b] overflow-hidden">
                      {/* Clickable Account Header & Timing (Step 3) */}
                      <button
                        type="button"
                        onClick={() => setSmmStepIdx(3)}
                        className={`w-full px-3.5 py-2.5 flex items-center justify-between border-b text-left transition-colors ${
                          smmStepIdx === 3
                            ? 'bg-[#f0f7ff] border-[#0284c7]'
                            : 'border-[#13294b]/10 hover:bg-[#f4f7fc]'
                        }`}
                        title="4. Время и площадка размещения"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#c41e2e] text-white font-display font-extrabold text-xs flex items-center justify-center shrink-0">
                            БН
                          </div>
                          <div className="leading-tight min-w-0">
                            <div className="text-xs font-extrabold inline-flex items-center gap-1">
                              <span>Библиотека · БГИИК</span>
                              <CheckCircle2 className="w-3 h-3 text-[#135c75]" />
                            </div>
                            <div className="text-[10px] text-[#135c75] font-bold truncate">
                              {activeTiming?.preview}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-tabular text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#13294b]/10 text-[#13294b] shrink-0">
                          Шаг 4
                        </span>
                      </button>

                      {/* Clickable Visual Block: Multi-Slide SMM Carousel vs Wall of Text (Step 1) */}
                      <div
                        onClick={() => setSmmStepIdx(1)}
                        className={`relative cursor-pointer border-b-2 transition-all ${
                          smmStepIdx === 1 ? 'border-[#0284c7]' : 'border-transparent'
                        }`}
                        title="2. Визуальное оформление поста"
                      >
                        {smmPicks.visual === 'best' ? (
                          <div className="relative aspect-[16/10] bg-[#13294b] overflow-hidden">
                            <img
                              src={
                                smmCardSlide === 0
                                  ? MEDIA.w3SmmCards
                                  : smmCardSlide === 1
                                    ? MEDIA.sceneFestivalStage
                                    : MEDIA.sceneFestivalComics
                              }
                              alt="Карточка анонса Библионочи"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f3a]/90 via-[#0d1f3a]/25 to-transparent" />
                            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-[#c41e2e] text-white font-mono-tabular text-[9px] font-extrabold">
                                КАРТОЧКА {smmCardSlide + 1} / 3
                              </span>
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[0, 1, 2].map((idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playSelectTick();
                                      setSmmCardSlide(idx);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[9px] font-mono-tabular font-extrabold transition-colors ${
                                      smmCardSlide === idx
                                        ? 'bg-[#0284c7] text-white'
                                        : 'bg-black/55 text-white/80 hover:bg-black/80'
                                    }`}
                                  >
                                    {idx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="absolute bottom-2.5 left-3 right-3 text-white">
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7dd3fc]">
                                {smmCardSlide === 0
                                  ? 'Слайд 1 · Афиша события'
                                  : smmCardSlide === 1
                                    ? 'Слайд 2 · 18:30 Главный зал'
                                    : 'Слайд 3 · 19:30 Интерактивные зоны'}
                              </div>
                              <div className="font-display font-extrabold text-xs leading-snug">
                                {smmCardSlide === 0
                                  ? 'Библионочь в пятницу · Вход свободный!'
                                  : smmCardSlide === 1
                                    ? 'Командный книжный квиз и встреча с автором'
                                    : 'Фотозона, печать открыток и буккроссинг'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative aspect-[16/10] bg-[#e5e9f0] p-3.5 overflow-hidden flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-[#c41e2e] text-white text-[9px] font-extrabold">
                                ⚠ СПЛОШНОЙ ТЕКСТ БЕЗ КАРТОЧЕК
                              </span>
                              <span className="font-mono-tabular text-[9px] font-extrabold text-[#13294b]/60">
                                Шаг 2
                              </span>
                            </div>
                            <p className="text-[9px] leading-tight text-[#13294b]/75 font-mono-tabular line-clamp-6">
                              ПОЛОЖЕНИЕ О ПРОВЕДЕНИИ КУЛЬТУРНО-МАССОВОГО МЕРОПРИЯТИЯ. Доводим до
                              сведения всех заинтересованных лиц регламент проведения вечерней
                              программы согласно утверждённому плану работы отдела на текущий
                              квартал без иллюстраций и разбивки на абзацы...
                            </p>
                            <div className="text-[10px] font-extrabold text-[#c41e2e]">
                              Нажми, чтобы заменить на яркую карусель карточек →
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Post Body & Engagement Metrics */}
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-extrabold font-mono-tabular">
                          <span className="inline-flex items-center gap-1 text-[#c41e2e]">
                            <Heart className="w-4 h-4 fill-current" />{' '}
                            <AnimatedNumber value={smmMetrics.likes} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#135c75]">
                            <MessageCircle className="w-4 h-4" />{' '}
                            <AnimatedNumber value={smmMetrics.comments} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#157a4f]">
                            <Users className="w-4 h-4" />{' '}
                            Прогноз: <AnimatedNumber value={smmMetrics.regs} />
                          </span>
                        </div>

                        {/* Clickable Hook Text (Step 0) */}
                        <button
                          type="button"
                          onClick={() => setSmmStepIdx(0)}
                          className={`w-full text-left p-2 rounded-xl border transition-colors ${
                            smmStepIdx === 0
                              ? 'bg-[#f0f7ff] border-[#0284c7]'
                              : 'bg-[#f8fafd] border-transparent hover:border-[#13294b]/15'
                          }`}
                          title="1. Заголовок анонса"
                        >
                          <div className="text-xs font-extrabold text-[#13294b] leading-snug">
                            {activeHook?.preview}
                          </div>
                          <div className="text-[10px] font-bold text-[#135c75] mt-1">
                            #Библионочь #БГИИК #КафедраБИД #ИнфополисБИД
                          </div>
                        </button>

                        {/* Clickable Call-to-Action Button (Step 2) */}
                        <button
                          type="button"
                          onClick={() => setSmmStepIdx(2)}
                          className={`w-full text-left p-2 rounded-xl border transition-colors space-y-1.5 ${
                            smmStepIdx === 2
                              ? 'bg-[#f0f7ff] border-[#0284c7]'
                              : 'bg-[#f8fafd] border-transparent hover:border-[#13294b]/15'
                          }`}
                          title="3. Призыв к действию"
                        >
                          <div className="text-[11px] text-[#13294b]/80 leading-snug">
                            {activeCta?.preview}
                          </div>
                          <div
                            className={`rounded-lg text-center py-1.5 text-[11px] font-extrabold ${
                              smmPicks.cta === 'best'
                                ? 'bg-[#157a4f] text-white'
                                : 'bg-[#e2e8f0] text-[#13294b]/60'
                            }`}
                          >
                            {smmPicks.cta === 'best'
                              ? 'Записаться на «Библионочь» (свободный вход) →'
                              : 'Кнопка регистрации не прикреплена'}
                          </div>
                        </button>

                        {/* Goal Progress Bar */}
                        <div className="pt-2 border-t border-[#13294b]/10 space-y-1">
                          <div className="flex justify-between text-[11px] font-extrabold">
                            <span>Прогноз записи гостей (цель: 400+)</span>
                            <span
                              className={`font-mono-tabular ${
                                smmMetrics.regs >= 400 ? 'text-[#157a4f]' : 'text-[#c41e2e]'
                              }`}
                            >
                              {smmMetrics.regs} / 400
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#e9edf5] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, (smmMetrics.regs / 400) * 100)}%`,
                                backgroundColor: smmMetrics.regs >= 400 ? '#157a4f' : '#0284c7',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ TASK 3: COMMUNITY MODERATION INBOX + CHAT THREAD ============ */}
          {taskIdx === 3 && (
            <>
              <MissionBanner
                image={MEDIA.sceneFestivalComics}
                imageAlt="Общение с читателями в комментариях к Библионочи"
                stepLabel="Проф-трек 03 · Комьюнити-менеджер · Шаг 4 из 4"
                title="Работа с аудиторией: ответь на 4 комментария читателей под анонсом"
                goal="Анонс «Библионочи» опубликован в соцсетях библиотеки! Под постом сразу появились комментарии подписчиков: организационный вопрос о билетах, замечание о гардеробе, благодарность с фото и слух о платном входе. Ответь каждому читателю грамотно, вежливо и с опорой на факты от лица библиотеки."
                steps={[
                  { text: 'Прочитай комментарий читателя ниже', done: true },
                  { text: 'Выбери грамотный ответ от лица библиотеки', done: Object.keys(resolvedChats).length > 0 },
                  { text: 'Разбери все 4 комментария подписчиков', done: Object.keys(resolvedChats).length === 4 },
                ]}
                resultPreview="Все 4 комментария отработаны, читатели получили точные ответы."
                accentColor="#13294b"
                proTip={{
                  term: 'Комьюнити-менеджмент',
                  text: 'Общение с подписчиками от лица организации: быстрые, вежливые и точные ответы на вопросы, критику и слухи формируют доверие к бренду.',
                }}
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 4 COLS: POST PREVIEW + DIALOG INBOX */}
                <div className="lg:col-span-4 bg-white rounded-3xl overflow-hidden border border-[#13294b]/12 shadow-md">
                  <div className="relative aspect-[16/9]">
                    <img
                      src={MEDIA.w3SmmCards}
                      alt="Анонс Библионочи"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13294b]/85 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white font-display font-extrabold text-xs">
                      Анонс «Библионочи» · Комментарии ({Object.keys(resolvedChats).length}/4)
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    {COMMUNITY_COMMENTS.map((c, idx) => {
                      const done = Boolean(resolvedChats[c.id]);
                      const active = chatIdx === idx;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playSelectTick();
                            setChatIdx(idx);
                            setChatWarning(null);
                          }}
                          className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between gap-2.5 transition-all ${
                            active
                              ? 'bg-[#13294b] text-white shadow-xs'
                              : done
                                ? 'bg-[#e9f7ef] text-[#157a4f]'
                                : 'bg-[#f4f7fc] text-[#13294b] hover:bg-[#e7eef9]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-full font-display font-extrabold text-xs flex items-center justify-center shrink-0 ${
                                active
                                  ? 'bg-[#0284c7] text-white'
                                  : done
                                    ? 'bg-[#157a4f] text-white'
                                    : 'bg-[#13294b]/12 text-[#13294b]'
                              }`}
                            >
                              {c.author[0]}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold truncate">{c.author}</div>
                              <div
                                className={`text-[10px] truncate ${
                                  active ? 'text-white/70' : 'text-current/70'
                                }`}
                              >
                                {c.tag}
                              </div>
                            </div>
                          </div>
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : active ? (
                            <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT 8 COLS: REALISTIC COMMENT THREAD */}
                <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-6 border border-[#13294b]/12 shadow-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#13294b]/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-[#c41e2e] text-white font-display font-extrabold text-sm flex items-center justify-center">
                        {currentComment.author[0]}
                      </span>
                      <div>
                        <div className="font-display font-extrabold text-sm text-[#13294b]">
                          {currentComment.author} · {currentComment.role}
                        </div>
                        <div className="text-[11px] font-bold text-[#135c75]">
                          {currentComment.tag}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs font-bold text-[#13294b]/60">
                      Обращение {chatIdx + 1} / {COMMUNITY_COMMENTS.length}
                    </span>
                  </div>

                  {/* Guest Comment Bubble */}
                  <div className="rounded-2xl rounded-tl-sm bg-[#f4f7fc] border border-[#13294b]/10 p-4 text-sm sm:text-base font-bold text-[#13294b] leading-relaxed">
                    {currentComment.text}
                  </div>

                  {/* Resolved Official Reply + Guest Reaction */}
                  {resolvedChats[currentComment.id] && (
                    <div className="space-y-2.5 animate-card-in">
                      <div className="rounded-2xl rounded-tr-sm bg-[#13294b] text-white p-4 ml-6 sm:ml-10 text-sm font-semibold shadow-sm">
                        <div className="text-[11px] font-extrabold text-[#7dd3fc] mb-1 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Библиотека · БГИИК (Официальный ответ)
                        </div>
                        <div>{resolvedChats[currentComment.id].reply}</div>
                      </div>
                      <div className="rounded-2xl bg-[#e9f7ef] border border-[#157a4f]/30 text-[#157a4f] p-3.5 text-sm font-extrabold">
                        {resolvedChats[currentComment.id].guestReaction}
                      </div>
                    </div>
                  )}

                  {chatWarning && (
                    <div className="rounded-xl bg-[#fde8ea] border border-[#c41e2e]/30 px-4 py-3 text-xs sm:text-sm font-bold text-[#c41e2e] animate-stage-shake">
                      {chatWarning}
                    </div>
                  )}

                  {/* Reply Options */}
                  {!resolvedChats[currentComment.id] && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b]/65">
                        Выбери ответ от лица библиотеки:
                      </div>
                      {currentComment.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSendChatReply(opt)}
                          className="w-full p-4 rounded-2xl bg-[#f7f9fd] hover:bg-[#13294b] hover:text-white border-2 border-[#13294b]/12 hover:border-[#13294b] text-left text-xs sm:text-sm font-bold transition-all flex items-center justify-between gap-3 group"
                        >
                          <span>{opt.label}</span>
                          <Send className="w-4 h-4 shrink-0 text-[#135c75] group-hover:text-[#7dd3fc]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
