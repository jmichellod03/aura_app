// Memoria de cálculo desplegable (compartida por acero, hormigón, madera, espectros y diseño vial).
// Cada paso muestra sus resultados; al pincharlo se despliegan las ecuaciones con
// los valores reemplazados (las mismas del informe .tex), dibujadas con KaTeX.
"use strict";

const KATEX = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/";
let katexListo = null;
function cargarKatex() {
  if (katexListo) return katexListo;
  // crossOrigin: la respuesta debe ser CORS (no opaca) para que el service worker la guarde.
  katexListo = new Promise((ok) => {
    if (!document.querySelector("link[data-katex]")) {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = KATEX + "katex.min.css"; css.crossOrigin = "anonymous";
      css.dataset.katex = "1";
      document.head.appendChild(css);
    }
    const js = document.createElement("script");
    js.src = KATEX + "katex.min.js"; js.crossOrigin = "anonymous";
    js.onload = () => ok(true);
    js.onerror = () => { js.remove(); katexListo = null; ok(false); }; // se reintenta en el próximo uso
    document.head.appendChild(js);
  });
  return katexListo;
}

// Datos obligatorios: reglas [id, mínimo, estricto]. Un campo vacío, no numérico o bajo el
// mínimo se marca en rojo y se devuelve su nombre; la página no calcula (evita un "CUMPLE" falso).
function datosInvalidos(reglas) {
  const malos = [];
  for (const [id, min = 0, estricto = false] of reglas) {
    const el = document.getElementById(id);
    if (!el) continue;
    const v = parseFloat(el.value);
    const bad = el.value.trim() === "" || !Number.isFinite(v) || (estricto ? v <= min : v < min);
    el.classList.toggle("invalido", bad);
    if (bad) malos.push((el.labels && el.labels[0] ? el.labels[0].textContent : id).replace(/\s+/g, " ").trim());
  }
  return malos;
}
// Limpia la marca de los campos que ya no se validan (p. ej. al cambiar de pestaña).
function limpiarInvalidos(raiz = document) {
  raiz.querySelectorAll(".invalido").forEach((el) => el.classList.remove("invalido"));
}
const avisoInvalidos = (malos) =>
  `<div class="verdict bad" style="margin:10px 0;padding:10px 14px;border-radius:6px;background:#fdecea;color:#8e2a1e;font-weight:600">✘ Datos inválidos — revise: ${malos.join(" · ")}. No se calcula hasta corregirlos.</div>`;

// pdflatex con inputenc utf8 no trae definidos los griegos ni varios símbolos matemáticos:
// se declaran en el preámbulo los que aparecen en el documento.
const TEX_UNICODE = {
  "03B1": "\\alpha", "03B2": "\\beta", "03B3": "\\gamma", "03B4": "\\delta", "03B5": "\\varepsilon",
  "03B6": "\\zeta", "03B7": "\\eta", "03B8": "\\theta", "03BB": "\\lambda", "03BC": "\\mu",
  "03BD": "\\nu", "03BE": "\\xi", "03C0": "\\pi", "03C1": "\\rho", "03C3": "\\sigma", "03C4": "\\tau",
  "03C6": "\\phi", "03D5": "\\phi", "03C8": "\\psi", "03C9": "\\omega", "0394": "\\Delta",
  "03A3": "\\Sigma", "03A6": "\\Phi", "2264": "\\le", "2265": "\\ge", "2260": "\\ne", "2248": "\\approx",
  "2192": "\\rightarrow", "21D2": "\\Rightarrow", "221E": "\\infty", "221A": "\\surd", "2212": "-",
  "2211": "\\sum", "2202": "\\partial", "2074": "^{4}", "2076": "^{6}", "2080": "_{0}", "2081": "_{1}",
  "2082": "_{2}", "2033": "''", "2032": "'",
};
function texUnicode(doc) {
  // babel-spanish redefine \% y falla con el espacio fino previo ("\,\%" → Incompatible glue units);
  // el propio babel ya agrega el espacio antes del signo
  doc = doc.replace(/\\,\\%/g, "\\%");
  // Memorias con punto como separador decimal: "12{,}5" → "12.5" (los miles quedan con espacio fino "\,")
  doc = doc.replace(/\{,\}/g, ".");
  const usados = Object.keys(TEX_UNICODE).filter((c) => doc.includes(String.fromCodePoint(parseInt(c, 16))));
  if (!usados.length) return doc;
  const decl = "\\ifdefined\\DeclareUnicodeCharacter\n"
    + usados.map((c) => `\\DeclareUnicodeCharacter{${c}}{\\ensuremath{${TEX_UNICODE[c]}}}`).join("\n") + "\n\\fi\n";
  return doc.replace(/(\\usepackage\[T1\]\{fontenc\}\r?\n)/, `$1${decl}`);
}

