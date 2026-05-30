/** Confetti bij afronden van de dagstart swipe-stap (dopamine-moment). */
export function fireDagstartCompleteConfetti() {
  void import("canvas-confetti")
    .then(({ default: confetti }) => {
      confetti({
        particleCount: 64,
        spread: 72,
        startVelocity: 26,
        origin: { x: 0.5, y: 0.52 },
        colors: ["#22c55e", "#3B6BF7", "#a855f7", "#f59e0b"],
        disableForReducedMotion: true,
        zIndex: 250,
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 36,
          spread: 96,
          startVelocity: 18,
          origin: { x: 0.5, y: 0.52 },
          colors: ["#3B6BF7", "#22c55e", "#8B5CF6"],
          disableForReducedMotion: true,
          zIndex: 250,
        });
      }, 220);
    })
    .catch((err) => {
      console.warn("dagstart confetti:", err);
    });
}
