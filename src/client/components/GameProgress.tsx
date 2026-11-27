interface GameProgressProps {
  label: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number | null;
}

/** Shared pill-based progress treatment for all five geoMaster modes. */
export function GameProgress({ label, totalSteps, completedSteps, currentStep }: GameProgressProps): JSX.Element {
  const completed = Math.max(0, Math.min(totalSteps, completedSteps));
  const activeStep = currentStep ?? Math.max(1, completed);
  return (
    <ol className="game-step-pills" aria-label={`${label} ${activeStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const isComplete = step <= completed;
        const isCurrent = !isComplete && step === currentStep;
        return (
          <li
            key={step}
            className={isComplete ? 'is-complete' : isCurrent ? 'is-current' : ''}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="sr-only">{label} {step}{isComplete ? ', completed' : isCurrent ? ', current' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}
