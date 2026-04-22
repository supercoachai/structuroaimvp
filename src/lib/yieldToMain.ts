/**
 * Geeft de browser ruimte om te painten na een interactie (betere INP).
 * Dubbele requestAnimationFrame: na layout/paint van de commit.
 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