// ---------------------------------------------------------------------------
// Formato de la memoria .tex, al estilo de una memoria hecha a mano: una ecuación por
// línea, la expresión general sobre el reemplazo numérico, los pasos encabezados en
// negrita como viñetas y "¡CUMPLE!" al cerrar cada verificación.
// ---------------------------------------------------------------------------
// Posiciones de los "=" de nivel superior (fuera de llaves y de \left ... \right)
function igualdadesTop(s) {
  const pos = []; let nivel = 0, lr = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      if (s.startsWith("\\left", i) && !/[a-zA-Z]/.test(s[i + 5] || "")) { lr++; i += 4; continue; }
      if (s.startsWith("\\right", i) && !/[a-zA-Z]/.test(s[i + 6] || "")) { lr--; i += 5; continue; }
      i++;   // salta el carácter siguiente: \{ \, \; no cuentan como llaves ni signos
      continue;
    }
    if (c === "{") nivel++;
    else if (c === "}") nivel--;
    else if (c === "=" && nivel === 0 && lr === 0) pos.push(i);
  }
  return pos;
}
// "X = fórmula = valores = resultado" (larga) → fórmula en la primera línea y valores en la segunda
function partirEcuacion(s) {
  if (s.length < 60 || /\\begin|&/.test(s)) return s;
  const p = igualdadesTop(s);
  if (p.length < 2) return s;
  const gen = s.slice(p[0] + 1, p[1]);
  const letras = gen.replace(/\\[a-zA-Z]+/g, "").replace(/\\./g, "");
  if (!/[A-Za-z]/.test(letras)) return s;   // la primera igualdad ya es numérica
  // "V_s = 0 \le V_{s,max} = ...": el primer tramo ya compara; partirlo cambiaría el sentido
  if (/\\(le|leq|ge|geq)(?![a-zA-Z])|\\Rightarrow|\\rightarrow|<|>/.test(gen)) return s;
  return `\\begin{aligned}\n${s.slice(0, p[0]).trim()} &= ${gen.trim()}\\\\\n&= ${s.slice(p[1] + 1).trim()}\n\\end{aligned}`;
}
// Comparación final contra 1 (razón demanda/capacidad) → "¡CUMPLE!" o "¡NO CUMPLE!"
function marcaVerificacion(s) {
  const m = s.match(/(\\le|\\leq|<|>|\\ge|\\geq)\s*(?:\\;)?\s*1(?:\{,\}0)?\s*$/);
  if (!m) return s;
  const ok = ["\\le", "\\leq", "<"].includes(m[1]);
  return s + (ok ? "\\hspace{2em}\\textbf{¡CUMPLE!}" : "\\hspace{2em}\\textbf{¡NO CUMPLE!}");
}
// Ecuación del .tex: cada igualdad unida por \qquad o \quad va en su propia línea
function texDisplay(s, ref) {
  const piezas = separarQquad(s);
  return piezas.map((p, i) => {
    const tag = ref && i === piezas.length - 1 ? `\\tag*{(${ref})}` : "";
    return `\\[\n${partirEcuacion(marcaVerificacion(p.trim()))}${tag}\n\\]`;
  }).join("\n");
}
// Párrafos que empiezan en negrita ("\textbf{Fluencia:} ...") se vuelven viñetas; el texto y
// las ecuaciones que les siguen quedan dentro de la viñeta hasta el próximo título.
function memoTexP(m, s) {
  if (/^\s*\\textbf\{/.test(s)) {
    if (!m.lista) { m.tex.push("\\begin{itemize}"); m.lista = true; }
    m.tex.push("\\item " + s.trim() + "\n");
  } else m.tex.push(s + "\n");
}
function memoTexCerrar(m) {
  if (m.lista) { m.tex.push("\\end{itemize}"); m.lista = false; }
}
// Preámbulo común: sin sangría, párrafos separados y viñetas cuadradas
const TEX_ESTILO = String.raw`\setlength{\parindent}{0pt}
\setlength{\parskip}{5pt}
\renewcommand{\labelitemi}{\tiny$\blacksquare$}
\renewcommand{\labelitemii}{\textbullet}`;

// Texto LaTeX de un párrafo → HTML; las fórmulas $...$ quedan marcadas para KaTeX.
function texParrafo(s) {
  const partes = s.trim().split(/(\$[^$]+\$)/);
  return partes.map((p) => {
    if (p.startsWith("$") && p.length > 1) return `<span class="km" data-tex="${encodeURIComponent(p.slice(1, -1))}"></span>`;
    return p.replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/\\textbf\{([^}]*)\}/g, "<b>$1</b>").replace(/\\textit\{([^}]*)\}/g, "<i>$1</i>")
      .replace(/\\%/g, "%").replace(/\{,\}/g, ",").replace(/\\,/g, " ").replace(/\\ /g, " ")
      .replace(/---/g, "—").replace(/--/g, "–").replace(/~/g, " ");
  }).join("");
}

// Ecuación en bloque: separa la etiqueta \tag*{(ref)} para mostrarla a la derecha.
function texEcuacion(s) {
  const m = s.match(/\\tag\*\{\(([^}]*)\)\}\s*$/);
  const cuerpo = m ? s.slice(0, m.index) : s;
  const ref = m ? `<span class="kref">(${m[1]})</span>` : "";
  return separarQquad(cuerpo).map((c, i, a) =>
    `<div class="kd"><span class="km" data-display="1" data-tex="${encodeURIComponent(c.trim())}"></span>${i === a.length - 1 ? ref : ""}</div>`).join("");
}

