// no dependencies. each block is independent and does nothing on pages without its elements.
(function () {
        "use strict";

        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        var $ = function (s, el) { return (el || document).querySelector(s); };
        var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

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

        /* ---------- command menu ---------- */
        var EMAIL = "davidokeke.c@gmail.com";
        var commands = [
                { group: "Go to", label: "Home", go: "/" },
                { group: "Go to", label: "About", go: "/about/" },
                { group: "Go to", label: "Work", go: "/work/" },
                { group: "Go to", label: "How I work", go: "/how-i-work/" },
                { group: "Get in touch", label: "Copy email address", hint: EMAIL, run: copyEmail },
                { group: "Get in touch", label: "Send an email", go: "mailto:" + EMAIL },
                { group: "Get in touch", label: "Read the CV", hint: "PDF", go: "/David_Okeke_CV.pdf" },
                { group: "Elsewhere", label: "LinkedIn", go: "https://www.linkedin.com/in/david-okeke-chihurumnanya/" },
                { group: "Elsewhere", label: "GitHub", go: "https://github.com/DCWhiteSnake" },
                { group: "Elsewhere", label: "X", hint: "@dc_okeke", go: "https://x.com/dc_okeke" },
                { group: "Elsewhere", label: "innKorp", hint: "innkorp.com", go: "https://innkorp.com" }
        ];

        function copyEmail() {
                var done = function () { say("Copied " + EMAIL); };
                if (navigator.clipboard) navigator.clipboard.writeText(EMAIL).then(done, function () { location.href = "mailto:" + EMAIL; });
                else location.href = "mailto:" + EMAIL;
        }

        var palette = document.createElement("div");
        palette.className = "palette";
        palette.innerHTML =
                '<div class="palette-box" role="dialog" aria-modal="true" aria-label="Command menu">' +
                '<input type="text" placeholder="Type a command or search…" aria-label="Search commands" aria-controls="palette-list" autocomplete="off" spellcheck="false">' +
                '<ul id="palette-list" role="listbox"></ul></div>';
        document.body.appendChild(palette);
        var input = $("input", palette);
        var list = $("ul", palette);
        var shown = [];
        var active = 0;
        var opener = null;

        function render() {
                var q = input.value.trim().toLowerCase();
                shown = commands.filter(function (c) {
                        return !q || (c.label + " " + c.group + " " + (c.hint || "")).toLowerCase().indexOf(q) !== -1;
                });
                active = Math.min(active, Math.max(shown.length - 1, 0));
                list.innerHTML = "";
                if (!shown.length) {
                        list.innerHTML = '<li class="empty">Nothing matches.</li>';
                        return;
                }
                var lastGroup = "";
                shown.forEach(function (c, i) {
                        if (c.group !== lastGroup) {
                                lastGroup = c.group;
                                var g = document.createElement("li");
                                g.className = "group";
                                g.setAttribute("role", "presentation");
                                g.textContent = c.group;
                                list.appendChild(g);
                        }
                        var li = document.createElement("li");
                        li.className = "item";
                        li.id = "cmd-" + i;
                        li.setAttribute("role", "option");
                        li.setAttribute("aria-selected", i === active ? "true" : "false");
                        var label = document.createElement("span");
                        label.textContent = c.label;
                        li.appendChild(label);
                        if (c.hint) {
                                var hint = document.createElement("span");
                                hint.className = "hint";
                                hint.textContent = c.hint;
                                li.appendChild(hint);
                        }
                        li.addEventListener("mousemove", function () { if (active !== i) { active = i; mark(); } });
                        li.addEventListener("click", function () { choose(i); });
                        list.appendChild(li);
                });
                input.setAttribute("aria-activedescendant", "cmd-" + active);
        }

        function mark() {
                $$(".item", list).forEach(function (li, i) { li.setAttribute("aria-selected", i === active ? "true" : "false"); });
                input.setAttribute("aria-activedescendant", "cmd-" + active);
                var el = $("#cmd-" + active, list);
                if (el) el.scrollIntoView({ block: "nearest" });
        }

        function choose(i) {
                var c = shown[i];
                if (!c) return;
                close();
                if (c.run) c.run();
                else location.href = c.go;
        }

        function open() {
                opener = document.activeElement;
                input.value = "";
                active = 0;
                render();
                palette.classList.add("is-open");
                input.focus();
        }

        function close() {
                palette.classList.remove("is-open");
                if (opener && opener.focus) opener.focus();
        }

        input.addEventListener("input", function () { active = 0; render(); });
        input.addEventListener("keydown", function (e) {
                if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % Math.max(shown.length, 1); mark(); }
                else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + shown.length) % Math.max(shown.length, 1); mark(); }
                else if (e.key === "Enter") { e.preventDefault(); choose(active); }
                else if (e.key === "Escape") { e.preventDefault(); close(); }
                else if (e.key === "Tab") { e.preventDefault(); }
        });
        palette.addEventListener("mousedown", function (e) { if (e.target === palette) close(); });

        document.addEventListener("keydown", function (e) {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                        e.preventDefault();
                        if (palette.classList.contains("is-open")) close(); else open();
                }
        });
        $$("[data-palette-open]").forEach(function (b) { b.addEventListener("click", open); });
        $$("[data-mod]").forEach(function (k) { k.textContent = isMac ? "⌘" : "ctrl"; });

        /* ---------- career lengths, worked out rather than typed ---------- */
        function months(from, to) {
                var a = from.split("-"), b = to ? to.split("-") : null;
                var now = new Date();
                var y2 = b ? +b[0] : now.getFullYear(), m2 = b ? +b[1] : now.getMonth() + 1;
                return (y2 - +a[0]) * 12 + (m2 - +a[1]) + 1;
        }
        $$("[data-from]").forEach(function (el) {
                var n = months(el.dataset.from, el.dataset.to);
                var y = Math.floor(n / 12), m = n % 12;
                var parts = [];
                if (y) parts.push(y + (y === 1 ? " yr" : " yrs"));
                if (m) parts.push(m + (m === 1 ? " mo" : " mos"));
                var line = el.parentNode;
                line.appendChild(document.createTextNode(" · " + parts.join(" ")));
        });

        /* ---------- work: the list and the map light each other up ---------- */
        var builds = $$(".build");
        var pins = $$(".pin");
        if (builds.length) {
                var scrolledTo = null;
                var show = function (build) {
                        builds.forEach(function (b) { b.classList.toggle("is-active", b === build); });
                        pins.forEach(function (p) { p.classList.toggle("is-active", !!build && p.dataset.pin === build.dataset.pin); });
                };
                builds.forEach(function (b) {
                        b.addEventListener("pointerenter", function () { show(b); });
                        b.addEventListener("pointerleave", function () { show(scrolledTo); });
                });
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
        }

        /* ---------- the snake: quiet, home page only ---------- */
        var canvas = $(".snake");
        var rainbowUntil = 0;
        if (canvas && canvas.getContext) {
                var ctx = canvas.getContext("2d");
                var dpr = Math.min(window.devicePixelRatio || 1, 2);
                var W = 0, H = 0, scale = 1;
                var SEGMENTS = 30, SPACING = 8;
                var body = [];
                var pointer = { x: 0, y: 0, at: -1e9 };
                var running = !reduceMotion;

                var idle = function (t) {
                        if (W > 900) {
                                return {
                                        x: W * 0.76 + Math.sin(t * 0.0005) * Math.min(W * 0.1, 150),
                                        y: H * 0.46 + Math.sin(t * 0.001) * Math.min(H * 0.18, 150)
                                };
                        }
                        return { x: W * 0.5 + Math.sin(t * 0.0005) * W * 0.34, y: H - 110 + Math.sin(t * 0.0013) * 10 };
                };

                var resize = function () {
                        W = window.innerWidth;
                        H = window.innerHeight;
                        canvas.width = W * dpr;
                        canvas.height = H * dpr;
                        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                        scale = W > 900 ? 0.8 : 0.55;
                        SPACING = 8 * scale;
                        if (!body.length) {
                                var s = idle(0);
                                for (var i = 0; i < SEGMENTS; i++) body.push({ x: s.x - i * SPACING, y: s.y });
                        }
                };

                var draw = function (t) {
                        ctx.clearRect(0, 0, W, H);
                        var rainbow = t < rainbowUntil;
                        for (var i = SEGMENTS - 1; i >= 0; i--) {
                                var p = body[i];
                                var k = 1 - i / SEGMENTS;
                                ctx.globalAlpha = rainbow ? 1 : 0.55 - (i / SEGMENTS) * 0.4;
                                ctx.fillStyle = rainbow ? "hsl(" + ((t / 8 + i * 12) % 360) + " 90% 72%)" : "#f2f4f3";
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, (1.2 + Math.pow(k, 0.8) * 6) * scale, 0, Math.PI * 2);
                                ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                        var head = body[0], neck = body[1];
                        var angle = Math.atan2(head.y - neck.y, head.x - neck.x);
                        ctx.fillStyle = "#08090b";
                        [-1, 1].forEach(function (side) {
                                ctx.beginPath();
                                ctx.arc(head.x + (Math.cos(angle) * 2.4 + Math.cos(angle + side * Math.PI / 2) * 2.9) * scale,
                                        head.y + (Math.sin(angle) * 2.4 + Math.sin(angle + side * Math.PI / 2) * 2.9) * scale,
                                        1.2 * scale, 0, Math.PI * 2);
                                ctx.fill();
                        });
                };

                var step = function (t) {
                        var target = t - pointer.at < 3500 ? pointer : idle(t);
                        var head = body[0];
                        var dx = target.x - head.x, dy = target.y - head.y;
                        var dist = Math.hypot(dx, dy);
                        var speed = Math.min(dist * 0.06, 10);
                        if (dist > 1) {
                                var nx = dx / dist, ny = dy / dist;
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
                };

                var frame = function (t) {
                        if (!running) return;
                        step(t);
                        draw(t);
                        requestAnimationFrame(frame);
                };

                resize();
                window.addEventListener("resize", function () {
                        clearTimeout(resize.t);
                        resize.t = setTimeout(function () { resize(); if (!running) draw(0); }, 150);
                });
                window.addEventListener("pointermove", function (e) {
                        pointer.x = e.clientX;
                        pointer.y = e.clientY;
                        pointer.at = performance.now();
                });

                if (reduceMotion) {
                        var rest = idle(0);
                        for (var i = 0; i < SEGMENTS; i++) {
                                body[i].x = rest.x + (15 - i) * 6 * scale;
                                body[i].y = rest.y + Math.sin(i / 5) * 22 * scale;
                        }
                        draw(0);
                } else {
                        requestAnimationFrame(frame);
                        document.addEventListener("visibilitychange", function () {
                                running = !document.hidden;
                                if (running) requestAnimationFrame(frame);
                        });
                }
        }

        /* ---------- type "snake" ---------- */
        var typed = "";
        document.addEventListener("keydown", function (e) {
                if (palette.classList.contains("is-open") || e.key.length !== 1) return;
                typed = (typed + e.key.toLowerCase()).slice(-5);
                if (typed !== "snake") return;
                if (canvas) {
                        rainbowUntil = performance.now() + 8000;
                        say("sssss… you found the snake 🐍");
                } else {
                        say("sssss… it lives on the home page 🐍");
                }
        });
})();
