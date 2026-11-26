import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export interface MissionStep {
  text: string;
  done: boolean;
}

interface MissionBannerProps {
  image: string;
  imageAlt: string;
  stepLabel: string;
  title: string;
  goal: string;
  steps: MissionStep[];
  resultPreview: string;
  accentColor: string;
  dark?: boolean;
  onHint: () => void;
}

export const MissionBanner: React.FC<MissionBannerProps> = ({
  image,
  imageAlt,
  stepLabel,
  title,
  goal,
  steps,
  accentColor,
  dark = false,
  onHint,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const doneSteps = steps.filter((s) => s.done).length;

  return (
    <section
      className={`rounded-2xl overflow-hidden border shadow-xs transition-all ${
        dark
          ? 'bg-[#0e2642] border-white/15 text-white'
          : 'bg-white border-[#13294b]/12 text-[#13294b]'
      }`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4">
        {!collapsed && (
          <div className="w-full md:w-44 lg:w-48 shrink-0 aspect-[16/10] md:aspect-[4/3] rounded-xl bg-[#13294b] overflow-hidden shadow-xs">
            <img
              src={image}
              alt={imageAlt}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: dark ? '#7dd3fc' : accentColor }}
                >
                  {stepLabel}
                </span>
                <span
                  className={`font-mono-tabular text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    dark ? 'bg-white/10 text-white/80' : 'bg-[#f1f5fb] text-[#13294b]/70'
                  }`}
                >
                  {doneSteps}/{steps.length}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-base sm:text-lg leading-snug">
                {title}
              </h2>
              {!collapsed && (
                <p
                  className={`text-xs sm:text-[13px] leading-relaxed max-w-4xl ${
                    dark ? 'text-white/85' : 'text-[#13294b]/80'
                  }`}
                >
                  {goal}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onHint}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  dark
                    ? 'bg-white/12 hover:bg-white/22 text-[#7dd3fc]'
                    : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b]'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Подсказка</span>
              </button>
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? 'Развернуть условие' : 'Свернуть условие'}
                aria-label={collapsed ? 'Развернуть условие' : 'Свернуть условие'}
                className={`w-9 h-9 rounded-xl inline-flex items-center justify-center transition-colors ${
                  dark
                    ? 'bg-white/10 hover:bg-white/20 text-white/80'
                    : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b]/70'
                }`}
              >
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsed && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-current/10 text-xs font-bold">
              {steps.map((st, idx) => (
                <span
                  key={st.text}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                    st.done
                      ? dark
                        ? 'bg-[#157a4f]/30 text-[#86efac]'
                        : 'bg-[#e9f7ef] text-[#157a4f]'
                      : dark
                        ? 'bg-white/8 text-white/85'
                        : 'bg-[#f4f7fc] text-[#13294b]/80'
                  }`}
                >
                  {st.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="font-mono-tabular font-extrabold text-[11px]">{idx + 1}.</span>
                  )}
                  <span className={st.done ? 'line-through opacity-85' : ''}>{st.text}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