// En pantalla, igualdades unidas por \qquad o \quad (fuera de llaves y entornos) van en líneas separadas.
function separarQquad(s) {
  if (/\\begin/.test(s)) return [s];
  const out = []; let nivel = 0, ini = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") nivel++;
    else if (s[i] === "}") nivel--;
    else if (nivel === 0 && s.startsWith("\\qquad", i)) { out.push(s.slice(ini, i)); ini = i + 6; i += 5; }
    else if (nivel === 0 && s.startsWith("\\quad", i)) { out.push(s.slice(ini, i)); ini = i + 5; i += 4; }
  }
  out.push(s.slice(ini));
  return out.filter((c) => c.trim());
}

async function dibujarTex(raiz) {
  const ok = await cargarKatex();
  raiz.querySelectorAll(".km:not([data-ok])").forEach((el) => {
    const tex = decodeURIComponent(el.dataset.tex);
    el.dataset.ok = "1";
    if (ok && window.katex) {
      try { katex.render(tex, el, { displayMode: !!el.dataset.display, throwOnError: false, strict: false }); return; } catch (e) { /* texto plano */ }
    }
    el.textContent = tex;
    el.classList.add("crudo");
  });
}

// out: lista de items del Memo — texto HTML (títulos, notas), {k, v, ref} (filas) o {tex, eq} (LaTeX).
// Agrupa las filas y el LaTeX entre títulos en un paso desplegable.
function memoHTML(out) {
  let s = "", filas = "", tex = "";
  const cerrar = () => {
    if (filas) {
      s += tex
        ? `<div class="paso"><table class="calc clic" title="Pinchar para ver las ecuaciones">${filas}</table><div class="eqs hidden">${tex}</div></div>`
        : `<table class="calc">${filas}</table>`;
    } else if (tex) {
      s += `<div class="paso"><button type="button" class="vereq">Ver ecuaciones</button><div class="eqs hidden">${tex}</div></div>`;
    }
    filas = ""; tex = "";
  };
  for (const it of out) {
    if (typeof it === "string") {
      if (/^<h[34]/.test(it)) { cerrar(); s += it; }
      else { // nota: queda visible junto a las filas del paso
        if (filas) filas += `<tr><td colspan="2">${it}</td></tr>`;
        else { cerrar(); s += it; }
      }
    } else if (it.tex !== undefined) {
      tex += it.eq ? texEcuacion(it.tex) : `<p>${texParrafo(it.tex)}</p>`;
    } else {
      const flecha = '<span class="chev">▸</span>';
      filas += `<tr><td class="k">${filas ? "" : flecha}${it.k}${it.ref ? `<span class="ref">${it.ref}</span>` : ""}</td><td class="v">${it.v}</td></tr>`;
    }
  }
  cerrar();
  return s;
}

function alternarPaso(paso, abrir) {
  const eqs = paso.querySelector(".eqs");
  const ab = abrir === undefined ? eqs.classList.contains("hidden") : abrir;
  eqs.classList.toggle("hidden", !ab);
  paso.classList.toggle("abierto", ab);
  const b = paso.querySelector(".vereq");
  if (b) b.textContent = ab ? "Ocultar ecuaciones" : "Ver ecuaciones";
  if (ab) dibujarTex(eqs);
}

// Botón sobre cada memoria: abre todos los pasos (o los cierra si ya están todos abiertos).
function botonTodas(id) {
  const memo = document.getElementById(id);
  if (!memo) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "todasEq"; b.textContent = "Mostrar / ocultar todas las ecuaciones";
  b.addEventListener("click", () => {
    const pasos = [...memo.querySelectorAll(".paso")];
    const abrir = pasos.some((p) => !p.classList.contains("abierto"));
    pasos.forEach((p) => alternarPaso(p, abrir));
  });
  memo.parentNode.insertBefore(b, memo);
}
// Al recalcular, la memoria se vuelve a generar: se reabren los pasos que estaban abiertos.
const abiertos = {};
function recordar(cont) {
  abiertos[cont.id] = [...cont.querySelectorAll(".paso")].map((p) => p.classList.contains("abierto"));
}
document.addEventListener("DOMContentLoaded", () => {
  ["memo", "lmemo"].forEach(botonTodas);
  ["memo", "lmemo", "pasosR", "pasosU"].forEach((id) => {
    const cont = document.getElementById(id);
    if (!cont) return;
    cont.addEventListener("click", () => setTimeout(() => recordar(cont)));
    cont.previousElementSibling?.classList?.contains("todasEq") && cont.previousElementSibling.addEventListener("click", () => recordar(cont));
    new MutationObserver(() => {
      const est = abiertos[cont.id] || [];
      cont.querySelectorAll(".paso").forEach((p, i) => { if (est[i] && !p.classList.contains("abierto")) alternarPaso(p, true); });
    }).observe(cont, { childList: true });
  });
});

document.addEventListener("click", (ev) => {
  const t = ev.target.closest(".paso > table.clic, .paso > .vereq");
  if (t) alternarPaso(t.parentElement);
});

