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
import { STICKERS } from '../game/assets';
import { WORKSHOPS } from '../game/knigogradData';
import { KnigogradSave, ScreenRoute, WorkshopId } from '../game/knigogradTypes';
import { BiblikCoin } from './TopBar';
import { AnimatedNumber } from './VisualEffects';

interface ResultsViewProps {
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  onNavigate: (route: ScreenRoute) => void;
  onResetProgress: () => void;
}

const CompetencyRadar: React.FC<{
  values: [number, number, number]; // each 0..12
}> = ({ values }) => {
  const cx = 120;
  const cy = 112;
  const maxR = 76;
  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const labels = ['БИД и поиск', 'Редакция', 'Креатив'];
  const colors = ['#135c75', '#c41e2e', '#13294b'];

  const ptAt = (angle: number, ratio: number) => ({
    x: cx + Math.cos(angle) * maxR * ratio,
    y: cy + Math.sin(angle) * maxR * ratio,
  });

  const rings = [0.33, 0.66, 1];
  const dataPts = values.map((v, idx) => ptAt(angles[idx], Math.max(0.14, v / 12)));
  const polyStr = dataPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox="0 0 240 220"
      className="w-full max-w-[230px] mx-auto select-none"
      aria-label="Диаграмма результатов по трём мастерским"
    >
      {/* Grid triangles */}
      {rings.map((r) => {
        const pts = angles.map((a) => ptAt(a, r));
        return (
          <polygon
            key={r}
            points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.2"
          />
        );
      })}

      {/* Axes */}
      {angles.map((a, idx) => {
        const edge = ptAt(a, 1);
        return (
          <line
            key={idx}
            x1={cx}
            y1={cy}
            x2={edge.x}
            y2={edge.y}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.2"
          />
        );
      })}

      {/* Filled data polygon */}
      <polygon
        points={polyStr}
        fill="rgba(56, 189, 248, 0.32)"
        stroke="#7dd3fc"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Vertex dots and labels */}
      {dataPts.map((p, idx) => {
        const labelPos = ptAt(angles[idx], 1.24);
        return (
          <g key={labels[idx]}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill={colors[idx]}
              stroke="#7dd3fc"
              strokeWidth="2.5"
            />
            <text
              x={labelPos.x}
              y={labelPos.y + (idx === 0 ? -4 : 6)}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="800"
              fontFamily="Manrope, sans-serif"
            >
              {labels[idx]}
            </text>
            <text
              x={labelPos.x}
              y={labelPos.y + (idx === 0 ? 8 : 18)}
              textAnchor="middle"
              fill="#7dd3fc"
              fontSize="10"
              fontWeight="800"
              fontFamily="JetBrains Mono, monospace"
            >
              {values[idx]}/12
            </text>
          </g>
        );
      })}
    </svg>
  );
};

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
      ? 'Главный профи Инфополиса БИД'
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
        {/* Top Score & Career Rank Certificate Card */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#13294b] via-[#17335c] to-[#0f223d] text-white p-6 sm:p-8 shadow-xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-3">
            <div className="inline-flex items-center gap-3 flex-wrap">
              <img
                src={STICKERS.bannerBid}
                alt="БИД · Кафедра библиотечно-информационной деятельности · БГИИК"
                className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#7dd3fc]/30 text-[11px] font-bold uppercase tracking-widest text-[#7dd3fc]">
              Личный профиль абитуриента · БГИИК · Кафедра БИД
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight">
              {rankTitle}
            </h1>
            <p className="text-sm text-white/85 leading-relaxed">
              {completedTasks === 0
                ? 'Пройди хотя бы несколько заданий в проф-треках, чтобы собрать библики и увидеть, какая профессия кафедры БИД тебе ближе всего.'
                : `Ты выполнил ${completedTasks} из 12 практических заданий и заработал ${totalBibliks} из 36 библиков. Ниже — подробный разбор твоих сильных сторон и рекомендации направлений.`}
            </p>

            <div className="inline-flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-3.5 border border-[#7dd3fc]/35 mt-2">
              <BiblikCoin size="lg" pulse={completedTasks > 0} />
              <div>
                <div className="font-mono-tabular font-extrabold text-3xl text-[#7dd3fc] leading-none">
                  <AnimatedNumber value={totalBibliks} />
                  <span className="text-base text-white/60 font-semibold"> / 36</span>
                </div>
                <div className="text-xs font-semibold text-white/80 mt-1">
                  библиков · {completedTasks}/12 заданий
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col sm:flex-row items-center justify-center gap-6 bg-white/6 rounded-2xl p-4 border border-white/10">
            <CompetencyRadar
              values={[
                workshopStats[0].bibliks,
                workshopStats[1].bibliks,
                workshopStats[2].bibliks,
              ]}
            />
            <div className="space-y-2.5 w-full sm:w-48 shrink-0">
              {workshopStats.map(({ ws, done, bibliks }) => (
                <div key={ws.id} className="rounded-xl bg-white/8 px-3 py-2 border border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span className="text-white/90 truncate">{ws.shortTitle}</span>
                    <span className="font-mono-tabular text-[#7dd3fc]">{bibliks} б.</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(bibliks / 12) * 100}%`,
                        backgroundColor: done === 4 ? '#4ade80' : '#38bdf8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Breakdown Across 3 Tracks */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {workshopStats.map(({ ws, done, bibliks }) => {
            const isTop = completedTasks > 0 && bestWorkshop.ws.id === ws.id;
            return (
              <div
                key={ws.id}
                className={`studio-card rounded-2xl p-5 flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5 ${
                  isTop ? 'ring-2 ring-[#0284c7]' : ''
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
                      <span className="text-xs font-extrabold text-[#0284c7] inline-flex items-center gap-1 bg-[#e0f2fe] px-2.5 py-0.5 rounded-full">
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
                      <span className="font-mono-tabular text-[#135c75]">{bibliks} / 12 Б</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#e6ebf4] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
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

        {/* Collectible Mascot Stickers Section */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#13294b]/12 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e]">
                Коллекция достижений · Маскот кафедры БИД
              </div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#13294b]">
                Стикерпак «Инфополис БИД»
              </h2>
            </div>
            <span className="text-xs font-bold text-[#135c75] bg-[#f0f7ff] px-3 py-1.5 rounded-xl border border-[#0284c7]/20">
              Открыто:{' '}
              {workshopStats.filter((s) => s.done === 4).length + (completedTasks === 12 ? 1 : 0)} из 4
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Это база. Данных',
                hint: 'Пройди все 4 задания Трека 01',
                unlocked: workshopStats[0].done === 4,
                img: STICKERS.database,
              },
              {
                title: 'Я не придираюсь. Я редактирую',
                hint: 'Пройди все 4 задания Трека 02',
                unlocked: workshopStats[1].done === 4,
                img: STICKERS.editing,
              },
              {
                title: 'Сейчас будет контент',
                hint: 'Пройди все 4 задания Трека 03',
                unlocked: workshopStats[2].done === 4,
                img: STICKERS.content,
              },
              {
                title: 'БИД · БГИИК (Супер-стикер)',
                hint: 'Выполни все 12 заданий игры',
                unlocked: completedTasks === 12,
                img: STICKERS.heroBid,
              },
            ].map((st) => (
              <div
                key={st.title}
                className={`rounded-2xl p-4 border-2 flex flex-col items-center text-center gap-2.5 transition-all ${
                  st.unlocked
                    ? 'bg-[#f0f7ff] border-[#0284c7]/40 shadow-sm'
                    : 'bg-[#f6f8fc] border-dashed border-[#13294b]/15 opacity-75'
                }`}
              >
                <div className="w-24 h-24 flex items-center justify-center">
                  <img
                    src={st.img}
                    alt={st.title}
                    className={`w-full h-full object-contain transition-all ${
                      st.unlocked ? 'drop-shadow-md' : 'grayscale opacity-45'
                    }`}
                  />
                </div>
                <div className="font-display font-extrabold text-xs sm:text-sm text-[#13294b] leading-snug">
                  {st.title}
                </div>
                <div
                  className={`text-[11px] font-bold ${
                    st.unlocked ? 'text-[#157a4f]' : 'text-[#13294b]/55'
                  }`}
                >
                  {st.unlocked ? '✓ Стикер открыт' : st.hint}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Profile Card */}
        <section className="studio-card rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e] inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Рекомендованная программа кафедры БИД (БГИИК)
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-lg text-white font-mono-tabular text-xs font-extrabold"
                  style={{ backgroundColor: bestWorkshop.ws.accentBg }}
                >
                  {bestWorkshop.ws.programCode}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b]">
                {bestWorkshop.ws.title}
              </h2>
              <div className="text-xs font-extrabold text-[#135c75]">
                {bestWorkshop.ws.programProfile} · «Гуманитарий с цифровым характером»
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[#f5f7fc] p-5 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#135c75] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Кем и где можно работать
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-[#13294b]">
                {bestWorkshop.ws.professions.map((prof) => (
                  <li key={prof} className="flex items-start gap-2 font-semibold">
                    <ArrowRight className="w-4 h-4 text-[#c41e2e] shrink-0 mt-0.5" />
                    <span>{prof}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#13294b]/10 text-xs text-[#13294b]/75 space-y-1">
                {bestWorkshop.ws.whereToWork.map((place) => (
                  <div key={place}>• {place}</div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f5f7fc] p-5 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b] inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Чему научат на кафедре
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-[#13294b]">
                {bestWorkshop.ws.disciplines.map((disc) => (
                  <li key={disc} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-[#135c75] shrink-0 mt-0.5" />
                    <span>{disc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-[#f0f7ff] border border-[#0284c7]/25 p-5 space-y-3 text-xs sm:text-sm text-[#13294b]">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7]">
                Поступление и практика
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#13294b]/60">
                  Вступительные испытания:
                </div>
                <div className="font-bold mt-0.5">{bestWorkshop.ws.entranceExams}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#13294b]/60">
                  Форма и срок обучения:
                </div>
                <div className="font-bold mt-0.5">{bestWorkshop.ws.studyDuration}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#13294b]/60">
                  Практическая подготовка:
                </div>
                <div className="font-semibold mt-0.5">{bestWorkshop.ws.practicePlace}</div>
              </div>
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
