/* ==========================================================================
   PACIFIC BLACK TRANSPORT — main.js
   Nav · IntersectionObserver reveals · shared form module · prefill · tabs
   No libraries.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIG — all form submissions open the visitor's email app via a
     pre-filled mailto: draft addressed to PBT. No backend, no keys.
  ------------------------------------------------------------------ */
  var PBT_EMAIL = "pacific.black.transport@gmail.com";

  /* ------------------------------------------------------------------
     1. Header: transparent → black after ~80px scroll
  ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  var motionOK = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  /* Scroll progress line (injected so the 7 duplicated headers stay in sync) */
  var progress = null;
  if (header && motionOK) {
    progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    header.appendChild(progress);
  }

  /* Parallax targets */
  var heroMedia = document.querySelector(".hero-media");
  var heroContent = document.querySelector(".hero .container");
  var heroEl = document.querySelector(".hero");

  var ticking = false;
  function paint() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 80);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
    if (motionOK) {
      var sp = document.querySelectorAll("[data-speed]");
      for (var i = 0; i < sp.length; i++) {
        sp[i].style.transform = "translate3d(0," + (y * parseFloat(sp[i].getAttribute("data-speed"))) + "px,0)";
      }
    }
    if (motionOK && heroEl && y < heroEl.offsetHeight) {
      /* Background drifts slower than scroll; content drifts up + fades */
      if (heroMedia) heroMedia.style.transform = "translate3d(0," + (y * 0.35) + "px,0)";
      if (heroContent) {
        heroContent.style.transform = "translate3d(0," + (y * -0.12) + "px,0)";
        heroContent.style.opacity = String(Math.max(0, 1 - y / (heroEl.offsetHeight * 0.9)));
      }
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     2. Mobile menu (full-screen overlay)
  ------------------------------------------------------------------ */
  var toggle = document.querySelector(".menu-toggle");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        mobileMenu.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileMenu.classList.contains("open")) {
        mobileMenu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
        document.body.style.overflow = "";
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     3. Reveal-on-scroll + signature accent-rule draw
        (CSS only animates inside prefers-reduced-motion: no-preference,
        so with reduced motion these classes are inert.)
  ------------------------------------------------------------------ */
  var observed = document.querySelectorAll(".reveal, .eyebrow");
  var headings = document.querySelectorAll("section h2");
  function makeObserver(options) {
    return new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, options);
  }
  if ("IntersectionObserver" in window) {
    var io = makeObserver({ threshold: 0.15 });
    observed.forEach(function (el) { io.observe(el); });
    /* Masked headings keep only a ~2% sliver visible pre-reveal, so they need a
       zero-threshold observer; -8% bottom rootMargin delays it slightly for rhythm. */
    var ioH2 = makeObserver({ threshold: 0, rootMargin: "0px 0px -8% 0px" });
    headings.forEach(function (el) { ioH2.observe(el); });
  } else {
    observed.forEach(function (el) { el.classList.add("in"); });
    headings.forEach(function (el) { el.classList.add("in"); });
  }

  /* ------------------------------------------------------------------
     4. Shared form module — one mailto-based submission system.
        Every <form data-pbt-form data-email-subject="…"> gets:
        · reliable custom validation (forms are novalidate)
        · per-field inline errors + focus on first invalid field
        · a clean plain-text email built from all completed fields
        · a URL-encoded mailto: draft opened in the default mail app
        No fake "submitted" state: the visitor reviews and presses Send.
  ------------------------------------------------------------------ */
  function fieldWrap(input) { return input.closest(".field"); }

  var PHONE_RE = /^[+()\-.\s\d]*\d[+()\-.\s\d]*$/;

  function countDigits(v) { return (v.match(/\d/g) || []).length; }

  function validateInput(input) {
    var wrap = fieldWrap(input);
    if (!wrap) return true;
    var v = input.value.trim();
    var ok = input.checkValidity();
    /* extra checks the browser can't do from markup alone */
    if (ok && v) {
      if (input.type === "tel" && (!PHONE_RE.test(v) || countDigits(v) < 7)) ok = false;
      if (input.type === "number" && input.hasAttribute("max") &&
          Number(v) > Number(input.max)) ok = false;
    }
    wrap.classList.toggle("invalid", !ok);
    return ok;
  }

  /* name="vehicle_class" -> "Vehicle Class"; data-email-label wins if present */
  function labelFor(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el && el.getAttribute("data-email-label")) return el.getAttribute("data-email-label");
    return name.replace(/[_-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function resolveSubject(form) {
    var subject = form.getAttribute("data-email-subject") || "PBT Website Inquiry";
    /* A select marked data-subject-source can override the subject via the
       chosen option's data-subject attribute (e.g. Corporate vs Partnership). */
    var src = form.querySelector("select[data-subject-source]");
    if (src) {
      var opt = src.options[src.selectedIndex];
      if (opt && opt.getAttribute("data-subject")) subject = opt.getAttribute("data-subject");
    }
    return subject;
  }

  function buildEmailBody(form, subject) {
    var seen = [];   /* field names, in DOM order */
    var values = {}; /* name -> array of values */
    var kinds = {};  /* name -> "block" (textarea / checkbox group) or "line" */

    Array.prototype.forEach.call(form.elements, function (el) {
      var name = el.name;
      if (!name || name === "botcheck") return;
      if (el.tagName === "BUTTON" || el.type === "submit" || el.type === "hidden") return;
      if ((el.type === "radio" || el.type === "checkbox") && !el.checked) {
        if (seen.indexOf(name) === -1 && el.type === "checkbox") kinds[name] = "block";
        return;
      }
      var v = (el.value || "").trim();
      if (!v) return;
      if (seen.indexOf(name) === -1) seen.push(name);
      (values[name] = values[name] || []).push(v);
      if (el.tagName === "TEXTAREA" || el.type === "checkbox") kinds[name] = "block";
    });

    var lines = ["PACIFIC BLACK TRANSPORT", subject, ""];
    var lastWasBlock = false;
    seen.forEach(function (name) {
      if (!values[name]) return;
      var label = labelFor(form, name);
      var joined = values[name].join(", ");
      var block = kinds[name] === "block" || joined.length > 60;
      if (block) {
        if (lines[lines.length - 1] !== "") lines.push("");
        lines.push(label + ":");
        lines.push(joined);
        lines.push("");
        lastWasBlock = true;
      } else {
        if (lastWasBlock && lines[lines.length - 1] !== "") lines.push("");
        lines.push(label + ": " + joined);
        lastWasBlock = false;
      }
    });
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push("", "\u2014 Sent from the PBT website");
    return lines.join("\n");
  }

  function setStatus(form, msg) {
    var status = form.querySelector(".form-status");
    if (status) { status.textContent = msg; status.classList.add("visible"); }
  }

  document.querySelectorAll("form[data-pbt-form]").forEach(function (form) {
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("blur", function () { validateInput(input); });
      input.addEventListener("input", function () {
        var w = fieldWrap(input);
        if (w && w.classList.contains("invalid")) validateInput(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* Honeypot: silently drop bot submissions */
      var hp = form.querySelector('input[name="botcheck"]');
      if (hp && (hp.checked || (hp.value && hp.type !== "checkbox"))) return;

      var firstInvalid = null;
      form.querySelectorAll("input, select, textarea").forEach(function (input) {
        if (!validateInput(input) && !firstInvalid) firstInvalid = input;
      });

      var btn = form.querySelector('button[type="submit"]');
      var originalLabel = btn ? btn.textContent : "";

      if (firstInvalid) {
        setStatus(form, "Please complete the highlighted fields.");
        firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
        firstInvalid.focus({ preventScroll: true });
        return;
      }

      var subject = resolveSubject(form);
      var body = buildEmailBody(form, subject);
      var mailto = "mailto:" + PBT_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      if (btn) { btn.disabled = true; btn.textContent = "Preparing your email\u2026"; }
      setStatus(form, "Preparing your email\u2026");

      window.setTimeout(function () {
        /* Open the mailto: URL via a synthetic anchor click — on phones this
           opens the default Mail app; on desktop, the configured client.
           The page itself stays put. */
        var a = document.createElement("a");
        a.href = mailto;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatus(form,
          "Your email app is opening. Please review and send your request. " +
          "If nothing opened, email us directly at " + PBT_EMAIL + ".");
        if (btn) {
          btn.textContent = "Open email again";
          btn.disabled = false;
        }
      }, 350);
    });
  });

  /* ------------------------------------------------------------------
     5. Date input: min = today (ride form)
  ------------------------------------------------------------------ */
  document.querySelectorAll('input[type="date"][data-min-today]').forEach(function (input) {
    var d = new Date();
    var iso = d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
    input.min = iso;
  });

  /* ------------------------------------------------------------------
     6. Query-param prefill
        /ride/?class=…   → preselect vehicle-class radio card
        /contact/?subject=… → preselect subject option
  ------------------------------------------------------------------ */
  var params = new URLSearchParams(window.location.search);

  var cls = params.get("class");
  if (cls) {
    var radio = document.querySelector('input[name="vehicle_class"][value="' + CSS.escape(cls) + '"]');
    if (radio) radio.checked = true;
  }

  var subj = params.get("subject");
  if (subj) {
    var sel = document.querySelector('select[name="topic"]');
    if (sel) {
      Array.prototype.forEach.call(sel.options, function (opt) {
        if (opt.value === subj) sel.value = subj;
      });
    }
  }

  /* ------------------------------------------------------------------
     7. Drive pathways: accessible tab pattern, deep-linkable
        (#pbt-vehicle / #own-vehicle)
  ------------------------------------------------------------------ */
  var tabs = document.querySelectorAll(".tab-btn");
  var panels = document.querySelectorAll(".tab-panel");
  function activateTab(id, pushHash) {
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", String(t.getAttribute("aria-controls") === id));
    });
    panels.forEach(function (p) { p.classList.toggle("active", p.id === id); });
    if (pushHash && history.replaceState) history.replaceState(null, "", "#" + id);
  }
  if (tabs.length) {
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        activateTab(t.getAttribute("aria-controls"), true);
      });
    });
    var hash = window.location.hash.replace("#", "");
    var target = hash && document.getElementById(hash);
    if (target && target.classList.contains("tab-panel")) {
      activateTab(hash, false);
      target.scrollIntoView();
    } else {
      activateTab("pbt-vehicle", false);
    }
  }

  /* ------------------------------------------------------------------
     8. Sticky mobile CTA on /ride/ and /drive/ — appears after 60% scroll
  ------------------------------------------------------------------ */
  var sticky = document.querySelector(".sticky-cta");
  if (sticky) {
    function onStickyScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? window.scrollY / max : 0;
      sticky.classList.toggle("visible", progress > 0.6);
    }
    window.addEventListener("scroll", onStickyScroll, { passive: true });
    onStickyScroll();
  }
})();
