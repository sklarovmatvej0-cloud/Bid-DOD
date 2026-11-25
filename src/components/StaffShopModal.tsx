import React from 'react';
import { ArrowUpCircle, Check, Coins, TrendingUp, Users, X } from 'lucide-react';
import { STUDIO_STAFF } from '../game/knigogradData';
import { KnigogradSave } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';

interface StaffShopModalProps {
  open: boolean;
  save: KnigogradSave;
  coinsPerSec: number;
  subsPerSec: number;
  onClose: () => void;
  onHireOrUpgrade: (staffId: string, cost: number) => void;
}

export const StaffShopModal: React.FC<StaffShopModalProps> = ({
  open,
  save,
  coinsPerSec,
  subsPerSec,
  onClose,
  onHireOrUpgrade,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d1c34]/80 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-w-3xl w-full bg-white text-[#13294b] rounded-3xl overflow-hidden shadow-2xl animate-card-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#13294b] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-display font-extrabold text-sm sm:text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ffd66b]" />
              Команда и техника студии (Idle-доход 24/7)
            </div>
            <div className="text-xs text-white/75 flex flex-wrap gap-3">
              <span>
                Касса:{' '}
                <strong className="font-mono-tabular text-[#ffd66b]">
                  {Math.floor(save.coins).toLocaleString('ru-RU')} ₽
                </strong>
              </span>
              <span>·</span>
              <span>
                Пассивный доход:{' '}
                <strong className="font-mono-tabular text-[#86efac]">+{coinsPerSec} ₽/сек</strong>
              </span>
              <span>·</span>
              <span>
                Рост аудитории:{' '}
                <strong className="font-mono-tabular text-[#7dd3fc]">+{subsPerSec} подп/сек</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[76vh] overflow-y-auto desk-scroll grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {STUDIO_STAFF.map((member) => {
            const level = save.hiredStaff[member.id] ?? 0;
            const isMax = level >= member.maxLevel;
            const cost = Math.round(member.baseCost * Math.pow(1.65, level));
            const canAfford = save.coins >= cost;

            return (
              <div
                key={member.id}
                className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 transition-all ${
                  level > 0
                    ? 'bg-[#f4fbf7] border-[#157a4f]/35'
                    : 'bg-[#f7f9fd] border-[#13294b]/10'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold">
                    <span className="text-[#135c75]">{member.zone}</span>
                    <span className="font-mono-tabular px-2 py-0.5 rounded bg-[#13294b] text-[#ffd66b]">
                      Ур. {level} / {member.maxLevel}
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-sm">{member.name}</div>
                  <p className="text-xs text-[#13294b]/75 leading-snug">{member.role}</p>
                  <div className="flex flex-wrap gap-2.5 pt-1 text-[11px] font-mono-tabular font-extrabold">
                    <span className="text-[#157a4f] inline-flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> +{member.coinsPerSec} ₽/с
                    </span>
                    <span className="text-[#135c75] inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +{member.subsPerSec} подп/с
                    </span>
                  </div>
                </div>

                {isMax ? (
                  <div className="min-h-[40px] rounded-xl bg-[#e9f7ef] text-[#157a4f] text-xs font-extrabold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" /> Максимальный уровень!
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      soundEngine.playSuccessChime();
                      onHireOrUpgrade(member.id, cost);
                    }}
                    className={`w-full min-h-[42px] rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      canAfford
                        ? 'bg-[#13294b] hover:bg-[#c41e2e] text-white'
                        : 'bg-[#e6ebf4] text-[#13294b]/45 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    {level === 0 ? 'Нанять' : 'Улучшить'} за {cost.toLocaleString('ru-RU')} ₽
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
