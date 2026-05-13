type OnboardingGuideProps = {
  onDismiss: () => void;
};

const guideSteps = [
  {
    target: "MIDI status",
    title: "Connect your MIDI controller",
    description:
      "Use the MIDI status button in the top bar to grant browser MIDI access and see connected inputs.",
  },
  {
    target: "Hold / Latch",
    title: "Choose Hold or Latch",
    description:
      "Hold plays notes while pressing keys. Latch keeps clicked notes active until you click them again or press Space.",
  },
  {
    target: "Sound toggle",
    title: "Control browser sound",
    description:
      "Turn sound on when you want browser playback, or turn it off when you only want visual chord feedback.",
  },
];

export function OnboardingGuide({ onDismiss }: OnboardingGuideProps) {
  return (
    <div className="onboarding-guide" role="presentation">
      <section
        aria-labelledby="onboarding-guide-title"
        className="onboarding-guide__panel"
        role="dialog"
      >
        <p className="onboarding-guide__eyebrow">First run guide</p>
        <h2 className="onboarding-guide__title" id="onboarding-guide-title">
          Welcome to Progresifo
        </h2>
        <p className="onboarding-guide__intro">
          Start from the top bar: connect MIDI if you have a controller, choose
          how mouse notes behave, and decide whether the browser should play
          sound.
        </p>

        <ol className="onboarding-guide__steps">
          {guideSteps.map((step) => (
            <li className="onboarding-guide__step" key={step.title}>
              <span className="onboarding-guide__target">{step.target}</span>
              <div>
                <h3 className="onboarding-guide__step-title">{step.title}</h3>
                <p className="onboarding-guide__step-description">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <button
          className="onboarding-guide__dismiss"
          onClick={onDismiss}
          type="button"
        >
          Start practicing
        </button>
      </section>
    </div>
  );
}
