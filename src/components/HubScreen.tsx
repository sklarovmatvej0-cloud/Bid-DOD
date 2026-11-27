import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Box,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FlaskConical,
  GraduationCap,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { MEDIA, STICKERS } from '../game/assets';
import {
  DEPARTMENT_PROGRAMS,
  DEPARTMENT_RESEARCH_HIGHLIGHTS,
  WORKSHOPS,
} from '../game/knigogradData';
import { KnigogradSave, ScreenRoute, WorkshopId } from '../game/knigogradTypes';
import { BiblikCoin } from './TopBar';

interface HubScreenProps {
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  onNavigate: (route: ScreenRoute) => void;
  onSwitchTo3D?: () => void;
}

const WORKSHOP_CARDS: Record<
  WorkshopId,
  { img: string; roleBadge: string; summary: string }
> = {
  1: {
    img: MEDIA.sceneLibraryDesk,
    roleBadge: 'Трек 01 · Специалист по информационным ресурсам',
    summary:
      'Профессиональный поиск и переработка информации, работа с электронным каталогом и фондом, сверка библиографической записи и создание мультимедийной выставки.',
  },
  2: {
    img: MEDIA.sceneEditorDesk,
    roleBadge: 'Трек 02 · Редактор-издатель',
    summary:
      'Редакторская подготовка авторских материалов, анализ и редактирование текста по стенограмме интервью, модульная вёрстка журнального разворота и выпуск издания.',
  },
  3: {
    img: MEDIA.sceneSmmFestival,
    roleBadge: 'Трек 03 · Креативный менеджер проектов',
    summary:
      'Проектирование социокультурных проектов, управление бюджетом гранта и площадками, цифровое продвижение и развитие бренда учреждения культуры.',
  },
};

const ROLE_SHOWCASE: Record<
  WorkshopId,
  {
    shortTitle: string;
    roleTitle: string;
    question: string;
    tagline: string;
    description: string;
    skills: string[];
    primarySticker: string;
    altSticker: string;
    accentColor: string;
    softBg: string;
    pillBorder: string;
  }
> = {
  1: {
    shortTitle: 'Инфо-специалист',
    roleTitle: 'Специалист по информационным ресурсам',
    question: 'Любишь находить точные факты и наводить порядок в хаосе?',
    tagline: '«Сейчас всё загуглим. Профессионально»',
    description:
      'Ищи редкие издания в электронном каталоге, систематизируй фонды, проверяй библиографические записи по ГОСТу и собирай виртуальную выставку.',
    skills: ['Поиск в каталоге', 'Систематизация', 'Сверка по ГОСТу', 'Мультимедиа-выставка'],
    primarySticker: STICKERS.searchPro,
    altSticker: STICKERS.database,
    accentColor: '#0284c7',
    softBg: 'from-[#e0f2fe] via-[#f0f9ff] to-[#ffffff]',
    pillBorder: 'border-[#0284c7]/35',
  },
  2: {
    shortTitle: 'Редактор-издатель',
    roleTitle: 'Редактор-издатель медиапроектов',
    question: 'Замечаешь ошибки в тексте и любишь собирать красивые развороты?',
    tagline: '«Я не придираюсь. Я редактирую»',
    description:
      'Работай с авторской рукописью, проверяй факты, редактируй интервью, верстай журнальный разворот и готовь выпуск к печати.',
    skills: ['Фактчекинг', 'Редактура текста', 'Модульная вёрстка', 'Выпуск издания'],
    primarySticker: STICKERS.editing,
    altSticker: STICKERS.noFormat,
    accentColor: '#c41e2e',
    softBg: 'from-[#ffe4e6] via-[#fff1f2] to-[#ffffff]',
    pillBorder: 'border-[#c41e2e]/35',
  },
  3: {
    shortTitle: 'Креативный менеджер',
    roleTitle: 'Креативный менеджер в БИД',
    question: 'Хочешь придумывать события, вести соцсети и развивать проекты?',
    tagline: '«Тихо! Я генерирую идеи»',
    description:
      'Проектируй программу «Библионочи», распределяй грантовый бюджет, собирай SMM-анонс и продвигай бренд учреждения культуры.',
    skills: ['Концепция события', 'Бюджет проекта', 'SMM-продвижение', 'Развитие бренда'],
    primarySticker: STICKERS.ideas,
    altSticker: STICKERS.content,
    accentColor: '#7c3aed',
    softBg: 'from-[#ede9fe] via-[#f5f3ff] to-[#ffffff]',
    pillBorder: 'border-[#7c3aed]/35',
  },
};