(function estilos() {
  const st = document.createElement("style");
  st.textContent = `
  .paso { margin: 0; }
  .paso > table.clic { cursor: pointer; }
  .paso > table.clic:hover td { background: #f6f9f8; }
  .chev { display: inline-block; width: 1em; color: var(--accent, #2f7d6d); transition: transform .15s; }
  .paso.abierto .chev { transform: rotate(90deg); }
  .eqs { margin: 4px 0 10px; padding: 8px 12px; background: #f3f7f6; border-left: 3px solid var(--accent, #2f7d6d); border-radius: 4px; font-size: 13px; overflow-x: auto; }
  .eqs p { margin: 6px 0; }
  .kd { display: flex; align-items: center; gap: 10px; margin: 4px 0; }
  .kd > .km { flex: 1; min-width: 0; }
  .kd .katex-display { margin: 4px 0; padding: 3px 0; overflow-x: auto; overflow-y: hidden; text-align: left; }
  .kd .katex-display > .katex { text-align: left; }
  .eqs .katex { font-size: 1.08em; }
  .kref { color: var(--muted, #5f6b7a); font-size: 12px; white-space: nowrap; }
  input.invalido, select.invalido { border-color: #c0392b !important; background: #fdecea !important; }
  .km.crudo { font-family: Consolas, monospace; font-size: 12px; white-space: pre-wrap; }
  .vereq, .todasEq { font: inherit; font-size: 12.5px; padding: 4px 10px; border: 1px solid var(--accent, #2f7d6d); color: var(--accent, #2f7d6d); background: #fff; border-radius: 4px; cursor: pointer; }
  .todasEq { margin: 10px 16px 0; }
  table.comb { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 12.5px; margin: 6px 0; }
  table.comb td:first-child { white-space: nowrap; }
  table.comb td:nth-child(2) { min-width: 190px; }
  table.comb th, table.comb td { border-bottom: 1px solid #e3e7ec; padding: 5px 6px; text-align: left; vertical-align: top; }
  table.comb th { font-weight: 600; background: rgba(47,125,109,.08); }
  table.comb td.num { text-align: right; white-space: nowrap; }
  table.comb tr.sel td { background: rgba(42,111,176,.12); font-weight: 600; }
  .combWrap { overflow-x: auto; }
  .critTag { display: inline-block; font-size: 11px; font-weight: 700; color: #fff; background: #c0392b; border-radius: 3px; padding: 0 5px; margin-left: 4px; }
  .selTag { display: inline-block; font-size: 11px; font-weight: 700; color: #fff; background: #2a6fb0; border-radius: 3px; padding: 0 5px; margin-left: 4px; }
  @media print { .todasEq, .vereq, .chev { display: none; } }
  `;
  document.head.appendChild(st);
})();

