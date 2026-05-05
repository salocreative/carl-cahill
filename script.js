/**
 * Carl Cahill — portfolio interactions.
 *
 *   1. Fade the fixed hero portrait out as the user scrolls past the
 *      banner. Driven by the `--hero-opacity` custom property so the
 *      transition stays on the GPU.
 *   2. Reveal each `.reveal` element on first intersection (fade up).
 *   3. Split each `.title-reveal` into per-character spans and ease
 *      them in with a blur on the same first intersection.
 *   4. Cursor halo — brighten/expand the dotted background dots
 *      within ~180px of the pointer. The base dot grid lives on
 *      the body's CSS bg; this just overlays a canvas that paints
 *      enhanced dots near the cursor.
 *   5. Magnetic pull on footer social links — the icons gently
 *      lean toward the cursor when it's nearby.
 *   6. SALO watermark — purple spotlight clipped to the logo shape,
 *      follows the cursor inside `.salo-callout`.
 *   7. Cookie consent banner — Google Consent Mode v2 + GA4 (see index.html).
 *
 * All effects respect `prefers-reduced-motion`.
 */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const hoverCapable =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover)").matches;

  /* -------------------------------------------------------------
   * 1. Scroll-tied hero opacity
   * ----------------------------------------------------------- */
  const heroBg = document.querySelector(".hero-bg");

  if (heroBg && !prefersReducedMotion) {
    let ticking = false;
    let lastOpacity = 1;

    const updateHeroOpacity = () => {
      const viewport = window.innerHeight;
      // The hero sits behind the banner (which is full viewport
      // height). Fade it out across the first viewport of scroll.
      const progress = Math.min(Math.max(window.scrollY / viewport, 0), 1);
      const opacity = 1 - progress;

      if (Math.abs(opacity - lastOpacity) > 0.005) {
        heroBg.style.setProperty("--hero-opacity", opacity.toFixed(3));
        lastOpacity = opacity;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeroOpacity);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateHeroOpacity();
  }

  /* -------------------------------------------------------------
   * 1d. Brand showcase marquees
   *
   * Each `.device-strip__track` gets its children cloned once so
   * the visible content is doubled. CSS then translates the track
   * by 50% of its own width — at the end of one cycle we're
   * looking at the cloned half, which is identical to the start,
   * so the loop reads as seamless. The `is-marquee` class on the
   * row gates the animation until cloning has actually happened
   * (avoids a flash of the half-content state).
   * ----------------------------------------------------------- */
  const marqueeTracks = document.querySelectorAll(".device-strip__track");

  marqueeTracks.forEach((track) => {
    const items = Array.from(track.children);
    items.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      // Strip duplicate alt text / IDs from the clone so the
      // accessibility tree stays clean.
      clone.querySelectorAll("img").forEach((img) => {
        img.setAttribute("alt", "");
      });
      track.appendChild(clone);
    });
    if (track.parentElement) {
      track.parentElement.classList.add("is-marquee");
    }
  });

  /* -------------------------------------------------------------
   * Vimeo testimonial — let the page scroll through the embed until
   * the user clicks. Embedded players often capture wheel/trackpad,
   * which reads as a sticky frame or erratic scroll position.
   * ----------------------------------------------------------- */
  const testimonialFrame = document.querySelector(
    ".testimonial-video-section__frame"
  );
  if (testimonialFrame) {
    testimonialFrame.addEventListener(
      "click",
      () => {
        testimonialFrame.classList.add("is-interactive");
      },
      { once: true }
    );
  }

  /* -------------------------------------------------------------
   * 1c. SALO watermark — sweeps right → left across the section
   *
   * Maps the section's progress through the viewport (0 when its
   * top first crosses the bottom edge, 1 when its bottom clears
   * the top edge) onto an X translation that runs from off-screen
   * right to off-screen left, so the giant outlined logo scrubs
   * across as the user scrolls past.
   * ----------------------------------------------------------- */
  const saloSection = document.querySelector(".salo-callout");
  const saloBg = saloSection && saloSection.querySelector(".salo-callout__bg");

  if (saloSection && saloBg && !prefersReducedMotion) {
    let saloTicking = false;
    let lastSaloX = null;

    const updateSalo = () => {
      const rect = saloSection.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // Section progress through the viewport, 0..1.
      const total = viewportH + rect.height;
      const passed = viewportH - rect.top;
      const progress = Math.max(0, Math.min(1, passed / total));

      const sectionW = saloSection.clientWidth;
      const svgW = saloBg.clientWidth || sectionW;
      // Half-range of the symmetric sweep — at progress 0 the
      // logo's centre sits half-section + half-svg to the right
      // of the section's centre (fully off-screen right); at
      // progress 1 it's the same distance to the left.
      const half = (sectionW + svgW) / 2;
      const x = (1 - 2 * progress) * half;

      if (lastSaloX === null || Math.abs(x - lastSaloX) > 0.5) {
        saloBg.style.setProperty("--salo-x", `${x.toFixed(1)}px`);
        lastSaloX = x;
      }
      saloTicking = false;
    };

    const onSaloScroll = () => {
      if (!saloTicking) {
        window.requestAnimationFrame(updateSalo);
        saloTicking = true;
      }
    };

    window.addEventListener("scroll", onSaloScroll, { passive: true });
    window.addEventListener("resize", onSaloScroll, { passive: true });
    updateSalo();
  }

  /* -------------------------------------------------------------
   * 1c-bis. SALO watermark — purple cursor spotlight inside shape
   *
   * Projects pointer coords through the SVG's screen CTM into the
   * logo's viewBox space, lerps the spotlight position for an easy
   * trailing feel, and clips both circles with the filled-letter
   * silhouette so purple never spills outside SALO.
   * ----------------------------------------------------------- */
  const saloCursorLayer =
    saloBg && saloBg.querySelector(".salo-callout__cursor-layer");
  const saloCursorFollow =
    saloBg && saloBg.querySelector(".salo-callout__cursor-follow");

  if (
    saloSection &&
    saloBg &&
    saloCursorLayer &&
    saloCursorFollow &&
    !prefersReducedMotion &&
    hoverCapable
  ) {
    const VIEW_W = 103.293;
    const VIEW_H = 29.9979;
    const CX = VIEW_W / 2;
    const CY = VIEW_H / 2;
    const LERP = 0.22;

    let targetX = CX;
    let targetY = CY;
    let curX = CX;
    let curY = CY;
    let rafId = null;

    const toSvgPoint = (clientX, clientY) => {
      if (typeof saloBg.createSVGPoint !== "function") return null;
      const pt = saloBg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = saloBg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    };

    const tick = () => {
      rafId = null;
      curX += (targetX - curX) * LERP;
      curY += (targetY - curY) * LERP;
      saloCursorFollow.setAttribute(
        "transform",
        `translate(${curX.toFixed(3)} ${curY.toFixed(3)})`
      );
      if (
        Math.abs(targetX - curX) > 0.03 ||
        Math.abs(targetY - curY) > 0.03
      ) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (rafId === null) rafId = window.requestAnimationFrame(tick);
    };

    saloSection.addEventListener(
      "mousemove",
      (e) => {
        const p = toSvgPoint(e.clientX, e.clientY);
        if (!p) return;
        targetX = p.x;
        targetY = p.y;
        saloCursorLayer.classList.remove("is-idle");
        schedule();
      },
      { passive: true }
    );

    saloSection.addEventListener("mouseleave", () => {
      saloCursorLayer.classList.add("is-idle");
    });
  }

  /* -------------------------------------------------------------
   * 1b. Scroll-tied phone traverse on each .achievement__row
   *
   * As an achievement scrolls through the viewport, the phone
   * graphic translates horizontally from its rest position on the
   * right across the title text and off to the left. The animation
   * is driven by a single `--phone-x` custom property on each
   * `.achievement__phone` so the transform stays on the GPU.
   * ----------------------------------------------------------- */
  const achievementPhones = Array.from(
    document.querySelectorAll(".achievement__phone")
  );

  if (achievementPhones.length && !prefersReducedMotion) {
    let phoneTicking = false;
    const lastState = new WeakMap();
    // Resting tilt of the phone (matches the CSS default for
    // .phone--tilted). The phone unrotates to 0deg as it traverses.
    const REST_ROTATION = 30;

    const updatePhones = () => {
      const viewportH = window.innerHeight;
      // Animation plays out over 1.4 viewport heights of scroll
      // centred on the row, so the phone is mid-text when the row
      // sits at the centre of the viewport.
      const animSpan = viewportH * 1.4;

      for (const phone of achievementPhones) {
        const row = phone.parentElement;
        if (!row) continue;

        const rect = row.getBoundingClientRect();
        const rowCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportH / 2;
        // -1 when row is fully below centre, +1 when fully above.
        const offset = (viewportCenter - rowCenter) / (animSpan / 2);
        const progress = Math.max(0, Math.min(1, (offset + 1) / 2));

        // Travel distance: span the row width plus the phone's own
        // width so it fully clears the title on both ends.
        const rowWidth = row.clientWidth;
        const phoneWidth = phone.offsetWidth || 220;
        const travel = rowWidth + phoneWidth;

        const x = -progress * travel;
        const rotation = (1 - progress) * REST_ROTATION;

        const prev = lastState.get(phone);
        if (
          !prev ||
          Math.abs(x - prev.x) > 0.5 ||
          Math.abs(rotation - prev.rotation) > 0.1
        ) {
          phone.style.setProperty("--phone-x", `${x.toFixed(1)}px`);
          phone.style.setProperty("--phone-rotate", `${rotation.toFixed(2)}deg`);
          lastState.set(phone, { x, rotation });
        }
      }

      phoneTicking = false;
    };

    const onPhoneScroll = () => {
      if (!phoneTicking) {
        window.requestAnimationFrame(updatePhones);
        phoneTicking = true;
      }
    };

    window.addEventListener("scroll", onPhoneScroll, { passive: true });
    window.addEventListener("resize", onPhoneScroll, { passive: true });
    updatePhones();
  }

  /* -------------------------------------------------------------
   * 1e. Dotted-background cursor halo
   *
   * The body paints a faint dotted grid via CSS background. This
   * canvas overlays a brighter, larger dot at every grid position
   * within `INFLUENCE` of the pointer. Smoothstep falloff makes
   * the highlight bloom out gently rather than cutting at the
   * edge. The halo lerps toward the raw cursor each frame so
   * fast mouse movement reads as a soft trail.
   *
   * Aligned to the same world grid as the CSS background (28px
   * spacing, dots centred on 14, 14) so canvas dots overlay the
   * CSS dots cleanly. Because CSS dots scroll with the page and
   * the canvas is screen-fixed, we re-render on scroll too.
   * ----------------------------------------------------------- */
  const dotCursor = document.querySelector(".dot-cursor");

  if (dotCursor && !prefersReducedMotion && hoverCapable) {
    const ctx = dotCursor.getContext("2d");

    // Pull spacing from the same custom property the CSS uses, so
    // the two layers stay aligned if we ever tune the grid.
    const cssSpacing = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--dot-spacing")
    );
    const SPACING = Number.isFinite(cssSpacing) && cssSpacing > 0 ? cssSpacing : 28;
    const HALF = SPACING / 2;

    // The halo expands when the cursor moves fast and recovers
    // when it settles. Influence is lerped between these two
    // bounds; the "speed" signal is the lerp lag itself (see the
    // draw loop). LAG_MAX is the lag distance at which the halo
    // hits its largest size — anything beyond saturates.
    const INFLUENCE_BASE = 180;
    const INFLUENCE_MAX = 360;
    const LAG_MAX = 200;
    const INFLUENCE_LERP = 0.2;

    const MAX_RADIUS = 3.2;
    const MAX_ALPHA = 0.55;
    const LERP = 0.18;

    // Off-screen "no cursor yet" sentinel.
    const FAR = -10000;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let viewW = 0;
    let viewH = 0;
    let targetX = FAR;
    let targetY = FAR;
    let lerpedX = FAR;
    let lerpedY = FAR;
    let renderInfluence = INFLUENCE_BASE;
    let rafId = null;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      dotCursor.width = Math.round(viewW * dpr);
      dotCursor.height = Math.round(viewH * dpr);
      dotCursor.style.width = viewW + "px";
      dotCursor.style.height = viewH + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    };

    const draw = () => {
      rafId = null;
      ctx.clearRect(0, 0, viewW, viewH);

      // Lerp render cursor toward the target. When the pointer is
      // off-screen (FAR), this fades the halo gracefully out.
      lerpedX += (targetX - lerpedX) * LERP;
      lerpedY += (targetY - lerpedY) * LERP;

      // Speed-tied halo bloom. While the pointer moves fast the
      // lerp lags behind it; that lag is a good proxy for speed.
      // Map it to a target influence radius and lerp toward that
      // so the bloom and recovery both feel inertial. Skip the
      // boost while the pointer is off-screen (sliding to FAR)
      // so the halo doesn't balloon as it exits.
      const onScreen = targetX > -1000;
      const lagDist = onScreen
        ? Math.min(LAG_MAX, Math.hypot(targetX - lerpedX, targetY - lerpedY))
        : 0;
      const speedT = lagDist / LAG_MAX;
      const targetInfluence =
        INFLUENCE_BASE + (INFLUENCE_MAX - INFLUENCE_BASE) * speedT;
      renderInfluence += (targetInfluence - renderInfluence) * INFLUENCE_LERP;
      const influence = renderInfluence;

      // CSS dots are positioned in document/world coords. Convert
      // the (screen-coord) cursor to world coords to find which
      // dots fall inside the influence radius.
      const sx = window.scrollX;
      const sy = window.scrollY;
      const wcx = lerpedX + sx;
      const wcy = lerpedY + sy;

      const minN = Math.floor((wcx - influence - HALF) / SPACING);
      const maxN = Math.ceil((wcx + influence - HALF) / SPACING);
      const minM = Math.floor((wcy - influence - HALF) / SPACING);
      const maxM = Math.ceil((wcy + influence - HALF) / SPACING);

      for (let m = minM; m <= maxM; m++) {
        const wy = m * SPACING + HALF;
        const screenY = wy - sy;
        if (screenY < -SPACING || screenY > viewH + SPACING) continue;

        for (let n = minN; n <= maxN; n++) {
          const wx = n * SPACING + HALF;
          const screenX = wx - sx;
          if (screenX < -SPACING || screenX > viewW + SPACING) continue;

          const dx = wx - wcx;
          const dy = wy - wcy;
          const dist = Math.hypot(dx, dy);
          if (dist >= influence) continue;

          // Smoothstep falloff (3t² - 2t³).
          let t = 1 - dist / influence;
          t = t * t * (3 - 2 * t);
          if (t < 0.01) continue;

          const r = t * MAX_RADIUS;
          const a = t * MAX_ALPHA;
          ctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Keep ticking until both the cursor lerp AND the influence
      // lerp have settled — otherwise a fast flick that ends with
      // the cursor stationary would freeze with a bloated halo.
      const dxL = targetX - lerpedX;
      const dyL = targetY - lerpedY;
      const dInfluence = targetInfluence - renderInfluence;
      if (
        Math.abs(dxL) > 0.4 ||
        Math.abs(dyL) > 0.4 ||
        Math.abs(dInfluence) > 0.5
      ) {
        schedule();
      }
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(draw);
    };

    window.addEventListener(
      "mousemove",
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        // First time we see a real cursor, snap the lerp to it
        // instead of sliding from FAR — avoids a comet trail on
        // page load.
        if (lerpedX === FAR) {
          lerpedX = targetX;
          lerpedY = targetY;
        }
        schedule();
      },
      { passive: true }
    );

    document.addEventListener("mouseleave", () => {
      targetX = FAR;
      targetY = FAR;
      schedule();
    });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize);
    resize();
  }

  /* -------------------------------------------------------------
   * 1f. Magnetic social-link pull
   *
   * Footer icons (LinkedIn, Dribbble) lean toward the cursor when
   * it's within ~120px of their centre. The translation is capped
   * so the icon never wanders too far from its origin, and we
   * lerp per-element for a soft, slightly delayed pull.
   * ----------------------------------------------------------- */
  const magneticTargets = document.querySelectorAll("[data-magnetic]");

  if (magneticTargets.length && !prefersReducedMotion && hoverCapable) {
    const PULL_RADIUS = 120;
    const MAX_PULL = 14;
    const LERP = 0.18;

    const states = new Map();
    let pointerX = -10000;
    let pointerY = -10000;
    let rafId = null;

    magneticTargets.forEach((el) => {
      states.set(el, { x: 0, y: 0, tx: 0, ty: 0 });
    });

    const tick = () => {
      rafId = null;
      let stillSettling = false;

      states.forEach((s, el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = pointerX - cx;
        const dy = pointerY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < PULL_RADIUS) {
          // Smoothstep so the icon eases into the pull rather
          // than snapping at the edge of the radius.
          let t = 1 - dist / PULL_RADIUS;
          t = t * t * (3 - 2 * t);
          s.tx = (dx / PULL_RADIUS) * MAX_PULL * t;
          s.ty = (dy / PULL_RADIUS) * MAX_PULL * t;
        } else {
          s.tx = 0;
          s.ty = 0;
        }

        s.x += (s.tx - s.x) * LERP;
        s.y += (s.ty - s.y) * LERP;

        if (Math.abs(s.tx - s.x) > 0.1 || Math.abs(s.ty - s.y) > 0.1) {
          stillSettling = true;
        }

        el.style.setProperty("--magnet-x", s.x.toFixed(2) + "px");
        el.style.setProperty("--magnet-y", s.y.toFixed(2) + "px");
      });

      if (stillSettling) schedule();
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener(
      "mousemove",
      (e) => {
        pointerX = e.clientX;
        pointerY = e.clientY;
        schedule();
      },
      { passive: true }
    );

    document.addEventListener("mouseleave", () => {
      pointerX = -10000;
      pointerY = -10000;
      schedule();
    });

    window.addEventListener("scroll", schedule, { passive: true });
  }

  /* -------------------------------------------------------------
   * 2. Title character-by-character reveal prep
   *
   * Walks each `.title-reveal` element, replacing every text node
   * with one `<span class="char">` per visible character. Inline
   * elements (e.g. <br>, <u>) are preserved. Each char gets a
   * `--char-i` index that the CSS turns into a transition delay so
   * the cascade is purely declarative.
   * ----------------------------------------------------------- */
  const splitTitle = (root) => {
    let charIndex = 0;

    const splitTextNode = (textNode) => {
      // Collapse whitespace the way the browser would when laying
      // out inline text (otherwise indented HTML produces a stagger
      // for every newline character).
      const text = textNode.textContent.replace(/\s+/g, " ");
      if (!text) return null;

      const fragment = document.createDocumentFragment();
      // Split on runs of whitespace so we can keep the whitespace
      // between words intact. Words are wrapped in a `.word` so
      // they never break mid-character when the line wraps.
      const parts = text.split(/(\s+)/);

      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          continue;
        }

        const wordSpan = document.createElement("span");
        wordSpan.className = "word";
        wordSpan.setAttribute("aria-hidden", "true");

        for (const ch of part) {
          const charSpan = document.createElement("span");
          charSpan.className = "char";
          charSpan.style.setProperty("--char-i", charIndex++);
          charSpan.textContent = ch;
          wordSpan.appendChild(charSpan);
        }

        fragment.appendChild(wordSpan);
      }
      return fragment;
    };

    const walk = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = splitTextNode(child);
          if (fragment) child.replaceWith(fragment);
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          child.nodeName !== "BR"
        ) {
          walk(child);
        }
      }
    };

    // Preserve the original text for screen readers; the visual
    // chars/words are aria-hidden, so the heading still reads
    // naturally.
    if (!root.hasAttribute("aria-label")) {
      root.setAttribute("aria-label", root.textContent.trim());
    }
    walk(root);
    root.style.setProperty("--char-count", charIndex);
  };

  const titles = document.querySelectorAll(".title-reveal");
  if (!prefersReducedMotion) {
    titles.forEach(splitTitle);
  }

  /* -------------------------------------------------------------
   * 3. Fade-up + title reveal observer
   *
   * Reveal classes are toggled (not just added) on every
   * intersection change, so elements fade in when they enter the
   * viewport and fade out when they leave — and replay both ways
   * as the user scrolls back and forth.
   * ----------------------------------------------------------- */
  const revealTargets = document.querySelectorAll(".reveal, .title-reveal");

  if (prefersReducedMotion) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        // Trigger slightly before the element fully enters/leaves so
        // the fade-up reads naturally. A symmetric inset on top and
        // bottom keeps enter and exit timing balanced.
        rootMargin: "-8% 0px -8% 0px",
        threshold: 0,
      }
    );

    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* -------------------------------------------------------------
   * Cookie consent (Google Consent Mode v2)
   *
   * Default denied state & measurement ID are set in <head> before
   * gtag loads. LocalStorage key must stay in sync: cc_cookie_consent.
   * ----------------------------------------------------------- */
  const CONSENT_STORAGE_KEY = "cc_cookie_consent";

  const consentGranted = () => ({
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });

  const consentDenied = () => ({
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });

  const applyGtagConsent = (payload) => {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", payload);
    }
  };

  const hideCookieBanner = (banner) => {
    if (!banner) return;
    banner.hidden = true;
    banner.setAttribute("aria-hidden", "true");
  };

  const showCookieBanner = (banner, acceptBtn) => {
    if (!banner) return;
    banner.hidden = false;
    banner.setAttribute("aria-hidden", "false");
    acceptBtn && acceptBtn.focus();
  };

  const banner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("cookie-accept");
  const rejectBtn = document.getElementById("cookie-reject");

  if (banner && acceptBtn && rejectBtn) {
    let stored = null;
    try {
      stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch (e) {
      /* private mode / security */
    }

    if (stored === null) {
      showCookieBanner(banner, acceptBtn);
    }

    acceptBtn.addEventListener("click", () => {
      try {
        localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
      } catch (e) {}
      applyGtagConsent(consentGranted());
      hideCookieBanner(banner);
    });

    rejectBtn.addEventListener("click", () => {
      try {
        localStorage.setItem(CONSENT_STORAGE_KEY, "denied");
      } catch (e) {}
      applyGtagConsent(consentDenied());
      hideCookieBanner(banner);
    });

    document.querySelectorAll(".cookie-prefs-trigger").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          localStorage.removeItem(CONSENT_STORAGE_KEY);
        } catch (err) {}
        applyGtagConsent(consentDenied());
        showCookieBanner(banner, acceptBtn);
      });
    });
  }
})();
