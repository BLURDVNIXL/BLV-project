import React, { useState } from 'react';
import { GraduationCap, CheckCircle2, XCircle } from 'lucide-react';
import { AcademicBadge } from '../types/game';
import { ACADEMIC_BADGES, SCHOOL_EXAMS } from '../core/destinies';
import { JellyButton } from './ui/Jelly';
import { Modal } from './ui/Modal';

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
    <Modal
      title={`Concours d’entrée — ${badge.title}`}
      icon={<GraduationCap className="h-5 w-5" />}
      onClose={onClose}
      closeLabel="Fermer le concours"
      widthClass="max-w-md"
    >
      <p className="text-xs font-semibold text-ink-400">{badge.school}</p>
      <div className="rounded-2xl border-2 border-cream-200 bg-cream-50 p-3 text-sm text-ink-600">{badge.legend}</div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        <span className="text-sun-600">
          Question {step + 1} / {questions.length}
        </span>
        <span className="text-xs text-palm-600">{badge.perks}</span>
      </div>

      <p className="text-base font-bold leading-snug">{currentQ.question}</p>

      <div className="space-y-2">
        {currentQ.options.map((opt, idx) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setSelected(idx);
              setFeedback('idle');
            }}
            className={`w-full cursor-pointer rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
              selected === idx ? 'border-sun-500 bg-sun-300/40' : 'border-cream-200 bg-cream-50 hover:border-sun-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback === 'wrong' && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-coral-400/60 bg-coral-400/10 px-3 py-2 text-sm font-bold text-coral-600">
          <XCircle className="h-5 w-5 shrink-0" />
          Mauvaise réponse ! Réessaie pour décrocher le badge d’excellence.
        </div>
      )}

      {feedback === 'passed' && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-palm-400/60 bg-palm-400/10 px-3 py-2 text-sm font-bold text-palm-600">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Concours réussi ! Remise du badge {badge.title}…
        </div>
      )}

      <JellyButton
        tone="sun"
        size="md"
        disabled={selected === null || feedback === 'passed'}
        onClick={handleSubmitAnswer}
        className="w-full disabled:cursor-not-allowed disabled:opacity-45"
      >
        Valider la réponse
      </JellyButton>
    </Modal>
  );
};
