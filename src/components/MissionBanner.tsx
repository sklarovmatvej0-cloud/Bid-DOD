import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export interface MissionStep {
  text: string;
  done: boolean;
}

export interface MissionProTip {
  term: string;
  text: string;
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
  proTip?: MissionProTip;
  onHint: () => void;
}

export const MissionBanner: React.FC<MissionBannerProps> = ({
  image,
  imageAlt,
  stepLabel,
  title,
  goal,
  steps,
  resultPreview,
  accentColor,
  dark = false,
  proTip,
  onHint,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showResultPeek, setShowResultPeek] = useState(false);
  const doneSteps = steps.filter((s) => s.done).length;
  const activeStepIdx = steps.findIndex((s) => !s.done);
  const gridColsClass =
    steps.length >= 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : steps.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-3';

  return (
    <section
      className={`rounded-2xl overflow-hidden border shadow-sm transition-all ${
        dark
          ? 'bg-[#0e2642] border-white/15 text-white'
          : 'bg-white border-[#13294b]/12 text-[#13294b]'
      }`}
    >
      {/* Top Bar: Track & Step Badge + Progress + Hint/Collapse */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b ${
          dark ? 'bg-white/5 border-white/10' : 'bg-[#f8fafd] border-[#13294b]/8'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: dark ? 'rgba(125,211,252,0.14)' : `${accentColor}14`,
              color: dark ? '#7dd3fc' : accentColor,
            }}
          >
            {stepLabel}
          </span>
          <span
            className={`font-mono-tabular text-[11px] font-extrabold px-2.5 py-1 rounded-lg ${
              dark ? 'bg-white/10 text-white/90' : 'bg-white border border-[#13294b]/10 text-[#13294b]/75'
            }`}
          >
            Выполнено: {doneSteps} из {steps.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onHint}
            className={`min-h-[34px] px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              dark
                ? 'bg-white/12 hover:bg-white/22 text-[#7dd3fc]'
                : 'bg-white hover:bg-[#e5eefb] border border-[#13294b]/12 text-[#13294b]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Подсказка</span>
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Развернуть условие' : 'Свернуть условие'}
            aria-label={collapsed ? 'Развернуть условие' : 'Свернуть условие'}
            className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-colors ${
              dark
                ? 'bg-white/10 hover:bg-white/20 text-white/80'
                : 'bg-white hover:bg-[#e5eefb] border border-[#13294b]/12 text-[#13294b]/70'
            }`}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4">
          {!collapsed && (
            <button
              type="button"
              onClick={() => setShowResultPeek((v) => !v)}
              title="Нажми, чтобы увидеть итог шага"
              className="group relative w-full md:w-44 lg:w-48 shrink-0 aspect-[16/10] md:aspect-[4/3] rounded-xl bg-[#13294b] overflow-hidden shadow-xs text-left cursor-pointer"
            >
              <img
                src={image}
                alt={imageAlt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                className={`absolute inset-0 transition-opacity duration-200 flex flex-col justify-end p-2.5 ${
                  showResultPeek
                    ? 'bg-[#0c1d36]/90 opacity-100'
                    : 'bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 group-hover:opacity-100'
                }`}
              >
                {showResultPeek ? (
                  <span className="text-[11px] font-bold text-white leading-snug">
                    ✓ Итог: {resultPreview}
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-[#7dd3fc] tracking-wide">
                    Нажми: что получится →
                  </span>
                )}
              </div>
            </button>
          )}

          <div className="flex-1 min-w-0 space-y-2.5">
            <h2 className="font-display font-extrabold text-lg sm:text-xl leading-snug">
              {title}
            </h2>
            {!collapsed && (
              <div className="space-y-2.5">
                <div
                  className={`rounded-xl px-3.5 py-2.5 border-l-4 text-xs sm:text-sm leading-relaxed ${
                    dark
                      ? 'bg-white/6 text-white/90'
                      : 'bg-[#f6f9fd] text-[#13294b]/85'
                  }`}
                  style={{ borderLeftColor: dark ? '#7dd3fc' : accentColor }}
                >
                  {goal}
                </div>
                {proTip && (
                  <div
                    className={`rounded-xl px-3.5 py-2 border flex items-start gap-2.5 text-xs leading-relaxed ${
                      dark
                        ? 'bg-[#0b1f38] border-[#7dd3fc]/25 text-white/85'
                        : 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]'
                    }`}
                  >
                    <BookOpen
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        dark ? 'text-[#7dd3fc]' : 'text-[#b45309]'
                      }`}
                    />
                    <div>
                      <span className="font-extrabold">{proTip.term}: </span>
                      <span>{proTip.text}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clear Step-by-Step Action Cards */}
        {!collapsed && (
          <div className={`pt-3 border-t space-y-2 ${dark ? 'border-white/10' : 'border-[#13294b]/10'}`}>
            <div
              className={`text-[11px] font-extrabold uppercase tracking-wider ${
                dark ? 'text-[#7dd3fc]' : 'text-[#13294b]/55'
              }`}
            >
              Что нужно сделать:
            </div>
            <div className={`grid ${gridColsClass} gap-2.5`}>
              {steps.map((st, idx) => {
                const isCurrent = idx === activeStepIdx;
                return (
                  <div
                    key={st.text}
                    className={`rounded-xl p-3 border flex items-start gap-2.5 text-xs leading-snug transition-all ${
                      st.done
                        ? dark
                          ? 'bg-[#157a4f]/25 border-[#4ade80]/30 text-[#86efac]'
                          : 'bg-[#ecfdf3] border-[#86efac] text-[#157a4f]'
                        : isCurrent
                          ? dark
                            ? 'bg-white/12 border-[#7dd3fc]/60 text-white shadow-xs'
                            : 'bg-white border-2 text-[#13294b] shadow-xs'
                          : dark
                            ? 'bg-white/5 border-white/10 text-white/75'
                            : 'bg-[#f8fafc] border-[#13294b]/10 text-[#13294b]/75'
                    }`}
                    style={
                      !st.done && isCurrent && !dark ? { borderColor: accentColor } : undefined
                    }
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono-tabular font-extrabold text-[11px] shrink-0 mt-0.5 ${
                        st.done
                          ? dark
                            ? 'bg-[#157a4f] text-white'
                            : 'bg-[#157a4f] text-white'
                          : isCurrent
                            ? 'text-white'
                            : dark
                              ? 'bg-white/15 text-white/80'
                              : 'bg-[#e2e8f0] text-[#13294b]/75'
                      }`}
                      style={
                        !st.done && isCurrent
                          ? { backgroundColor: dark ? '#0284c7' : accentColor }
                          : undefined
                      }
                    >
                      {st.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span className={`font-semibold ${st.done ? 'line-through opacity-85' : ''}`}>
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
