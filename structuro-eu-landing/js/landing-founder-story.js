/**
 * Founder story — doorlopende verticale lay-out (geen carrousel meer).
 * De drie beats staan onder elkaar; geen pijltjes, dots of swipe.
 * Dit script zorgt er alleen voor dat alle slides zichtbaar en
 * toegankelijk zijn, ongeacht eerdere carrousel-state.
 */
(function () {
  var root = document.getElementById("founderStory");
  if (!root) return;

  var track = root.querySelector("[data-founder-track]");
  if (track) track.style.transform = "none";

  var slides = root.querySelectorAll("[data-founder-slide]");
  slides.forEach(function (slide) {
    slide.setAttribute("aria-hidden", "false");
    slide.removeAttribute("tabindex");
  });

  // Carrousel-only no-ops behouden zodat externe aanroepen niet crashen.
  window.refreshFounderStoryLabels = function () {};
})();
