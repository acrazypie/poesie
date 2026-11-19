(function () {
    "use strict";

    const SITE = "https://poesie.egenesio.com/";
    const AUTORE = "Elisa Genesio";
    const $ = (id) => document.getElementById(id);

    /* ─── DATI ──────────────────────────────────────────────
     * poesie.json elenca i file in poesie/ nell'ordine dell'indice.
     * Ogni file inizia con un'intestazione:
     *   ---
     *   titolo: Il titolo
     *   scritta: 2025-07-20      (quando è stata scritta)
     *   pubblicata: 2026-11-19   (quando è uscita sul sito)
     *   ---
     * e sotto il testo, così come va letto.
     */

    const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    function parse(slug, raw, n) {
        raw = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
        const meta = {};
        const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
        if (fm) {
            fm[1].split("\n").forEach((l) => {
                const m = l.match(/^\s*([a-zà-ù]+)\s*:\s*(.*?)\s*$/i);
                if (m) meta[m[1].toLowerCase()] = m[2];
            });
            raw = raw.slice(fm[0].length);
        }
        const strofe = raw
            .replace(/^\s*\n|\s+$/g, "") // via le righe vuote all'inizio e alla fine
            .split(/\n[ \t]*\n+/);
        const titolo = meta.titolo || slug;
        return {
            n,
            slug,
            titolo,
            scritta: meta.scritta || meta.data || "",
            pubblicata: meta.pubblicata || "",
            strofe,
            primo: strofe[0].split("\n")[0].trim(),
            cerca: fold(titolo + " " + raw),
        };
    }

    async function load() {
        const files = await fetch("poesie.json", { cache: "no-cache" }).then((r) => r.json());
        const texts = await Promise.all(
            files.map((f) => fetch("poesie/" + encodeURIComponent(f) + ".md", { cache: "no-cache" }).then((r) => (r.ok ? r.text() : null))),
        );
        return files.map((f, i) => texts[i] && parse(f, texts[i], 0)).filter(Boolean).map((p, i) => ((p.n = i + 1), p));
    }

    const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
    function dataIt(iso) {
        const m = iso.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
        if (!m) return iso;
        if (!m[2]) return m[1];
        return (m[3] ? +m[3] + " " : "") + MESI[+m[2] - 1] + " " + m[1];
    }

    const pad = (n) => String(n).padStart(2, "0");
    const count = (n) => (n === 1 ? "1 poesia" : n + " poesie");
    const href = (p) => "?p=" + encodeURIComponent(p.slug);

    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    let poems = [];
    let bySlug = new Map();

    /* ─── INDICE ────────────────────────────────────────────── */

    const list = $("list");
    const empty = $("empty");
    const search = $("search");

    function row(p, k) {
        const li = el("li");
        const a = el("a", "row");
        a.href = href(p);
        a.style.setProperty("--k", Math.min(k, 12));
        a.append(el("span", "row__idx", pad(p.n)));
        const body = el("span", "row__body");
        body.append(el("span", "row__name", p.titolo), el("span", "row__first", p.primo));
        a.append(body, el("span", "row__meta", p.scritta ? dataIt(p.scritta) : ""), el("span", "row__arrow", "→"));
        a.lastChild.setAttribute("aria-hidden", "true");
        li.append(a);
        return li;
    }

    /* ordine: i numeri restano quelli cronologici (01 = la più vecchia),
       cambia solo il verso della lista. La scelta resta salvata. */
    let order = "old";
    try {
        if (localStorage.getItem("ordine") === "new") order = "new";
    } catch (e) {}
    const orderBtns = document.querySelectorAll("[data-order]");
    function setOrder(o) {
        order = o;
        orderBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.order === o)));
        try {
            localStorage.setItem("ordine", o);
        } catch (e) {}
    }
    orderBtns.forEach((b) =>
        b.addEventListener("click", () => {
            if (b.dataset.order === order) return;
            setOrder(b.dataset.order);
            renderList();
        }),
    );
    setOrder(order);

    function renderList() {
        const q = fold(search.value).trim();
        let shown = q ? poems.filter((p) => p.cerca.includes(q)) : poems.slice();
        if (order === "new") shown.reverse();
        list.replaceChildren(...shown.map(row));
        list.hidden = shown.length === 0;
        empty.hidden = shown.length > 0;
        empty.textContent = poems.length === 0 ? "Le poesie arrivano presto." : "Nessuna poesia contiene “" + search.value.trim() + "”.";
    }
    search.addEventListener("input", renderList);

    /* ─── LETTURA ───────────────────────────────────────────── */

    function navRow(p, dir) {
        const a = el("a", "row row--" + dir);
        a.href = href(p);
        a.rel = dir;
        a.append(el("span", "row__meta", dir === "prev" ? "Precedente" : "Successiva"));
        const body = el("span", "row__body");
        body.append(el("span", "row__name", p.titolo));
        a.append(body, el("span", "row__arrow", dir === "prev" ? "←" : "→"));
        a.lastChild.setAttribute("aria-hidden", "true");
        return a;
    }

    function renderPoem(p) {
        $("poem-tag").textContent = "Poesia " + pad(p.n) + " / " + pad(poems.length);
        $("poem-title").textContent = p.titolo;
        const date = (id, iso, label) => {
            const t = $(id);
            t.hidden = !iso;
            t.textContent = iso ? label + " " + dataIt(iso) : "";
            if (iso) t.dateTime = iso;
        };
        date("poem-written", p.scritta, "scritta il");
        date("poem-published", p.pubblicata, "pubblicata il");

        $("poem-text").replaceChildren(
            ...p.strofe.map((s) => {
                const strofa = el("p", "strofa");
                strofa.append(...s.split("\n").map((v) => el("span", "verso", v || " ")));
                return strofa;
            }),
        );

        const nav = $("poem-nav");
        const prev = poems[p.n - 2];
        const next = poems[p.n];
        nav.replaceChildren(...[prev && navRow(prev, "prev"), next && navRow(next, "next")].filter(Boolean));
        nav.hidden = !prev && !next;
    }

    /* ─── META: canonical, descrizione, JSON-LD ─────────────── */

    const ld = $("ld");
    const homeLd = ld.textContent;
    function setMeta(title, url, desc, json) {
        document.title = title;
        document.querySelector('link[rel="canonical"]').href = url;
        document.querySelector('meta[property="og:url"]').content = url;
        document.querySelector('meta[property="og:title"]').content = title;
        document.querySelector('meta[name="description"]').content = desc;
        ld.textContent = json;
    }

    function poemLd(p, url) {
        // il diritto d'autore nasce con la scrittura: l'anno è quello della stesura
        const year = +((p.scritta || p.pubblicata).match(/^\d{4}/) || ["2026"])[0];
        const work = {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            genre: "Poesia",
            name: p.titolo,
            url,
            inLanguage: "it",
            author: { "@type": "Person", name: AUTORE, url: "https://egenesio.com" },
            copyrightHolder: { "@type": "Person", name: AUTORE },
            copyrightYear: year,
            copyrightNotice: "© " + year + " " + AUTORE + ". Tutti i diritti riservati.",
            isPartOf: { "@type": "CollectionPage", url: SITE },
        };
        if (p.scritta) work.dateCreated = p.scritta;
        if (p.pubblicata) work.datePublished = p.pubblicata;
        return JSON.stringify(work);
    }

    /* ─── ROUTER ──────────────────────────────────────────────
     * Ogni poesia ha un indirizzo vero (?p=titolo), così può avere
     * il suo canonical: la parte dopo # i motori di ricerca la ignorano.
     */

    const views = { home: $("home"), poem: $("poem"), missing: $("missing") };
    let current = null;
    let poemSlug = null;
    let homeScroll = 0;
    history.scrollRestoration = "manual";

    function show(name) {
        for (const k in views) views[k].hidden = k !== name;
        const v = views[name]; // riparte l'animazione d'entrata (non durante il morph del titolo)
        for (const k in views) views[k].classList.toggle("no-enter", morphing);
        v.style.display = "none";
        void v.offsetWidth;
        v.style.display = "";
        document.querySelector('[data-nav="indice"]').classList.toggle("current", name === "home");
    }

    const slugNow = () => new URLSearchParams(location.search).get("p") || "";

    function route() {
        const slug = slugNow();
        const leaving = current;
        if (leaving === "home") homeScroll = scrollY;

        if (!slug) {
            show("home");
            setMeta("Poesie · " + AUTORE, SITE, "Poesie di " + AUTORE + ".", homeLd);
            current = "home";
            scrollTo(0, leaving && leaving !== "home" ? homeScroll : 0);
        } else if (bySlug.has(slug)) {
            const p = bySlug.get(slug);
            const url = SITE + href(p);
            renderPoem(p);
            poemSlug = p.slug;
            show("poem");
            setMeta(p.titolo + " · " + AUTORE, url, "“" + p.primo + "” — una poesia di " + AUTORE + ".", poemLd(p, url));
            current = "poem";
            scrollTo(0, 0);
        } else {
            show("missing");
            setMeta("Non trovata · Poesie", SITE, "Poesie di " + AUTORE + ".", homeLd);
            current = "missing";
            scrollTo(0, 0);
        }

        // il focus segue il cambio di vista, per chi usa tastiera e screen reader
        if (leaving) $("main").focus({ preventScroll: true });
        progress();
    }

    function go(url, from) {
        if (url === location.pathname + location.search) return;
        history.pushState(null, "", url);
        navigate(from);
    }

    /* ─── MORPH DEL TITOLO ────────────────────────────────────
     * Con la View Transitions API il titolo cliccato (riga dell'indice o
     * precedente/successiva) cresce e si trasforma nel titolo della poesia;
     * tornando all'indice fa il percorso inverso. Senza supporto, o con
     * movimento ridotto, la pagina cambia e basta.
     */
    let morphing = false;
    const NAME = "titolo";
    const canMorph = () => !!document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches;

    function navigate(from) {
        if (!canMorph() || !current) return route();

        const before = current === "poem" ? bySlug.get(poemSlug) : null;
        const old = from || (current === "poem" ? $("poem-title") : null);
        let target = null;
        if (old) old.style.viewTransitionName = NAME;

        morphing = true;
        document.documentElement.classList.add("vt-page");
        const t = document.startViewTransition(() => {
            if (old) old.style.viewTransitionName = "";
            route();
            if (old) {
                if (current === "poem") target = $("poem-title");
                else if (current === "home" && before) {
                    target = list.querySelector('a[href="' + href(before) + '"] .row__name');
                    // se la riga è fuori schermo il titolo sfuma e basta
                    const r = target && target.getBoundingClientRect();
                    if (r && (r.bottom < 0 || r.top > innerHeight)) target = null;
                }
                if (target) target.style.viewTransitionName = NAME;
            }
        });
        t.finished.finally(() => {
            morphing = false;
            if (target) target.style.viewTransitionName = "";
            document.documentElement.classList.remove("vt-page");
        });
    }

    // i link interni cambiano vista senza ricaricare la pagina
    document.addEventListener("click", (e) => {
        const a = e.target.closest("a[href]");
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || a.target) return;
        e.preventDefault();
        go(url.pathname + url.search, a.querySelector(".row__name"));
    });
    addEventListener("popstate", () => navigate());

    function randomPoem() {
        if (!poems.length) return;
        const here = bySlug.get(slugNow());
        let p;
        do p = poems[Math.floor(Math.random() * poems.length)];
        while (poems.length > 1 && p === here);
        go(location.pathname + href(p));
    }
    $("random").addEventListener("click", randomPoem);
    $("random-hero").addEventListener("click", randomPoem);

    // ← → per spostarsi tra le poesie
    document.addEventListener("keydown", (e) => {
        if (current !== "poem" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
        const sel = e.key === "ArrowLeft" ? ".row--prev" : e.key === "ArrowRight" ? ".row--next" : null;
        const link = sel && document.querySelector(sel);
        if (link) link.click();
    });

    /* ─── BARRA DI LETTURA ──────────────────────────────────── */

    const bar = document.querySelector(".progress i");
    let ticking = false;
    function progress() {
        ticking = false;
        let p = 0;
        if (current === "poem") {
            const max = document.documentElement.scrollHeight - innerHeight;
            p = max > 0 ? Math.min(1, scrollY / max) : 1;
        }
        bar.style.setProperty("--p", p);
    }
    addEventListener("scroll", () => {
        if (!ticking) requestAnimationFrame(progress);
        ticking = true;
    }, { passive: true });
    addEventListener("resize", progress);

    /* ─── AVVIO ─────────────────────────────────────────────── */

    function ready(list) {
        poems = list;
        bySlug = new Map(poems.map((p) => [p.slug, p]));
        $("home-tag").textContent = AUTORE + " · " + count(poems.length);
        search.closest(".search").hidden = poems.length < 6; // con poche poesie la ricerca non serve
        $("random").hidden = $("random-hero").hidden = poems.length < 2;
        document.querySelector(".order").hidden = poems.length < 2;
        const start = $("start");
        if (poems.length) start.href = href(poems[0]);
        else start.hidden = true;
        renderList();
        route();
    }

    load()
        .then(ready)
        .catch(() => {
            ready([]);
            empty.textContent = "Non riesco a caricare le poesie. Riprova tra poco.";
        });
})();
