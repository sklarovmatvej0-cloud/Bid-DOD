import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TaskProgress } from '../game/knigogradTypes';

interface WorkshopStepperProps {
  trackTitle: string;
  taskTitles: string[];
  activeIdx: number;
  progress: TaskProgress[];
  accentColor: string;
  dark?: boolean;
  onSelectTask: (idx: number) => void;
}

export const WorkshopStepper: React.FC<WorkshopStepperProps> = ({
  trackTitle,
  taskTitles,
  activeIdx,
  progress,
  accentColor,
  dark = false,
  onSelectTask,
}) => {
  const doneCount = progress.filter((t) => t.completed).length;

  return (
    <nav
      aria-label="Маршрут проф-трека"
      className={`rounded-2xl border px-3.5 py-3 shadow-xs ${
        dark
          ? 'bg-[#0e2642] border-white/15 text-white'
          : 'bg-white border-[#13294b]/10 text-[#13294b]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span
          className={`text-[11px] font-extrabold uppercase tracking-wider ${
            dark ? 'text-[#7dd3fc]' : 'text-[#13294b]/60'
          }`}
        >
          Маршрут трека: {trackTitle}
        </span>
        <span
          className={`font-mono-tabular text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
            dark ? 'bg-white/10 text-white/90' : 'bg-[#f4f7fc] text-[#13294b]/75'
          }`}
        >
          Пройдено {doneCount} из {taskTitles.length}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {taskTitles.map((label, idx) => {
          const isCurrent = idx === activeIdx;
          const isDone = progress[idx]?.completed;

          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectTask(idx)}
              className={`group text-left px-3 py-2 rounded-xl border transition-all flex items-center gap-2 min-w-0 ${
                isCurrent
                  ? dark
                    ? 'bg-white/15 border-[#7dd3fc] text-white shadow-xs'
                    : 'bg-[#f8fbff] border-2 text-[#13294b] shadow-xs'
                  : isDone
                    ? dark
                      ? 'bg-[#157a4f]/20 border-[#4ade80]/30 text-[#86efac] hover:bg-[#157a4f]/30'
                      : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#157a4f] hover:bg-[#dcfce7]'
                    : dark
                      ? 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                      : 'bg-[#f8fafc] border-[#13294b]/8 text-[#13294b]/70 hover:bg-[#eef3f9]'
              }`}
              style={isCurrent && !dark ? { borderColor: accentColor } : undefined}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono-tabular font-extrabold text-[11px] shrink-0 ${
                  isDone
                    ? 'bg-[#157a4f] text-white'
                    : isCurrent
                      ? 'text-white'
                      : dark
                        ? 'bg-white/15 text-white/80'
                        : 'bg-[#e2e8f0] text-[#13294b]/75'
                }`}
                style={
                  !isDone && isCurrent
                    ? { backgroundColor: dark ? '#0284c7' : accentColor }
                    : undefined
                }
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <span className="text-xs font-bold truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
