interface GameProgressProps {
  label: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number | null;
}

/** Shared numbered progress treatment for all five geoMaster modes. */
export function GameProgress({ label, totalSteps, completedSteps, currentStep }: GameProgressProps): JSX.Element {
  const completed = Math.max(0, Math.min(totalSteps, completedSteps));
  return (
    <ol className="game-step-pills" aria-label={`${label} progress: ${completed} of ${totalSteps} completed`}>
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
            <span aria-hidden="true">{step}</span>
            <span className="sr-only">{label} {step}{isComplete ? ', completed' : isCurrent ? ', current' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}
