import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Award, BookOpen, RotateCcw } from 'lucide-react';
import { KnigogradSave, ScreenRoute } from '../game/knigogradTypes';
import { WORKSHOPS } from '../game/knigogradData';
import { AnimatedNumber } from './VisualEffects';

interface TopBarProps {
  route: ScreenRoute;
  hubMode?: '3d' | '2d';
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  muted: boolean;
  onNavigate: (next: ScreenRoute) => void;
  onReturnToMainHub?: () => void;
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
      } inline-flex shrink-0 items-center justify-center rounded-full bg-[#0284c7] border-[#7dd3fc] text-white font-display font-extrabold shadow-xs select-none`}
      style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #135c75 100%)' }}
      aria-hidden="true"
    >
      Б
    </span>
  );
};

export const TopBar: React.FC<TopBarProps> = ({
  route,
  hubMode = '2d',
  totalBibliks,
  completedTasks,
  onNavigate,
  onReturnToMainHub,
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
  const showBackToMain = route.view !== 'hub' || hubMode === '3d';
  const handleGoMain = () => {
    if (onReturnToMainHub) {
      onReturnToMainHub();
    } else {
      onNavigate({ view: 'hub' });
    }
  };

  return (
    <header className="relative shrink-0 h-16 bg-[#13294b] text-white border-b border-white/15 px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {showBackToMain && (
          <button
            type="button"
            onClick={handleGoMain}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-white hover:bg-[#e0f2fe] active:scale-[0.98] text-xs sm:text-sm font-display font-extrabold text-[#13294b] transition-all whitespace-nowrap shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-[#c41e2e]" />
            <span>На главную</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleGoMain}
          className={`${showBackToMain ? 'hidden sm:flex' : 'flex'} items-center gap-2 text-left group min-h-[40px] rounded-lg hover:bg-white/8 transition-colors px-1.5 min-w-0 overflow-hidden`}
          title="Вернуться на главную страницу"
        >
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#c41e2e] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </span>
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
              ИНФОПОЛИС БИД · БГИИК
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7dd3fc] truncate">
              Интерактивная игра · Кафедра БИД
            </span>
          </div>
        </button>

        {route.view === 'hub' && hubMode === '3d' && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/15 text-xs font-bold text-[#7dd3fc]">
            <span>3D-тур по Инфополису</span>
          </div>
        )}

        {activeWorkshopMeta && (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/15 text-xs sm:text-sm min-w-0">
            <span className="text-white/75 whitespace-nowrap">{activeWorkshopMeta.shortTitle}</span>
            <span className="text-white/35">/</span>
            <span className="font-bold text-[#7dd3fc] truncate">
              {route.view === 'workshop'
                ? activeWorkshopMeta.tasks[route.task]?.title ?? ''
                : 'Готовый результат'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Live Biblik Counter Badge */}
        <div className="relative hidden sm:inline-flex items-center gap-2 min-h-[40px] px-3 rounded-xl bg-white/10 border border-[#7dd3fc]/30">
          <BiblikCoin size="sm" pulse={coinPulse} />
          <div className="flex items-baseline gap-1 font-mono-tabular">
            <AnimatedNumber
              value={totalBibliks}
              className="text-sm font-extrabold text-[#7dd3fc]"
            />
            <span className="text-[11px] font-semibold text-white/60">/ 36</span>
          </div>
          {biblikGain !== null && (
            <span
              key={`gain-${totalBibliks}`}
              className="pointer-events-none absolute -bottom-7 right-1 px-2 py-0.5 rounded-lg bg-[#0284c7] text-white font-mono-tabular text-xs font-extrabold shadow-lg animate-biblik-float"
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
          <Award className="w-4 h-4 text-[#7dd3fc]" />
          <span>Итоги</span>
          <span className="font-mono-tabular font-extrabold text-[#7dd3fc]">
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
              <RotateCcw className="w-3.5 h-3.5 text-[#7dd3fc]" />
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
          className="h-full bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#4ade80] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </header>
  );
};
