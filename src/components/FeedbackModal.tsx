import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { FeedbackState } from '../game/knigogradTypes';
import { BiblikCoin } from './TopBar';

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
  if (!feedback) return null;

  const isSuccess = feedback.success;
  const isHint = !isSuccess && feedback.title.toLowerCase().includes('подсказк');

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d1c34]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#13294b]/15 shadow-2xl overflow-hidden animate-card-in">
        {/* Top Accent Strip */}
        <div
          className={`px-6 py-4 flex items-center justify-between gap-3 ${
            isSuccess
              ? 'bg-[#157a4f] text-white'
              : isHint
                ? 'bg-[#135c75] text-white'
                : 'bg-[#c41e2e] text-white'
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
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#fff8e6] border border-[#e59c2d]/35 px-4 py-3 animate-stamp-pop">
              <div className="flex items-center gap-3">
                <BiblikCoin size="lg" />
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
                  <div className="text-xs font-medium text-[#7b5110]">
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
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`w-2.5 h-2.5 rounded-full ${
                        n <= (feedback.bibliksAwarded ?? 0)
                          ? 'bg-[#e59c2d]'
                          : 'bg-[#e59c2d]/25'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-sm sm:text-[15px] leading-relaxed text-[#13294b]">
            {feedback.body}
          </p>

          {feedback.lesson && (
            <div className="rounded-xl bg-[#f3f6fc] border border-[#13294b]/10 p-4">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#135c75] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Чему это учит на кафедре БИД
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
                    className="min-h-[42px] px-4 rounded-xl bg-[#fff4d4] hover:bg-[#ffe9ad] text-sm font-extrabold text-[#13294b] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    В 3D-комнаты
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
                  className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  {feedback.nextActionLabel ?? 'Дальше'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-5 rounded-xl bg-[#13294b] hover:bg-[#1e3d6e] text-white text-sm font-bold transition-colors whitespace-nowrap"
              >
                {isHint ? 'Понятно, к заданию' : 'Попробовать снова'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