export const HubScreen: React.FC<HubScreenProps> = ({
  save,
  totalBibliks,
  completedTasks,
  onNavigate,
  onSwitchTo3D,
}) => {
  const [selectedRole, setSelectedRole] = useState<WorkshopId>(1);
  const [altPose, setAltPose] = useState<boolean>(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEPARTMENT_PROGRAMS[1].id);
  const activeProgram =
    DEPARTMENT_PROGRAMS.find((p) => p.id === selectedProgramId) ?? DEPARTMENT_PROGRAMS[0];
  const activeRole = ROLE_SHOWCASE[selectedRole];

  const getTasksProgress = (wId: WorkshopId) => {
    if (wId === 1) return save.w1;
    if (wId === 2) return save.w2;
    return save.w3;
  };

  const getNextTaskIdx = (wId: WorkshopId): number => {
    const arr = getTasksProgress(wId);
    const idx = arr.findIndex((t) => !t.completed);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="h-full overflow-y-auto desk-scroll px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6 animate-card-in">
        {/* 1. LIGHT SPARKLE-INSPIRED HERO + INTERACTIVE ROLE SWITCHER */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fffaf4] via-[#f4f8ff] to-[#eef4ff] text-[#13294b] px-6 py-7 sm:px-9 sm:py-10 shadow-xl border border-[#13294b]/10">
          {/* Soft Pastel Glow Orbs */}
          <div
            className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-[#fde68a]/35 blur-3xl animate-hero-float"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 right-0 w-96 h-96 rounded-full bg-[#bae6fd]/40 blur-3xl animate-hero-float"
            style={{ animationDelay: '1.6s' }}
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Editorial Headline + Role Switcher */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#0284c7]/20 shadow-xs text-xs font-extrabold uppercase tracking-wider text-[#0369a1]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#c41e2e]" />
                  <span>Кафедра библиотечно-информационной деятельности</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl sm:text-5xl leading-[1.08] tracking-tight text-[#13294b]">
                  Узнай, какая роль{' '}
                  <span className="italic text-[#c41e2e]">тебе ближе.</span>
                </h1>
                <p className="text-sm sm:text-base text-[#13294b]/75 leading-relaxed max-w-xl">
                  Переключай профессии «Инфополиса БИД» — посмотри, кто чем занимается, примерь
                  роль на живом маскоте и начни с того трека, который откликается больше всего.
                </p>
              </div>

              {/* 3 Interactive Role Pills */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#13294b]/55">
                  Кто ты в Инфополисе БИД? Нажми, чтобы примерить роль:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {([1, 2, 3] as WorkshopId[]).map((wId) => {
                    const role = ROLE_SHOWCASE[wId];
                    const isSelected = selectedRole === wId;
                    return (
                      <button
                        key={wId}
                        type="button"
                        onClick={() => {
                          setSelectedRole(wId);
                          setAltPose(false);
                        }}
                        className={`text-left px-3.5 py-3 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? `bg-white shadow-md ${role.pillBorder} -translate-y-0.5`
                            : 'bg-white/60 hover:bg-white/90 border-transparent text-[#13294b]/80'
                        }`}
                      >
                        <div
                          className="text-[10px] font-mono-tabular font-extrabold uppercase tracking-wider"
                          style={{ color: isSelected ? role.accentColor : '#64748b' }}
                        >
                          Трек 0{wId}
                        </div>
                        <div className="font-display font-extrabold text-sm text-[#13294b] mt-0.5">
                          {role.shortTitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Role Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({
                      view: 'workshop',
                      workshop: selectedRole,
                      task: getNextTaskIdx(selectedRole),
                    })
                  }
                  className="min-h-[50px] px-6 rounded-2xl text-white font-display font-extrabold text-sm sm:text-base inline-flex items-center gap-2.5 shadow-lg transition-all hover:brightness-110 active:scale-[0.99]"
                  style={{ backgroundColor: activeRole.accentColor }}
                >
                  <span>Начать трек «{activeRole.shortTitle}»</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {onSwitchTo3D && (
                  <button
                    type="button"
                    onClick={onSwitchTo3D}
                    className="min-h-[50px] px-5 rounded-2xl bg-white hover:bg-[#f8fafc] border border-[#13294b]/15 text-[#13294b] font-display font-extrabold text-sm inline-flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Box className="w-4 h-4 text-[#0284c7] shrink-0" />
                    <span>Открыть 3D-тур</span>
                  </button>
                )}

                <a
                  href="#tracks-section"
                  className="text-xs sm:text-sm font-extrabold text-[#135c75] hover:underline px-2 py-1"
                >
                  Все треки и программы ↓
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Changing Mascot Stage */}
            <div className="lg:col-span-5">
              <div
                key={`${selectedRole}-${altPose ? 'alt' : 'main'}`}
                className={`relative rounded-3xl bg-gradient-to-br ${activeRole.softBg} border border-white shadow-lg p-5 sm:p-6 animate-card-in`}
              >
                {/* Floating Top Micro-Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-white/90 border border-[#13294b]/10 text-[11px] font-extrabold text-[#13294b] shadow-2xs">
                    3 трека · 12 кейсов
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/90 border border-[#13294b]/10 text-[11px] font-mono-tabular font-extrabold text-[#0284c7] shadow-2xs">
                    До 36 библиков
                  </span>
                </div>

                {/* Changing Mascot Character */}
                <div className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => setAltPose((prev) => !prev)}
                    title="Нажми на маскота, чтобы сменить эмоцию"
                    className="group relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center rounded-full bg-white/80 shadow-inner border border-white transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <img
                      src={altPose ? activeRole.altSticker : activeRole.primarySticker}
                      alt={activeRole.roleTitle}
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-md select-none"
                    />
                    <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-[#13294b] text-white text-[10px] font-bold opacity-85 group-hover:opacity-100 transition-opacity">
                      Нажми на маскота ✨
                    </span>
                  </button>

                  <div
                    className="mt-4 text-xs font-extrabold italic"
                    style={{ color: activeRole.accentColor }}
                  >
                    {activeRole.tagline}
                  </div>
                  <h2 className="font-display font-extrabold text-base sm:text-lg text-[#13294b] mt-1 leading-snug">
                    {activeRole.roleTitle}
                  </h2>
                  <p className="text-xs text-[#13294b]/75 leading-relaxed mt-1.5">
                    {activeRole.description}
                  </p>

                  {/* 4 Skill Chips */}
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3.5">
                    {activeRole.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full bg-white/90 border border-[#13294b]/10 text-[11px] font-bold text-[#13294b]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compact 3D Preview Strip */}
                {onSwitchTo3D && (
                  <button
                    type="button"
                    onClick={onSwitchTo3D}
                    className="mt-4 w-full p-2.5 rounded-2xl bg-white/90 hover:bg-white border border-[#13294b]/10 flex items-center gap-3 text-left transition-all shadow-2xs group"
                  >
                    <img
                      src={MEDIA.studioRoom}
                      alt="3D-мир Инфополис БИД"
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-[#13294b] truncate">
                        Заглянуть в 3D-залы Инфополиса
                      </div>
                      <div className="text-[11px] text-[#13294b]/65 truncate">
                        Библиотека · Редакция · Зал «Библионочи»
                      </div>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-[#eef6fc] text-[#0284c7] group-hover:bg-[#0284c7] group-hover:text-white flex items-center justify-center font-extrabold text-sm transition-colors shrink-0">
                      →
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. GAME RULES RIGHT AFTER THE HERO BANNER */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#e8f3f7] text-[#135c75] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                1. Выбери роль и проф-трек
              </h2>
            </div>
            <p className="text-sm text-[#13294b]/75 leading-relaxed">
              Заходи в 3D-тур или открывай любой из 3 профессиональных треков ниже. В каждом тебя
              ждут 4 практических кейса и готовый итоговый проект.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#fdecee] text-[#c41e2e] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                2. Зарабатывай библики
              </h2>
            </div>
            <ul className="space-y-1 text-xs sm:text-sm text-[#13294b]/80">
              <li className="flex items-center justify-between gap-2">
                <span>С первой попытки без подсказок</span>
                <strong className="font-mono-tabular text-[#157a4f]">+3 библика</strong>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>С одной ошибкой</span>
                <strong className="font-mono-tabular text-[#135c75]">+2 библика</strong>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>С подсказкой или от 2 ошибок</span>
                <strong className="font-mono-tabular text-[#13294b]">+1 библик</strong>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#13294b]/10 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#eef2f9] text-[#13294b] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-display font-extrabold text-base text-[#13294b]">
                3. Узнай, какая роль тебе ближе
              </h2>
            </div>
            <p className="text-sm text-[#13294b]/75 leading-relaxed">
              После прохождения игра покажет диаграмму твоих результатов и подскажет, какое
              направление или профиль на кафедре БИД подходит именно тебе.
            </p>
          </div>
        </section>

        {/* 3. THREE PROFESSIONAL TRACKS TO PLAY */}
        <div id="tracks-section" className="flex flex-wrap items-baseline justify-between gap-2 pt-2">
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#13294b]">
              Выбери профессиональный трек
            </h2>
            <p className="text-sm text-[#13294b]/70">
              Проходить треки можно в любом порядке — прогресс и заработанные библики сохраняются
              автоматически.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onSwitchTo3D && (
              <button
                type="button"
                onClick={onSwitchTo3D}
                className="min-h-[42px] px-4 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-xs sm:text-sm font-display font-extrabold inline-flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                <Box className="w-4 h-4 text-[#7dd3fc]" />
                <span>Открыть 3D-тур</span>
              </button>
            )}
            {completedTasks > 0 && (
              <button
                type="button"
                onClick={() => onNavigate({ view: 'results' })}
                className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#c41e2e] hover:underline whitespace-nowrap"
              >
                <BiblikCoin size="sm" />
                <span>
                  Посмотреть итоги ({completedTasks} из 12 · {totalBibliks} Б) →
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Career Track Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {WORKSHOPS.map((ws) => {
            const prog = getTasksProgress(ws.id);
            const doneCount = prog.filter((t) => t.completed).length;
            const wsBibliks = prog.reduce((sum, t) => sum + t.bibliks, 0);
            const nextTaskIdx = getNextTaskIdx(ws.id);
            const card = WORKSHOP_CARDS[ws.id];

            return (
              <article
                key={ws.id}
                className="bg-white rounded-3xl overflow-hidden shadow-md border border-[#13294b]/10 flex flex-col justify-between transition-transform hover:-translate-y-1"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-[#13294b] overflow-hidden">
                    <img
                      src={card.img}
                      alt={ws.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#7dd3fc]">
                        Проф-трек 0{ws.id}
                      </span>
                      <span className="font-mono-tabular text-xs font-extrabold">
                        {doneCount} из 4 заданий · {wsBibliks} Б
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#135c75]">
                        {card.roleBadge}
                      </div>
                      <h3 className="font-display font-extrabold text-lg text-[#13294b] leading-snug mt-0.5">
                        {ws.id === 1
                          ? 'Библиотека и информационные ресурсы'
                          : ws.id === 2
                            ? 'Издательское дело и редакция'
                            : 'Креативный менеджмент и проекты'}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#13294b]/75 leading-relaxed mt-1.5">
                        {card.summary}
                      </p>
                    </div>

                    {/* Direct 4-Stage List inside each Track Card */}
                    <div className="space-y-1.5 pt-2 border-t border-[#13294b]/10">
                      {ws.tasks.map((task, idx) => {
                        const isDone = prog[idx]?.completed;
                        return (
                          <button
                            key={task.title}
                            type="button"
                            onClick={() =>
                              onNavigate({ view: 'workshop', workshop: ws.id, task: idx })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors ${
                              isDone
                                ? 'bg-[#e9f7ef] text-[#157a4f] hover:bg-[#d8f1e3]'
                                : 'bg-[#f4f7fc] text-[#13294b] hover:bg-[#e6edf8]'
                            }`}
                          >
                            <span className="truncate">
                              <strong className="font-mono-tabular">{idx + 1}.</strong> {task.title}
                            </span>
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-extrabold shrink-0">
                                <Check className="w-3.5 h-3.5" />+{prog[idx].bibliks} Б
                              </span>
                            ) : (
                              <span className="text-[#13294b]/40 text-xs shrink-0">↗</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({ view: 'workshop', workshop: ws.id, task: nextTaskIdx })
                    }
                    className="flex-1 min-h-[46px] rounded-2xl text-white font-display font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-92 whitespace-nowrap"
                    style={{ backgroundColor: ws.accentBg }}
                  >
                    {doneCount === 0
                      ? 'Запустить проф-трек'
                      : doneCount === 4
                        ? 'Пройти ещё раз'
                        : `Продолжить (шаг ${nextTaskIdx + 1})`}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {doneCount === 4 && (
                    <button
                      type="button"
                      onClick={() => onNavigate({ view: 'showcase', workshop: ws.id })}
                      className="min-h-[46px] px-4 rounded-2xl bg-[#e9f7ef] hover:bg-[#d5f0e1] text-[#157a4f] text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Итог
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* 4. Interactive Educational Programs Navigator + Full-Width Research & Practice Base */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#13294b]/12 shadow-md space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#13294b]/10 pb-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e] inline-flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                <span>Образовательные программы кафедры БИД</span>
              </div>
              <h2 className="font-display font-extrabold text-lg sm:text-2xl text-[#13294b] mt-0.5">
                Направления подготовки кафедры библиотечно-информационной деятельности
              </h2>
            </div>
          </div>

          {/* 6 Program Tabs (СПО БИД, Базовое ВО БИД, Профиль Креативный менеджмент в БИД, Издательское дело, Магистратура, Аспирантура) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {DEPARTMENT_PROGRAMS.map((prog) => {
              const active = prog.id === activeProgram.id;
              return (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => setSelectedProgramId(prog.id)}
                  className={`p-3 rounded-2xl text-left border-2 transition-all flex flex-col justify-between gap-1.5 ${
                    active
                      ? 'bg-[#13294b] text-white border-[#13294b] shadow-sm'
                      : 'bg-[#f6f8fc] hover:bg-[#e9effa] text-[#13294b] border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-mono-tabular text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                        active ? 'bg-[#0284c7] text-white' : 'bg-white text-[#135c75]'
                      }`}
                    >
                      {prog.code}
                    </span>
                    {prog.isNew ? (
                      <span className="px-1.5 py-0.5 rounded bg-[#c41e2e] text-white font-mono-tabular text-[9px] font-extrabold uppercase">
                        ПРОФИЛЬ NEW!
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          active ? 'bg-white/15 text-[#7dd3fc]' : 'bg-[#13294b]/8 text-[#13294b]/70'
                        }`}
                      >
                        {prog.id === 'spo-bid'
                          ? 'СПО'
                          : prog.id === 'bak-bid-base'
                            ? 'ВО · БАЗА'
                            : prog.id === 'bak-pub'
                              ? 'ВО'
                              : prog.id === 'mag-bid'
                                ? 'МАГИСТР.'
                                : 'АСПИРАНТ.'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold leading-snug line-clamp-2">
                      {prog.id === 'spo-bid'
                        ? 'СПО · Библиотечно-информационная деятельность'
                        : prog.id === 'bak-bid-base'
                          ? 'ВО · Библиотечно-информационная деятельность'
                          : prog.id === 'bak-bid'
                            ? 'Профиль «Креативный менеджмент в БИД»'
                            : prog.id === 'bak-pub'
                              ? 'ВО · Издательское дело'
                              : prog.id === 'mag-bid'
                                ? 'Магистратура БИД'
                                : 'Аспирантура 5.10.4'}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        active ? 'text-white/75' : 'text-[#13294b]/65'
                      }`}
                    >
                      {prog.duration}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Program Detailed Card */}
          <div className="rounded-2xl bg-[#f6f8fc] border border-[#13294b]/10 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-white font-mono-tabular text-xs font-extrabold"
                    style={{ backgroundColor: activeProgram.accentHex }}
                  >
                    {activeProgram.code}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#135c75]">
                    {activeProgram.level}
                  </span>
                  {activeProgram.isNew && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#c41e2e] text-white text-[11px] font-extrabold">
                      NEW! Профиль направления 51.03.06 БИД
                    </span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#13294b]">
                  {activeProgram.title} — {activeProgram.profile}
                </h3>
                <p className="text-xs sm:text-sm text-[#13294b]/80 leading-relaxed">
                  {activeProgram.summary}
                </p>
              </div>

              {activeProgram.linkedWorkshop && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({
                      view: 'workshop',
                      workshop: activeProgram.linkedWorkshop!,
                      task: getNextTaskIdx(activeProgram.linkedWorkshop!),
                    })
                  }
                  className="min-h-[42px] px-4 rounded-xl text-white font-display font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm shrink-0"
                  style={{ backgroundColor: activeProgram.accentHex }}
                >
                  <span>Попробовать в Проф-треке 0{activeProgram.linkedWorkshop}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white p-4 border border-[#13294b]/8 space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#135c75] inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Чему научат</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#13294b]">
                  {activeProgram.whatYouLearn.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#157a4f] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-white p-4 border border-[#13294b]/8 space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#c41e2e] inline-flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Кем и где можно работать</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#13294b]">
                  {activeProgram.careers.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 font-bold">
                      <ArrowRight className="w-3.5 h-3.5 text-[#c41e2e] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-[#13294b]/10 text-[11px] text-[#13294b]/75 space-y-1">
                  {activeProgram.whereToWork.map((place) => (
                    <div key={place} className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-[#135c75] shrink-0 mt-0.5" />
                      <span>{place}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border border-[#13294b]/8 space-y-2.5 text-xs text-[#13294b]">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#13294b] inline-flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Поступление и практика</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#13294b]/60">
                    Вступительные испытания:
                  </div>
                  <div className="font-bold mt-0.5">{activeProgram.exams}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#13294b]/60">
                    Форма и срок обучения:
                  </div>
                  <div className="font-bold mt-0.5 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#135c75]" />
                    <span>{activeProgram.duration}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#13294b]/60">
                    Где проходит практика:
                  </div>
                  <div className="font-semibold mt-0.5">{activeProgram.practice}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width Styled Block: Научная и практическая база кафедры БИД */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0f223d] via-[#13294b] to-[#1b3a69] text-white p-5 sm:p-6 space-y-4 border border-white/10 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#7dd3fc]">
                <FlaskConical className="w-4 h-4 shrink-0" />
                <span>Научная и практическая база кафедры БИД БГИИК</span>
              </div>
              <span className="text-xs text-white/75 font-semibold">
                Реальные площадки практики, исследований и всероссийских форумов
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {DEPARTMENT_RESEARCH_HIGHLIGHTS.map((item, idx) => {
                const badges = [
                  'Лаборатория и база практики',
                  'Научная школа кафедры',
                  'Всероссийский форум',
                  'Конференция молодых учёных',
                ];
                return (
                  <div
                    key={item}
                    className="rounded-2xl bg-white/10 hover:bg-white/14 transition-colors border border-white/15 p-4 flex flex-col justify-start gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#38bdf8]/20 border border-[#7dd3fc]/40 text-[#7dd3fc] font-mono-tabular text-[10px] font-extrabold">
                        0{idx + 1} · {badges[idx] ?? 'Наука и практика'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white/95 leading-snug">
                      {item}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