// ---------------------------------------------------------------------------
// Combinaciones de carga para columnas y pies derechos (madera aserrada y MLE)
// Cada combinación usa el K_D de su carga de menor duración (NCh 1198, Anexo G).
// d: qPP, qSCp, qSCt, KDpp, KDsc, KDt, KDv.
// ---------------------------------------------------------------------------
const COMBINACIONES = [
  { n: "C1", inc: ["PP"], kd: "KDpp", kdTxt: "permanente" },
  { n: "C2", inc: ["PP", "SCp"], kd: "KDsc", kdTxt: "SC de piso" },
  { n: "C3", inc: ["PP", "SCp", "SCt"], kd: "KDt", kdTxt: "SC de techo" },
  { n: "C4", inc: ["PP", "SCp", "V"], kd: "KDv", kdTxt: "viento" },
  { n: "C5", inc: ["PP", "SCp", "SCt", "V"], kd: "KDv", kdTxt: "viento" },
];
const COMB_HTML = { PP: "PP", SCp: "SC<sub>piso</sub>", SCt: "SC<sub>techo</sub>", V: "V" };
const COMB_TEX = { PP: "PP", SCp: "SC_{piso}", SCt: "SC_{techo}", V: "V" };
const COMB_DESC = { PP: "peso propio", SCp: "sobrecarga de piso", SCt: "sobrecarga de techo", V: "viento" };
function combinaciones(d, conViento) {
  return COMBINACIONES.filter(c => conViento || !c.inc.includes("V")).map(c => {
    const desc = c.inc.map(k => COMB_DESC[k]);
    return {
      n: c.n, inc: c.inc, kdTxt: c.kdTxt, KD: d[c.kd], viento: c.inc.includes("V"),
      txt: c.inc.map(k => COMB_HTML[k]).join(" + "),
      tex: c.inc.map(k => COMB_TEX[k]).join(" + "),
      desc: (desc.length > 1 ? desc.slice(0, -1).join(", ") + " y " + desc.at(-1) : desc[0]).replace(/^./, s => s.toUpperCase()),
      q: (c.inc.includes("PP") ? d.qPP : 0) + (c.inc.includes("SCp") ? d.qSCp : 0) + (c.inc.includes("SCt") ? d.qSCt : 0),
    };
  });
}
// Opciones del selector "Combinación a analizar"; las con viento se deshabilitan si el viento es nulo
function opcionesCombinacion(sel, conViento) {
  const v = sel.value || "auto";
  sel.innerHTML = `<option value="auto">Crítica (automática)</option>` + COMBINACIONES.map(c =>
    `<option value="${c.n}"${!conViento && c.inc.includes("V") ? " disabled" : ""}>${c.n} — ${c.inc.map(k => k === "SCp" ? "SC piso" : k === "SCt" ? "SC techo" : k).join(" + ")}</option>`).join("");
  sel.value = !conViento && COMBINACIONES.find(c => c.n === v)?.inc.includes("V") ? "auto" : v;
}
// c.max: mayor razón del elemento en la combinación (compresión paralela y, con viento, flexión, cizalle e interacción)
function elegirCombinacion(combos, valor) {
  const crit = combos.reduce((a, c) => (c.max > a.max ? c : a));
  return { sel: combos.find(c => c.n === valor) || crit, crit };
}
// Combinaciones que se desarrollan completas en la memoria .tex: C2 a C5 (y C1 solo si resulta crítica)
function combosMemoria(combos, crit) {
  return combos.filter(c => c.n !== "C1" || c === crit);
}
// Tabla resumen de combinaciones en pantalla (marca la crítica y la analizada). s: símbolos { f, F }
function tablaCombinaciones(m, combos, sel, crit, elemento, s) {
  const hayV = combos.some(c => c.viento);
  const f3 = (x) => (Number.isFinite(x) ? fmt(x, 3) : "∞");
  m.out.push(`<div class="combWrap"><table class="comb"><tr><th>Comb.</th><th>Incluye</th><th>K<sub>D</sub></th><th>P [kgf]</th><th>${s.f} [kgf/cm²]</th><th>${s.F} [kgf/cm²]</th><th>${s.f}/${s.F}</th>${hayV ? "<th>Flexocomp.</th>" : ""}<th>Razón máx.</th></tr>` +
    combos.map(c => `<tr${c === sel ? ' class="sel"' : ""}><td>${c.n}${c === crit ? '<br><span class="critTag">crítica</span>' : ""}${c === sel ? '<br><span class="selTag">analizada</span>' : ""}</td>` +
      `<td>${c.txt}<div class="unit">${c.desc}; K<sub>D</sub> de ${c.kdTxt}</div></td><td class="num">${fmt(c.KD, 2)}</td><td class="num">${fmt(c.P, 1)}</td>` +
      `<td class="num">${fmt(c.fc, 2)}</td><td class="num">${fmt(c.Fcl, 2)}</td><td class="num">${fmt(c.ratio, 3)}</td>` +
      (hayV ? `<td class="num">${c.viento ? f3(c.inter) : "—"}</td>` : "") + `<td class="num">${f3(c.max)}</td></tr>`).join("") +
    `</table></div><div class="unit" style="margin-top:4px">Combinación crítica: <b>${crit.n}</b> (razón máxima ${f3(crit.max)}). Combinación analizada: <b>${sel.n}</b>. La razón máxima de cada combinación es la de compresión paralela${hayV ? " o, en las combinaciones con viento, la mayor entre compresión paralela, flexión, cizalle y flexocompresión" : ""}.${hayV ? "" : " Sin viento no se generan las combinaciones C4 y C5."}</div>`);
}
// .tex: tabla de las combinaciones consideradas (al inicio de la memoria)
function tablaCombinacionesDefTex(cT) {
  return String.raw`\begin{table}[H]
\centering
\caption{Combinaciones de carga verificadas. Cada combinación usa el $K_D$ de su carga de menor duración (NCh 1198:2024, Anexo G).}
\begin{tabular}{lll}
\toprule
Comb. & Cargas que incluye & Expresión\\
\midrule
${cT.map(c => `${c.n} & ${c.desc} & $${c.tex}$\\\\`).join("\n")}
\bottomrule
\end{tabular}
\end{table}
`;
}
// Factor de duración por combinación: tabla en pantalla y en el .tex (viñeta propia)
const KD_DURACION = { permanente: "Peso propio (permanente)", "SC de piso": "Sobrecarga de piso", "SC de techo": "Sobrecarga de techo", viento: "Viento" };
function tablaKD(m, combos) {
  if (m.enT) {
    m.p(String.raw`\textbf{Factor de modificación por duración de la carga} (Anexo G). Cada combinación usa el $K_D$ de su carga de menor duración; las combinaciones con viento usan el $K_D$ de viento en todas sus verificaciones, incluida la compresión paralela:`, true);
    m.tex.push(String.raw`\begin{table}[H]
\centering
\caption{Factor de modificación por duración de la carga para cada combinación.}
\begin{tabular}{llc}
\toprule
Comb. & Carga de menor duración & $K_D$\\
\midrule
${combos.map(c => `${c.n} ($${c.tex}$) & ${KD_DURACION[c.kdTxt] || c.kdTxt} & ${tn(c.KD, 2)}\\\\`).join("\n")}
\bottomrule
\end{tabular}
\end{table}
`);
  }
  if (m.enP) m.out.push(`<table class="prop"><tr><th>Combinación</th><th>Carga de menor duración</th><th>K<sub>D</sub></th></tr>` +
    combos.map(c => `<tr><td>${c.n} — ${c.txt}</td><td>${KD_DURACION[c.kdTxt] || c.kdTxt}</td><td class="num">${fmt(c.KD, 2)}</td></tr>`).join("") + `</table>`);
}
// .tex: resumen de las combinaciones verificadas (al final de la memoria). s: { ftex, Ftex }
function tablaCombinacionesTex(cT, crit, elemento, s) {
  const t3 = (x) => (Number.isFinite(x) ? tn(x, 3) : String.raw`$\infty$`);
  const hayVT = cT.some(c => c.viento);
  return String.raw`\begin{table}[H]
\centering\footnotesize\setlength{\tabcolsep}{3pt}
\caption{Resumen por combinación de carga ${elemento}: tensiones de trabajo ($${s.ftex}$) y de diseño con pandeo ($${s.Ftex}$) en kgf/cm$^2$. Combinación crítica: ${crit.n}.}
\begin{tabular}{ll${"r".repeat(hayVT ? 8 : 7)}}
\toprule
Comb. & Expresión & $K_D$ & $P$ [kgf] & $${s.ftex}$ & $${s.Ftex}$ & C. paralela & C. normal & ${hayVT ? "Flexocomp. & " : ""}Máx.\\
\midrule
${cT.map(c => `${c === crit ? `\\textbf{${c.n}} (crítica)` : c.n} & $${c.tex}$ & ${tn(c.KD, 2)} & ${tn(c.P, 1)} & ${tn(c.fc, 3)} & ${tn(c.Fcl, 2)} & ${tn(c.ratio, 3)} & ${tn(c.rcn, 3)} & ${hayVT ? `${c.viento ? t3(c.inter) : "---"} & ` : ""}${t3(Math.max(c.max, c.rcn))}\\\\`).join("\n")}
\bottomrule
\end{tabular}
\end{table}
`;
}
// Máximos: [id, máximo, texto]. Marca el campo y devuelve los mensajes (solo campos visibles).
function datosSobreMaximo(reglas) {
  const malos = [];
  for (const [id, max, txt] of reglas) {
    const el = document.getElementById(id);
    if (!el || el.offsetParent === null || el.value.trim() === "") continue;
    const v = parseFloat(el.value);
    if (Number.isFinite(v) && v > max + 1e-9) { el.classList.add("invalido"); malos.push(txt); }
  }
  return malos;
}
// ---------------------------------------------------------------------------
// Descarga para Overleaf: .zip con la memoria (.tex), referencias (.bib) y figuras (.png)
// ---------------------------------------------------------------------------
// Referencias normativas: patrón que la reconoce en el texto y entrada BibTeX
const REFERENCIAS = [
  { clave: "nch1198", patron: /NCh\s?1198(?::2024)?/, bib: String.raw`@manual{nch1198,
  title        = {{NCh 1198:2024. Madera --- Construcciones en madera --- Cálculo}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {2024}
}` },
  { clave: "nch2165", patron: /NCh\s?2165(?::2023)?/, bib: String.raw`@manual{nch2165,
  title        = {{NCh 2165:2023. Madera laminada encolada estructural --- Propiedades físicas y mecánicas}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {2023}
}` },
  { clave: "nch1537", patron: /NCh\s?1537(?::\d{4})?/, bib: String.raw`@manual{nch1537,
  title        = {{NCh 1537:2009. Diseño estructural --- Cargas permanentes y cargas de uso}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {2009}
}` },
  { clave: "nch432", patron: /NCh\s?432(?:\s?Of\.?\s?(?:19)?71)?/, bib: String.raw`@manual{nch432,
  title        = {{NCh 432.Of1971. Cálculo de la acción del viento sobre las construcciones}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {1971}
}` },
  { clave: "nch433of96", patron: /NCh\s?433\s?Of\.?\s?1996/, bib: String.raw`@manual{nch433of96,
  title        = {{NCh 433.Of1996. Diseño sísmico de edificios}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {1996}
}` },
  { clave: "nch433", patron: /NCh\s?433:2026/, bib: String.raw`@manual{nch433,
  title        = {{NCh 433:2026. Diseño sísmico de edificios}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {2026}
}` },
  { clave: "nch2369", patron: /NCh\s?2369(?::2025)?/, bib: String.raw`@manual{nch2369,
  title        = {{NCh 2369:2025. Diseño sísmico de estructuras e instalaciones industriales}},
  organization = {Instituto Nacional de Normalización (INN)},
  address      = {Santiago, Chile},
  year         = {2025}
}` },
  { clave: "aisc360", patron: /AISC\s?360(?:-16)?/, bib: String.raw`@manual{aisc360,
  title        = {{ANSI/AISC 360-16. Specification for Structural Steel Buildings}},
  organization = {American Institute of Steel Construction},
  address      = {Chicago, IL},
  year         = {2016}
}` },
  { clave: "aci318", patron: /ACI\s?318-08/, bib: String.raw`@manual{aci318,
  title        = {{ACI 318-08. Building Code Requirements for Structural Concrete and Commentary}},
  organization = {American Concrete Institute},
  address      = {Farmington Hills, MI},
  year         = {2008}
}` },
  { clave: "aci31814", patron: /ACI\s?318-14/, bib: String.raw`@manual{aci31814,
  title        = {{ACI 318-14. Building Code Requirements for Structural Concrete and Commentary}},
  organization = {American Concrete Institute},
  address      = {Farmington Hills, MI},
  year         = {2014}
}` },
  { clave: "ich2019", patron: /Manual de Detallamiento(?: para Elementos de Hormigón Armado\})?/, bib: String.raw`@manual{ich2019,
  title        = {{Manual de Detallamiento para Elementos de Hormigón Armado}},
  organization = {Instituto del Cemento y del Hormigón de Chile (ICH)},
  address      = {Santiago, Chile},
  year         = {2019}
}` },
  { clave: "mcv3", patron: /Manual de Carreteras/, bib: String.raw`@manual{mcv3,
  title        = {{Manual de Carreteras, Volumen 3: Instrucciones y Criterios de Diseño}},
  organization = {Dirección de Vialidad, Ministerio de Obras Públicas},
  address      = {Santiago, Chile},
  note         = {Edición vigente}
}` },
  { clave: "aashto93", patron: /AASHTO\s?(?:19)?93/, bib: String.raw`@manual{aashto93,
  title        = {{AASHTO Guide for Design of Pavement Structures}},
  organization = {American Association of State Highway and Transportation Officials},
  address      = {Washington, D.C.},
  year         = {1993}
}` },
  { clave: "aashto98", patron: /AASHTO\s?(?:19)?98|Suplemento(?: AASHTO)? 1998/, bib: String.raw`@manual{aashto98,
  title        = {{Supplement to the AASHTO Guide for Design of Pavement Structures, Part II: Rigid Pavement Design \& Rigid Pavement Joint Design}},
  organization = {American Association of State Highway and Transportation Officials},
  address      = {Washington, D.C.},
  year         = {1998}
}` },
];

