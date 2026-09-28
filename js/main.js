// the whole show, no dependencies. each block below is independent, so a failure in one leaves the rest alone.
(function () {
        "use strict";

        var root = document.documentElement;
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var $ = function (s, el) { return (el || document).querySelector(s); };
        var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

        /* ---------- theme toggle ---------- */
        var toggle = $(".theme-toggle");
        function currentTheme() {
                return root.dataset.theme ||
                        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        }
        function labelToggle() {
                // the label names what a click will do, not what's showing now
                toggle.setAttribute("aria-label", currentTheme() === "dark" ? "Switch to light theme" : "Switch to dark theme");
        }
        if (toggle) {
                labelToggle();
                toggle.addEventListener("click", function () {
                        var next = currentTheme() === "dark" ? "light" : "dark";
                        root.dataset.theme = next;
                        labelToggle();
                        try { localStorage.setItem("theme", next); } catch (e) { /* private mode: fine, just won't persist */ }
                });
        }

        /* ---------- nav: frosted after the hero, and which section am I in ---------- */
        var nav = $(".nav");
        var hero = $(".hero");
        function onScroll() {
                if (!nav || !hero) return;
                nav.classList.toggle("is-scrolled", window.scrollY > hero.offsetHeight - 80);
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        var navLinks = $$(".nav nav a");
        if ("IntersectionObserver" in window) {
                var sectionObserver = new IntersectionObserver(function (entries) {
                        entries.forEach(function (entry) {
                                if (!entry.isIntersecting) return;
                                navLinks.forEach(function (a) {
                                        a.classList.toggle("is-current", a.getAttribute("href") === "#" + entry.target.id);
                                });
                        });
                }, { rootMargin: "-45% 0px -50% 0px" });
                navLinks.forEach(function (a) {
                        var target = $(a.getAttribute("href"));
                        if (target) sectionObserver.observe(target);
                });
        }

        /* ---------- scroll reveals and counters ---------- */
        function countUp(el) {
                var end = parseInt(el.dataset.count, 10);
                if (reduceMotion || !end) return;
                var start = performance.now();
                var dur = 1400 + Math.min(end, 3000) / 3;
                (function tick(now) {
                        var p = Math.min((now - start) / dur, 1);
                        var eased = 1 - Math.pow(1 - p, 4);
                        el.textContent = Math.round(end * eased).toLocaleString("en-US");
                        if (p < 1) requestAnimationFrame(tick);
                })(start);
        }

        if ("IntersectionObserver" in window) {
                var revealObserver = new IntersectionObserver(function (entries) {
                        entries.forEach(function (entry) {
                                if (!entry.isIntersecting) return;
                                entry.target.classList.add("is-visible");
                                $$("[data-count]", entry.target).forEach(countUp);
                                revealObserver.unobserve(entry.target);
                        });
                }, { threshold: 0.12 });

                // siblings arrive one after another rather than all at once
                $$(".reveal").forEach(function (el) {
                        var siblings = $$(":scope > .reveal", el.parentElement);
                        el.style.transitionDelay = Math.min(siblings.indexOf(el), 6) * 70 + "ms";
                        revealObserver.observe(el);
                });

        } else {
                $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
        }

        /* ---------- the work list and the map light each other up ---------- */
        var builds = $$(".build");
        var pins = $$(".pin");
        var scrolledTo = null; // the entry in the middle of the screen, which is what shows when nothing is hovered
        function show(build) {
                builds.forEach(function (b) { b.classList.toggle("is-active", b === build); });
                pins.forEach(function (p) { p.classList.toggle("is-active", !!build && p.dataset.pin === build.dataset.pin); });
        }
        builds.forEach(function (b) {
                b.addEventListener("pointerenter", function () { show(b); });
                b.addEventListener("pointerleave", function () { show(scrolledTo); });
        });
        // hovering a pin picks the first entry for that country
        pins.forEach(function (p) {
                p.addEventListener("pointerenter", function () {
                        show(builds.filter(function (b) { return b.dataset.pin === p.dataset.pin; })[0]);
                });
                p.addEventListener("pointerleave", function () { show(scrolledTo); });
        });
        if ("IntersectionObserver" in window) {
                var middle = new IntersectionObserver(function (entries) {
                        entries.forEach(function (entry) {
                                if (entry.isIntersecting) scrolledTo = entry.target;
                                else if (scrolledTo === entry.target) scrolledTo = null;
                        });
                        show(scrolledTo);
                }, { rootMargin: "-45% 0px -45% 0px" });
                builds.forEach(function (b) { middle.observe(b); });
        }

        /* ---------- toast ---------- */
        var toast = $(".toast");
        var toastTimer;
        function say(msg) {
                if (!toast) return;
                toast.textContent = msg;
                toast.classList.add("is-on");
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 3200);
        }

        /* ---------- the white snake ---------- */
        var canvas = $(".hero-canvas");
        if (!canvas || !hero || !canvas.getContext) return;
        var ctx = canvas.getContext("2d");
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0;
        var stars = [];
        var sparks = [];
        var SEGMENTS = 36;
        var SPACING = 9;
        var scale = 1;
        var body = [];

        // the glow is drawn once into a sprite and stamped per segment; shadowBlur every frame is too slow on phones
        var sprite = document.createElement("canvas");
        sprite.width = sprite.height = 64;
        (function () {
                var s = sprite.getContext("2d");
                s.shadowColor = "rgba(150, 240, 205, 0.85)";
                s.shadowBlur = 16;
                s.fillStyle = "#f4f1ea";
                s.beginPath();
                s.arc(32, 32, 12, 0, Math.PI * 2);
                s.fill();
        })();
        var pointer = { x: 0, y: 0, at: -1e9 };
        var rainbowUntil = 0;
        var running = true;
        var hint = $(".hint");

        function resize() {
                var r = hero.getBoundingClientRect();
                W = r.width;
                H = r.height;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                var count = Math.round((W * H) / 9000);
                stars = [];
                for (var s = 0; s < count; s++) {
                        stars.push({
                                x: Math.random() * W,
                                y: Math.random() * H,
                                r: Math.random() * 1.2 + 0.2,
                                phase: Math.random() * Math.PI * 2,
                                speed: 0.6 + Math.random() * 1.6
                        });
                }

                // a smaller snake on narrow screens, where the text takes the full width
                scale = W > 900 ? 1 : 0.65;
                SPACING = 9 * scale;

                if (!body.length) {
                        var start = idleTarget(0);
                        for (var b = 0; b < SEGMENTS; b++) body.push({ x: start.x - b * SPACING, y: start.y });
                }
        }

        function idleTarget(t) {
                if (W > 900) {
                        // a lazy figure-of-eight in the right-hand third, clear of the text column
                        return {
                                x: W * 0.8 + Math.sin(t * 0.00055) * Math.min(W * 0.1, 140),
                                y: H * 0.42 + Math.sin(t * 0.0011) * Math.min(H * 0.2, 160)
                        };
                }
                // narrow screens: meander along the bottom edge, under the buttons
                return {
                        x: W * 0.5 + Math.sin(t * 0.0005) * W * 0.36,
                        y: H - 34 + Math.sin(t * 0.0013) * 10
                };
        }

        function colourAt(i, t) {
                if (t < rainbowUntil) return "hsl(" + ((t / 8 + i * 12) % 360) + " 90% 72%)";
                var a = 0.95 - (i / SEGMENTS) * 0.5;
                return "rgba(244, 241, 234, " + a + ")";
        }

        function drawStars(t) {
                for (var s = 0; s < stars.length; s++) {
                        var st = stars[s];
                        var twinkle = reduceMotion ? 0.7 : 0.45 + 0.55 * Math.sin(t * 0.001 * st.speed + st.phase);
                        ctx.globalAlpha = Math.max(0.08, twinkle) * 0.85;
                        ctx.beginPath();
                        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
                        ctx.fillStyle = "#e3f5ec";
                        ctx.fill();
                }
                ctx.globalAlpha = 1;
        }

        function drawSnake(t) {
                var head = body[0];
                var neck = body[1];
                var angle = Math.atan2(head.y - neck.y, head.x - neck.x);

                var rainbow = t < rainbowUntil;
                for (var i = SEGMENTS - 1; i >= 0; i--) {
                        var p = body[i];
                        var k = 1 - i / SEGMENTS;
                        var radius = (1.4 + Math.pow(k, 0.8) * 7.6) * scale;
                        if (rainbow) {
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                                ctx.fillStyle = colourAt(i, t);
                                ctx.fill();
                        } else {
                                // the sprite's circle is 12px inside 64px, so size it to match the radius
                                var size = (radius / 12) * 64;
                                ctx.globalAlpha = 0.95 - (i / SEGMENTS) * 0.5;
                                ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
                        }
                }
                ctx.globalAlpha = 1;

                // a tongue, now and then
                if (Math.sin(t * 0.0021) > 0.93) {
                        var tx = head.x + Math.cos(angle) * 18 * scale;
                        var ty = head.y + Math.sin(angle) * 18 * scale;
                        var fork = 5 * scale;
                        ctx.strokeStyle = "#ff6b8b";
                        ctx.lineWidth = 1.4;
                        ctx.lineCap = "round";
                        ctx.beginPath();
                        ctx.moveTo(head.x + Math.cos(angle) * 8 * scale, head.y + Math.sin(angle) * 8 * scale);
                        ctx.lineTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(angle + 0.5) * fork, ty + Math.sin(angle + 0.5) * fork);
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(angle - 0.5) * fork, ty + Math.sin(angle - 0.5) * fork);
                        ctx.stroke();
                }

                // two small eyes, looking where it's going
                ctx.fillStyle = "#050b09";
                [-1, 1].forEach(function (side) {
                        var ex = head.x + (Math.cos(angle) * 3 + Math.cos(angle + side * Math.PI / 2) * 3.6) * scale;
                        var ey = head.y + (Math.sin(angle) * 3 + Math.sin(angle + side * Math.PI / 2) * 3.6) * scale;
                        ctx.beginPath();
                        ctx.arc(ex, ey, 1.5 * scale, 0, Math.PI * 2);
                        ctx.fill();
                });
        }

        function drawSparks() {
                for (var s = sparks.length - 1; s >= 0; s--) {
                        var sp = sparks[s];
                        sp.x += sp.vx;
                        sp.y += sp.vy;
                        sp.life -= 0.02;
                        if (sp.life <= 0) { sparks.splice(s, 1); continue; }
                        ctx.globalAlpha = sp.life;
                        ctx.fillStyle = sp.colour;
                        ctx.beginPath();
                        ctx.arc(sp.x, sp.y, sp.r * sp.life, 0, Math.PI * 2);
                        ctx.fill();
                }
                ctx.globalAlpha = 1;
        }

        function step(t) {
                var target = t - pointer.at < 3500 ? pointer : idleTarget(t);
                var head = body[0];
                var dx = target.x - head.x;
                var dy = target.y - head.y;
                var dist = Math.hypot(dx, dy);
                var speed = Math.min(dist * 0.07, 13);

                if (dist > 1) {
                        var nx = dx / dist, ny = dy / dist;
                        // the slither: a little side-to-side on top of the chase
                        var wiggle = Math.sin(t * 0.012) * Math.min(speed, 4) * 0.5;
                        head.x += nx * speed - ny * wiggle;
                        head.y += ny * speed + nx * wiggle;
                }

                for (var i = 1; i < SEGMENTS; i++) {
                        var prev = body[i - 1], cur = body[i];
                        var ddx = prev.x - cur.x, ddy = prev.y - cur.y;
                        var len = Math.hypot(ddx, ddy) || 1;
                        if (len > SPACING) {
                                cur.x = prev.x - (ddx / len) * SPACING;
                                cur.y = prev.y - (ddy / len) * SPACING;
                        }
                }

                if (speed > 6 && sparks.length < 80) {
                        sparks.push({
                                x: body[SEGMENTS - 1].x, y: body[SEGMENTS - 1].y,
                                vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
                                r: Math.random() * 1.8 + 0.6, life: 1,
                                colour: t < rainbowUntil ? colourAt(Math.random() * 36, t) : "#c9f7e3"
                        });
                }
        }

        function frame(t) {
                if (!running) return;
                ctx.clearRect(0, 0, W, H);
                drawStars(t);
                step(t);
                drawSparks();
                drawSnake(t);
                requestAnimationFrame(frame);
        }

        function start() {
                if (running || reduceMotion) return;
                running = true;
                requestAnimationFrame(frame);
        }

        resize();
        window.addEventListener("resize", function () {
                clearTimeout(resize.t);
                resize.t = setTimeout(resize, 150);
        });

        hero.addEventListener("pointermove", function (e) {
                var r = hero.getBoundingClientRect();
                pointer.x = e.clientX - r.left;
                pointer.y = e.clientY - r.top;
                pointer.at = performance.now();
                if (hint && !hint.classList.contains("is-gone")) {
                        setTimeout(function () { hint.classList.add("is-gone"); }, 1800);
                }
        });

        if (reduceMotion) {
                // one still frame: stars and a snake resting in an S
                running = false;
                var rest = idleTarget(0);
                for (var i = 0; i < SEGMENTS; i++) {
                        body[i].x = rest.x + (18 - i) * 7 * scale;
                        body[i].y = rest.y + Math.sin(i / 5) * 26 * scale;
                }
                drawStars(0);
                drawSnake(0);
        } else {
                requestAnimationFrame(frame);
                if ("IntersectionObserver" in window) {
                        new IntersectionObserver(function (entries) {
                                if (entries[0].isIntersecting && !document.hidden) start();
                                else running = false;
                        }).observe(hero);
                }
                document.addEventListener("visibilitychange", function () {
                        if (document.hidden) running = false;
                        else if (hero.getBoundingClientRect().bottom > 0) start();
                });
        }

        /* ---------- type "snake" ---------- */
        var typedKeys = "";
        document.addEventListener("keydown", function (e) {
                if (e.key.length !== 1) return;
                typedKeys = (typedKeys + e.key.toLowerCase()).slice(-5);
                if (typedKeys === "snake") {
                        rainbowUntil = performance.now() + 8000;
                        say("sssss… you found the snake 🐍");
                        if (window.scrollY > hero.offsetHeight / 2) {
                                window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                        }
                }
        });
})();
