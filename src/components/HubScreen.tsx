import React from 'react';
import {
  ArrowRight,
  Award,
  Box,
  Check,
  CheckCircle2,
  Compass,
  Sparkles,
} from 'lucide-react';
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
  { img: string; roleBadge: string; summary: string }
> = {
  1: {
    img: MEDIA.sceneLibraryDesk,
    roleBadge: 'Роль 1 · Специалист по информационным ресурсам',
    summary:
      'Выполни запрос читателя в электронном каталоге, проверь расстановку фонда на стеллаже, сверь карточку с книгой и собери мультимедийную выставку.',
  },
  2: {
    img: MEDIA.sceneEditorDesk,
    roleBadge: 'Роль 2 · Редактор-издатель',
    summary:
      'Отбери авторские статьи в номер журнала «Культура», проверь факты по аудиозаписи интервью, сверстай полосу и проверь макет перед печатью.',
  },
  3: {
    img: MEDIA.sceneSmmFestival,
    roleBadge: 'Роль 3 · Креативный менеджер проектов',
    summary:
      'Разработай концепцию и афишу акции «Библионочь» по опросу гостей, распредели грант 300 000 ₽ по площадкам, оформи SMM-анонс и ответь читателям.',
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
        {/* 1. GAME-FIRST HERO BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f223d] via-[#13294b] to-[#1d3f72] text-white px-6 py-7 sm:px-8 sm:py-8 shadow-2xl border border-white/15">
          {/* Animated Ambient Background Orbs */}
          <div
            className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-[#ffd66b]/15 blur-3xl animate-hero-float"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-[#c41e2e]/20 blur-3xl animate-hero-float"
            style={{ animationDelay: '1.8s' }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-[#ffd66b]/40 text-xs font-extrabold uppercase tracking-widest text-[#ffd66b]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Интерактивная игра · Кафедра БИД БГИИК</span>
              </div>

              <h1 className="font-display font-extrabold text-2xl sm:text-4xl leading-tight tracking-tight">
                Профессиональная проба «Книгоград»
              </h1>

              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Попробуй себя в трёх профессиях на реальных рабочих задачах: управляй
                информационными ресурсами и электронным каталогом, редактируй и верстай новый выпуск
                журнала, запускай культурный проект и продвигай его в цифровой среде.
              </p>

              {/* Prominent Call-to-Action Block + Primary 3D Tour Button */}
              <div className="rounded-2xl bg-white/10 border border-[#ffd66b]/45 p-4 space-y-3">
                <div className="font-display font-extrabold text-sm sm:text-base text-[#ffd66b] leading-snug">
                  Твоим идеям пора получить профессию — исследуй 3D-залы «Книгограда» или выбери
                  мастерскую ниже!
                </div>
                {onSwitchTo3D && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onSwitchTo3D}
                      className="min-h-[52px] px-6 rounded-2xl bg-gradient-to-r from-[#ffd66b] via-[#ffca42] to-[#f5b019] hover:brightness-105 active:scale-[0.99] text-[#13294b] font-display font-extrabold text-sm sm:text-base inline-flex items-center gap-2.5 transition-all animate-tour-glow"
                    >
                      <Box className="w-5 h-5 text-[#c41e2e] shrink-0" />
                      <span>Открыть 3D-тур по Книгограду</span>
                      <ArrowRight className="w-5 h-5 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Interactive 3D Preview Card + Game Stats */}
            <div className="shrink-0 lg:w-[360px] space-y-3">
              {onSwitchTo3D && (
                <button
                  type="button"
                  onClick={onSwitchTo3D}
                  className="group w-full relative rounded-2xl overflow-hidden border-2 border-[#ffd66b]/60 shadow-xl text-left block transition-transform hover:-translate-y-0.5"
                >
                  <img
                    src={MEDIA.studioRoom}
                    alt="3D-тур по залам Книгограда"
                    referrerPolicy="no-referrer"
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f3a]/95 via-[#0d1f3a]/35 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#c41e2e] text-white font-mono-tabular text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 shadow">
                    <Box className="w-3 h-3" /> Интерактивный 3D-режим
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                    <div>
                      <div className="font-display font-extrabold text-xs sm:text-sm text-[#ffd66b]">
                        Виртуальный 3D-мир «Книгоград»
                      </div>
                      <div className="text-[11px] text-white/85">
                        Холл · Библиотека · Редакция · Зал «Библионочи»
                      </div>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-[#ffd66b] text-[#13294b] flex items-center justify-center font-extrabold shrink-0">
                      →
                    </span>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2.5 text-center">
                  <div className="font-display font-extrabold text-xl text-[#ffd66b] font-mono-tabular">
                    3
                  </div>
                  <div className="text-[11px] font-bold text-white/80">мастерские</div>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2.5 text-center">
                  <div className="font-display font-extrabold text-xl text-[#ffd66b] font-mono-tabular">
                    12
                  </div>
                  <div className="text-[11px] font-bold text-white/80">заданий</div>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2.5 text-center">
                  <div className="font-display font-extrabold text-xl text-[#ffd66b] font-mono-tabular">
                    36
                  </div>
                  <div className="text-[11px] font-bold text-white/80">макс. библиков</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. GAME RULES RIGHT AFTER THE HERO BANNER */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e8f3f7] text-[#135c75] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                1. Выбери роль и мастерскую
              </h2>
            </div>
            <p className="text-sm text-[#13294b]/75 leading-relaxed">
              Заходи в 3D-тур или открывай любую из 3 мастерских ниже. В каждой тебя ждут 4 рабочих
              задания и готовый итоговый проект.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#fdecee] text-[#c41e2e] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                2. Зарабатывай библики
              </h2>
            </div>
            <ul className="space-y-1 text-xs sm:text-sm text-[#13294b]/80">
              <li className="flex items-center justify-between gap-2">
                <span>С первой попытки без подсказок</span>
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
                3. Узнай, какая роль тебе ближе
              </h2>
            </div>
            <p className="text-sm text-[#13294b]/75 leading-relaxed">
              После прохождения игра покажет диаграмму твоих результатов и подскажет, какое
              направление на кафедре БИД подходит именно тебе.
            </p>
          </div>
        </section>

        {/* 3. THREE WORKSHOPS TO PLAY */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b]">
              Выбери мастерскую для прохождения
            </h2>
            <p className="text-sm text-[#13294b]/70">
              Проходить мастерские можно в любом порядке — прогресс и заработанные библики
              сохраняются автоматически.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onSwitchTo3D && (
              <button
                type="button"
                onClick={onSwitchTo3D}
                className="min-h-[42px] px-4 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] text-[#13294b] text-xs sm:text-sm font-display font-extrabold inline-flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                <Box className="w-4 h-4 text-[#c41e2e]" />
                <span>Открыть 3D-тур</span>
              </button>
            )}
            {completedTasks > 0 && (
              <button
                type="button"
                onClick={() => onNavigate({ view: 'results' })}
                className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#c41e2e] hover:underline whitespace-nowrap"
              >
                <BiblikCoin size="sm" />
                <span>
                  Посмотреть итоги ({completedTasks} из 12 · {totalBibliks} Б) →
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Workshop Cards */}
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
                        Мастерская {ws.id}
                      </span>
                      <span className="font-mono-tabular text-xs font-extrabold">
                        {doneCount} из 4 заданий · {wsBibliks} Б
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#135c75]">
                        {card.roleBadge}
                      </div>
                      <h3 className="font-display font-extrabold text-lg text-[#13294b] leading-snug mt-0.5">
                        {ws.id === 1
                          ? 'Библиотека и информационные ресурсы'
                          : ws.id === 2
                            ? 'Издательское дело и редакция'
                            : 'Креативный менеджмент и проекты'}
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
