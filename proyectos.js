// Proyectos de AURA: agrupan cálculos de distintos elementos en una sola memoria (portada, índice,
// capítulos por elemento, bibliografía .bib y figuras PNG) descargable como .zip para Overleaf.
// Requiere memo.js. Los datos se guardan en el navegador (IndexedDB) mediante una API asíncrona
// (Proyectos.listar/obtener/guardar/borrar) pensada para reemplazarse por un servicio en la nube.
"use strict";

// ---------------------------------------------------------------------------
// Almacenamiento
// ---------------------------------------------------------------------------
const PROY_DB = "aura-proyectos";
let proyDbPromesa = null;
function proyDB() {
  if (!proyDbPromesa) proyDbPromesa = new Promise((ok, mal) => {
    const r = indexedDB.open(PROY_DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("proyectos")) r.result.createObjectStore("proyectos", { keyPath: "id" }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { proyDbPromesa = null; mal(r.error); };
  });
  return proyDbPromesa;
}
async function proyTx(modo, fn) {
  const db = await proyDB();
  return new Promise((ok, mal) => {
    const tx = db.transaction("proyectos", modo);
    const req = fn(tx.objectStore("proyectos"));
    tx.oncomplete = () => ok(req ? req.result : undefined);
    tx.onerror = () => mal(tx.error);
  });
}
// Estructura mínima válida de un proyecto (filas antiguas o incompletas no rompen el panel ni la memoria)
function normalizarProyecto(p) {
  if (!p || typeof p !== "object") return undefined;
  if (!Array.isArray(p.elementos)) p.elementos = [];
  p.elementos = p.elementos.filter(e => e && typeof e === "object" && typeof e.id === "string");
  p.elementos.forEach(e => { if (!e.datos || typeof e.datos !== "object") e.datos = {}; if (!Array.isArray(e.figuras)) e.figuras = []; });
  if (typeof p.nombre !== "string" || !p.nombre) p.nombre = "Proyecto sin nombre";
  return p;
}
// Copia local en el navegador (modo sin sesión y origen de la migración a la nube)
const ProyectosLocal = {
  listar: async () => (await proyTx("readonly", s => s.getAll())).map(normalizarProyecto).filter(Boolean).sort((a, b) => (b.modificado || 0) - (a.modificado || 0)),
  obtener: async (id) => normalizarProyecto(await proyTx("readonly", s => s.get(id))),
  guardar: (p) => { p.modificado = Date.now(); return proyTx("readwrite", s => s.put(p)); },
  borrar: (id) => proyTx("readwrite", s => s.delete(id)),
  figura: async (f) => f.blob,
  borrarFiguras: async () => {},
};
// Proyectos del usuario en Supabase: fila en «proyectos» (JSON) y figuras PNG en el bucket «figuras».
// Concurrencia optimista: cada guardado exige la versión leída; si otra pestaña o dispositivo guardó antes, se rechaza.
class ConflictoVersion extends Error {}
const ProyectosNube = {
  async listar() {
    const { data, error } = await sb.from("proyectos").select("datos, version").order("modificado", { ascending: false });
    if (error) throw error;
    return data.map(r => normalizarProyecto(Object.assign(r.datos || {}, { version: r.version }))).filter(Boolean);
  },
  async obtener(id) {
    const { data, error } = await sb.from("proyectos").select("datos, version").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? normalizarProyecto(Object.assign(data.datos || {}, { version: data.version })) : undefined;
  },
  async guardar(p) {
    p.modificado = Date.now();
    const carpeta = `${usuarioActual.id}/${p.id}`;
    for (const e of p.elementos || []) for (const f of e.figuras || []) {
      if (f.blob && !f.ruta) {
        const ruta = `${carpeta}/${f.nombre.split("/").pop()}`;
        const { error } = await sb.storage.from("figuras").upload(ruta, f.blob, { upsert: true, contentType: "image/png" });
        if (error) throw error;
        f.ruta = ruta;
      }
    }
    const datos = JSON.parse(JSON.stringify(p, (k, v) => (k === "blob" || k === "version" ? undefined : v)));
    const fila = { id: p.id, nombre: p.nombre, calculista: p.calculista, oficina: p.oficina, mandante: p.mandante, fecha: p.fecha, datos, modificado: new Date().toISOString() };
    if (p.version == null) {
      const { error } = await sb.from("proyectos").insert({ ...fila, version: 1 });
      if (error) throw error;
      p.version = 1;
    } else {
      const { data, error } = await sb.from("proyectos").update({ ...fila, version: p.version + 1 }).eq("id", p.id).eq("version", p.version).select("id");
      if (error) throw error;
      if (!data || !data.length) throw new ConflictoVersion("El proyecto fue modificado en otra pestaña o dispositivo. Se recargará la versión más reciente.");
      p.version += 1;
    }
  },
  async borrar(id) {
    const carpeta = `${usuarioActual.id}/${id}`;
    const { data: lista } = await sb.storage.from("figuras").list(carpeta, { limit: 1000 });
    if (lista && lista.length) await sb.storage.from("figuras").remove(lista.map(o => `${carpeta}/${o.name}`));
    const { error } = await sb.from("proyectos").delete().eq("id", id);
    if (error) throw error;
  },
  async figura(f) {
    if (f.blob) return f.blob;
    const { data, error } = await sb.storage.from("figuras").download(f.ruta);
    if (error) throw error;
    return data;
  },
  // Figuras de elementos quitados o reemplazados (solo rutas de la carpeta del usuario)
  async borrarFiguras(rutas) {
    const propias = rutas.filter(r => typeof r === "string" && r.startsWith(`${usuarioActual.id}/`));
    if (propias.length) await sb.storage.from("figuras").remove(propias);
  },
};
// Con sesión iniciada se usa la nube; sin sesión (o sin conexión al cargar la librería), el navegador
const almacen = () => (typeof sb !== "undefined" && sb && usuarioActual ? ProyectosNube : ProyectosLocal);
const textoError = (e) => (typeof errorEnEspanol === "function" ? errorEnEspanol(e) : e.message);
const conAviso = (fn) => async (...a) => {
  try { return await fn(...a); }
  catch (e) { alert(e instanceof ConflictoVersion ? e.message : `No se pudo acceder a los proyectos: ${textoError(e)}`); throw e; }
};
const Proyectos = {
  listar: conAviso(() => almacen().listar()),
  obtener: conAviso((id) => almacen().obtener(id)),
  guardar: conAviso((p) => almacen().guardar(p)),
  borrar: conAviso((id) => almacen().borrar(id)),
  figura: (f) => almacen().figura(f),
  borrarFiguras: (rutas) => almacen().borrarFiguras(rutas).catch(() => {}),
};
// Lee la versión más reciente, aplica el cambio y guarda; ante un conflicto de versión reintenta con datos frescos.
// fn(p) devuelve false para cancelar sin guardar.
async function modificarProyecto(id, fn) {
  for (let intento = 0; intento < 3; intento++) {
    const p = await almacen().obtener(id);
    if (!p) throw new Error("El proyecto ya no existe.");
    if ((await fn(p)) === false) return p;
    try { await almacen().guardar(p); return p; }
    catch (e) { if (!(e instanceof ConflictoVersion) || intento === 2) throw e; }
  }
}
const proyId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};
const proyectoActivoId = () => ls.get("auraProyectoActivo");
const fijarProyectoActivo = (id) => ls.set("auraProyectoActivo", id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fechaLarga = (iso) => {
  const d = iso ? new Date(iso + "T12:00:00") : new Date();
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
};
const fechaCorta = (ms) => new Date(ms).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });

// ---------------------------------------------------------------------------
// Captura y restauración del cálculo de una página (requiere window.AURA_MEMO en la página)
// AURA_MEMO = { tipo, elemento(), tex(), nombre(), recalcular(valores) }
// ---------------------------------------------------------------------------
function capturarFormulario() {
  const v = {};
  document.querySelectorAll("main input[id], main select[id], main textarea[id]").forEach(el => {
    if (el.closest("#auraPanel")) return;
    v[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  return v;
}
function restaurarFormulario(v) {
  for (const [id, x] of Object.entries(v || {})) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!x; else el.value = x;
  }
}
function estadoActual() {
  const ver = [...document.querySelectorAll(".verdict")].find(e => e.getBoundingClientRect().width > 0);
  if (!ver) return { ok: null, texto: "" };
  const m = ver.textContent.match(/razón máxima = ([\d.,\u00a0∞]+)/);
  const razon = m ? `razón máx. ${m[1]}` : "";
  // "Sin verificar" no es cumple ni no cumple: el panel y la memoria no muestran ninguno de los dos
  // "NO CUMPLE" manda sobre "SIN VERIFICAR" (un elemento que falla se guarda como no cumple)
  if (/NO CUMPLE/.test(ver.textContent)) return { ok: false, texto: razon };
  if (/SIN VERIFICAR/.test(ver.textContent)) return { ok: null, texto: razon ? `sin verificar · ${razon}` : "sin verificar" };
  return { ok: ver.classList.contains("ok"), texto: razon };
}
function tituloSugerido() {
  const t = document.getElementById("resTitle");
  return t ? t.textContent.replace(/^Resultados\s*—\s*/, "").trim() : (window.AURA_MEMO?.tipo || "Elemento");
}
const paginaActual = () => location.pathname.split("/").pop() || "index.html";
// Solo páginas propias de la app (un dato manipulado no puede convertirse en un enlace javascript: u otro sitio)
const PAGINAS_CALCULO = ["acero.html", "reticulada.html", "placa.html", "hormigon.html", "muro.html", "madera.html", "mle.html", "vial.html", "rigido.html", "zapata.html", "piers.html", "base.html", "conexion.html", "diagonal.html"];
function urlElemento(p, e) {
  const q = new URLSearchParams();
  if (e.elemento) q.set("elemento", e.elemento);
  q.set("proyecto", p.id); q.set("el", e.id);
  return `${PAGINAS_CALCULO.includes(e.pagina) ? e.pagina : "index.html"}?${q}`;
}

// Agrega (o actualiza) el cálculo visible en la página como elemento del proyecto activo
let guardando = false;
async function guardarCalculo(nombre, idExistente) {
  const H = window.AURA_MEMO, pid = proyectoActivoId();
  if (!H || !pid || guardando) return;
  const tex = H.tex();
  if (!tex) { alert(H.sinMemoria || "Corrija los datos inválidos antes de agregar el cálculo al proyecto."); return; }
  // Evita doble clic: los botones quedan deshabilitados hasta terminar
  guardando = true;
  document.querySelectorAll("#auraPanel .ap-acc button").forEach(b => { b.disabled = true; });
  try {
    const id = idExistente || proyId();
    const fig = await prepararFiguras(tex, document.body, `${id}_figura`);
    const el = {
      id, nombre: nombre || tituloSugerido(), tipo: H.tipo, pagina: paginaActual(), elemento: H.elemento ? H.elemento() : "",
      datos: capturarFormulario(), tex: fig.tex, figuras: fig.archivos.map(a => ({ nombre: a.nombre, blob: new Blob([a.datos], { type: "image/png" }) })),
      estado: estadoActual(), fecha: Date.now(),
    };
    let viejas = [];
    // Se lee la versión más reciente del proyecto justo antes de guardar (no se pisan cambios de otra pestaña)
    await modificarProyecto(pid, (p) => {
      const i = p.elementos.findIndex(e => e.id === id);
      viejas = i >= 0 ? p.elementos[i].figuras.map(f => f.ruta).filter(Boolean) : [];
      if (i >= 0) p.elementos[i] = el; else p.elementos.push(el);
    });
    const nuevas = new Set(el.figuras.map(f => f.ruta));
    await Proyectos.borrarFiguras(viejas.filter(r => !nuevas.has(r)));
    panelEditando = id;
  } catch (e) {
    alert(e instanceof ConflictoVersion ? e.message : `No se pudo guardar el cálculo en el proyecto: ${textoError(e)}`);
  } finally {
    guardando = false;
    await pintarPanel().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Memoria del proyecto (.zip para Overleaf)
// ---------------------------------------------------------------------------
const PREAMBULO_EXCLUIR = /^\\(documentclass|pagestyle|fancyhf|[lcr](head|foot)|geometry|allowdisplaybreaks|begin\{document\})/;
function partesMemoria(tex) {
  const ini = tex.indexOf("\\begin{document}"), fin = tex.lastIndexOf("\\end{document}");
  const pre = tex.slice(0, ini).split("\n").map(s => s.trim()).filter(s => s && !PREAMBULO_EXCLUIR.test(s));
  let cuerpo = tex.slice(ini + "\\begin{document}".length, fin < 0 ? undefined : fin);
  let subtitulo = "";
  const tit = cuerpo.match(/^\s*\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  if (tit) {
    // Subtítulo: segunda línea del bloque de título (entre los saltos \\[3pt]/\\[4pt] y \\[2pt])
    const s = tit[1].match(/\\\\\[\d+pt\]\s*([\s\S]*?)\\\\\[\d+pt\]/);
    subtitulo = s ? s[1].trim() : "";
    cuerpo = cuerpo.slice(tit.index + tit[0].length);
  }
  cuerpo = cuerpo.replace(/\\bibliographystyle\{[^}]*\}\s*\\bibliography\{[^}]*\}/g, "");
  return { pre, subtitulo, cuerpo: cuerpo.trim() };
}
function documentoProyecto(p) {
  const pre = [], usadas = new Map(), capitulos = [];
  for (const e of p.elementos) {
    const m = partesMemoria(e.tex);
    m.pre.forEach(l => { if (!pre.includes(l)) pre.push(l); });
    const { texto, usadas: u } = citarTexto(`\\chapter{${escTex(e.nombre)}}\n${m.subtitulo ? `\\noindent\\textit{${m.subtitulo}}\\par\\medskip\n` : ""}${m.cuerpo}\n`);
    u.forEach(r => usadas.set(r.clave, r));
    capitulos.push(texto);
  }
  for (const l of ["\\usepackage{graphicx}", "\\usepackage{xcolor}", "\\usepackage{tikz}", "\\usepackage{fancyhdr}", "\\usepackage{booktabs}", "\\usepackage{float}", "\\usepackage{amsmath,amssymb}"])
    if (!pre.some(x => x.startsWith(l.replace(/\}$/, "")))) pre.push(l);
  const fecha = fechaLarga(p.fecha);
  const n = p.elementos.length;
  const filas = p.elementos.map((e, i) => `${i + 1} & ${escTex(e.nombre)} & ${escTex(e.tipo || "")} & ${e.estado?.ok == null ? "---" : e.estado.ok ? "Cumple" : "No cumple"}\\\\`).join("\n");
  const doc = String.raw`\documentclass[11pt,letterpaper]{report}
${pre.join("\n")}
\usepackage{geometry}
\geometry{margin=2.2cm}
\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage{setspace}
\setlength{\parindent}{0pt}
\singlespacing
\allowdisplaybreaks
\definecolor{aurabase}{HTML}{3D4450}
\definecolor{auraacento}{HTML}{E8711C}
\definecolor{auragris}{HTML}{5F6B7A}
% Encabezado: nombre del capítulo al centro; pie: oficina de cálculo al centro y número de página a la derecha
\renewcommand{\chaptermark}[1]{\markboth{#1}{}}
\pagestyle{fancy}
\fancyhf{}
\chead{\small\nouppercase{\leftmark}}
\cfoot{\small ${escTex(p.oficina || "")}}
\rfoot{\small\thepage}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0pt}
\fancypagestyle{plain}{\fancyhf{}\cfoot{\small ${escTex(p.oficina || "")}}\rfoot{\small\thepage}\renewcommand{\headrulewidth}{0pt}}
% Índice con hipervínculos (al final del preámbulo)
\usepackage[hidelinks]{hyperref}
\hypersetup{pdftitle={${escTex(p.nombre)}}, pdfauthor={${escTex(p.calculista || "")}}}

\begin{document}
\begin{titlepage}
\begin{tikzpicture}[remember picture, overlay]
\fill[aurabase] (current page.north west) rectangle ([yshift=-4.6cm]current page.north east);
\fill[auraacento] ([yshift=-4.6cm]current page.north west) rectangle ([yshift=-4.85cm]current page.north east);
\node[anchor=west, text=white, font=\LARGE\bfseries] at ([xshift=2.2cm, yshift=-2.0cm]current page.north west) {${escTex(p.oficina || "Oficina de cálculo")}};
\node[anchor=west, text=white!80!aurabase, font=\large] at ([xshift=2.2cm, yshift=-3.0cm]current page.north west) {Ingeniería estructural};
\fill[aurabase] (current page.south west) rectangle ([yshift=1.8cm]current page.south east);
\node[text=white, font=\small] at ([yshift=0.9cm]current page.south) {${escTex(p.oficina || "")}${p.oficina ? " --- " : ""}${fecha}};
\end{tikzpicture}
\vspace*{5.2cm}

{\large\scshape\color{auragris} Memoria de cálculo estructural\par}
\vspace{0.7cm}
{\fontsize{30}{37}\selectfont\bfseries\color{aurabase} ${escTex(p.nombre)}\par}
\vspace{0.5cm}
{\color{auraacento}\rule{0.3\linewidth}{2.5pt}}\par
\vfill
{\large
\renewcommand{\arraystretch}{1.6}
\begin{tabular}{@{}l l@{}}
{\color{auragris}Mandante:} & \textbf{${escTex(p.mandante || "---")}}\\
{\color{auragris}Calculista:} & \textbf{${escTex(p.calculista || "---")}}\\
{\color{auragris}Oficina de cálculo:} & \textbf{${escTex(p.oficina || "---")}}\\
{\color{auragris}Fecha:} & \textbf{${fecha}}\\
\end{tabular}\par}
\vspace{1.2cm}
{\color{auragris}\small Esta memoria reúne ${n} ${n === 1 ? "elemento estructural" : "elementos estructurales"}.\par}
\vspace{1.4cm}
\end{titlepage}

\tableofcontents
\clearpage

\chapter{Resumen del proyecto}
La presente memoria reúne el cálculo estructural de los elementos del proyecto \textbf{${escTex(p.nombre)}}${p.mandante ? `, cuyo mandante es ${escTex(p.mandante)}` : ""}. El cálculo fue realizado por ${escTex(p.calculista || "el calculista")}${p.oficina ? ` (${escTex(p.oficina)})` : ""}. Cada capítulo desarrolla un elemento con sus datos, verificaciones y resumen; las normas utilizadas se indican en la bibliografía.
\begin{table}[H]
\centering
\caption{Elementos incluidos en la memoria.}
\begin{tabular}{rllc}
\toprule
N.º & Elemento & Tipo & Estado\\
\midrule
${filas}
\bottomrule
\end{tabular}
\end{table}

${capitulos.join("\n\\clearpage\n")}
${usadas.size ? "\\clearpage\n\\phantomsection\n\\addcontentsline{toc}{chapter}{\\bibname}\n\\bibliographystyle{unsrt}\n\\bibliography{referencias}" : ""}
\end{document}
`;
  return { doc, usadas: [...usadas.values()] };
}
async function descargarZipProyecto(id) {
  try { await armarZipProyecto(id); }
  catch (e) { alert(`No se pudo generar la memoria del proyecto: ${textoError(e)}`); }
}
async function armarZipProyecto(id) {
  const p = await almacen().obtener(id);
  if (!p) return;
  if (!p.elementos.length) { alert("El proyecto aún no tiene elementos. Agregue cálculos desde las páginas de cálculo."); return; }
  const { doc, usadas } = documentoProyecto(p);
  const base = (p.nombre || "proyecto").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "proyecto";
  const archivos = [{ nombre: `${base}.tex`, datos: texUnicode(doc) }];
  if (usadas.length) archivos.push({ nombre: "referencias.bib", datos: usadas.map(u => u.bib).join("\n\n") + "\n" });
  for (const e of p.elementos)
    for (const f of e.figuras || []) {
      let blob;
      try { blob = await Proyectos.figura(f); } catch (err) { throw new Error(`falta la figura ${f.nombre} del elemento «${e.nombre}»; vuelva a guardar ese elemento desde su página (${textoError(err)})`); }
      archivos.push({ nombre: f.nombre, datos: new Uint8Array(await blob.arrayBuffer()) });
    }
  descargarBlob(crearZip(archivos), `${base}.zip`);
}

// ---------------------------------------------------------------------------
// Panel lateral del proyecto activo
// ---------------------------------------------------------------------------
let panelEditando = null;
const panelAbierto = () => ls.get("auraPanelAbierto") === "1";
function estilosPanel() {
  if (document.getElementById("auraPanelCss")) return;
  const st = document.createElement("style");
  st.id = "auraPanelCss";
  st.textContent = `
  #auraPanel { position: fixed; top: 0; right: 0; bottom: 0; width: 320px; max-width: 92vw; background: #fff; border-left: 1px solid #dde1e7;
    box-shadow: -6px 0 18px rgba(29,35,48,.10); z-index: 60; display: flex; flex-direction: column; transform: translateX(100%); transition: transform .22s ease; font: 13.5px/1.4 "Segoe UI", system-ui, sans-serif; color: #1d2330; }
  body.ap-abierto #auraPanel { transform: none; }
  @media (min-width: 1180px) { body.ap-abierto { padding-right: 320px; } }
  #auraPanel .ap-head { background: #00008B; color: #fff; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; }
  #auraPanel .ap-head small { display: block; color: #c8cbe8; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  #auraPanel .ap-head b { display: block; font-size: 15px; }
  #auraPanel .ap-head span { color: #c8cbe8; font-size: 12px; }
  #auraPanel .ap-head > div { flex: 1; min-width: 0; }
  #auraPanel .ap-min { background: none; border: 1px solid rgba(255,255,255,.35); color: #fff; border-radius: 4px; cursor: pointer; font-size: 15px; padding: 1px 8px; }
  #auraPanel .ap-acc { padding: 10px 14px; display: grid; gap: 7px; border-bottom: 1px solid #eef0f3; }
  #auraPanel button.ap-b { font: inherit; padding: 7px 10px; border-radius: 5px; border: 1px solid #00008B; background: #00008B; color: #fff; cursor: pointer; text-align: center; }
  #auraPanel button.ap-b.sec { background: #fff; color: #00008B; border-color: #c3c9d1; }
  #auraPanel button.ap-b:disabled { opacity: .5; cursor: default; }
  #auraPanel .ap-nuevo { display: grid; gap: 6px; }
  #auraPanel .ap-sal { display: flex; gap: 6px; }
  #auraPanel .ap-sal .ap-b { flex: 1; font-size: 12.5px; padding: 6px 8px; }
  #auraPanel .ap-nuevo input { font: inherit; padding: 6px 8px; border: 1px solid #c9ced6; border-radius: 5px; }
  #auraPanel .ap-lista { list-style: none; margin: 0; padding: 6px 8px; overflow-y: auto; flex: 1; }
  #auraPanel .ap-lista li { border: 1px solid #eef0f3; border-radius: 6px; padding: 8px 9px; margin: 6px 0; }
  #auraPanel .ap-lista li.ed { border-color: #e8711c; background: #fff8f2; }
  #auraPanel .ap-lista a { color: #1d2330; font-weight: 600; text-decoration: none; }
  #auraPanel .ap-lista a:hover { text-decoration: underline; }
  #auraPanel .ap-lista small { display: block; color: #5f6b7a; font-size: 11.5px; }
  #auraPanel .ap-fila { display: flex; gap: 4px; margin-top: 5px; align-items: center; }
  #auraPanel .ap-fila button { font-size: 12px; padding: 1px 7px; border: 1px solid #dde1e7; background: #f7f8fa; border-radius: 4px; cursor: pointer; }
  #auraPanel .ap-tag { margin-left: auto; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 3px; }
  #auraPanel .ap-tag.ok { background: #e3f3ea; color: #1e7a46; } #auraPanel .ap-tag.bad { background: #fbe4e2; color: #b3261e; }
  #auraPanel .ap-vacio { color: #5f6b7a; padding: 14px; }
  #auraPanel .ap-foot { padding: 10px 14px; border-top: 1px solid #eef0f3; display: flex; justify-content: space-between; }
  #auraPanel .ap-foot a { color: #2a6fb0; text-decoration: none; font-size: 13px; }
  #auraPanelTab { position: fixed; right: 0; top: 42%; z-index: 59; background: #00008B; color: #fff; border: none; border-radius: 6px 0 0 6px; padding: 10px 7px;
    writing-mode: vertical-rl; transform: rotate(180deg); cursor: pointer; font: 600 12.5px "Segoe UI", system-ui, sans-serif; letter-spacing: .04em; box-shadow: -2px 2px 8px rgba(0,0,0,.15); }
  body.ap-abierto #auraPanelTab { display: none; }
  @media print { #auraPanel, #auraPanelTab { display: none !important; } body.ap-abierto { padding-right: 0; } }`;
  document.head.appendChild(st);
}
function abrirPanel(abrir) {
  ls.set("auraPanelAbierto", abrir ? "1" : "0");
  document.body.classList.toggle("ap-abierto", abrir);
}
async function pintarPanel() {
  const panel = document.getElementById("auraPanel");
  if (!panel) return;
  const p = proyectoActivoId() ? await Proyectos.obtener(proyectoActivoId()) : null;
  window.AURA_OFICINA = p ? p.oficina : undefined;   // pie de página de las memorias individuales
  const tab = document.getElementById("auraPanelTab");
  tab.textContent = p ? `Proyecto: ${p.nombre.length > 22 ? p.nombre.slice(0, 21) + "…" : p.nombre}` : "Proyectos";
  if (!p) {
    panel.innerHTML = `<div class="ap-head"><div><small>Proyecto</small><b>Sin proyecto activo</b></div><button class="ap-min" title="Minimizar">›</button></div>
      <div class="ap-vacio">Cree un proyecto o abra uno existente para ir agregando los cálculos de sus elementos y generar una memoria única.</div>
      <div class="ap-foot"><a href="index.html#misProyectos">Ir a mis proyectos</a></div>`;
  } else {
    // Solo se ofrece «guardar cambios» si el cálculo visible es del mismo tipo que el elemento abierto
    const H = window.AURA_MEMO;
    const editando = p.elementos.find(e => e.id === panelEditando && H && e.pagina === paginaActual() && e.elemento === (H.elemento ? H.elemento() : ""));
    panel.innerHTML = `<div class="ap-head"><div><small>Proyecto activo</small><b>${esc(p.nombre)}</b><span>${esc(p.mandante || "")}${p.mandante && p.calculista ? " · " : ""}${esc(p.calculista || "")}</span></div><button class="ap-min" title="Minimizar">›</button></div>
      <div class="ap-acc">
        ${H ? `<div class="ap-nuevo" id="apNuevo">
          <input id="apNombre" maxlength="80" placeholder="Nombre del elemento (ej.: Viga maestra VM-1)" value="${esc(editando ? editando.nombre : tituloSugerido())}">
          ${editando ? `<button class="ap-b" id="apGuardar">Guardar cambios en el elemento</button><button class="ap-b sec" id="apAgregar">Agregar como elemento nuevo</button>`
            : `<button class="ap-b" id="apAgregar">+ Agregar este cálculo al proyecto</button>`}
        </div>` : `<div class="ap-vacio" style="padding:0">Abra una herramienta de cálculo para agregar elementos al proyecto.</div>`}
        <button class="ap-b sec" id="apZip" ${p.elementos.length ? "" : "disabled"}>Descargar memoria del proyecto (.zip)</button>
        <div class="ap-sal">
          ${editando ? `<button class="ap-b sec" id="apSalirEd" title="Deja de editar el elemento sin guardar y vuelve a la herramienta con sus valores por defecto">Salir de la edición</button>` : ""}
          <button class="ap-b sec" id="apCerrar" title="Desactiva el proyecto; sigue guardado en Mis proyectos">Cerrar proyecto</button>
        </div>
      </div>
      ${p.elementos.length ? `<ol class="ap-lista">${p.elementos.map((e, i) => `<li class="${e.id === panelEditando ? "ed" : ""}" data-id="${esc(e.id)}">
          <a href="${esc(urlElemento(p, e))}" title="Abrir el cálculo">${i + 1}. ${esc(e.nombre)}</a>
          <small>${esc(e.tipo || "")} · ${fechaCorta(e.fecha)}${e.estado?.texto ? " · " + esc(e.estado.texto) : ""}</small>
          <div class="ap-fila"><button data-acc="sub" title="Subir">↑</button><button data-acc="baj" title="Bajar">↓</button><button data-acc="ren" title="Renombrar">✎</button><button data-acc="del" title="Quitar del proyecto">✕</button>
          ${e.estado?.ok == null ? "" : `<span class="ap-tag ${e.estado.ok ? "ok" : "bad"}">${e.estado.ok ? "CUMPLE" : "NO CUMPLE"}</span>`}</div></li>`).join("")}</ol>`
        : `<div class="ap-vacio">Aún no hay elementos. Calcule un elemento y use «Agregar este cálculo al proyecto»; cada elemento será un capítulo de la memoria.</div>`}
      <div class="ap-foot"><a href="index.html#misProyectos">Mis proyectos</a><a href="index.html#herramientas">Herramientas</a></div>`;
    const nombre = () => document.getElementById("apNombre")?.value.trim();
    document.getElementById("apAgregar")?.addEventListener("click", () => guardarCalculo(nombre()));
    document.getElementById("apGuardar")?.addEventListener("click", () => guardarCalculo(nombre(), panelEditando));
    document.getElementById("apZip")?.addEventListener("click", () => descargarZipProyecto(p.id));
    document.getElementById("apSalirEd")?.addEventListener("click", () => salirEdicion());
    document.getElementById("apCerrar")?.addEventListener("click", () => cerrarProyecto());
    panel.querySelectorAll(".ap-fila button").forEach(b => b.addEventListener("click", async () => {
      const id = b.closest("li").dataset.id, acc = b.dataset.acc;
      const actual = p.elementos.find(e => e.id === id);
      if (!actual) return;
      // Las preguntas se hacen antes de leer la versión más reciente, para no retener datos viejos
      let nv = null;
      if (acc === "ren") { nv = prompt("Nombre del elemento:", actual.nombre); if (!nv || !nv.trim()) return; }
      if (acc === "del" && !confirm(`¿Quitar «${actual.nombre}» del proyecto?`)) return;
      let quitadas = [];
      try {
        await modificarProyecto(p.id, (q) => {
          const i = q.elementos.findIndex(e => e.id === id);
          if (i < 0) return false;
          if (acc === "sub" && i > 0) [q.elementos[i - 1], q.elementos[i]] = [q.elementos[i], q.elementos[i - 1]];
          else if (acc === "baj" && i < q.elementos.length - 1) [q.elementos[i + 1], q.elementos[i]] = [q.elementos[i], q.elementos[i + 1]];
          else if (acc === "ren") q.elementos[i].nombre = nv.trim();
          else if (acc === "del") { quitadas = q.elementos[i].figuras.map(f => f.ruta).filter(Boolean); q.elementos.splice(i, 1); }
          else return false;
        });
        if (acc === "del") { if (panelEditando === id) panelEditando = null; await Proyectos.borrarFiguras(quitadas); }
      } catch (e) { alert(e instanceof ConflictoVersion ? e.message : `No se pudo modificar el proyecto: ${textoError(e)}`); }
      pintarPanel();
    }));
  }
  panel.querySelector(".ap-min").addEventListener("click", () => abrirPanel(false));
}
// La página quedó cargada con los datos de un elemento (parámetros proyecto/el): se vuelve a cargar limpia
function recargarSinElemento() {
  const q = new URLSearchParams(location.search);
  if (!q.has("proyecto") && !q.has("el")) return false;
  q.delete("proyecto"); q.delete("el");
  location.replace(`${paginaActual()}${q.toString() ? "?" + q : ""}`);
  return true;
}
// Termina la edición del elemento abierto sin guardar; el proyecto sigue activo
function salirEdicion() {
  panelEditando = null;
  if (!recargarSinElemento()) pintarPanel();
}
// Desactiva el proyecto: las herramientas quedan independientes (el proyecto sigue en «Mis proyectos»)
async function cerrarProyecto() {
  fijarProyectoActivo(null);
  panelEditando = null;
  if (recargarSinElemento()) return;
  await pintarPanel();
  if (typeof pintarProyectos === "function") await pintarProyectos();
}
async function iniciarPanel() {
  if (document.getElementById("auraPanel")) return;
  estilosPanel();
  const panel = document.createElement("aside");
  panel.id = "auraPanel";
  panel.setAttribute("aria-label", "Proyecto activo");
  // Al cambiar de pestaña (viga/columna, envigado/tabique/muro…) se actualiza el panel
  document.addEventListener("click", (ev) => {
    if (ev.target.closest(".tabs button, button[id^=tab]") && !ev.target.closest("#auraPanel")) setTimeout(pintarPanel, 60);
  });
  const tab = document.createElement("button");
  tab.id = "auraPanelTab"; tab.type = "button"; tab.title = "Mostrar el panel del proyecto";
  tab.addEventListener("click", () => abrirPanel(true));
  document.body.append(panel, tab);
  // Cálculo abierto desde el panel: proyecto y elemento en la URL
  const q = new URLSearchParams(location.search);
  if (q.get("proyecto") && q.get("el")) {
    let p = null;
    try { p = await almacen().obtener(q.get("proyecto")); } catch { /* sin conexión: se abre la página sin restaurar */ }
    const e = p && p.elementos.find(x => x.id === q.get("el"));
    // Solo se restaura en la página que generó el elemento (otra página tiene campos distintos)
    if (e && window.AURA_MEMO && e.pagina === paginaActual()) {
      fijarProyectoActivo(p.id);
      panelEditando = e.id;
      restaurarFormulario(e.datos);
      window.AURA_MEMO.recalcular(e.datos);
    }
  }
  abrirPanel(panelAbierto() && !!proyectoActivoId());
  await pintarPanel();
}

// ---------------------------------------------------------------------------
// Página de inicio: mis proyectos y formulario de proyecto
// ---------------------------------------------------------------------------
function formularioProyecto(p) {
  const dlg = document.getElementById("dlgProyecto");
  const f = dlg.querySelector("form");
  f.reset();
  f.dataset.id = p ? p.id : "";
  dlg.querySelector("h2").textContent = p ? "Editar proyecto" : "Nuevo proyecto";
  f.pNombre.value = p?.nombre || ""; f.pCalculista.value = p?.calculista || ls.get("auraCalculista") || "";
  f.pOficina.value = p?.oficina || ls.get("auraOficina") || ""; f.pMandante.value = p?.mandante || "";
  f.pFecha.value = p?.fecha || new Date().toISOString().slice(0, 10);
  dlg.showModal();
  f.pNombre.focus();
}
async function guardarFormularioProyecto(ev) {
  ev.preventDefault();
  const f = ev.target, id = f.dataset.id;
  const datos = { nombre: f.pNombre.value.trim(), calculista: f.pCalculista.value.trim(), oficina: f.pOficina.value.trim(), mandante: f.pMandante.value.trim(), fecha: f.pFecha.value };
  if (!datos.nombre) return;
  ls.set("auraCalculista", datos.calculista); ls.set("auraOficina", datos.oficina);
  try {
    if (id) await modificarProyecto(id, (p) => { Object.assign(p, datos); });
    else {
      const p = { id: proyId(), creado: Date.now(), elementos: [], ...datos };
      await almacen().guardar(p);
      fijarProyectoActivo(p.id); abrirPanel(true);
    }
  } catch (e) { alert(e instanceof ConflictoVersion ? e.message : `No se pudo guardar el proyecto: ${textoError(e)}`); return; }
  document.getElementById("dlgProyecto").close();
  await pintarProyectos();
  await pintarPanel();
  if (!id) document.getElementById("herramientas")?.scrollIntoView({ behavior: "smooth" });
}
async function pintarProyectos() {
  const cont = document.getElementById("listaProyectos");
  if (!cont) return;
  const lista = await Proyectos.listar(), act = proyectoActivoId();
  cont.innerHTML = lista.length ? lista.map(p => `<article class="proy${p.id === act ? " activo" : ""}" data-id="${esc(p.id)}">
      <div class="proy-t"><h3>${esc(p.nombre)}</h3>${p.id === act ? '<span class="proy-act">Activo</span>' : ""}</div>
      <p>${p.mandante ? `Mandante: <b>${esc(p.mandante)}</b><br>` : ""}${p.calculista ? `Calculista: ${esc(p.calculista)}` : ""}${p.oficina ? ` · ${esc(p.oficina)}` : ""}</p>
      <p class="proy-m">${p.elementos.length} ${p.elementos.length === 1 ? "elemento" : "elementos"} · modificado ${fechaCorta(p.modificado || p.creado)}</p>
      <div class="proy-acc"><button data-acc="abrir" class="pb">Abrir</button><button data-acc="zip" class="pb sec" ${p.elementos.length ? "" : "disabled"}>Memoria .zip</button><button data-acc="editar" class="pb sec">Editar</button><button data-acc="borrar" class="pb sec">Eliminar</button></div>
    </article>`).join("")
    : `<div class="proy-vacio">Aún no tiene proyectos. Cree uno para agrupar los cálculos de una obra (por ejemplo, una casa de madera) y generar una memoria única con portada, índice y bibliografía.</div>`;
  cont.querySelectorAll(".proy-acc button").forEach(b => b.addEventListener("click", async () => {
    const id = b.closest(".proy").dataset.id, acc = b.dataset.acc;
    if (acc === "abrir") { fijarProyectoActivo(id); abrirPanel(true); await pintarProyectos(); await pintarPanel(); }
    else if (acc === "zip") descargarZipProyecto(id);
    else if (acc === "editar") formularioProyecto(await Proyectos.obtener(id));
    else if (acc === "borrar") {
      const p = await Proyectos.obtener(id);
      if (!confirm(`¿Eliminar el proyecto «${p.nombre}» y sus ${p.elementos.length} elementos? Esta acción no se puede deshacer.`)) return;
      await Proyectos.borrar(id);
      if (proyectoActivoId() === id) { fijarProyectoActivo(null); abrirPanel(false); }
      await pintarProyectos(); await pintarPanel();
    }
  }));
}
function iniciarInicio() {
  if (!document.getElementById("listaProyectos")) return;
  document.getElementById("btnNuevoProyecto").addEventListener("click", () => formularioProyecto(null));
  document.querySelector("#dlgProyecto form").addEventListener("submit", guardarFormularioProyecto);
  document.getElementById("dlgCancelar").addEventListener("click", () => document.getElementById("dlgProyecto").close());
  pintarProyectos();
}

// Proyectos guardados en este navegador antes de iniciar sesión: se ofrece subirlos a la cuenta una vez
async function ofrecerMigracion() {
  if (almacen() !== ProyectosNube) return;
  const marca = `auraMigrado_${usuarioActual.id}`;
  if (ls.get(marca)) return;
  let locales = [];
  try { locales = await ProyectosLocal.listar(); } catch { return; }
  if (!locales.length) { ls.set(marca, "1"); return; }
  if (!confirm(`Hay ${locales.length} ${locales.length === 1 ? "proyecto guardado" : "proyectos guardados"} en este navegador. ¿Subirlos a su cuenta para tenerlos en todos sus dispositivos?`)) { ls.set(marca, "1"); return; }
  // Uno por uno: los subidos se quitan del navegador (no quedan para otro usuario de este equipo); los fallidos se informan
  const fallidos = [];
  for (const p of locales) {
    try { delete p.version; await ProyectosNube.guardar(p); await ProyectosLocal.borrar(p.id); }
    catch (e) { fallidos.push(`${p.nombre}: ${textoError(e)}`); }
  }
  if (fallidos.length) alert(`No se pudieron subir ${fallidos.length} proyecto(s); quedan en este navegador y se volverá a ofrecer subirlos:\n\n${fallidos.join("\n")}`);
  else { alert("Proyectos subidos a su cuenta."); ls.set(marca, "1"); }
}
// Usuario y botón de cierre de sesión en el encabezado
function pintarUsuario() {
  if (!usuarioActual || document.getElementById("auraUsuario")) return;
  const h = document.querySelector("header");
  if (!h) return;
  const d = document.createElement("div");
  d.id = "auraUsuario";
  d.style.cssText = "margin-left:auto;display:flex;align-items:center;gap:10px;font-size:12.5px;color:#c8cbe8";
  const nombre = usuarioActual.user_metadata?.nombre || usuarioActual.email;
  d.innerHTML = `<span title="${esc(usuarioActual.email)}">${esc(nombre)}</span><button type="button" style="font:inherit;color:#fff;background:none;border:1px solid rgba(255,255,255,.35);border-radius:4px;padding:3px 9px;cursor:pointer">Cerrar sesión</button>`;
  d.querySelector("button").addEventListener("click", cerrarSesion);
  if (getComputedStyle(h).display !== "flex") { h.style.display = "flex"; h.style.flexWrap = "wrap"; h.style.alignItems = "baseline"; h.style.gap = "6px 16px"; }
  h.appendChild(d);
}

// Cada paso se aísla: un error (sin conexión, migración fallida) no deja la página sin lista ni botones
(async () => {
  try { await (typeof sesionLista !== "undefined" ? sesionLista : null); } catch { /* sin sesión */ }
  try { pintarUsuario(); } catch (e) { console.error(e); }
  try { await iniciarPanel(); } catch (e) { console.error(e); }
  try { await ofrecerMigracion(); } catch (e) { console.error(e); }
  iniciarInicio();
})();