// Cita cada norma en su primera mención dentro de un texto LaTeX, fuera de ecuaciones, figuras TikZ y títulos.
// Devuelve { texto, usadas }.
function citarTexto(texto) {
  const usadas = [];
  // Zonas donde no se puede citar: ecuaciones en bloque, entornos tikz, matemática en línea y títulos
  const prohibidas = () => {
    const z = [];
    for (const re of [/(?<!\\)\\\[[\s\S]*?(?<!\\)\\\]/g, /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, /\$[^$]*\$/g, /\\(?:chapter|section|subsection)\{[^}]*\}/g])
      for (const mm of texto.matchAll(re)) z.push([mm.index, mm.index + mm[0].length]);
    return z;
  };
  for (const ref of REFERENCIAS) {
    const z = prohibidas();
    const re = new RegExp(ref.patron.source, "g");
    let mm, pos = -1;
    while ((mm = re.exec(texto))) {
      const a = mm.index;
      if (!z.some(([x, y]) => a >= x && a < y)) { pos = a + mm[0].length; break; }
    }
    if (pos < 0) continue;
    texto = texto.slice(0, pos) + `~\\cite{${ref.clave}}` + texto.slice(pos);
    usadas.push(ref);
  }
  return { texto, usadas };
}
// Documento completo: cita en el cuerpo y agrega la bibliografía al final. Devuelve { tex, usadas }.
function conCitas(tex) {
  const ini = tex.indexOf("\\begin{document}");
  if (ini < 0) return { tex, usadas: [] };
  let { texto: cuerpo, usadas } = citarTexto(tex.slice(ini));
  if (usadas.length) cuerpo = cuerpo.replace(/\\end\{document\}\s*$/, "\\bibliographystyle{unsrt}\n\\bibliography{referencias}\n\\end{document}\n");
  return { tex: tex.slice(0, ini) + cuerpo, usadas };
}
// SVG en pantalla → PNG (fondo blanco, 2× de resolución)
function svgAPng(svg, escala = 2) {
  return new Promise((ok, mal) => {
    const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : svg.getBoundingClientRect();
    const w = Math.round(vb.width), h = Math.round(vb.height);
    const copia = svg.cloneNode(true);
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copia.setAttribute("width", w); copia.setAttribute("height", h);
    copia.removeAttribute("style");
    copia.setAttribute("font-family", "Segoe UI, Arial, Helvetica, sans-serif");
    // Variables CSS (var(--...)) → color calculado en la página
    const cs = getComputedStyle(document.documentElement);
    let txt = new XMLSerializer().serializeToString(copia).replace(/var\((--[\w-]+)\)/g, (_, v) => cs.getPropertyValue(v).trim() || "#000");
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w * escala; c.height = h * escala;
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? b.arrayBuffer().then(x => ok(new Uint8Array(x))) : mal(new Error("PNG")), "image/png");
    };
    img.onerror = () => mal(new Error("No se pudo convertir la figura"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
  });
}

