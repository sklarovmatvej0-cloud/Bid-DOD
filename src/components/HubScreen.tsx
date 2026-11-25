import React from 'react';
import { ArrowRight, Award, Box, Check, CheckCircle2, Compass, Sparkles } from 'lucide-react';
import { MEDIA } from '../game/assets';
import { WORKSHOPS } from '../game/knigogradData';
import { KnigogradSave, ScreenRoute, WorkshopId } from '../game/knigogradTypes';
import { BiblikCoin } from './TopBar';

interface HubScreenProps {
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  onNavigate: (route: ScreenRoute) => void;
  onSwitchTo3D?: () => void;
}

const WORKSHOP_CARDS: Record<
  WorkshopId,
  { img: string; place: string; summary: string }
> = {
  1: {
    img: MEDIA.sceneLibraryDesk,
    place: 'Библиотека и информационный центр',
    summary:
      'Поиск книг в электронном каталоге, систематическая расстановка фонда, сверка записи с изданием и виртуальная выставка.',
  },
  2: {
    img: MEDIA.sceneEditorDesk,
    place: 'Издательство и редакция журнала',
    summary:
      'Отбор статей в новый номер, проверка фактов по интервью, оформление страницы журнала и сверка перед печатью.',
  },
  3: {
    img: MEDIA.sceneSmmFestival,
    place: 'Отдел креативного и проектного менеджмента',
    summary:
      'Концепция акции «Библионочь», распределение гранта библиотеки, анонс в соцсетях и ответы на комментарии читателей.',
  },
};

