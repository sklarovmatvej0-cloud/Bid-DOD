import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Award, BookOpen, RotateCcw } from 'lucide-react';
import { KnigogradSave, ScreenRoute } from '../game/knigogradTypes';
import { WORKSHOPS } from '../game/knigogradData';
import { AnimatedNumber } from './VisualEffects';

interface TopBarProps {
  route: ScreenRoute;
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  muted: boolean;
  onNavigate: (next: ScreenRoute) => void;
  onToggleMute: () => void;
  onResetProgress?: () => void;
}

export const BiblikCoin: React.FC<{ size?: 'sm' | 'md' | 'lg'; pulse?: boolean }> = ({
  size = 'sm',
  pulse = false,
}) => {
  const dims =
    size === 'lg'
      ? 'w-9 h-9 text-base border-2'
      : size === 'md'
        ? 'w-7 h-7 text-xs border-2'
        : 'w-6 h-6 text-[11px] border';

  return (
    <span
      className={`${dims} ${
        pulse ? 'animate-coin-pulse' : ''
      } inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd66b] via-[#f0a92c] to-[#d07d12] border-[#b76506] text-[#13294b] font-display font-extrabold shadow-xs select-none`}
      aria-hidden="true"
    >
      Б
    </span>
  );
};

export const TopBar: React.FC<TopBarProps> = ({
  route,
  totalBibliks,
  completedTasks,
  onNavigate,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [biblikGain, setBiblikGain] = useState<number | null>(null);
  const [coinPulse, setCoinPulse] = useState(false);
  const prevBibliksRef = useRef(totalBibliks);

  useEffect(() => {
    const diff = totalBibliks - prevBibliksRef.current;
    if (diff > 0) {
      setBiblikGain(diff);
      setCoinPulse(true);
      const t1 = window.setTimeout(() => setCoinPulse(false), 750);
      const t2 = window.setTimeout(() => setBiblikGain(null), 1550);
      prevBibliksRef.current = totalBibliks;
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    prevBibliksRef.current = totalBibliks;
  }, [totalBibliks]);

  const activeWorkshopMeta =
    route.view === 'workshop' || route.view === 'showcase'
      ? WORKSHOPS.find((w) => w.id === route.workshop)
      : null;

  const progressPct = Math.round((completedTasks / 12) * 100);

  return (
    <header className="relative shrink-0 h-16 bg-[#13294b] text-white border-b border-white/15 px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {route.view !== 'hub' && (
          <button
            type="button"
            onClick={() => onNavigate({ view: 'hub' })}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] active:scale-[0.98] text-xs sm:text-sm font-display font-extrabold text-[#13294b] transition-all whitespace-nowrap shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>На главную</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigate({ view: 'hub' })}
          className="flex items-center gap-2.5 text-left group min-h-[40px] pr-2 rounded-lg hover:bg-white/8 transition-colors px-1.5 whitespace-nowrap shrink-0"
          title="Вернуться на главную страницу"
        >
          <span className="w-9 h-9 rounded-lg bg-[#c41e2e] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-white" />
          </span>
          <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white">
            КНИГОГРАД · БГИИК
          </span>
        </button>

        {activeWorkshopMeta && (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/15 text-xs sm:text-sm min-w-0">
            <span className="text-white/75 whitespace-nowrap">{activeWorkshopMeta.title}</span>
            <span className="text-white/35">/</span>
            <span className="font-bold text-[#ffd66b] truncate">
              {route.view === 'workshop'
                ? activeWorkshopMeta.tasks[route.task]?.title ?? ''
                : 'Готовый результат'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Live Biblik Counter Badge */}
        <div className="relative hidden sm:inline-flex items-center gap-2 min-h-[40px] px-3 rounded-xl bg-white/10 border border-[#ffd66b]/30">
          <BiblikCoin size="sm" pulse={coinPulse} />
          <div className="flex items-baseline gap-1 font-mono-tabular">
            <AnimatedNumber
              value={totalBibliks}
              className="text-sm font-extrabold text-[#ffd66b]"
            />
            <span className="text-[11px] font-semibold text-white/60">/ 36</span>
          </div>
          {biblikGain !== null && (
            <span
              key={`gain-${totalBibliks}`}
              className="pointer-events-none absolute -bottom-7 right-1 px-2 py-0.5 rounded-lg bg-[#ffd66b] text-[#13294b] font-mono-tabular text-xs font-extrabold shadow-lg animate-biblik-float"
            >
              +{biblikGain} Б
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onNavigate({ view: 'results' })}
          className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold transition-all whitespace-nowrap active:scale-[0.98] ${
            route.view === 'results'
              ? 'bg-[#c41e2e] border-[#ff8b96]/40 text-white shadow-sm'
              : 'bg-white/10 hover:bg-white/18 border-white/15 text-white'
          }`}
        >
          <Award className="w-4 h-4 text-[#ffd66b]" />
          <span>Итоги</span>
          <span className="font-mono-tabular font-extrabold text-[#ffd66b]">
            {completedTasks}/12
          </span>
        </button>

        {/* Quick Reset for Computer Lab Turnover */}
        {onResetProgress && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setConfirmReset((v) => !v)}
              title="Начать игру заново для нового участника"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-white/8 hover:bg-white/16 border border-white/15 text-xs font-bold text-white/85 hover:text-white transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#ffd66b]" />
              <span className="hidden md:inline">Новый игрок</span>
            </button>

            {confirmReset && (
              <div
                className="absolute right-0 top-12 w-64 rounded-2xl bg-white text-[#13294b] p-3.5 shadow-2xl border border-[#13294b]/15 z-50 space-y-2.5 animate-card-in"
                role="dialog"
                aria-label="Сброс прогресса для нового игрока"
              >
                <div className="text-xs font-extrabold leading-snug">
                  Сбросить текущий прогресс и начать для нового участника?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false);
                      onResetProgress();
                    }}
                    className="flex-1 min-h-[34px] px-3 rounded-lg bg-[#c41e2e] hover:bg-[#a91826] text-white text-xs font-extrabold transition-colors"
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[34px] px-3 rounded-lg bg-[#eef2f8] hover:bg-[#dfe7f4] text-[#13294b] text-xs font-bold transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle Overall Progress Strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#ffd66b] via-[#fbbf24] to-[#4ade80] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </header>
  );
};
