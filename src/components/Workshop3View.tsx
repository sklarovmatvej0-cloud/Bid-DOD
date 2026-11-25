import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Flame,
  Heart,
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

  /* ---- Task 0: Live Illustrated Festival Poster Builder ---- */
  const [conceptPicks, setConceptPicks] = useState<Record<string, string>>({});

  /* ---- Task 1: Illustrated 3-Zone Festival Map + Budget ---- */
  const [budgetPicks, setBudgetPicks] = useState<Record<string, string>>({});

  /* ---- Task 2: Realistic Smartphone SMM Studio ---- */
  const [smmPicks, setSmmPicks] = useState<Record<string, string>>({
    hook: 'dry',
    visual: 'wall',
    cta: 'weak',
    timing: 'late',
  });

  /* ---- Task 3: Live Messenger Comment Thread ---- */
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

    for (const step of CONCEPT_STEPS) {
      const chosen = step.options.find((o) => o.id === conceptPicks[step.id]);
      if (!chosen?.isBest) {
        onRecordMistake(0);
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
    for (const step of SMM_CONSTRUCTOR_STEPS) {
      const chosen = step.options.find((o) => o.id === smmPicks[step.id]);
      if (!chosen?.isBest) {
        onRecordMistake(2);
        onShowError(
          `Сейчас анонс собрал ${smmMetrics.regs} регистраций (нужно 400+)`,
          chosen?.feedback ?? 'Попробуй другой вариант слева и следи за счётчиком на экране смартфона.'
        );
        return;
      }
    }

    onCompleteTask(2, {
      success: true,
      title: `Анонс «Библионочи» опубликован: ${smmMetrics.regs} регистраций!`,
      body: 'Понятный заголовок, яркие карточки с расписанием площадок, чёткий призыв к записи и публикация за 5 дней с репостом партнёров.',
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

    if (chatIdx < COMMUNITY_COMMENTS.length - 1) {
      setTimeout(() => {
        setChatIdx((i) => i + 1);
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
                  <div className="text-xs font-extrabold uppercase tracking-widest text-[#ffd66b]">
                    Готовый результат · Мастерская 3
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
                    className="min-h-[42px] px-5 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] text-[#13294b] text-xs sm:text-sm font-extrabold inline-flex items-center gap-2"
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
                <div className="font-display font-bold text-sm text-[#ffd66b]">Главный зал</div>
                <p className="text-xs text-white/80">Книжный квиз с ведущим и творческая встреча с автором</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 space-y-2">
                <img
                  src={MEDIA.sceneFestivalComics}
                  alt="Интерактивные зоны"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
                <div className="font-display font-bold text-sm text-[#ffd66b]">Интерактивные зоны</div>
                <p className="text-xs text-white/80">Фотозона, мастер-класс по открыткам и буккроссинг</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 space-y-2">
                <img
                  src={MEDIA.w3SmmCards}
                  alt="Анонс Библионочи в соцсетях"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
                <div className="font-display font-bold text-sm text-[#ffd66b]">450+ регистраций</div>
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
                    ? 'bg-[#13294b] text-white'
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
              Готовая «Библионочь»
            </button>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 min-h-0 overflow-y-auto desk-scroll px-4 sm:px-6 py-5">
        <div className="max-w-6xl mx-auto space-y-5 animate-card-in" key={`w3-t${taskIdx}`}>
          {/* ============ TASK 0: ILLUSTRATED FESTIVAL POSTER BUILDER ============ */}
          {taskIdx === 0 && (
            <>
              <MissionBanner
                image={MEDIA.sceneSmmFestival}
                imageAlt="Планирование культурного проекта в отделе креативного менеджмента"
                stepLabel="Мастерская 3 · Шаг 1 из 4"
                title="Разработай концепцию и афишу события по аналитике аудитории"
                goal="Перед запуском проекта изучи данные опроса потенциальных гостей ниже. Выбери формат, название и партнёров слева — макет афиши справа обновится сразу."
                steps={[
                  { text: 'Изучи статистику опроса и выбери формат события', done: Boolean(conceptPicks.format) },
                  { text: 'Подбери понятное и привлекательное название для афиши', done: Boolean(conceptPicks.name) },
                  { text: 'Выбери подходящих партнёров и утверди концепцию', done: Boolean(conceptPicks.partner) },
                ]}
                resultPreview="Готовая концепция и афиша культурного проекта, основанная на данных опроса."
                accentColor="#13294b"
                onHint={handleHintClick}
              />

              {/* Compact Visual Survey Strip */}
              <div className="bg-white rounded-2xl p-4 border border-[#13294b]/10 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SURVEY_STATS.map((st) => (
                  <div key={st.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#13294b]">
                      <span className="line-clamp-1">{st.label}</span>
                      <span className="font-mono-tabular font-extrabold text-[#c41e2e] shrink-0">
                        {st.percent}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#eef2f8] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${st.percent}%`,
                          backgroundColor: st.percent > 50 ? '#157a4f' : '#c41e2e',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 7 COLS: 3 CLEAR CHOICE BLOCKS */}
                <div className="lg:col-span-7 space-y-4">
                  {CONCEPT_STEPS.map((step) => (
                    <div
                      key={step.id}
                      className="bg-white rounded-2xl p-4 border border-[#13294b]/10 shadow-xs space-y-2.5"
                    >
                      <div className="font-display font-extrabold text-sm text-[#13294b]">
                        {step.title}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {step.options.map((opt) => {
                          const selected = conceptPicks[step.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playSelectTick();
                                setConceptPicks((prev) => ({ ...prev, [step.id]: opt.id }));
                              }}
                              className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                                selected
                                  ? 'bg-[#13294b] text-white border-[#13294b] shadow'
                                  : 'bg-[#f5f7fc] hover:bg-[#e8effa] text-[#13294b] border-transparent'
                              }`}
                            >
                              <div className="text-xs sm:text-sm font-extrabold">{opt.label}</div>
                              <div
                                className={`text-[11px] mt-0.5 ${
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
                  ))}
                </div>

                {/* RIGHT 5 COLS: BIG LIVE ILLUSTRATED POSTER PREVIEW */}
                <div className="lg:col-span-5 space-y-3 sticky top-4">
                  <div className="rounded-3xl overflow-hidden bg-[#13294b] text-white shadow-2xl border-2 border-[#ffd66b]/50">
                    <div className="relative aspect-[4/3] bg-[#0a182e]">
                      <img
                        src={
                          conceptPicks.format === 'lecture'
                            ? MEDIA.studioArch
                            : conceptPicks.format === 'closed'
                              ? MEDIA.w3SmmTextwall
                              : MEDIA.sceneSmmFestival
                        }
                        alt="Живой макет афиши Библионочи"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#13294b] via-[#13294b]/25 to-transparent" />
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-[#c41e2e] text-white font-mono-tabular text-[11px] font-extrabold">
                        МАКЕТ АФИШИ
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="font-display font-extrabold text-xl text-[#ffd66b] leading-snug">
                        {pickedName ? pickedName.label : '← Выбери название афиши'}
                      </div>
                      <div className="rounded-xl bg-white/10 p-3 text-xs text-white/90">
                        <strong className="text-[#7dd3fc]">Формат:</strong>{' '}
                        {pickedFormat ? pickedFormat.label : 'ещё не выбран'}
                      </div>
                      <div className="rounded-xl bg-white/10 p-3 text-xs text-white/90">
                        <strong className="text-[#86efac]">Партнёры:</strong>{' '}
                        {pickedPartner ? pickedPartner.label : 'ещё не выбраны'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckTask0}
                    className="w-full min-h-[50px] rounded-2xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-sm shadow-lg transition-colors"
                  >
                    Утвердить афишу ({Object.keys(conceptPicks).length}/3) →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============ TASK 1: ILLUSTRATED 3-ZONE FESTIVAL MAP + BUDGET ============ */}
          {taskIdx === 1 && (
            <>
              <MissionBanner
                image={MEDIA.sceneFestivalStage}
                imageAlt="Площадки и смета гранта библиотеки"
                stepLabel="Мастерская 3 · Шаг 2 из 4"
                title="Библиотеке выделен грант 300 000 ₽ — распредели его по 3 площадкам"
                goal="На проведение акции «Библионочь» библиотеке выделен грант 300 тыс. ₽. Выбери наполнение для всех 3 зон, чтобы уложиться в грант, а показатели Настроения и Порядка стали не ниже 80%."
                steps={[
                  { text: 'Выбери программу для Главного зала', done: Boolean(budgetPicks.main) },
                  { text: 'Выбери наполнение Интерактивных зон', done: Boolean(budgetPicks.zones) },
                  { text: 'Настрой навигацию, волонтёров и призы', done: Boolean(budgetPicks.care) },
                ]}
                resultPreview="Грант библиотеки 300 тыс. ₽ распределён грамотно, оба показателя ≥ 80%."
                accentColor="#13294b"
                onHint={handleHintClick}
              />

              {/* 3 Big Clear Live Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div
                  className={`rounded-2xl p-4 border-2 shadow-xs ${
                    budgetMetrics.cost > 300
                      ? 'bg-[#fde8ea] border-[#c41e2e]'
                      : 'bg-white border-[#13294b]/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#13294b]/70">
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#c41e2e]" /> Грант библиотеки (лимит 300 тыс.)
                    </span>
                    <span
                      className={`font-mono-tabular text-base ${
                        budgetMetrics.cost > 300 ? 'text-[#c41e2e]' : 'text-[#13294b]'
                      }`}
                    >
                      {budgetMetrics.cost} / 300 тыс. ₽
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (budgetMetrics.cost / 300) * 100)}%`,
                        backgroundColor: budgetMetrics.cost > 300 ? '#c41e2e' : '#135c75',
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border-2 border-[#13294b]/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#13294b]/70">
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-[#e59c2d]" /> Настроение (нужно 80%+)
                    </span>
                    <span
                      className={`font-mono-tabular text-base ${
                        budgetMetrics.vibe >= 80 ? 'text-[#157a4f]' : 'text-[#b76506]'
                      }`}
                    >
                      {budgetMetrics.vibe}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, budgetMetrics.vibe)}%`,
                        backgroundColor: budgetMetrics.vibe >= 80 ? '#157a4f' : '#e59c2d',
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 border-2 border-[#13294b]/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#13294b]/70">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#157a4f]" /> Порядок (нужно 80%+)
                    </span>
                    <span
                      className={`font-mono-tabular text-base ${
                        budgetMetrics.org >= 80 ? 'text-[#157a4f]' : 'text-[#135c75]'
                      }`}
                    >
                      {budgetMetrics.org}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, budgetMetrics.org)}%`,
                        backgroundColor: budgetMetrics.org >= 80 ? '#157a4f' : '#135c75',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 3 Illustrated Festival Zones */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {EVENT_BUDGET_STEPS.map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-white rounded-3xl overflow-hidden border border-[#13294b]/12 shadow-md flex flex-col"
                  >
                    <div className="relative aspect-[4/3] bg-[#13294b]">
                      <img
                        src={ZONE_IMAGES[zone.id] ?? MEDIA.sceneSmmFestival}
                        alt={zone.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white font-display font-extrabold text-sm">
                        {zone.title}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2 flex-1">
                      {zone.options.map((opt) => {
                        const selected = budgetPicks[zone.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playSelectTick();
                              setBudgetPicks((prev) => ({ ...prev, [zone.id]: opt.id }));
                            }}
                            className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                              selected
                                ? 'bg-[#13294b] text-white border-[#13294b]'
                                : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b] border-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-extrabold leading-snug">{opt.label}</span>
                              <span
                                className={`font-mono-tabular text-xs font-extrabold shrink-0 ${
                                  selected ? 'text-[#ffd66b]' : 'text-[#c41e2e]'
                                }`}
                              >
                                {opt.cost} т.₽
                              </span>
                            </div>
                            <div
                              className={`text-[11px] mt-1 ${
                                selected ? 'text-white/75' : 'text-[#13294b]/65'
                              }`}
                            >
                              Настроение +{opt.vibe}% · Порядок +{opt.org}%
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCheckTask1}
                className="w-full min-h-[50px] rounded-2xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-sm shadow-lg"
              >
                Утвердить площадки «Библионочи» ({budgetMetrics.count}/3) →
              </button>
            </>
          )}

          {/* ============ TASK 2: REALISTIC SMARTPHONE SMM POST STUDIO ============ */}
          {taskIdx === 2 && (
            <>
              <MissionBanner
                image={MEDIA.sceneSmmReels}
                imageAlt="Подготовка анонса Библионочи в соцсетях"
                stepLabel="Мастерская 3 · Шаг 3 из 4"
                title="Подготовь анонс «Библионочи» в соцсетях на 400+ регистраций"
                goal="Собери публикацию из 4 частей: заголовок, оформление, призыв к действию и время выхода. На экране смартфона справа сразу видно, сколько человек запишется."
                steps={[
                  { text: 'Подбери заголовок и оформление поста', done: smmPicks.hook === 'best' && smmPicks.visual === 'best' },
                  { text: 'Выбери призыв к действию и время публикации', done: smmPicks.cta === 'best' && smmPicks.timing === 'best' },
                  { text: 'Набери 400+ регистраций и нажми «Опубликовать пост»', done: smmMetrics.regs >= 400 },
                ]}
                resultPreview="Анонс «Библионочи» на экране смартфона собирает более 400 регистраций."
                accentColor="#13294b"
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT 7 COLS: 4 VISUAL CONTROLS */}
                <div className="lg:col-span-7 space-y-4">
                  {SMM_CONSTRUCTOR_STEPS.map((step) => (
                    <div
                      key={step.id}
                      className="bg-white rounded-2xl p-4 border border-[#13294b]/10 shadow-xs space-y-2.5"
                    >
                      <div className="font-display font-extrabold text-sm text-[#13294b]">
                        {step.title}
                      </div>

                      {step.id === 'visual' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {step.options.map((opt) => {
                            const selected = smmPicks[step.id] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  soundEngine.playSelectTick();
                                  setSmmPicks((prev) => ({ ...prev, [step.id]: opt.id }));
                                }}
                                className={`rounded-2xl overflow-hidden border-2 text-left transition-all flex flex-col ${
                                  selected
                                    ? 'border-[#13294b] ring-2 ring-[#ffd66b]'
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
                        <div className="space-y-2">
                          {step.options.map((opt) => {
                            const selected = smmPicks[step.id] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  soundEngine.playSelectTick();
                                  setSmmPicks((prev) => ({ ...prev, [step.id]: opt.id }));
                                }}
                                className={`w-full p-3 rounded-xl border-2 text-left text-xs sm:text-sm font-bold transition-all ${
                                  selected
                                    ? 'bg-[#13294b] text-white border-[#13294b]'
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
                  ))}
                </div>

                {/* RIGHT 5 COLS: REALISTIC SMARTPHONE LIVE POST */}
                <div className="lg:col-span-5 flex flex-col items-center space-y-4">
                  <div className="w-full max-w-[350px] rounded-[36px] bg-[#101828] p-3.5 shadow-2xl border-4 border-[#273552] text-white">
                    <div className="w-24 h-4 rounded-full bg-black/70 mx-auto mb-3" />
                    <div className="rounded-[24px] bg-white text-[#13294b] overflow-hidden">
                      {/* Account Header */}
                      <div className="px-3.5 py-2.5 flex items-center gap-2.5 border-b border-[#13294b]/10">
                        <div className="w-8 h-8 rounded-full bg-[#c41e2e] text-white font-display font-extrabold text-xs flex items-center justify-center">
                          БН
                        </div>
                        <div className="leading-tight">
                          <div className="text-xs font-extrabold">Библиотека · БГИИК</div>
                          <div className="text-[10px] text-[#13294b]/60">Белгород · Анонс «Библионочи»</div>
                        </div>
                      </div>

                      {/* Real Post Photo */}
                      <img
                        src={SMM_VISUAL_PREVIEWS[smmPicks.visual] ?? MEDIA.w3SmmCards}
                        alt="Превью поста в смартфоне"
                        referrerPolicy="no-referrer"
                        className="w-full aspect-[4/3] object-cover"
                      />

                      {/* Live Likes / Comments / Registrations */}
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span className="inline-flex items-center gap-1 text-[#c41e2e]">
                            <Heart className="w-4 h-4 fill-current" /> {smmMetrics.likes}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#135c75]">
                            <MessageCircle className="w-4 h-4" /> {smmMetrics.comments}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#157a4f]">
                            <Users className="w-4 h-4" /> {smmMetrics.regs} записей
                          </span>
                        </div>

                        <div className="text-xs font-extrabold text-[#13294b] leading-snug">
                          {activeHook?.preview}
                        </div>
                        <div className="text-[11px] text-[#13294b]/75 leading-snug">
                          {activeVisual?.preview} · {activeCta?.preview}
                        </div>

                        {/* Goal Progress Bar */}
                        <div className="pt-2 border-t border-[#13294b]/10 space-y-1">
                          <div className="flex justify-between text-[11px] font-extrabold">
                            <span>Цель: 400+ регистраций</span>
                            <span
                              className={
                                smmMetrics.regs >= 400 ? 'text-[#157a4f]' : 'text-[#c41e2e]'
                              }
                            >
                              {smmMetrics.regs} / 400
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-[#e9edf5] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.min(100, (smmMetrics.regs / 400) * 100)}%`,
                                backgroundColor: smmMetrics.regs >= 400 ? '#157a4f' : '#e59c2d',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckTask2}
                    className="w-full max-w-[350px] min-h-[50px] rounded-2xl bg-[#157a4f] hover:bg-[#116440] text-white font-display font-extrabold text-sm shadow-lg"
                  >
                    Опубликовать пост ({smmMetrics.regs} регистраций) →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============ TASK 3: LIVE MESSENGER COMMENT THREAD ============ */}
          {taskIdx === 3 && (
            <>
              <MissionBanner
                image={MEDIA.sceneFestivalComics}
                imageAlt="Общение с читателями в комментариях к Библионочи"
                stepLabel="Мастерская 3 · Шаг 4 из 4"
                title="Ответь на 4 комментария читателей под анонсом «Библионочи»"
                goal="Под публикацией библиотеки читатели задают организационные вопросы, оставляют отзывы и уточняют условия входа. Выбери грамотный и вежливый ответ от лица библиотеки."
                steps={[
                  { text: 'Прочитай комментарий читателя ниже', done: true },
                  { text: 'Выбери грамотный ответ от лица библиотеки', done: Object.keys(resolvedChats).length > 0 },
                  { text: 'Разбери все 4 комментария', done: Object.keys(resolvedChats).length === 4 },
                ]}
                resultPreview="Все 4 комментария отработаны, читатели получили точные ответы."
                accentColor="#13294b"
                onHint={handleHintClick}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT 4 COLS: POST PREVIEW + PROGRESS */}
                <div className="lg:col-span-4 bg-white rounded-3xl overflow-hidden border border-[#13294b]/12 shadow-md">
                  <img
                    src={MEDIA.w3SmmCards}
                    alt="Анонс Библионочи"
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="p-4 space-y-3">
                    <div className="font-display font-extrabold text-sm text-[#13294b]">
                      Анонс «Библионочи» · Комментарии
                    </div>
                    <div className="space-y-1.5">
                      {COMMUNITY_COMMENTS.map((c, idx) => {
                        const done = Boolean(resolvedChats[c.id]);
                        const active = chatIdx === idx;
                        return (
                          <div
                            key={c.id}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                              done
                                ? 'bg-[#e9f7ef] text-[#157a4f]'
                                : active
                                  ? 'bg-[#13294b] text-white'
                                  : 'bg-[#f4f7fc] text-[#13294b]/60'
                            }`}
                          >
                            <span>
                              {idx + 1}. {c.author}
                            </span>
                            {done ? <CheckCircle2 className="w-4 h-4" /> : active ? 'Сейчас' : 'Ждёт'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT 8 COLS: LIVE CHAT THREAD */}
                <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-6 border border-[#13294b]/12 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-[#13294b]/10 pb-3">
                    <div className="font-display font-extrabold text-base text-[#13294b]">
                      Комментарий {chatIdx + 1} из {COMMUNITY_COMMENTS.length}
                    </div>
                    <span className="text-xs font-bold text-[#135c75]">
                      {currentComment.role} · {currentComment.tag}
                    </span>
                  </div>

                  {/* Guest Message Bubble */}
                  <div className="rounded-2xl bg-[#f4f7fc] border border-[#13294b]/10 p-4 space-y-1.5">
                    <div className="text-xs font-extrabold text-[#c41e2e]">{currentComment.author}</div>
                    <div className="text-sm sm:text-base font-bold text-[#13294b] leading-relaxed">
                      {currentComment.text}
                    </div>
                  </div>

                  {/* If resolved, show your reply & instant guest reaction */}
                  {resolvedChats[currentComment.id] && (
                    <div className="space-y-2.5 animate-card-in">
                      <div className="rounded-2xl bg-[#13294b] text-white p-4 ml-6 text-sm font-semibold">
                        <div className="text-[11px] font-extrabold text-[#ffd66b] mb-1">
                          Твой ответ (Библиотека):
                        </div>
                        {resolvedChats[currentComment.id].reply}
                      </div>
                      <div className="rounded-2xl bg-[#e9f7ef] border border-[#157a4f]/30 text-[#157a4f] p-3.5 text-sm font-extrabold">
                        {resolvedChats[currentComment.id].guestReaction}
                      </div>
                    </div>
                  )}

                  {chatWarning && (
                    <div className="rounded-xl bg-[#fde8ea] border border-[#c41e2e]/30 px-4 py-3 text-xs sm:text-sm font-bold text-[#c41e2e]">
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
                          <Send className="w-4 h-4 shrink-0 text-[#135c75] group-hover:text-[#ffd66b]" />
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
