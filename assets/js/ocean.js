/* ==========================================================================
   PACIFIC BLACK TRANSPORT — ocean.js
   Interactive canvas hero: "Pacific Nocturne"

   · Layered ocean waves drawn to a full-bleed canvas (never crops — it
     draws to whatever size the hero is, on any screen).
   · Moon + moonlight path rendered in canvas, so the moon is always
     correctly placed. Height is tunable per page via data-moon.
   · Pointer/touch displaces the water and leaves a short fading wake.
   · Accent tint is read from the page's --accent CSS variable.
   · Respects prefers-reduced-motion: renders ONE static frame, no loop.
   · Pauses when scrolled out of view and when the tab is hidden.
   · No libraries. ~6KB.

   USAGE (in each page's hero, replacing the <img>):
     <div class="hero-media">
       <canvas class="ocean-canvas" data-moon="0.30" data-skyline="1"></canvas>
     </div>
   Attributes (both optional):
     data-moon    — 0..1 vertical position of the moon (0.30 = upper third)
     data-skyline — "1" to draw a distant LA skyline silhouette (homepage)
   ========================================================================== */
(function () {
  "use strict";

  var canvases = document.querySelectorAll("canvas.ocean-canvas");
  if (!canvases.length) return;

  var motionOK = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  /* Read a CSS custom property as an {r,g,b} triple */
  function readColor(el, prop, fallback) {
    var v = getComputedStyle(el).getPropertyValue(prop).trim();
    if (!v) return fallback;
    if (v[0] === "#") {
      var h = v.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    var m = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return fallback;
  }

  function rgba(c, a) {
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
  }

  function initOcean(canvas) {
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var accent = readColor(document.body, "--accent", { r: 201, g: 205, b: 211 });
    var white  = { r: 245, g: 245, b: 243 };

    var moonY01   = parseFloat(canvas.getAttribute("data-moon")) || 0.30;
    var skylineOn = canvas.getAttribute("data-skyline") === "1";

    var W = 0, H = 0, dpr = 1;
    var t = 0;                 /* animation clock */
    var running = false;
    var visible = true;
    var rafId = null;

    /* Pointer state — target vs. eased actual, so motion feels like water */
    var ptr = { x: -9999, y: -9999, ax: -9999, ay: -9999, power: 0, tPower: 0 };
    var wake = [];             /* short trail of recent pointer positions */

    /* Wave layer definitions: far (small, dim) → near (tall, brighter) */
    var LAYERS = [
      { y: 0.60, amp: 10, len: 0.9,  speed: 0.10, alpha: 0.10, fill: 0.00 },
      { y: 0.68, amp: 15, len: 0.65, speed: 0.15, alpha: 0.14, fill: 0.02 },
      { y: 0.77, amp: 21, len: 0.48, speed: 0.22, alpha: 0.17, fill: 0.03 },
      { y: 0.88, amp: 28, len: 0.36, speed: 0.31, alpha: 0.20, fill: 0.05 }
    ];

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);   /* cap for perf */
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();                                            /* repaint immediately */
    }

    /* Vertical displacement from the pointer — a soft bump that falls off
       with distance, so the water "lifts" toward the cursor and settles. */
    function pointerLift(x, baseY) {
      if (ptr.power < 0.01) return 0;
      var dx = x - ptr.ax;
      var dy = baseY - ptr.ay;
      var d2 = dx * dx + dy * dy;
      var radius = 150;
      var fall = Math.exp(-d2 / (2 * radius * radius));
      return -fall * 26 * ptr.power;
    }

    function wakeLift(x, baseY) {
      var sum = 0;
      for (var i = 0; i < wake.length; i++) {
        var w = wake[i];
        var dx = x - w.x, dy = baseY - w.y;
        var d2 = dx * dx + dy * dy;
        var r = 90;
        sum += -Math.exp(-d2 / (2 * r * r)) * 14 * w.life;
      }
      return sum;
    }

    function drawMoon() {
      var mx = W * 0.66;
      var my = H * moonY01;
      var r  = Math.max(26, Math.min(W, H) * 0.045);

      /* Outer glow */
      var glow = ctx.createRadialGradient(mx, my, r * 0.4, mx, my, r * 6);
      glow.addColorStop(0, rgba(white, 0.20));
      glow.addColorStop(0.4, rgba(white, 0.05));
      glow.addColorStop(1, rgba(white, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, r * 6, 0, Math.PI * 2);
      ctx.fill();

      /* Disc */
      var disc = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r);
      disc.addColorStop(0, rgba(white, 0.95));
      disc.addColorStop(1, rgba(white, 0.72));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();

      return { x: mx, y: my, r: r };
    }

    /* The moonlight path: staggered horizontal glints below the moon that
       shimmer with the wave phase — the signature of the whole scene. */
    function drawMoonPath(moon) {
      var top = moon.y + moon.r * 2.2;
      if (top > H) return;
      var rows = 26;
      for (var i = 0; i < rows; i++) {
        var p = i / rows;
        var y = top + p * (H - top);
        var spread = moon.r * (1.6 + p * 9);
        var count = 2 + Math.floor(p * 5);
        for (var j = 0; j < count; j++) {
          var phase = t * (0.6 + p) + i * 1.7 + j * 2.3;
          var off = Math.sin(phase) * spread * 0.55;
          var len = (6 + Math.abs(Math.cos(phase)) * 34) * (0.4 + p);
          var a = (0.16 - p * 0.11) * (0.55 + 0.45 * Math.abs(Math.sin(phase * 0.8)));
          if (a <= 0.002) continue;
          ctx.strokeStyle = rgba(white, a);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(moon.x + off - len / 2, y);
          ctx.lineTo(moon.x + off + len / 2, y);
          ctx.stroke();
        }
      }
    }

    function drawSkyline(horizonY) {
      /* Distant, very low-contrast city silhouette sitting on the horizon */
      ctx.fillStyle = "rgba(255,255,255,0.030)";
      var x = 0;
      var seed = 12345;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      while (x < W) {
        var w = 12 + rnd() * 34;
        var h = 10 + rnd() * 60;
        ctx.fillRect(x, horizonY - h, w - 3, h);
        x += w;
      }
    }

    function drawWaves() {
      var step = 6;   /* sample spacing in px — lower = smoother, costlier */
      for (var li = 0; li < LAYERS.length; li++) {
        var L = LAYERS[li];
        var baseY = H * L.y;
        var k = (Math.PI * 2) / (W * L.len);

        ctx.beginPath();
        var firstY = 0;
        for (var x = 0; x <= W + step; x += step) {
          var y = baseY
            + Math.sin(x * k + t * L.speed) * L.amp
            + Math.sin(x * k * 2.3 + t * L.speed * 1.7) * (L.amp * 0.35)
            + pointerLift(x, baseY)
            + wakeLift(x, baseY);
          if (x === 0) { ctx.moveTo(x, y); firstY = y; }
          else ctx.lineTo(x, y);
        }

        /* Stroke the crest line in the page accent, very quietly */
        ctx.strokeStyle = rgba(accent, L.alpha);
        ctx.lineWidth = 1;
        ctx.stroke();

        /* Fill beneath the crest to build depth toward the bottom */
        if (L.fill > 0) {
          ctx.lineTo(W + step, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          ctx.fillStyle = rgba(accent, L.fill);
          ctx.fill();
        }
      }
    }

    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);

      /* Sky: near-black, slightly lifted toward the horizon */
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "rgba(255,255,255,0.00)");
      sky.addColorStop(0.55, "rgba(255,255,255,0.022)");
      sky.addColorStop(1, "rgba(255,255,255,0.00)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      var moon = drawMoon();
      if (skylineOn) drawSkyline(H * 0.60);
      drawMoonPath(moon);
      drawWaves();
    }

    function frame() {
      if (!running) return;
      t += 0.016;

      /* Ease the pointer so water responds smoothly, then settles */
      ptr.ax += (ptr.x - ptr.ax) * 0.12;
      ptr.ay += (ptr.y - ptr.ay) * 0.12;
      ptr.power += (ptr.tPower - ptr.power) * 0.06;

      /* Age the wake */
      for (var i = wake.length - 1; i >= 0; i--) {
        wake[i].life -= 0.02;
        if (wake[i].life <= 0) wake.splice(i, 1);
      }

      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || !motionOK) return;
      running = true;
      rafId = window.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    /* ---- Pointer / touch ---- */
    function setPointer(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      ptr.x = clientX - rect.left;
      ptr.y = clientY - rect.top;
      ptr.tPower = 1;
      if (wake.length === 0 ||
          Math.abs(ptr.x - wake[wake.length - 1].x) > 8 ||
          Math.abs(ptr.y - wake[wake.length - 1].y) > 8) {
        wake.push({ x: ptr.x, y: ptr.y, life: 1 });
        if (wake.length > 14) wake.shift();
      }
    }
    function clearPointer() { ptr.tPower = 0; }

    var host = canvas.parentNode || canvas;
    /* Listen on the hero section so the whole area is interactive, and use
       passive listeners so scrolling is never blocked on touch devices. */
    var area = canvas.closest(".hero") || host;
    area.addEventListener("mousemove", function (e) { setPointer(e.clientX, e.clientY); }, { passive: true });
    area.addEventListener("mouseleave", clearPointer, { passive: true });
    area.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    area.addEventListener("touchend", clearPointer, { passive: true });

    /* ---- Lifecycle: pause off-screen and when tab is hidden ---- */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0 }).observe(canvas);
    } else {
      start();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (visible) start();
    });

    /* ---- Resize (debounced) ---- */
    var rt = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(resize, 150);
    }, { passive: true });

    resize();
    if (motionOK) start();   /* reduced motion: the single resize() frame stands */
  }

  Array.prototype.forEach.call(canvases, initOcean);
})();
