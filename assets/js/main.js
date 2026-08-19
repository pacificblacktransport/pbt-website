/* ==========================================================================
   PACIFIC BLACK TRANSPORT — main.js
   Nav · IntersectionObserver reveals · shared form module · prefill · tabs
   No libraries.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIG — the owner must replace this before forms will deliver.
     Get a free access key at https://web3forms.com
     (submissions route to: pacific.black.transport@gmail.com)
  ------------------------------------------------------------------ */
  var WEB3FORMS_ACCESS_KEY = "WEB3FORMS_ACCESS_KEY"; // TODO: insert real key

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
     4. Shared form module
        Every <form data-pbt-form> gets: inline validation on blur,
        Web3Forms fetch submission, loading state, success-panel swap,
        network-failure retry message with the email as fallback.
  ------------------------------------------------------------------ */
  function fieldWrap(input) { return input.closest(".field"); }

  function validateInput(input) {
    var wrap = fieldWrap(input);
    if (!wrap) return true;
    var ok = input.checkValidity();
    wrap.classList.toggle("invalid", !ok);
    return ok;
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

      var firstInvalid = null;
      form.querySelectorAll("input, select, textarea").forEach(function (input) {
        if (!validateInput(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      // Honeypot: silently drop bot submissions
      var hp = form.querySelector('input[name="botcheck"]');
      if (hp && hp.value) return;

      var btn = form.querySelector('button[type="submit"]');
      var status = form.querySelector(".form-status");
      var originalLabel = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending\u2026"; }
      if (status) { status.classList.remove("visible"); status.textContent = ""; }

      var data = new FormData(form);
      data.append("access_key", WEB3FORMS_ACCESS_KEY);

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success) throw new Error("submit-failed");
          var panel = document.querySelector(form.getAttribute("data-confirm"));
          var wrapPanel = form.closest(".form-panel");
          if (panel) {
            if (wrapPanel) wrapPanel.style.display = "none";
            panel.classList.add("visible");
            panel.setAttribute("tabindex", "-1");
            panel.focus();
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = "Something went wrong sending your request. Try again, or email pacific.black.transport@gmail.com directly.";
            status.classList.add("visible");
          }
          if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        });
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
