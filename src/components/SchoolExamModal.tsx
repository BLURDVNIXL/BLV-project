import React, { useState } from 'react';
import { GraduationCap, CheckCircle2, XCircle, X } from 'lucide-react';
import { AcademicBadge } from '../types/game';
import { ACADEMIC_BADGES, SCHOOL_EXAMS } from '../core/destinies';

interface SchoolExamModalProps {
  badgeId: AcademicBadge;
  onPass: (badge: AcademicBadge) => void;
  onClose: () => void;
}

export const SchoolExamModal: React.FC<SchoolExamModalProps> = ({ badgeId, onPass, onClose }) => {
  const badge = ACADEMIC_BADGES.find((b) => b.id === badgeId)!;
  const questions = SCHOOL_EXAMS[badgeId];
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'wrong' | 'passed'>('idle');

  const currentQ = questions[step];

  const handleSubmitAnswer = () => {
    if (selected === null) return;
    if (selected !== currentQ.correctIndex) {
      setFeedback('wrong');
      return;
    }
    setFeedback('idle');
    setSelected(null);
    if (step + 1 < questions.length) {
      setStep(step + 1);
    } else {
      setFeedback('passed');
      setTimeout(() => {
        onPass(badgeId);
      }, 650);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/92 text-white select-none">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border-2 border-amber-500/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-xl tracking-wide uppercase text-white truncate">
                Concours d’Entrée — {badge.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">{badge.school}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le concours"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:p-3">
            {badge.legend}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase">
            <span className="text-amber-400 shrink-0">Question {step + 1} / {questions.length}</span>
            <span className="text-[11px] text-emerald-300">{badge.perks}</span>
          </div>

          <p className="text-sm font-bold text-white leading-snug">{currentQ.question}</p>

          <div className="space-y-2">
            {currentQ.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setSelected(idx);
                  setFeedback('idle');
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  selected === idx
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {feedback === 'wrong' && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 rounded-xl px-3 py-2">
              <XCircle className="w-4 h-4 shrink-0" />
              Mauvaise réponse ! Réessaie pour décrocher le badge d’excellence.
            </div>
          )}

          {feedback === 'passed' && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Concours réussi ! Remise du badge {badge.title}...
            </div>
          )}

          <button
            type="button"
            disabled={selected === null || feedback === 'passed'}
            onClick={handleSubmitAnswer}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            Valider la réponse
          </button>
        </div>
      </div>
    </div>
  );
};
