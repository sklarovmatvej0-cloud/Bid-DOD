import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { FeedbackState } from '../game/knigogradTypes';
import { BiblikCoin } from './TopBar';
import { ConfettiBurst } from './VisualEffects';

interface FeedbackModalProps {
  feedback: FeedbackState | null;
  onClose: () => void;
  onAction: () => void;
  onBackToWorld?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  feedback,
  onClose,
  onAction,
  onBackToWorld,
}) => {
  const isSuccess = Boolean(feedback?.success);
  const isHint = Boolean(feedback && !feedback.success && feedback.title.toLowerCase().includes('подсказк'));

  useEffect(() => {
    if (!feedback) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (feedback.success) {
          onAction();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [feedback, onAction, onClose]);

  if (!feedback) return null;

  const isVictory = isSuccess && feedback.onNext === 'showcase';

  return (
    <>
      <ConfettiBurst active={isSuccess} intensity={isVictory ? 'victory' : 'normal'} />
      <div
        className="fixed inset-0 z-50 bg-[#0d1c34]/65 backdrop-blur-[3px] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-2xl bg-white border border-[#13294b]/15 shadow-2xl overflow-hidden ${
            !isSuccess && !isHint ? 'animate-stage-shake' : 'animate-card-in'
          }`}
        >
          {/* Top Accent Strip */}
          <div
            className={`px-6 py-4 flex items-center justify-between gap-3 ${
              isSuccess
                ? 'bg-gradient-to-r from-[#157a4f] to-[#116440] text-white'
                : isHint
                  ? 'bg-gradient-to-r from-[#135c75] to-[#0f485c] text-white'
                  : 'bg-gradient-to-r from-[#c41e2e] to-[#a21725] text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : isHint ? (
                <HelpCircle className="w-5 h-5 shrink-0" />
              ) : (
                <RotateCcw className="w-5 h-5 shrink-0" />
              )}
              <h2
                id="feedback-modal-title"
                className="font-display font-bold text-base sm:text-lg leading-tight truncate"
              >
                {feedback.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно"
              className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {isSuccess && (
              <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[#f0f7ff] to-[#e0f2fe] border border-[#0284c7]/30 px-4 py-3 animate-stamp-pop shadow-xs">
                <div className="flex items-center gap-3">
                  <BiblikCoin size="lg" pulse />
                  <div>
                    <div className="font-display font-extrabold text-base text-[#13294b]">
                      {feedback.alreadyDone
                        ? 'Задание пройдено повторно'
                        : `+${feedback.bibliksAwarded ?? 0} ${
                            (feedback.bibliksAwarded ?? 0) === 1
                              ? 'библик'
                              : 'библика'
                          } в копилку!`}
                    </div>
                    <div className="text-xs font-medium text-[#135c75]">
                      {feedback.alreadyDone
                        ? 'Отличная тренировка — библики за это задание уже начислены'
                        : feedback.bibliksAwarded === 3
                          ? 'Безупречно — максимум без ошибок и подсказок'
                          : feedback.bibliksAwarded === 2
                            ? 'Отличный результат с небольшой помаркой'
                            : 'Задание выполнено — опыт засчитан'}
                    </div>
                  </div>
                </div>
                {!feedback.alreadyDone && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {[1, 2, 3].map((n) => (
                      <span
                        key={n}
                        className={`w-3 h-3 rounded-full transition-transform ${
                          n <= (feedback.bibliksAwarded ?? 0)
                            ? 'bg-[#0284c7] scale-110 shadow-xs'
                            : 'bg-[#0284c7]/20'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {feedback.sticker && (
                <div className="shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#f6f8fc] border border-[#13294b]/10 p-2 flex items-center justify-center animate-stamp-pop shadow-xs">
                  <img
                    src={feedback.sticker}
                    alt="Реакция маскота БИД"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
              )}
              <p className="text-sm sm:text-[15px] leading-relaxed text-[#13294b] flex-1">
                {feedback.body}
              </p>
            </div>

            {feedback.lesson && (
              <div className="rounded-xl bg-[#f3f6fc] border border-[#13294b]/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#135c75] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Как это работает в профессии
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-[#13294b]/85">
                  {feedback.lesson}
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
              {isSuccess ? (
                <>
                  {onBackToWorld && (
                    <button
                      type="button"
                      onClick={onBackToWorld}
                      className="min-h-[42px] px-4 rounded-xl bg-[#f0f7ff] hover:bg-[#e0f2fe] text-sm font-extrabold text-[#13294b] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      На главную
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[42px] px-4 rounded-xl border border-[#13294b]/15 hover:bg-[#f3f6fc] text-sm font-semibold text-[#13294b] transition-colors whitespace-nowrap"
                  >
                    Остаться здесь
                  </button>
                  <button
                    type="button"
                    onClick={onAction}
                    className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
                  >
                    <span>{feedback.nextActionLabel ?? 'Дальше'}</span>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono-tabular bg-white/15 rounded">
                      Enter
                    </kbd>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
                >
                  <span>{isHint ? 'Понятно, к заданию' : 'Попробовать снова'}</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono-tabular bg-white/15 rounded">
                    Enter
                  </kbd>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
