// Presentación de resultados de las páginas de cálculo (solo pantalla; no toca cálculos, textos del veredicto ni la
// memoria .tex). Reorganiza lo que cada página ya dibuja, observando el DOM:
//   - panel de datos plegable (botón en el título "Datos de entrada");
//   - tablero: medidor del D/C máximo junto al veredicto y semáforo en las tarjetas de resumen;
//   - procedimiento en tarjetas por sección (h3) con su estado (cumple / no cumple) e índice de chips.
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
    const sinVerificar = !!v && (v.classList.contains("warn") || /SIN VERIFICAR/.test(txt));
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
  function indice(memo, cards) {
    // El índice se identifica por su memoria (entre ambos puede quedar el botón "Mostrar / ocultar todas las ecuaciones")
    const de = memo.id || "memo";
    let nav = memo.parentElement.querySelector(`:scope > .mindice[data-de="${de}"]`);
    if (!cards.length) { nav?.remove(); return; }
    if (!nav) {
      nav = document.createElement("nav"); nav.className = "mindice"; nav.dataset.de = de; nav.setAttribute("aria-label", "Secciones del procedimiento");
      (memo.previousElementSibling?.classList.contains("todasEq") ? memo.previousElementSibling : memo).before(nav);
    }
    nav.replaceChildren();
    const t = document.createElement("span"); t.className = "mindice-t"; t.textContent = "Procedimiento"; nav.append(t);
    for (const c of cards) {
      const a = document.createElement("a");
      a.href = "#" + c.id; a.className = c.classList.contains("est-bad") ? "bad" : c.classList.contains("est-ok") ? "ok" : "";
      a.textContent = c.querySelector(".mcard-t").textContent.trim();
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (c.classList.contains("plegada")) c.querySelector(".mcard-cab").click();
        c.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      nav.append(a);
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
