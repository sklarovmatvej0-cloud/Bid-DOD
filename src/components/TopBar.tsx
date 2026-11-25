import React from 'react';
import { ArrowLeft, Award, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { KnigogradSave, ScreenRoute } from '../game/knigogradTypes';
import { WORKSHOPS } from '../game/knigogradData';

interface TopBarProps {
  route: ScreenRoute;
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  muted: boolean;
  onNavigate: (next: ScreenRoute) => void;
  onToggleMute: () => void;
}

export const BiblikCoin: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'sm' }) => {
  const dims =
    size === 'lg'
      ? 'w-9 h-9 text-base border-2'
      : size === 'md'
        ? 'w-7 h-7 text-xs border-2'
        : 'w-6 h-6 text-[11px] border';

  return (
    <span
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd66b] via-[#f0a92c] to-[#d07d12] border-[#b76506] text-[#13294b] font-display font-extrabold shadow-xs select-none`}
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
  muted,
  onNavigate,
  onToggleMute,
}) => {
  const activeWorkshopMeta =
    route.view === 'workshop' || route.view === 'showcase'
      ? WORKSHOPS.find((w) => w.id === route.workshop)
      : null;

  return (
    <header className="shrink-0 h-16 bg-[#13294b] text-white border-b border-white/15 px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {route.view !== 'hub' && (
          <button
            type="button"
            onClick={() => onNavigate({ view: 'hub' })}
            className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] text-xs sm:text-sm font-display font-extrabold text-[#13294b] transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>К 3D-комнатам</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigate({ view: 'hub' })}
          className="flex items-center gap-2.5 text-left group min-h-[40px] pr-2 rounded-lg hover:bg-white/8 transition-colors px-1.5 whitespace-nowrap shrink-0"
          title="Вернуться к 3D-комнатам"
        >
          <span className="w-9 h-9 rounded-lg bg-[#c41e2e] flex items-center justify-center shrink-0 shadow-sm">
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

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        <button
          type="button"
          onClick={() => onNavigate({ view: 'results' })}
          className="inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/15 text-xs sm:text-sm font-bold text-white transition-colors whitespace-nowrap"
        >
          <Award className="w-4 h-4 text-[#ffd66b]" />
          <span>Итоги</span>
          <span className="font-mono-tabular font-extrabold text-[#ffd66b]">
            {completedTasks}/12
          </span>
          {totalBibliks > 0 && (
            <span className="hidden sm:inline font-mono-tabular text-xs text-white/75">
              ({totalBibliks} б.)
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/18 flex items-center justify-center text-white transition-colors shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4 text-white/65" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