export const HubScreen: React.FC<HubScreenProps> = ({
  save,
  totalBibliks,
  completedTasks,
  onNavigate,
  onSwitchTo3D,
}) => {
  const getTasksProgress = (wId: WorkshopId) => {
    if (wId === 1) return save.w1;
    if (wId === 2) return save.w2;
    return save.w3;
  };

  const getNextTaskIdx = (wId: WorkshopId): number => {
    const arr = getTasksProgress(wId);
    const idx = arr.findIndex((t) => !t.completed);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="h-full overflow-y-auto desk-scroll px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6 animate-card-in">
        {/* 1. Main Welcome Hero: What this resource is and why it exists */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#13294b] via-[#17335c] to-[#0f223d] text-white px-6 py-6 sm:px-8 sm:py-8 shadow-xl border border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#ffd66b]/35 text-[11px] font-extrabold uppercase tracking-widest text-[#ffd66b]">
                БГИИК · Кафедра библиотечно-информационной деятельности · День открытых дверей
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-4xl leading-tight">
                Профессиональная проба «Книгоград»
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Хочешь узнать, чем занимаются специалисты, которые работают с информацией, готовят
                печатные и электронные издания, разрабатывают и организуют мероприятия? Здесь ты
                познакомишься с тремя профессиональными ролями и выполнишь практические задания,
                связанные с направлениями подготовки кафедры БИД.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({
                      view: 'workshop',
                      workshop: 1,
                      task: getNextTaskIdx(1),
                    })
                  }
                  className="min-h-[44px] px-5 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] text-[#13294b] font-display font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-colors"
                >
                  <span>Начать с Мастерской 1</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {onSwitchTo3D && (
                  <button
                    type="button"
                    onClick={onSwitchTo3D}
                    className="min-h-[44px] px-4 rounded-xl bg-white/12 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition-colors"
                  >
                    <Box className="w-4 h-4 text-[#ffd66b]" />
                    <span>Открыть 3D-экскурсию по залам</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0 lg:min-w-[330px]">
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3.5 text-center">
                <div className="font-display font-extrabold text-2xl text-[#ffd66b] font-mono-tabular">
                  3
                </div>
                <div className="text-[11px] font-bold text-white/80 mt-0.5">мастерские</div>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3.5 text-center">
                <div className="font-display font-extrabold text-2xl text-[#ffd66b] font-mono-tabular">
                  12
                </div>
                <div className="text-[11px] font-bold text-white/80 mt-0.5">заданий</div>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3.5 text-center">
                <div className="font-display font-extrabold text-2xl text-[#ffd66b] font-mono-tabular">
                  36
                </div>
                <div className="text-[11px] font-bold text-white/80 mt-0.5">макс. библиков</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Three Clearly Separated Light Info Cards (How the Professional Trial Works) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e8f3f7] text-[#135c75] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                1. Выбери мастерскую
              </h2>
            </div>
            <p className="text-sm text-[#13294b]/75 leading-relaxed">
              Начинай с любой из трёх мастерских ниже. В каждой — 4 коротких задания и готовый
              итоговый проект.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#fdecee] text-[#c41e2e] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                2. Собирай библики
              </h2>
            </div>
            <ul className="space-y-1 text-xs sm:text-sm text-[#13294b]/80">
              <li className="flex items-center justify-between gap-2">
                <span>Без ошибок и подсказок</span>
                <strong className="font-mono-tabular text-[#157a4f]">+3 библика</strong>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>С одной ошибкой</span>
                <strong className="font-mono-tabular text-[#135c75]">+2 библика</strong>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>С подсказкой или от 2 ошибок</span>
                <strong className="font-mono-tabular text-[#9c5a08]">+1 библик</strong>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#eef2f9] text-[#13294b] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                3. Узнай свой итог
              </h2>
            </div>
            <p className="text-sm text-[#13294b]/75 leading-relaxed">
              После прохождения откроется профиль твоих сильных сторон и подходящее направление на
              кафедре БИД в БГИИК.
            </p>
          </div>
        </section>

        {/* Section Heading */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b]">
              Три профессиональные роли — выбери мастерскую
            </h2>
            <p className="text-sm text-[#13294b]/70">
              Можно нажать сразу на конкретное задание внутри карточки или начать мастерскую по порядку.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {completedTasks > 0 && (
              <button
                type="button"
                onClick={() => onNavigate({ view: 'results' })}
                className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#c41e2e] hover:underline whitespace-nowrap"
              >
                <BiblikCoin size="sm" />
                <span>
                  Мои результаты ({completedTasks} из 12 · {totalBibliks} Б) →
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Workshop Cards with Direct 4-Task Launch List */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {WORKSHOPS.map((ws) => {
            const prog = getTasksProgress(ws.id);
            const doneCount = prog.filter((t) => t.completed).length;
            const wsBibliks = prog.reduce((sum, t) => sum + t.bibliks, 0);
            const nextTaskIdx = getNextTaskIdx(ws.id);
            const card = WORKSHOP_CARDS[ws.id];

            return (
              <article
                key={ws.id}
                className="bg-white rounded-3xl overflow-hidden shadow-md border border-[#13294b]/10 flex flex-col justify-between transition-transform hover:-translate-y-1"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-[#13294b] overflow-hidden">
                    <img
                      src={card.img}
                      alt={ws.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                        Мастерская 0{ws.id}
                      </span>
                      <span className="font-mono-tabular text-xs font-extrabold">
                        {doneCount}/4 · {wsBibliks} Б
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#135c75]">
                        {card.place}
                      </div>
                      <h3 className="font-display font-extrabold text-lg text-[#13294b] leading-snug mt-0.5">
                        {ws.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#13294b]/75 leading-relaxed mt-1.5">
                        {card.summary}
                      </p>
                    </div>

                    {/* Direct 4-Stage List inside each Workshop Card */}
                    <div className="space-y-1.5 pt-2 border-t border-[#13294b]/10">
                      {ws.tasks.map((task, idx) => {
                        const isDone = prog[idx]?.completed;
                        return (
                          <button
                            key={task.title}
                            type="button"
                            onClick={() =>
                              onNavigate({ view: 'workshop', workshop: ws.id, task: idx })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors ${
                              isDone
                                ? 'bg-[#e9f7ef] text-[#157a4f] hover:bg-[#d8f1e3]'
                                : 'bg-[#f4f7fc] text-[#13294b] hover:bg-[#e6edf8]'
                            }`}
                          >
                            <span className="truncate">
                              <strong className="font-mono-tabular">{idx + 1}.</strong> {task.title}
                            </span>
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-extrabold shrink-0">
                                <Check className="w-3.5 h-3.5" />+{prog[idx].bibliks} Б
                              </span>
                            ) : (
                              <span className="text-[#13294b]/40 text-xs shrink-0">↗</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({ view: 'workshop', workshop: ws.id, task: nextTaskIdx })
                    }
                    className="flex-1 min-h-[46px] rounded-2xl text-white font-display font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-92 whitespace-nowrap"
                    style={{ backgroundColor: ws.accentBg }}
                  >
                    {doneCount === 0
                      ? 'Начать мастерскую'
                      : doneCount === 4
                        ? 'Открыть ещё раз'
                        : `Продолжить (шаг ${nextTaskIdx + 1})`}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {doneCount === 4 && (
                    <button
                      type="button"
                      onClick={() => onNavigate({ view: 'showcase', workshop: ws.id })}
                      className="min-h-[46px] px-4 rounded-2xl bg-[#e9f7ef] hover:bg-[#d5f0e1] text-[#157a4f] text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Итог
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
};
