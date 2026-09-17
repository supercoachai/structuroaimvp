/*
 * Coach-aanvraag: POST naar structuro.ai, mail naar info@ (Outlook).
 * Override voor lokaal: window.__STRUCTURO_COACH_AANVRAAG_URL__
 */
(function () {
  function coachRef() {
    var params = new URLSearchParams(window.location.search || "");
    return (params.get("utm_content") || "").replace(/[^\w-]/g, "").slice(0, 60);
  }

  function joinUrl() {
    var override =
      typeof window.__STRUCTURO_COACH_AANVRAAG_URL__ === "string"
        ? window.__STRUCTURO_COACH_AANVRAAG_URL__.trim()
        : "";
    if (override) return override;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return "http://localhost:3000/api/coach-aanvraag";
    }
    return "https://www.structuro.ai/api/coach-aanvraag";
  }

  function val(id) {
    var el = document.getElementById(id);
    return el && "value" in el ? String(el.value).trim() : "";
  }

  function init() {
    var form = document.getElementById("coach-form");
    if (!form) return;
    var status = document.getElementById("coach-form-status");
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) {
        status.hidden = true;
        status.textContent = "";
        status.className = "form-status";
      }
      if (btn) btn.disabled = true;

      var checked = form.querySelector('input[name="besloten"]');
      var payload = {
        naam: val("f-naam"),
        praktijk: val("f-praktijk"),
        website: val("f-web"),
        email: val("f-mail"),
        toelichting: val("f-toel"),
        company: val("f-company"),
        besloten: !!(checked && checked.checked),
        utmContent: coachRef(),
      };

      fetch(joinUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res
            .json()
            .then(function (data) {
              return { res: res, data: data };
            })
            .catch(function () {
              return { res: res, data: null };
            });
        })
        .then(function (out) {
          if (out.res.ok && out.data && out.data.ok === true) {
            form.classList.add("is-sent");
            if (status) {
              status.hidden = false;
              status.className = "form-status ok";
              status.setAttribute("role", "status");
              status.textContent =
                "Gelukt. We hebben je aanvraag binnen en nemen contact op.";
            }
            if (typeof window.posthog !== "undefined") {
              window.posthog.capture("coach_form_success", {
                utm_content: payload.utmContent || undefined,
              });
            }
            return;
          }
          throw new Error("fail");
        })
        .catch(function () {
          if (status) {
            status.hidden = false;
            status.className = "form-status err";
            status.textContent =
              "Versturen lukte nu niet. Probeer het opnieuw, of mail info@structuro.eu.";
          }
        })
        .finally(function () {
          if (btn && !form.classList.contains("is-sent")) btn.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
