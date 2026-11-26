import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedbackModal } from './components/FeedbackModal';
import { HubScreen } from './components/HubScreen';
import { KnigogradExplorer3D, PlayerWorldPos } from './components/KnigogradExplorer3D';
import { ResultsView } from './components/ResultsView';
import { TopBar } from './components/TopBar';
import { Workshop1View } from './components/Workshop1View';
import { Workshop2View } from './components/Workshop2View';
import { Workshop3View } from './components/Workshop3View';
import {
  createInitialSave,
  loadKnigogradSave,
  saveKnigogradSave,
} from './game/knigogradData';
import {
  FeedbackState,
  KnigogradSave,
  ScreenRoute,
  TaskProgress,
  WorkshopId,
} from './game/knigogradTypes';
import { soundEngine } from './game/sound';

function getWorkshopKey(wId: WorkshopId): 'w1' | 'w2' | 'w3' {
  if (wId === 1) return 'w1';
  if (wId === 2) return 'w2';
  return 'w3';
}

export function App() {
  const [save, setSave] = useState<KnigogradSave>(() => loadKnigogradSave());
  const [route, setRoute] = useState<ScreenRoute>({ view: 'hub' });
  const [hubMode, setHubMode] = useState<'3d' | '2d'>('2d');
  const [playerPos, setPlayerPos] = useState<PlayerWorldPos>({ x: 0, z: 5.1, rotY: Math.PI });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());

  const saveRef = useRef(save);
  saveRef.current = save;

  const updateSave = useCallback((updater: (prev: KnigogradSave) => KnigogradSave) => {
    setSave((prev) => {
      const next = updater(prev);
      saveKnigogradSave(next);
      return next;
    });
  }, []);

  const totalBibliks = useMemo(() => {
    const all = [...save.w1, ...save.w2, ...save.w3];
    return all.reduce((sum, t) => sum + t.bibliks, 0);
  }, [save.w1, save.w2, save.w3]);

  const completedTasks = useMemo(() => {
    const all = [...save.w1, ...save.w2, ...save.w3];
    return all.filter((t) => t.completed).length;
  }, [save.w1, save.w2, save.w3]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && feedback) {
        setFeedback(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [feedback]);

  const handleNavigate = useCallback((next: ScreenRoute) => {
    soundEngine.playSelectTick();
    setFeedback(null);
    setRoute(next);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
    updateSave((prev) => ({ ...prev, soundMuted: nextMuted }));
  }, [updateSave]);

  const handleRecordMistake = useCallback(
    (wId: WorkshopId, taskIdx: number) => {
      soundEngine.playErrorThud();
      const key = getWorkshopKey(wId);
      updateSave((prev) => {
        const arr = [...prev[key]];
        const current = arr[taskIdx];
        if (!current.completed) {
          arr[taskIdx] = { ...current, mistakes: current.mistakes + 1 };
        }
        return { ...prev, [key]: arr };
      });
    },
    [updateSave]
  );

  const handleUseHint = useCallback(
    (wId: WorkshopId, taskIdx: number, hintTitle: string, hintBody: string) => {
      soundEngine.playPaperSlide();
      const key = getWorkshopKey(wId);
      updateSave((prev) => {
        const arr = [...prev[key]];
        const current = arr[taskIdx];
        if (!current.completed && !current.usedHint) {
          arr[taskIdx] = { ...current, usedHint: true };
        }
        return { ...prev, [key]: arr };
      });
      setFeedback({
        success: false,
        title: hintTitle,
        body: hintBody,
      });
    },
    [updateSave]
  );

  const handleCompleteTask = useCallback(
    (
      wId: WorkshopId,
      taskIdx: number,
      modalContent: Omit<FeedbackState, 'bibliksAwarded' | 'alreadyDone'>,
      extraSave?: Partial<KnigogradSave>
    ) => {
      const key = getWorkshopKey(wId);
      const currentProgress: TaskProgress = saveRef.current[key][taskIdx];
      const alreadyDone = currentProgress.completed;

      let awarded = 0;
      if (!alreadyDone) {
        if (currentProgress.usedHint || currentProgress.mistakes >= 2) {
          awarded = 1;
        } else if (currentProgress.mistakes === 1) {
          awarded = 2;
        } else {
          awarded = 3;
        }
      }

      if (taskIdx === 3) {
        soundEngine.playVictoryFanfare();
      } else {
        soundEngine.playSuccessChime();
      }

      updateSave((prev) => {
        const arr = [...prev[key]];
        if (!arr[taskIdx].completed) {
          arr[taskIdx] = {
            ...arr[taskIdx],
            completed: true,
            bibliks: awarded,
          };
        }
        return {
          ...prev,
          ...(extraSave ?? {}),
          [key]: arr,
        };
      });

      setFeedback({
        ...modalContent,
        bibliksAwarded: awarded,
        alreadyDone,
      });
    },
    [updateSave]
  );

  const handleShowError = useCallback((title: string, body: string) => {
    setFeedback({
      success: false,
      title,
      body,
    });
  }, []);

  const handleModalAction = useCallback(() => {
    const currentFeedback = feedback;
    setFeedback(null);
    if (!currentFeedback?.success) return;

    if (route.view === 'workshop') {
      if (currentFeedback.onNext === 'showcase') {
        setRoute({ view: 'showcase', workshop: route.workshop });
      } else if (currentFeedback.onNext === 'next_task' && route.task < 3) {
        setRoute({ view: 'workshop', workshop: route.workshop, task: route.task + 1 });
      }
    }
  }, [feedback, route]);

  const handleResetProgress = useCallback(() => {
    soundEngine.playPaperSlide();
    const fresh = createInitialSave();
    fresh.soundMuted = muted;
    saveKnigogradSave(fresh);
    setSave(fresh);
    setRoute({ view: 'hub' });
  }, [muted]);

  const handleReturnToMainHub = useCallback(() => {
    soundEngine.playSelectTick();
    setFeedback(null);
    setHubMode('2d');
    setRoute({ view: 'hub' });
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col studio-canvas text-[#13294b]">
      <TopBar
        route={route}
        hubMode={hubMode}
        save={save}
        totalBibliks={totalBibliks}
        completedTasks={completedTasks}
        muted={muted}
        onNavigate={handleNavigate}
        onReturnToMainHub={handleReturnToMainHub}
        onToggleMute={handleToggleMute}
        onResetProgress={handleResetProgress}
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        {route.view === 'hub' && hubMode === '3d' && (
          <KnigogradExplorer3D
            save={save}
            totalBibliks={totalBibliks}
            completedTasks={completedTasks}
            initialPlayerPos={playerPos}
            onSavePlayerPos={setPlayerPos}
            onNavigate={handleNavigate}
            onSwitchTo2D={() => {
              soundEngine.playSelectTick();
              setHubMode('2d');
            }}
          />
        )}

        {route.view === 'hub' && hubMode === '2d' && (
          <HubScreen
            save={save}
            totalBibliks={totalBibliks}
            completedTasks={completedTasks}
            onNavigate={handleNavigate}
            onSwitchTo3D={() => {
              soundEngine.playSelectTick();
              setHubMode('3d');
            }}
          />
        )}

        {(route.view === 'workshop' || route.view === 'showcase') && route.workshop === 1 && (
          <Workshop1View
            taskIdx={route.view === 'workshop' ? route.task : 3}
            isShowcase={route.view === 'showcase'}
            progress={save.w1}
            save={save}
            onSelectTask={(idx) => handleNavigate({ view: 'workshop', workshop: 1, task: idx })}
            onOpenShowcase={() => handleNavigate({ view: 'showcase', workshop: 1 })}
            onNextWorkshop={() => handleNavigate({ view: 'workshop', workshop: 2, task: 0 })}
            onRecordMistake={(tIdx) => handleRecordMistake(1, tIdx)}
            onUseHint={(tIdx, title, body) => handleUseHint(1, tIdx, title, body)}
            onCompleteTask={(tIdx, fb, extra) => handleCompleteTask(1, tIdx, fb, extra)}
            onShowError={handleShowError}
          />
        )}

        {(route.view === 'workshop' || route.view === 'showcase') && route.workshop === 2 && (
          <Workshop2View
            taskIdx={route.view === 'workshop' ? route.task : 3}
            isShowcase={route.view === 'showcase'}
            progress={save.w2}
            save={save}
            onSelectTask={(idx) => handleNavigate({ view: 'workshop', workshop: 2, task: idx })}
            onOpenShowcase={() => handleNavigate({ view: 'showcase', workshop: 2 })}
            onNextWorkshop={() => handleNavigate({ view: 'workshop', workshop: 3, task: 0 })}
            onRecordMistake={(tIdx) => handleRecordMistake(2, tIdx)}
            onUseHint={(tIdx, title, body) => handleUseHint(2, tIdx, title, body)}
            onCompleteTask={(tIdx, fb, extra) => handleCompleteTask(2, tIdx, fb, extra)}
            onShowError={handleShowError}
          />
        )}

        {(route.view === 'workshop' || route.view === 'showcase') && route.workshop === 3 && (
          <Workshop3View
            taskIdx={route.view === 'workshop' ? route.task : 3}
            isShowcase={route.view === 'showcase'}
            progress={save.w3}
            save={save}
            onSelectTask={(idx) => handleNavigate({ view: 'workshop', workshop: 3, task: idx })}
            onOpenShowcase={() => handleNavigate({ view: 'showcase', workshop: 3 })}
            onOpenResults={() => handleNavigate({ view: 'results' })}
            onRecordMistake={(tIdx) => handleRecordMistake(3, tIdx)}
            onUseHint={(tIdx, title, body) => handleUseHint(3, tIdx, title, body)}
            onCompleteTask={(tIdx, fb, extra) => handleCompleteTask(3, tIdx, fb, extra)}
            onShowError={handleShowError}
          />
        )}

        {route.view === 'results' && (
          <ResultsView
            save={save}
            totalBibliks={totalBibliks}
            completedTasks={completedTasks}
            onNavigate={handleNavigate}
            onResetProgress={handleResetProgress}
          />
        )}
      </main>

      <FeedbackModal
        feedback={feedback}
        onClose={() => setFeedback(null)}
        onAction={handleModalAction}
        onBackToWorld={() => handleNavigate({ view: 'hub' })}
      />
    </div>
  );
}

export default App;
