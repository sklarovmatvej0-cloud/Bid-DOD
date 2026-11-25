import React from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';

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
  return (
    <section
      className={`rounded-2xl overflow-hidden border shadow-xs ${
        dark
          ? 'bg-[#0e2642] border-white/15 text-white'
          : 'bg-white border-[#13294b]/12 text-[#13294b]'
      }`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 sm:gap-5 p-4 sm:p-5">
        <div className="w-full md:w-64 lg:w-72 shrink-0 aspect-[4/3] rounded-xl bg-[#13294b] overflow-hidden shadow-xs">
          <img
            src={image}
            alt={imageAlt}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: dark ? '#7dd3fc' : accentColor }}
              >
                {stepLabel}
              </div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl leading-snug">
                {title}
              </h2>
              <p className={`text-sm leading-relaxed ${dark ? 'text-white/85' : 'text-[#13294b]/80'}`}>
                {goal}
              </p>
            </div>
            <button
              type="button"
              onClick={onHint}
              className={`shrink-0 min-h-[38px] px-3.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                dark
                  ? 'bg-white/12 hover:bg-white/22 text-[#ffd66b]'
                  : 'bg-[#f4f7fc] hover:bg-[#e5eefb] text-[#13294b]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Подсказка
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 border-t border-current/10 text-xs font-bold">
            {steps.map((st, idx) => (
              <span
                key={st.text}
                className={`inline-flex items-center gap-1.5 ${
                  st.done
                    ? dark
                      ? 'text-[#86efac]'
                      : 'text-[#157a4f]'
                    : dark
                      ? 'text-white/85'
                      : 'text-[#13294b]/80'
                }`}
              >
                {st.done ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <span className="font-mono-tabular font-extrabold">{idx + 1}.</span>
                )}
                <span className={st.done ? 'line-through opacity-80' : ''}>{st.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
