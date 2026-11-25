import React, { useEffect, useState } from 'react';
import {
  Flame,
  Rocket,
  Shuffle,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { RELEASE_COVERS, RELEASE_FORMATS, STUDIO_STAFF } from '../game/knigogradData';
import { KnigogradSave, ReleasedProject } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';

interface PublisherStudioModalProps {
  open: boolean;
  save: KnigogradSave;
  onClose: () => void;
  onCompleteRelease: (project: ReleasedProject, instantCoins: number, instantSubs: number) => void;
}

const TOTAL_POINTS = 15;

export const PublisherStudioModal: React.FC<PublisherStudioModalProps> = ({
  open,
  save,
  onClose,
  onCompleteRelease,
}) => {
  const [step, setStep] = useState<'setup' | 'producing' | 'result'>('setup');
  const [formatId, setFormatId] = useState<(typeof RELEASE_FORMATS)[number]['id']>('book');
  const [coverId, setCoverId] = useState<string>(RELEASE_COVERS[0].id);
  const [title, setTitle] = useState<string>(RELEASE_FORMATS[0].sampleTitles[0]);

  const [facts, setFacts] = useState(5);
  const [design, setDesign] = useState(5);
  const [hype, setHype] = useState(5);

  const [progress, setProgress] = useState(0);
  const [taps, setTaps] = useState(0);

  const [releaseOutcome, setReleaseOutcome] = useState<{
    project: ReleasedProject;
    critics: { name: string; score: number; quote: string }[];
    instantCoins: number;
    instantSubs: number;
  } | null>(null);

  const activeFormat = RELEASE_FORMATS.find((f) => f.id === formatId) ?? RELEASE_FORMATS[0];
  const activeCover = RELEASE_COVERS.find((c) => c.id === coverId) ?? RELEASE_COVERS[0];

  const staffQualityBonus = STUDIO_STAFF.reduce((sum, s) => {
    const lvl = save.hiredStaff[s.id] ?? 0;
    return sum + lvl * s.qualityBonus;
  }, 0);

  const finishProduction = () => {
    // Evaluate how close the 3 sliders are to the format's ideal recipe
    const diff =
      Math.abs(facts - activeFormat.ideal.facts) +
      Math.abs(design - activeFormat.ideal.design) +
      Math.abs(hype - activeFormat.ideal.hype);

    const baseScore = Math.max(5.2, 9.1 - diff * 0.35);
    const finalRating = Math.min(9.9, Number((baseScore + staffQualityBonus * 0.25).toFixed(1)));
    const isHit = finalRating >= 8.5;

    const c1 = Math.min(10, Math.max(5, Number((finalRating + 0.2).toFixed(1))));
    const c2 = Math.min(10, Math.max(5, Number((finalRating - 0.3).toFixed(1))));
    const c3 = Math.min(10, Math.max(5, Number((finalRating + 0.1).toFixed(1))));

    const coinsPerSec = Math.round(finalRating * 1.4 + (isHit ? 5 : 1));
    const subsPerSec = Math.max(1, Math.round(finalRating * 0.45 + (isHit ? 2 : 0)));
    const instantCoins = Math.round(finalRating * 42 + (isHit ? 180 : 40));
    const instantSubs = Math.round(finalRating * 48 + (isHit ? 260 : 60));

    const project: ReleasedProject = {
      id: `rel_${Date.now()}`,
      title: title.trim() || activeFormat.sampleTitles[0],
      formatId: activeFormat.id,
      formatLabel: activeFormat.short,
      cover: activeCover.img,
      rating: finalRating,
      coinsPerSec,
      subsPerSec,
      isHit,
    };

    const critics = [
      {
        name: 'Журнал «Книжный гид»',
        score: c1,
        quote:
          finalRating >= 8.5
            ? '«Свежая подача и точное попадание в формат — читается на одном дыхании!»'
            : '«Неплохой старт, но в следующий раз проверь баланс приоритетов для этого формата!»',
      },
      {
        name: 'Арт-директор БГИИК',
        score: c2,
        quote:
          design >= 5
            ? '«Обложка и визуал сразу цепляют взгляд — хочется открыть и полистать!»'
            : '«Чуть больше внимания к дизайну и обложке — и проект станет хитом!»',
      },
      {
        name: 'Школьный чат',
        score: c3,
        quote:
          isHit
            ? '«🔥 Уже скинули ссылку всему классу! Ждём продолжение!»'
            : '«Прикольно, но хочется ещё больше драйва и интерактива!»',
      },
    ];

    if (isHit) {
      soundEngine.playVictoryFanfare();
    } else {
      soundEngine.playSuccessChime();
    }

    setReleaseOutcome({ project, critics, instantCoins, instantSubs });
    onCompleteRelease(project, instantCoins, instantSubs);
    setStep('result');
  };

  useEffect(() => {
    if (!open || step !== 'producing') return;
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + 6);
        if (next >= 100) {
          window.clearInterval(timer);
        }
        return next;
      });
    }, 240);
    return () => window.clearInterval(timer);
  }, [open, step]);

  useEffect(() => {
    if (step === 'producing' && progress >= 100) {
      const doneTimer = window.setTimeout(() => {
        finishProduction();
      }, 220);
      return () => window.clearTimeout(doneTimer);
    }
  }, [progress, step]);

  if (!open) return null;

  const remainingPoints = TOTAL_POINTS - (facts + design + hype);

  const adjustStat = (which: 'facts' | 'design' | 'hype', delta: number) => {
    soundEngine.playSelectTick();
    if (delta > 0 && remainingPoints <= 0) return;
    if (which === 'facts') setFacts((v) => Math.max(1, Math.min(10, v + delta)));
    if (which === 'design') setDesign((v) => Math.max(1, Math.min(10, v + delta)));
    if (which === 'hype') setHype((v) => Math.max(1, Math.min(10, v + delta)));
  };

  const handleRandomTitle = () => {
    soundEngine.playSelectTick();
    const list = activeFormat.sampleTitles;
    const next = list[(list.indexOf(title) + 1) % list.length];
    setTitle(next);
  };

  const handleStartProduction = () => {
    soundEngine.playStampThud();
    setProgress(0);
    setTaps(0);
    setStep('producing');
  };

  const handleBoostTap = () => {
    soundEngine.playSelectTick();
    setTaps((t) => t + 1);
    setProgress((p) => Math.min(100, p + 12));
  };

  const handleResetAndClose = () => {
    setStep('setup');
    setReleaseOutcome(null);
    setProgress(0);
    onClose();
  };

  const handleCreateAnother = () => {
    soundEngine.playSelectTick();
    setStep('setup');
    setReleaseOutcome(null);
    setProgress(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d1c34]/80 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={handleResetAndClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-w-2xl w-full bg-[#111b30] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/15 animate-card-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#c41e2e] to-[#13294b] flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-extrabold text-sm sm:text-base">
            <Rocket className="w-5 h-5 text-[#ffd66b]" />
            Выпустить проект (как в Idle Publisher и Симуляторе писателя)
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto desk-scroll space-y-5">
          {/* ============ STEP 1: PROJECT CREATOR ============ */}
          {step === 'setup' && (
            <>
              {/* 1. Format */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                  1. Что выпускаем сегодня?
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RELEASE_FORMATS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelectTick();
                        setFormatId(fmt.id);
                        setTitle(fmt.sampleTitles[0]);
                      }}
                      className={`p-3 rounded-2xl text-left border-2 transition-all ${
                        formatId === fmt.id
                          ? 'bg-[#ffd66b] text-[#13294b] border-[#ffd66b]'
                          : 'bg-white/8 text-white border-white/12 hover:bg-white/15'
                      }`}
                    >
                      <div className="font-display font-extrabold text-xs">{fmt.short}</div>
                      <div
                        className={`text-[10px] mt-0.5 leading-tight ${
                          formatId === fmt.id ? 'text-[#13294b]/80' : 'text-white/65'
                        }`}
                      >
                        {fmt.label}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="text-xs font-bold text-[#7dd3fc]">
                  Подсказка редакции: {activeFormat.hint}
                </div>
              </div>

              {/* 2. Title + Cover */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-7 space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                    2. Придумай название
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={48}
                      className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white/10 border border-white/20 text-sm font-bold text-white outline-none focus:border-[#ffd66b]"
                    />
                    <button
                      type="button"
                      onClick={handleRandomTitle}
                      title="Случайное название"
                      className="w-11 h-11 rounded-xl bg-white/12 hover:bg-white/22 flex items-center justify-center shrink-0"
                    >
                      <Shuffle className="w-4 h-4 text-[#ffd66b]" />
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-5 space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                    3. Обложка
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-3 gap-1.5">
                    {RELEASE_COVERS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playSelectTick();
                          setCoverId(c.id);
                        }}
                        className={`rounded-lg overflow-hidden border-2 transition-all ${
                          coverId === c.id
                            ? 'border-[#ffd66b] scale-105'
                            : 'border-white/15 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={c.img} alt={c.label} className="w-full h-12 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Priority Sliders (15 points to distribute!) */}
              <div className="rounded-2xl bg-white/8 border border-white/12 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                    4. Распредели {TOTAL_POINTS} очков сил команды
                  </span>
                  <span className="font-mono-tabular text-xs font-extrabold text-[#86efac]">
                    Свободно: {remainingPoints}
                  </span>
                </div>

                {[
                  { id: 'facts' as const, label: 'Факты и сюжет', val: facts, color: '#38bdf8' },
                  { id: 'design' as const, label: 'Дизайн и обложка', val: design, color: '#f43f5e' },
                  { id: 'hype' as const, label: 'Хайп и продвижение', val: hype, color: '#facc15' },
                ].map((stat) => (
                  <div key={stat.id} className="flex items-center gap-3">
                    <div className="w-36 text-xs font-bold text-white/90 shrink-0">{stat.label}</div>
                    <button
                      type="button"
                      onClick={() => adjustStat(stat.id, -1)}
                      className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/25 font-extrabold text-sm"
                    >
                      −
                    </button>
                    <div className="flex-1 h-3 rounded-full bg-white/12 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(stat.val / 10) * 100}%`, backgroundColor: stat.color }}
                      />
                    </div>
                    <span className="w-7 text-center font-mono-tabular font-extrabold text-sm">
                      {stat.val}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustStat(stat.id, 1)}
                      disabled={remainingPoints <= 0}
                      className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/25 disabled:opacity-30 font-extrabold text-sm"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleStartProduction}
                className="w-full min-h-[50px] rounded-2xl bg-[#157a4f] hover:bg-[#199460] text-white font-display font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Sparkles className="w-5 h-5 text-[#ffd66b]" />
                Запустить в производство!
              </button>
            </>
          )}

          {/* ============ STEP 2: IDLE PUBLISHER RAPID-CLICK PRODUCTION BAR ============ */}
          {step === 'producing' && (
            <div className="py-6 text-center space-y-6 animate-card-in">
              <div className="flex flex-col items-center gap-3">
                <img
                  src={activeCover.img}
                  alt={title}
                  className="w-28 h-36 object-cover rounded-2xl shadow-2xl border-2 border-[#ffd66b]"
                />
                <div className="font-display font-extrabold text-lg text-[#ffd66b]">{title}</div>
                <div className="text-xs text-white/75">
                  Студия верстает, проверяет факты и готовит релиз...
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="h-5 rounded-full bg-white/15 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ffd66b] via-[#34d399] to-[#38bdf8] transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="font-mono-tabular font-extrabold text-lg text-white">
                  {progress}%
                </div>
              </div>

              <button
                type="button"
                onClick={handleBoostTap}
                className="min-h-[58px] px-8 rounded-2xl bg-[#ffd66b] hover:bg-[#ffca42] active:scale-95 text-[#13294b] font-display font-extrabold text-base inline-flex items-center gap-2 shadow-xl transition-transform"
              >
                <Zap className="w-5 h-5 text-[#c41e2e]" />
                Ускорить выпуск! ({taps} кликов)
              </button>
            </div>
          )}

          {/* ============ STEP 3: CRITIC SCORES & PASSIVE INCOME PREMIERE ============ */}
          {step === 'result' && releaseOutcome && (
            <div className="space-y-4 animate-card-in">
              <div className="rounded-2xl bg-white/10 border border-[#ffd66b]/40 p-4 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={releaseOutcome.project.cover}
                  alt={releaseOutcome.project.title}
                  className="w-24 h-32 object-cover rounded-xl shadow-lg shrink-0"
                />
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#ffd66b]">
                    {releaseOutcome.project.isHit ? (
                      <>
                        <Trophy className="w-4 h-4" /> ХИТ ТОП-ЧАРТА КНИГОГРАДА!
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" /> ПРЕМЬЕРА СОСТОЯЛАСЬ!
                      </>
                    )}
                  </div>
                  <div className="font-display font-extrabold text-xl">
                    {releaseOutcome.project.title}
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-xs font-extrabold">
                    <span className="text-[#ffd66b] inline-flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" /> Рейтинг{' '}
                      {releaseOutcome.project.rating} / 10
                    </span>
                    <span className="text-[#86efac]">
                      +{releaseOutcome.instantCoins} ₽ сразу
                    </span>
                    <span className="text-[#7dd3fc]">
                      +{releaseOutcome.instantSubs} подписчиков
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#86efac] inline-flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Пассивный доход студии: +{releaseOutcome.project.coinsPerSec} ₽/сек и +
                    {releaseOutcome.project.subsPerSec} подп/сек!
                  </div>
                </div>
              </div>

              {/* 3 Critic Reviews */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {releaseOutcome.critics.map((c) => (
                  <div
                    key={c.name}
                    className="rounded-2xl bg-white/8 border border-white/12 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-white/75 truncate">{c.name}</span>
                      <span className="font-mono-tabular font-extrabold text-sm text-[#ffd66b]">
                        {c.score}/10
                      </span>
                    </div>
                    <p className="text-xs text-white/90 leading-snug">{c.quote}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCreateAnother}
                  className="min-h-[46px] rounded-2xl bg-white/12 hover:bg-white/22 text-white font-display font-bold text-xs sm:text-sm"
                >
                  Выпустить ещё проект
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="min-h-[46px] rounded-2xl bg-[#ffd66b] hover:bg-[#ffca42] text-[#13294b] font-display font-extrabold text-xs sm:text-sm"
                >
                  Вернуться в студию
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