// ZIP sin compresión (método "store"), suficiente para .tex, .bib y .png
const CRC_TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_TABLA[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function crearZip(archivos) {
  const enc = new TextEncoder(), partes = [], central = [];
  let off = 0;
  const d = new Date(), hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const { nombre, datos } of archivos) {
    const n = enc.encode(nombre), u = typeof datos === "string" ? enc.encode(datos) : datos, crc = crc32(u);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true);
    loc.setUint16(10, hora, true); loc.setUint16(12, dia, true); loc.setUint32(14, crc, true);
    loc.setUint32(18, u.length, true); loc.setUint32(22, u.length, true); loc.setUint16(26, n.length, true); loc.setUint16(28, 0, true);
    partes.push(new Uint8Array(loc.buffer), n, u);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true);
    cen.setUint16(12, hora, true); cen.setUint16(14, dia, true); cen.setUint32(16, crc, true); cen.setUint32(20, u.length, true); cen.setUint32(24, u.length, true);
    cen.setUint16(28, n.length, true); cen.setUint32(42, off, true);
    central.push(new Uint8Array(cen.buffer), n);
    off += 30 + n.length + u.length;
  }
  const tamC = central.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamC, true); fin.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: "application/zip" });
}

// Figuras TikZ del .tex → dibujos de pantalla en PNG, en orden. Devuelve { tex, archivos: [{ nombre, datos }] }.
async function prepararFiguras(tex, contenedor, prefijo = "figura") {
  // Dibujos de resultados visibles; se excluyen los esquemas de ayuda de los datos de entrada (dentro de <details>)
  const svgs = contenedor ? [...contenedor.querySelectorAll('svg[role="img"]')].filter(s => s.getBoundingClientRect().width > 0 && !s.closest("details, [data-sin-figura]")) : [];
  const archivos = [];
  let i = 0;
  for (const b of [...tex.matchAll(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g)]) {
    if (i >= svgs.length) break;
    try {
      const ruta = `figuras/${prefijo}${i + 1}.png`;
      archivos.push({ nombre: ruta, datos: await svgAPng(svgs[i]) });
      tex = tex.replace(b[0], `\\includegraphics[width=0.85\\linewidth]{${ruta}}`);
      i++;
    } catch (e) { break; }
  }
  // Varias imágenes en una misma figura (lado a lado): se reparte el ancho
  tex = tex.replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, (fig) => {
    const k = (fig.match(/\\includegraphics\[width=0\.85\\linewidth\]/g) || []).length;
    return k > 1 ? fig.replaceAll("\\includegraphics[width=0.85\\linewidth]", `\\includegraphics[width=${(0.9 / k - 0.04).toFixed(2)}\\linewidth]`) : fig;
  });
  if (i && !/\\usepackage\{graphicx\}/.test(tex)) tex = tex.replace(/\\begin\{document\}/, "\\usepackage{graphicx}\n\\begin{document}");
  return { tex, archivos };
}
function descargarBlob(blob, nombre) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Texto del usuario → LaTeX: escapa los caracteres especiales y quita los que pdflatex no puede componer (emojis, símbolos fuera del BMP)
const escTex = (s) => String(s ?? "")
  .replace(/[\u{10000}-\u{10FFFF}☀-➿️‍]/gu, "").replace(/[\u0000-\u0008\u000B-\u001F]/g, "")
  .replace(/[\\{}&%$#_~^]/g, c => ({ "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" }[c]))
  .replace(/\s{2,}/g, " ").trim();
// Oficina de cálculo para el pie de página: la del proyecto activo o la última ingresada
function oficinaMemoria() {
  if (window.AURA_OFICINA) return window.AURA_OFICINA;
  try { return localStorage.getItem("auraOficina") || ""; } catch { return ""; }
}
// Estilo común con la memoria de un proyecto: Helvetica, interlineado simple y pie con la oficina al centro y la página a la derecha
function estiloMemoria(tex, oficina) {
  const ini = tex.indexOf("\\begin{document}");
  if (ini < 0) return tex;
  const pre = tex.slice(0, ini).replace(/^\\(?:[lcr]foot\{.*\}|renewcommand\{\\footrulewidth\}\{.*\})[ \t]*\n/gm, "");
  const of = escTex(oficina);
  const estilo = String.raw`\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage{setspace}
\setlength{\parindent}{0pt}
\singlespacing
\cfoot{\small ${of}}
\rfoot{\small\thepage}
\renewcommand{\footrulewidth}{0pt}
`;
  return pre + estilo + tex.slice(ini);
}
// Vista 3D de la página (Zona2D3D de modelo3d.js), tal como se ve en pantalla, al final de la memoria
function figura3D(fig) {
  let url = null;
  try { url = typeof window.AURA_3D === "function" ? window.AURA_3D() : null; } catch { url = null; }
  if (!url || !/^data:image\/png;base64,/.test(url)) return fig;
  const bin = atob(url.split(",")[1]), u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0)), ruta = "figuras/modelo3d.png";
  let tex = fig.tex.replace(/\\end\{document\}\s*$/, String.raw`\section*{Modelo 3D del elemento}
\begin{figure}[H]
\centering
\includegraphics[width=0.8\linewidth]{${ruta}}
\caption{Modelo 3D ilustrativo generado por AURA a escala real con las dimensiones de esta memoria. Los apoyos, uniones, placas, anclajes y largos de tramo que no se verifican en esta memoria se dibujan solo como referencia.}
\end{figure}
\end{document}
`);
  if (!/\\usepackage\{graphicx\}/.test(tex)) tex = tex.replace(/\\begin\{document\}/, "\\usepackage{graphicx}\n\\begin{document}");
  if (!/\\usepackage\{float\}/.test(tex)) tex = tex.replace(/\\begin\{document\}/, "\\usepackage{float}\n\\begin{document}");
  return { tex, archivos: [...fig.archivos, { nombre: ruta, datos: u8 }] };
}
// Arma y descarga el .zip de una memoria: .tex con citas, referencias.bib y figuras PNG
async function descargarZipMemoria(tex, nombre, contenedor) {
  if (!tex) { alert("Corrija los datos inválidos antes de descargar la memoria."); return; }
  const base = nombre.replace(/\.tex$/i, "");
  const fig = figura3D(await prepararFiguras(tex, contenedor));
  const { tex: conRef, usadas } = conCitas(estiloMemoria(fig.tex, oficinaMemoria()));
  const archivos = [{ nombre: `${base}.tex`, datos: texUnicode(conRef) }];
  if (usadas.length) archivos.push({ nombre: "referencias.bib", datos: usadas.map(u => u.bib).join("\n\n") + "\n" });
  descargarBlob(crearZip([...archivos, ...fig.archivos]), `${base}.zip`);
}