import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Home,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { WORKSHOPS } from '../game/knigogradData';
import { KnigogradSave, ScreenRoute, WorkshopId } from '../game/knigogradTypes';
import { BiblikCoin } from './TopBar';

interface ResultsViewProps {
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  onNavigate: (route: ScreenRoute) => void;
  onResetProgress: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  save,
  totalBibliks,
  completedTasks,
  onNavigate,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const workshopStats = WORKSHOPS.map((ws) => {
    const arr = ws.id === 1 ? save.w1 : ws.id === 2 ? save.w2 : save.w3;
    const done = arr.filter((t) => t.completed).length;
    const bibliks = arr.reduce((sum, t) => sum + t.bibliks, 0);
    return { ws, done, bibliks };
  });

  const bestWorkshop = [...workshopStats].sort((a, b) => {
    if (b.bibliks !== a.bibliks) return b.bibliks - a.bibliks;
    return b.done - a.done;
  })[0];

  const rankTitle =
    totalBibliks >= 32
      ? 'Главный профи Книгограда'
      : totalBibliks >= 22
        ? 'Уверенный специалист медиа и культуры'
        : totalBibliks >= 10
          ? 'Перспективный абитуриент БИД'
          : 'Начинающий исследователь профессий';

  const openFirstTask = (wId: WorkshopId) => {
    const arr = wId === 1 ? save.w1 : wId === 2 ? save.w2 : save.w3;
    const idx = arr.findIndex((t) => !t.completed);
    onNavigate({ view: 'workshop', workshop: wId, task: idx === -1 ? 0 : idx });
  };

  return (
    <div className="h-full overflow-y-auto desk-scroll px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6 animate-card-in">
        {/* Top Score & Career Rank */}
        <section className="rounded-3xl bg-[#13294b] text-white p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-[#ffd66b]">
              Личный профиль абитуриента · БГИИК · Кафедра БИД
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight">
              {rankTitle}
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              {completedTasks === 0
                ? 'Пройди хотя бы несколько заданий в мастерских, чтобы собрать библики и увидеть, какая профессия кафедры БИД тебе ближе всего.'
                : `Ты выполнил ${completedTasks} из 12 практических заданий и заработал ${totalBibliks} из 36 библиков. Ниже — подробный разбор твоих сильных сторон и рекомендации направлений.`}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-4 border border-[#ffd66b]/30 shrink-0">
            <BiblikCoin size="lg" />
            <div>
              <div className="font-mono-tabular font-extrabold text-3xl text-[#ffd66b] leading-none">
                {totalBibliks}
                <span className="text-base text-white/60 font-semibold"> / 36</span>
              </div>
              <div className="text-xs font-semibold text-white/80 mt-1">
                золотых библиков · {completedTasks}/12 заданий
              </div>
            </div>
          </div>
        </section>

        {/* Breakdown Across 3 Workshops */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {workshopStats.map(({ ws, done, bibliks }) => {
            const isTop = completedTasks > 0 && bestWorkshop.ws.id === ws.id;
            return (
              <div
                key={ws.id}
                className={`studio-card rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                  isTop ? 'ring-2 ring-[#e59c2d]' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-extrabold uppercase tracking-wider"
                      style={{ color: ws.accentText }}
                    >
                      {ws.code}
                    </span>
                    {isTop && (
                      <span className="text-xs font-extrabold text-[#b76506] inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Твой лучший результат
                      </span>
                    )}
                  </div>

                  <h2 className="font-display font-extrabold text-base text-[#13294b] leading-snug">
                    {ws.title}
                  </h2>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#13294b]/75">
                      <span>Выполнено: {done} из 4</span>
                      <span className="font-mono-tabular text-[#b76506]">{bibliks} / 12 Б</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#e6ebf4] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(bibliks / 12) * 100}%`,
                          backgroundColor: ws.accentBg,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openFirstTask(ws.id)}
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#f2f5fa] hover:bg-[#e5ecf6] text-[#13294b] text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    {done === 4 ? 'Повторить' : 'Пройти дальше'}
                  </button>
                  {done === 4 && (
                    <button
                      type="button"
                      onClick={() => onNavigate({ view: 'showcase', workshop: ws.id })}
                      className="min-h-[40px] px-3 rounded-xl text-white text-xs font-bold whitespace-nowrap"
                      style={{ backgroundColor: ws.accentBg }}
                    >
                      Готовый проект
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Recommended Profile Card */}
        <section className="studio-card rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e] inline-flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Рекомендованное направление на кафедре БИД (БГИИК)
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b]">
                {bestWorkshop.ws.title}
              </h2>
              <p className="text-sm text-[#13294b]/75 max-w-3xl">{bestWorkshop.ws.description}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ view: 'hub' })}
              className="min-h-[42px] px-4 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              На главную
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#f5f7fc] p-5 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#135c75] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Кем ты сможешь работать
              </div>
              <ul className="space-y-2 text-sm text-[#13294b]">
                {bestWorkshop.ws.professions.map((prof) => (
                  <li key={prof} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-[#c41e2e] shrink-0 mt-0.5" />
                    <span>{prof}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-[#f5f7fc] p-5 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b] inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Чему научат на кафедре
              </div>
              <ul className="space-y-2 text-sm text-[#13294b]">
                {bestWorkshop.ws.disciplines.map((disc) => (
                  <li key={disc} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-[#135c75] shrink-0 mt-0.5" />
                    <span>{disc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Safe In-App Reset Confirmation (No window.confirm!) */}
          <div className="pt-3 border-t border-[#13294b]/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#13294b]/60">
              Хочешь пройти игру заново и попробовать набрать все 36 библиков?
            </span>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[38px] px-3.5 rounded-xl border border-[#13294b]/15 hover:bg-[#fef2f2] hover:text-[#c41e2e] text-xs font-bold text-[#13294b]/75 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сбросить прогресс
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#c41e2e]">Точно сбросить всё?</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(false);
                    onResetProgress();
                  }}
                  className="min-h-[36px] px-3 rounded-lg bg-[#c41e2e] text-white text-xs font-bold whitespace-nowrap"
                >
                  Да, начать сначала
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[36px] px-3 rounded-lg bg-[#f2f5fa] text-[#13294b] text-xs font-bold whitespace-nowrap"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
