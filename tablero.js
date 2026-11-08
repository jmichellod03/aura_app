// Presentación de resultados de las páginas de cálculo (solo pantalla; no toca cálculos, textos del veredicto ni la
// memoria .tex). Reorganiza lo que cada página ya dibuja, observando el DOM:
//   - panel de datos plegable (botón en el título "Datos de entrada");
//   - tablero: medidor del D/C máximo junto al veredicto y semáforo en las tarjetas de resumen;
//   - procedimiento en tarjetas por sección (h3) con su estado (cumple / no cumple), en pestañas ("Todo", una por
//     sección y "Referencias", con las normas y cláusulas citadas en las filas).
// Se carga después de memo.js y antes del script de la página.
"use strict";
const Tablero = (() => {
  const nivel = (dc) => (!Number.isFinite(dc) ? "mal" : dc > 1 + 1e-9 ? "mal" : dc > 0.9 ? "alerta" : "ok");

  // Ejecuta fn ahora y cada vez que cambie el contenido de el, ignorando los cambios que hace la propia fn
  function observar(el, fn) {
    if (!el) return;
    let ocupado = false;
    const correr = () => { if (ocupado) return; ocupado = true; try { fn(); } catch (e) { console.error(e); } finally { obs.takeRecords(); ocupado = false; } };
    const obs = new MutationObserver(correr);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    correr();
  }

  // ---------- Panel de datos plegable ----------
  function plegable(main) {
    const panel = main.querySelector(":scope > section.panel"), h2 = panel?.querySelector(":scope > h2");
    if (!h2 || h2.querySelector(".plegar")) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "plegar"; b.setAttribute("aria-expanded", "true"); b.title = "Plegar o desplegar los datos";
    b.innerHTML = `<span class="plegar-ic" aria-hidden="true">‹</span><span class="plegar-tx">Plegar</span>`;
    h2.appendChild(b);
    // El estado se recuerda por página y solo en pantallas anchas (en el celular los datos parten siempre a la vista)
    const clave = "auraDatosPlegados:" + location.pathname.split("/").pop(), ancha = () => matchMedia("(min-width: 901px)").matches;
    const guardar = (v) => { try { localStorage.setItem(clave, v ? "1" : ""); } catch { /* sin almacenamiento */ } };
    const fijar = (pleg) => {
      main.classList.toggle("datos-plegados", pleg);
      b.setAttribute("aria-expanded", String(!pleg));
      b.querySelector(".plegar-tx").textContent = pleg ? "Datos" : "Plegar";
    };
    b.addEventListener("click", () => { const p = !main.classList.contains("datos-plegados"); fijar(p); guardar(p); });
    let ini = false; try { ini = ancha() && localStorage.getItem(clave) === "1"; } catch { /* sin almacenamiento */ }
    fijar(ini);
    desplegarDatos = () => { if (main.classList.contains("datos-plegados")) fijar(false); };
  }
  let desplegarDatos = () => {};

  // ---------- Tablero: medidor del D/C máximo + veredicto + tarjetas de resumen ----------
  function tablero(ver) {
    let t = ver.closest(".tablero");
    const resumen = t ? t.querySelector(":scope > .summary") : ver.parentElement.querySelector(":scope > .summary");
    if (!t) {
      t = document.createElement("div"); t.className = "tablero";
      t.innerHTML = `<div class="medidor" aria-hidden="true"></div>`;
      // El tablero se ubica donde estaba el resumen (o el veredicto); el veredicto queda dentro, a la derecha del medidor
      (resumen || ver).before(t);
      const cab = document.createElement("div"); cab.className = "tablero-cab";
      cab.append(t.querySelector(".medidor"));
      t.append(cab);
      // Alto de la cabecera fija, para ubicar el índice bajo ella (la del elemento oculto mide 0 y no cuenta)
      new ResizeObserver(() => { if (cab.offsetHeight) document.documentElement.style.setProperty("--alto-tablero", `${cab.offsetHeight}px`); }).observe(cab);
    }
    const cab = t.querySelector(".tablero-cab");
    if (ver.parentElement !== cab) cab.append(ver);
    if (resumen && resumen.parentElement !== t) t.append(resumen);
    // Medidor: lee "razón máxima = X" del texto del veredicto (sin modificarlo)
    const v = ver.querySelector(".verdict"), txt = v ? v.textContent : "";
    const m = /raz[oó]n m[aá]xima\s*=\s*(∞|[\d. ]+)/i.exec(txt);
    const med = t.querySelector(".medidor");
    // Color del tablero según el veredicto de la página, haya o no número (pavimento flexible no informa razón máxima).
    // "Sin verificar" tiene color propio, aunque lo verificado esté bajo 1, para que no se lea como aprobado
    // "NO CUMPLE" manda: si algo falla, el tablero va en naranja aunque además haya algo sin verificar
    const sinVerificar = !!v && !/NO CUMPLE/.test(txt) && (v.classList.contains("warn") || /SIN VERIFICAR/.test(txt));
    t.classList.toggle("warn", sinVerificar);
    t.classList.toggle("ok", !!v && !sinVerificar && v.classList.contains("ok")); t.classList.toggle("bad", !!v && !sinVerificar && v.classList.contains("bad"));
    // Con datos inválidos se despliega el panel de datos para que se vean los campos marcados
    if (/inv[aá]lid/i.test(ver.textContent)) desplegarDatos();
    if (!v || !m) { med.hidden = true; return; }
    med.hidden = false;
    const dc = m[1] === "∞" ? Infinity : parseFloat(m[1].replace(/ /g, "")), pct = Number.isFinite(dc) ? Math.min(dc, 1.5) / 1.5 : 1;
    const r = 34, L = 2 * Math.PI * r, lim = L / 1.5;      // la marca del 100 % queda a 2/3 de la vuelta
    med.innerHTML = `<svg viewBox="0 0 84 84" width="84" height="84"><circle cx="42" cy="42" r="${r}" class="med-fondo"/>
        <circle cx="42" cy="42" r="${r}" class="med-arco" stroke-dasharray="${(pct * L).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 42 42)"/>
        <line x1="42" y1="${42 - r - 5}" x2="42" y2="${42 - r + 5}" class="med-lim" transform="rotate(${(lim / L * 360).toFixed(1)} 42 42)"/></svg>
      <div class="med-tx"><b>${Number.isFinite(dc) ? dc.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/,/g, " ") : "∞"}</b><small>D/C máx.</small></div>`;
  }

  // Semáforo de las tarjetas de resumen. Se usa la barra que dibuja la propia página (siempre el D/C de la tarjeta:
  // clase "bad" sobre 1 y ancho = D/C·100 %), porque el número grande puede ser otra cosa (por ejemplo un factor de
  // seguridad "3.30 / 1.50" en el muro de contención). Las tarjetas sin barra son informativas (espesores, "No") y
  // quedan sin semáforo.
  function semaforo(s) {
    s.querySelectorAll(".card").forEach(c => {
      c.classList.remove("nv-ok", "nv-alerta", "nv-mal");
      const bar = c.querySelector(".bar"), i = bar?.querySelector("i");
      if (!bar) return;
      const dc = bar.classList.contains("bad") ? Infinity : parseFloat(i?.style.width) / 100;
      if (Number.isFinite(dc) || dc === Infinity) c.classList.add("nv-" + nivel(dc));
    });
  }

  // ---------- Procedimiento en tarjetas por sección (h3) con índice ----------
  // Marcas .tag.bad que son informativas y no una falla de la verificación (clasificaciones, recortes constructivos,
  // recomendaciones). Cualquier otra marca "bad" cuenta como falla de la tarjeta.
  const INFORMATIVAS = /se recorta|esbelt|no compact|>\s*300|no se cumplen/i;
  const plegadas = new Map();                 // por memoria: títulos plegados por el usuario (se recuerdan al recalcular)
  function tarjetas(memo) {
    if (memo.querySelector(":scope > .mcard")) return;
    if (!memo.querySelector(":scope > h3")) { indice(memo, []); return; }     // memoria vacía (datos inválidos): sin índice
    const hijos = [...memo.childNodes], de = memo.id || "memo";
    if (!plegadas.has(de)) plegadas.set(de, new Set());
    const pleg = plegadas.get(de);
    let card = null, n = 0;
    const cards = [];
    for (const nodo of hijos) {
      if (nodo.nodeType === 1 && nodo.tagName === "H3") {
        card = document.createElement("section"); card.className = "mcard";
        card.id = `${de}-s${++n}`;
        // Número del propio título ("2. Verificación…") o una "i" para las secciones sin número (datos generales)
        const titulo = nodo.textContent.trim(), mn = /^(\d+)\.\s*/.exec(titulo);
        const cab = document.createElement("button"); cab.type = "button"; cab.className = "mcard-cab";
        cab.setAttribute("aria-expanded", "true"); cab.setAttribute("aria-controls", card.id + "-c");
        cab.innerHTML = `<span class="mcard-n${mn ? "" : " sin"}" aria-hidden="true"></span><span class="mcard-t"></span><span class="mcard-estado"></span><span class="mcard-chev" aria-hidden="true">▾</span>`;
        cab.querySelector(".mcard-n").textContent = mn ? mn[1] : "i";
        cab.querySelector(".mcard-t").innerHTML = nodo.innerHTML.replace(/^\s*\d+\.\s*/, "");
        const cuerpo = document.createElement("div"); cuerpo.className = "mcard-cuerpo"; cuerpo.id = card.id + "-c";
        // El h3 original encabeza la tarjeta y contiene el botón (navegación por títulos e impresión)
        memo.insertBefore(card, nodo);
        nodo.classList.add("mcard-h3");
        nodo.dataset.titulo = titulo;
        nodo.replaceChildren(cab);
        card.append(nodo, cuerpo);
        cards.push(card);
      } else if (card) card.querySelector(".mcard-cuerpo").append(nodo);
    }
    for (const c of cards) {
      const malas = [...c.querySelectorAll(".tag.bad")].filter(t => !INFORMATIVAS.test(t.textContent)).length;
      const buenas = c.querySelectorAll(".tag.ok").length;
      const est = malas ? "bad" : buenas ? "ok" : "";
      c.classList.toggle("est-bad", est === "bad"); c.classList.toggle("est-ok", est === "ok");
      c.querySelector(".mcard-estado").textContent = est === "bad" ? `${malas} no cumple${malas > 1 ? "n" : ""}` : est === "ok" ? "cumple" : "";
      const titulo = c.querySelector(".mcard-h3").dataset.titulo, cab = c.querySelector(".mcard-cab");
      const fijar = (p) => { c.classList.toggle("plegada", p); cab.setAttribute("aria-expanded", String(!p)); if (p) pleg.add(titulo); else pleg.delete(titulo); };
      if (pleg.has(titulo)) fijar(true);
      cab.addEventListener("click", () => fijar(!c.classList.contains("plegada")));
    }
    indice(memo, cards);
  }

  // ---------- Pestañas del procedimiento: «Todo», una por sección y «Referencias» ----------
  const elegida = new Map();                  // por memoria: pestaña elegida ("todo", título de la sección o "refs")
  function indice(memo, cards) {
    // La barra se identifica por su memoria (entre ambas puede quedar el botón "Mostrar / ocultar todas las ecuaciones")
    if (!memo.id) memo.id = "memo";
    const de = memo.id;
    let nav = memo.parentElement.querySelector(`:scope > .mindice[data-de="${de}"]`);
    let panel = memo.parentElement.querySelector(`:scope > .mrefs[data-de="${de}"]`);
    const eqs = memo.previousElementSibling?.classList.contains("todasEq") ? memo.previousElementSibling : null;
    if (!cards.length) { nav?.remove(); panel?.remove(); memo.classList.remove("oculta"); eqs?.classList.remove("oculta"); return; }
    if (!nav) {
      nav = document.createElement("nav"); nav.className = "mindice"; nav.dataset.de = de; nav.setAttribute("aria-label", "Secciones del procedimiento");
      (memo.previousElementSibling?.classList.contains("todasEq") ? memo.previousElementSibling : memo).before(nav);
    }
    if (!panel) {
      panel = document.createElement("div"); panel.className = "mrefs"; panel.dataset.de = de; panel.id = de + "-refs";
      panel.setAttribute("role", "tabpanel"); panel.tabIndex = 0;
      memo.after(panel);
    }
    referencias(panel, cards);
    nav.replaceChildren();
    const lista = document.createElement("div"); lista.className = "mtabs"; lista.setAttribute("role", "tablist"); lista.setAttribute("aria-label", "Procedimiento");
    nav.append(lista);
    const pestanas = [];
    // Cada pestaña controla un panel (la memoria completa, una tarjeta o las referencias), que se rotula con ella
    const paneles = new Map();
    const nueva = (clave, texto, titulo, clase, el) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.className = "mtab" + (clase ? " " + clase : ""); b.dataset.clave = clave;
      b.id = `${de}-tab-${pestanas.length}`;
      b.setAttribute("aria-controls", el.id); b.title = titulo; b.textContent = texto;
      if (clase === "ok" || clase === "bad") { const s = document.createElement("span"); s.className = "sr-only"; s.textContent = clase === "ok" ? ", cumple" : ", no cumple"; b.append(s); }
      b.addEventListener("click", () => mostrar(clave, true));
      lista.append(b); pestanas.push(b); paneles.set(clave, [el, b]);
    };
    // Clave estable de una sección: su título sin el número ni lo que va tras " — " (cambian al recalcular)
    const claveDe = (c) => c.querySelector(".mcard-h3").dataset.titulo.replace(/^\s*\d+\.\s*/, "").split(/\s+—\s+/)[0].trim();
    nueva("todo", "Todo", "Procedimiento completo", "", memo);
    for (const c of cards) {
      const titulo = c.querySelector(".mcard-t").textContent.trim(), n = c.querySelector(".mcard-n").textContent;
      // Nombre corto: lo que va antes de " — " (la norma o el capítulo quedan en el título completo de la pestaña)
      const base = titulo.split(/\s+—\s+/)[0], corto = base.length > 30 ? base.slice(0, 28).trimEnd() + "…" : base;
      const est = c.classList.contains("est-bad") ? "bad" : c.classList.contains("est-ok") ? "ok" : "";
      nueva(claveDe(c), `${n === "i" ? "" : n + " · "}${corto}`, titulo + (est === "ok" ? " (cumple)" : est === "bad" ? " (no cumple)" : ""), est, c);
    }
    nueva("refs", "Referencias", "Normas y cláusulas usadas en el cálculo", "refs", panel);
    // Flechas, Inicio y Fin recorren las pestañas (patrón de pestañas de WAI-ARIA)
    lista.addEventListener("keydown", (e) => {
      const i = pestanas.indexOf(document.activeElement);
      if (i < 0) return;
      const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: pestanas.length - 1 }[e.key];
      if (j === undefined) return;
      e.preventDefault();
      const b = pestanas[(j + pestanas.length) % pestanas.length];
      b.focus(); mostrar(b.dataset.clave, false);
    });
    function mostrar(clave, alClic) {
      if (!pestanas.some(b => b.dataset.clave === clave)) clave = "todo";
      elegida.set(de, clave);
      for (const b of pestanas) {
        const si = b.dataset.clave === clave;
        b.setAttribute("aria-selected", String(si)); b.tabIndex = si ? 0 : -1;
        if (si && alClic) b.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      memo.classList.toggle("oculta", clave === "refs");
      eqs?.classList.toggle("oculta", clave === "refs");
      panel.hidden = clave !== "refs";
      for (const c of cards) {
        const si = clave === "todo" || clave === claveDe(c);
        c.classList.toggle("fuera", !si);
        // La sección elegida se ve desplegada, sin cambiar la preferencia de plegado guardada
        if (si && clave !== "todo" && c.classList.contains("plegada")) { c.classList.remove("plegada"); c.querySelector(".mcard-cab").setAttribute("aria-expanded", "true"); }
      }
      // Rol de panel en el elemento que muestra la pestaña elegida (las tarjetas, solo cuando son una pestaña)
      for (const [k, [el, b]] of paneles) {
        if (k === "refs") { el.setAttribute("aria-labelledby", b.id); continue; }
        if (k === clave) { el.setAttribute("role", "tabpanel"); el.setAttribute("aria-labelledby", b.id); }
        else if (el !== memo || clave === "refs") { el.removeAttribute("role"); el.removeAttribute("aria-labelledby"); }
      }
      if (clave !== "todo" && clave !== "refs") { memo.removeAttribute("role"); memo.removeAttribute("aria-labelledby"); }
      // Al cambiar de pestaña con el procedimiento ya recorrido, se vuelve al inicio del contenido
      if (alClic && memo.getBoundingClientRect().top < nav.getBoundingClientRect().bottom) {
        const destino = clave === "refs" ? panel : memo, y = nav.getBoundingClientRect().bottom + 8;
        scrollTo({ top: scrollY + destino.getBoundingClientRect().top - y });
      }
    }
    mostrar(elegida.get(de) || "todo", false);
  }

  // ---------- Referencias: normas usadas, con sus cláusulas y la sección donde se aplican ----------
  // patron: reconoce la norma en el texto de la marca; clausula: marcas sin el nombre de la norma que le pertenecen
  // cuando la norma es la principal de la página (subtítulo de la cabecera).
  const NORMAS = [
    { id: "aisc", patron: /(?:ANSI\/)?AISC\s?360-16/, clausula: /^(?:[A-N]\d|A-\d)/, titulo: "ANSI/AISC 360-16",
      desc: "Specification for Structural Steel Buildings. American Institute of Steel Construction, Chicago, 2016. Diseño por factores de carga y resistencia (LRFD)." },
    { id: "aci", patron: /ACI\s?318-08/, clausula: /^\d{1,2}(?:[.-]\d+)+(?![\d.A-Z])/, titulo: "ACI 318-08",
      desc: "Building Code Requirements for Structural Concrete and Commentary. American Concrete Institute, Farmington Hills, 2008. Adoptado en Chile mediante el DS 60 y la NCh 430." },
    { id: "aci14", patron: /ACI\s?318-14/, titulo: "ACI 318-14", desc: "Building Code Requirements for Structural Concrete and Commentary. American Concrete Institute, 2014." },
    { id: "nch1198", patron: /NCh\s?1198(?::2024)?/, clausula: /^(?:\d{1,2}(?:\.\d+)+(?![\dA-Z])|Tabla \d|Anexo [A-Z]\b)/, titulo: "NCh 1198:2024",
      desc: "Madera — Construcciones en madera — Cálculo. Instituto Nacional de Normalización (INN), Santiago, 2024. Método de tensiones admisibles." },
    { id: "nch2165", patron: /NCh\s?2165(?::2023)?/, titulo: "NCh 2165:2023", desc: "Madera laminada encolada estructural — Propiedades físicas y mecánicas. Instituto Nacional de Normalización (INN), Santiago, 2023." },
    { id: "mc", patron: /Manual de Carreteras/, clausula: /^(?:Tablas? |Láminas? )?3\.6\d\d/, titulo: "Manual de Carreteras, Volumen 3",
      desc: "Instrucciones y Criterios de Diseño. Dirección de Vialidad, Ministerio de Obras Públicas de Chile. Capítulo 3.600, diseño de pavimentos." },
    { id: "aashto", patron: /AASHTO/, titulo: "AASHTO 1993 (Suplemento 1998)", desc: "Guide for Design of Pavement Structures. American Association of State Highway and Transportation Officials, 1993, con el Suplemento de 1998 para pavimentos rígidos." },
    { id: "instadeck", patron: /Instadeck|Ficha t[ée]cnica|Manual T[ée]cnico/, clausula: /^(?:Tabla [IVX]+\b|Ficha t[ée]cnica|Manual, pto\.)/, titulo: "Cintac — Manual Técnico Instadeck",
      desc: "Manual Técnico Instadeck (noviembre 2010) y Ficha Técnica de la placa colaborante Instadeck 0.8 mm. Tablas I a IV según el método SDI (1991)." },
    { id: "sdi", patron: /SDI/, titulo: "SDI 1991", desc: "Steel Deck Institute — Composite Deck Design Handbook, 1991. Método del que derivan las tablas del fabricante." },
    { id: "nch433", patron: /NCh\s?433|DS\s?(?:61|117)/, titulo: "NCh 433", desc: "Diseño sísmico de edificios. Instituto Nacional de Normalización (INN), con el Decreto Supremo 61 (2011) del MINVU." },
    { id: "nch2369", patron: /NCh\s?2369/, titulo: "NCh 2369", desc: "Diseño sísmico de estructuras e instalaciones industriales. Instituto Nacional de Normalización (INN)." },
    { id: "nch3171", patron: /NCh\s?3171/, titulo: "NCh 3171:2017", desc: "Diseño estructural — Disposiciones generales y combinaciones de carga. Instituto Nacional de Normalización (INN), 2017." },
    { id: "rankine", patron: /Rankine/, titulo: "Rankine", desc: "Teoría de empujes activo y pasivo de tierras (W. J. M. Rankine, 1857), para relleno sin cohesión y trasdós vertical." },
    { id: "mo", patron: /Mononobe|Okabe|\bM-O\b/, titulo: "Mononobe-Okabe", desc: "Empuje sísmico de tierras (Okabe, 1926; Mononobe y Matsuo, 1929), extensión pseudoestática de la teoría de Coulomb." },
    { id: "ich", patron: /\bICH\b/, titulo: "Manual de cálculo de hormigón armado (ICH)", desc: "Instituto del Cemento y del Hormigón de Chile. Tablas de apoyo para el diseño de losas." },
  ];
  const OTRAS = { id: "otras", titulo: "Otras referencias y criterios", desc: "Criterios del curso, combinaciones de carga y otras referencias citadas sin una norma asociada." };
  function referencias(panel, cards) {
    const sub = document.querySelector("header > span")?.textContent || "";
    // Normas principales de la página, en el orden en que aparecen en el subtítulo
    const principales = NORMAS.filter(n => n.clausula && n.patron.test(sub)).sort((a, b) => sub.search(a.patron) - sub.search(b.patron));
    const grupos = new Map();
    const agregar = (norma, clausula, seccion) => {
      if (!grupos.has(norma.id)) grupos.set(norma.id, { norma, cl: new Map() });
      const g = grupos.get(norma.id);
      if (!clausula) return;
      if (!g.cl.has(clausula)) g.cl.set(clausula, new Set());
      g.cl.get(clausula).add(seccion);
    };
    for (const n of NORMAS) if (n.patron.test(sub)) agregar(n, "", "");
    // Marcas sin norma de una sección cuyo título nombra una norma ("Propiedades del material — NCh 2165")
    const GENERICA = /^(?:Tablas? \d|\d{1,2}(?:\.\d+)+(?![\dA-Z])|Anexo [A-Z]\b)/;
    for (const c of cards) {
      const seccion = c.querySelector(".mcard-h3").dataset.titulo;
      const deSeccion = NORMAS.find(x => x.patron.test(seccion));
      // Referencias de las filas (.ref) y de las ecuaciones (.kref, entre paréntesis)
      for (const r of c.querySelectorAll(".ref, .kref")) {
        const t = r.textContent.trim().replace(/^\((.*)\)$/, "$1").trim();
        if (!t) continue;
        const ns = NORMAS.filter(x => x.patron.test(t));
        if (ns.length) {
          let resto = t;
          for (const n of ns) resto = resto.replace(n.patron, "");
          resto = resto.replace(/^[\s,;:·—/-]+|[\s,;:·—/-]+$/g, "").trim();
          for (const n of ns) agregar(n, resto || t, seccion);
          continue;
        }
        if (deSeccion && GENERICA.test(t)) { agregar(deSeccion, t, seccion); continue; }
        const p = principales.find(x => x.clausula.test(t));
        agregar(p || OTRAS, t, seccion);
      }
    }
    panel.replaceChildren();
    const intro = document.createElement("p"); intro.className = "mrefs-int";
    intro.textContent = "Normas y documentos usados en este cálculo, con las cláusulas, ecuaciones y tablas que se aplican y la sección del procedimiento donde aparecen. Cada fila del procedimiento muestra además su referencia.";
    panel.append(intro);
    const orden = [...grupos.values()].sort((a, b) => (a.norma === OTRAS) - (b.norma === OTRAS));
    for (const { norma, cl } of orden) {
      const s = document.createElement("section"); s.className = "mref";
      const h = document.createElement("h4"); h.textContent = norma.titulo;
      const p = document.createElement("p"); p.className = "mref-d"; p.textContent = norma.desc;
      s.append(h, p);
      if (cl.size) {
        const ul = document.createElement("ul");
        for (const [clausula, secciones] of cl) {
          const li = document.createElement("li");
          const r = document.createElement("span"); r.className = "ref"; r.textContent = clausula || norma.titulo;
          const q = document.createElement("span"); q.className = "mref-s"; q.textContent = [...secciones].join(" · ");
          li.append(r, q); ul.append(li);
        }
        s.append(ul);
      }
      panel.append(s);
    }
  }

  function iniciar() {
    const main = document.querySelector("main");
    if (!main) return;
    document.body.classList.add("con-tablero");
    // Altura real de la cabecera fija (una o dos líneas) para el índice y el panel de datos plegado
    const cab = document.querySelector("header");
    const medirCab = () => {
      const fija = !!cab && getComputedStyle(cab).position === "sticky", raiz = document.documentElement.style;
      raiz.setProperty("--alto-cab", `${fija ? cab.offsetHeight : 0}px`);
      if (fija) raiz.setProperty("--cab", `${cab.offsetHeight}px`);
    };
    medirCab(); addEventListener("resize", medirCab);
    if (cab) new ResizeObserver(medirCab).observe(cab);       // también si cambia al cargar el logo o las fuentes
    plegable(main);
    for (const id of ["verdict", "lverdict"]) { const v = document.getElementById(id); if (v) observar(v, () => tablero(v)); }
    document.querySelectorAll(".summary").forEach(s => observar(s, () => semaforo(s)));
    document.querySelectorAll(".memo").forEach(m => observar(m, () => tarjetas(m)));
  }
  return { iniciar };
})();
// El script se carga al final del <body>: el DOM de la página ya existe; los resultados llegan después y se observan
try { Tablero.iniciar(); } catch (e) { console.error(e); }
