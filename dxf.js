// Planos DXF compartidos (R12, milímetros, por capas) con lámina normalizada. Lo cargan las páginas sin generador
// propio (su clase se llama DxfR12 para convivir con la clase Dxf propia de reticulada, placa y muro).
// formato serie A (A3 a A0) con marco, margen de archivo a la izquierda y viñeta (rótulo) abajo a la derecha (NCh 13),
// escalas normalizadas, notas generales y cuadros. La vista principal queda a tamaño real en el espacio modelo
// (se mide en mm en AutoCAD); las demás vistas y la lámina se escalan respecto de ella.
//
// Uso:
//   const pl = new PlanoDXF({ titulo: "VIGA HEB 140", contenido: "Elevación y sección" });
//   pl.vista({ titulo: "ELEVACIÓN", bbox: [x0, y0, x1, y1], objetivo: [300, 90], dibujar: (v) => { v.line("CONTORNO", ...); v.cotaH(...); } });
//   pl.tabla({ titulo: "CUADRO", columnas: [["Elemento", 30], ["Perfil", 25]], filas: [["Viga", "HEB 140"]] });
//   pl.notas(["Cotas en mm.", ...]);
//   descargarPlano(pl, "plano.dxf");
"use strict";

class DxfR12 {
  constructor() { this.e = []; }
  _p(...pares) { for (let i = 0; i < pares.length; i += 2) this.e.push(String(pares[i]), typeof pares[i + 1] === "number" ? (+pares[i + 1].toFixed(4)).toString() : pares[i + 1]); }
  line(ly, x1, y1, x2, y2) { this._p(0, "LINE", 8, ly, 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0); }
  poly(ly, pts, cerrada = true) {
    this._p(0, "POLYLINE", 8, ly, 66, 1, 10, 0, 20, 0, 30, 0, 70, cerrada ? 1 : 0);
    for (const [x, y] of pts) this._p(0, "VERTEX", 8, ly, 10, x, 20, y, 30, 0);
    this._p(0, "SEQEND", 8, ly);
  }
  circle(ly, x, y, r) { this._p(0, "CIRCLE", 8, ly, 10, x, 20, y, 30, 0, 40, r); }
  // Arco en sentido antihorario de a1 a a2 (grados)
  arc(ly, x, y, r, a1, a2) { this._p(0, "ARC", 8, ly, 10, x, 20, y, 30, 0, 40, r, 50, a1, 51, a2); }
  // Punto relleno (como el comando DONUT): barras de armadura en corte
  punto(ly, x, y, d) {
    this._p(0, "POLYLINE", 8, ly, 66, 1, 10, 0, 20, 0, 30, 0, 70, 1, 40, d / 2, 41, d / 2);
    this._p(0, "VERTEX", 8, ly, 10, x - d / 4, 20, y, 30, 0, 42, 1);
    this._p(0, "VERTEX", 8, ly, 10, x + d / 4, 20, y, 30, 0, 42, 1);
    this._p(0, "SEQEND", 8, ly);
  }
  // h: alineación horizontal (0 izq, 1 centro, 2 der); v: vertical (0 base, 1 abajo, 2 medio, 3 arriba)
  text(ly, x, y, alto, txt, h = 0, v = 0, rot = 0) {
    if (txt === "" || txt == null) return;               // algunos lectores rechazan TEXT vacíos
    this._p(0, "TEXT", 8, ly, 10, x, 20, y, 30, 0, 40, alto, 1, txt, 50, rot, 7, "AURA");
    if (h || v) this._p(72, h, 11, x, 21, y, 31, 0, 73, v);
  }
  archivo(capas) {
    const c = [];
    const p = (...a) => { for (let i = 0; i < a.length; i += 2) c.push(String(a[i]), String(a[i + 1])); };
    p(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, "AC1009", 9, "$DWGCODEPAGE", 3, "ANSI_1252", 9, "$INSBASE", 10, 0, 20, 0, 30, 0,
      9, "$LTSCALE", 40, this.ltscale || 1, 0, "ENDSEC");
    p(0, "SECTION", 2, "TABLES");
    p(0, "TABLE", 2, "LTYPE", 70, 3);
    p(0, "LTYPE", 2, "CONTINUOUS", 70, 0, 3, "Solid line", 72, 65, 73, 0, 40, 0);
    p(0, "LTYPE", 2, "CENTER", 70, 0, 3, "Center ____ _ ____", 72, 65, 73, 4, 40, 50, 49, 32, 49, -6, 49, 6, 49, -6);
    p(0, "LTYPE", 2, "DASHED", 70, 0, 3, "Dashed __ __ __", 72, 65, 73, 2, 40, 9, 49, 6, 49, -3);
    p(0, "ENDTAB");
    p(0, "TABLE", 2, "LAYER", 70, capas.length);
    for (const [n, col, lt] of capas) p(0, "LAYER", 2, n, 70, 0, 62, col, 6, lt || "CONTINUOUS");
    p(0, "ENDTAB");
    p(0, "TABLE", 2, "STYLE", 70, 1, 0, "STYLE", 2, "AURA", 70, 0, 40, 0, 41, 0.9, 50, 0, 71, 0, 42, 2.5, 3, "romans", 4, "", 0, "ENDTAB");
    p(0, "ENDSEC");
    c.push("0", "SECTION", "2", "ENTITIES", ...this.e, "0", "ENDSEC", "0", "EOF");
    // Windows-1252. Diámetro y grado con los códigos de AutoCAD (%%c, %%d); símbolos sin equivalente se simplifican
    const txt = c.join("\r\n") + "\r\n";
    const map = { "—": "-", "–": "-", "≤": "<=", "≥": ">=", "φ": "phi", "Δ": "Delta", "λ": "lambda", "ξ": "xi", "α": "alfa", "→": "->", "π": "pi", "·": " ", "²": "2", "³": "3", "×": "x", "ø": "%%c", "Ø": "%%c", "°": "%%d", "±": "%%p" };
    const limpio = txt.replace(/[—–≤≥φΔλξα→π·²³×øØ°±]/g, (ch) => map[ch]).replace(/[^\x00-\xff]/g, "?");
    return Uint8Array.from(limpio, (ch) => ch.charCodeAt(0));
  }
}

// Capas normalizadas de AURA. Color = grosor de pluma con un archivo CTB (7 contorno 0,5 mm; 1 armadura 0,35 mm;
// 3 cotas, 8 ejes y ocultas 0,18 mm; 4 secciones cortadas 0,35 mm).
const CAPAS_PLANO = [
  ["MARCO", 7], ["ROTULO", 7], ["EJES", 8, "CENTER"], ["CONTORNO", 7], ["OCULTO", 8, "DASHED"], ["SECCION", 4],
  ["ACHURADO", 8], ["ARMADURA", 1], ["ARM_INFERIOR", 5], ["ARM_SUPERIOR", 1], ["ESTRIBOS", 6], ["COTAS", 3], ["TEXTOS", 7], ["NIVELES", 5], ["CUADRO", 7],
  ["APOYOS", 7], ["CURVAS", 1], ["RETICULA", 8],
];

const ESCALAS = [1, 2, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000];
const FORMATOS = [["A3", 420, 297], ["A2", 594, 420], ["A1", 841, 594], ["A0", 1189, 841]];
// Márgenes NCh 13 [mm]: 25 a la izquierda (archivo), 10 en los demás bordes; viñeta de 180 mm de ancho
const MARGEN = { izq: 25, otro: 10 }, ANCHO_COL = 180, ALTO_ROTULO = 58, SEP = 10;

class PlanoDXF {
  constructor({ titulo, contenido = "" }) {
    this.titulo = titulo; this.contenido = contenido;
    this.vistas = []; this._notas = [];
  }
  // bbox en mm reales [x0, y0, x1, y1]; objetivo = tamaño máximo en papel [ancho, alto] en mm;
  // margen = espacio en papel alrededor para cotas y textos [izq, abajo, der, arriba]
  // papel = true: el dibujo está en mm de papel (gráficos y esquemas sin escala)
  vista({ titulo, bbox, objetivo = [250, 150], margen = [16, 16, 16, 12], dibujar, escala, papel = false }) {
    const [x0, y0, x1, y1] = bbox, w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1);
    const E = papel ? 1 : escala || ESCALAS.find(e => w / e <= objetivo[0] && h / e <= objetivo[1]) || ESCALAS[ESCALAS.length - 1];
    this.vistas.push({ titulo, bbox, E, papel, margen, dibujar, pw: w / E + margen[0] + margen[2], ph: h / E + margen[1] + margen[3] + 9 });
    return E;
  }
  // Cuadro en papel: columnas [[encabezado, ancho mm], ...]; filas de textos
  tabla({ titulo, columnas, filas, alto = 6, nota }) {
    const W = columnas.reduce((a, c) => a + c[1], 0), H = alto * (filas.length + 1);
    this.vistas.push({
      titulo, papel: true, E: 1, margen: [0, nota ? 8 : 2, 0, 2], bbox: [0, 0, W, H], pw: W, ph: H + (nota ? 8 : 2) + 2 + 9,
      dibujar: (v) => {
        let y = H;
        for (let r = 0; r <= filas.length + 1; r++) v.line("CUADRO", 0, H - r * alto, W, H - r * alto);
        let x = 0;
        for (const [, cw] of columnas) { v.line("CUADRO", x, 0, x, H); x += cw; }
        v.line("CUADRO", W, 0, W, H);
        [columnas.map(c => c[0]), ...filas].forEach((f) => {
          x = 0;
          f.forEach((t, i) => { v.text("CUADRO", x + 1.5, y - alto / 2, 2, String(t ?? ""), 0, 2); x += columnas[i][1]; });
          y -= alto;
        });
        if (nota) v.text("CUADRO", 0, -4, 1.8, nota);
      },
    });
  }
  notas(lineas) { this._notas.push(...lineas); }

  // Ordena las vistas en filas de arriba hacia abajo dentro del recuadro (AW × AH), sin entrar en el bloque de
  // notas y viñeta de la esquina inferior derecha (ANCHO_COL × altoBloque). Devuelve las posiciones o null.
  _acomodar(AW, AH, altoBloque) {
    const pos = []; let x = 0, y = AH, altoFila = 0;
    const cabe = (x, v) => x + v.pw <= (y - v.ph < altoBloque ? AW - ANCHO_COL - SEP : AW);
    for (const v of this.vistas) {
      if (x > 0 && !cabe(x, v)) { y -= altoFila + SEP; x = 0; altoFila = 0; }
      if (y - v.ph < 0 || !cabe(x, v)) return null;
      pos.push([x, y - v.ph]); x += v.pw + SEP; altoFila = Math.max(altoFila, v.ph);
    }
    return pos;
  }

  archivo(info = {}) {
    const lineasNotas = this._notas.flatMap((t, i) => partirTexto(`${i + 1}. ${t}`, 92).map((l, k) => (k ? "    " + l : l)));
    const altoNotas = 12 + lineasNotas.length * 3.6;
    let F, pos;
    for (const f of FORMATOS) {
      const AW = f[1] - MARGEN.izq - MARGEN.otro - 2 * SEP, AH = f[2] - 2 * MARGEN.otro - SEP, bloque = ALTO_ROTULO + altoNotas + SEP;
      if (bloque > AH && f !== FORMATOS[FORMATOS.length - 1]) continue;
      pos = this._acomodar(AW, AH, bloque);
      if (pos) { F = f; break; }
    }
    if (!pos) {   // no cabe ni en A0: se apilan en una columna desde arriba; lo que no quepa queda fuera del marco y se avisa en las notas
      F = FORMATOS[FORMATOS.length - 1]; let y = F[2] - 2 * MARGEN.otro - SEP; pos = this.vistas.map(v => { y -= v.ph; const p = [0, y]; y -= SEP; return p; });
      lineasNotas.push(`${this._notas.length + 1}. ATENCIÓN: el contenido no cabe en un formato A0; reorganizar las vistas en varias láminas.`);
    }
    const [nomF, FW, FH] = F;
    // Escala de la lámina = la de la vista principal (queda a tamaño real en el espacio modelo)
    const S = this.vistas[0]?.papel ? 1 : (this.vistas[0]?.E || 1);
    const dx = new DxfR12(); dx.ltscale = S;
    const X = (px) => px * S, Y = (py) => py * S;
    const ox = MARGEN.izq + SEP, oy = MARGEN.otro + SEP / 2;

    // Vistas
    this.vistas.forEach((v, i) => {
      const [px, py] = pos[i], E = v.E, k = S / E, [x0, y0, x1] = v.bbox;
      const bx = ox + px + v.margen[0], by = oy + py + v.margen[1] + 9;      // origen en papel del bbox de la vista
      const P = (x, y) => [X(bx) + (x - x0) * k, Y(by) + (y - y0) * k];
      v.dibujar(contexto(dx, P, k, E, S));
      // Título subrayado y escala bajo la vista
      const tx = X(bx), ty = Y(oy + py + 5);
      dx.text("TEXTOS", tx, ty, 3.5 * S, v.titulo.toUpperCase());
      dx.line("TEXTOS", tx, ty - 1.2 * S, tx + Math.min((x1 - x0) * k, v.titulo.length * 3.3 * S), ty - 1.2 * S);
      if (!v.papel) dx.text("TEXTOS", tx, ty - 4.5 * S, 2.5 * S, `ESC. 1:${E}`);
    });

    // Marco del formato y recuadro interior
    dx.poly("MARCO", [[0, 0], [X(FW), 0], [X(FW), Y(FH)], [0, Y(FH)]]);
    const mx = MARGEN.izq, my = MARGEN.otro;
    dx.poly("MARCO", [[X(mx), Y(my)], [X(FW - my), Y(my)], [X(FW - my), Y(FH - my)], [X(mx), Y(FH - my)]]);

    // Viñeta (rótulo) en la esquina inferior derecha del recuadro
    const rx = FW - MARGEN.otro - ANCHO_COL, ry = my;
    const R = (x, y) => [X(rx + x), Y(ry + y)];
    const caja = (x, y, w, h) => dx.poly("ROTULO", [R(x, y), R(x + w, y), R(x + w, y + h), R(x, y + h)]);
    const campo = (x, y, w, h, et, val, alto = 2.5) => {
      caja(x, y, w, h);
      dx.text("ROTULO", ...R(x + 1.5, y + h - 2.5), 1.6 * S, et);
      dx.text("ROTULO", ...R(x + 1.5, y + 1.8), alto * S, val || "");
    };
    const hoy = new Date().toLocaleDateString("es-CL");
    campo(0, 46, 180, 12, "PROYECTO", info.proyecto, 3.5);
    campo(0, 37, 120, 9, "MANDANTE", info.mandante);
    campo(120, 37, 60, 9, "OFICINA DE CÁLCULO", info.oficina);
    campo(0, 25, 180, 12, "CONTENIDO", `${this.titulo}${this.contenido ? " - " + this.contenido : ""}`, 3);
    campo(0, 16, 90, 9, "CALCULISTA", info.calculista);
    campo(90, 16, 45, 9, "REVISÓ", "");
    campo(135, 16, 45, 9, "FECHA", hoy);
    campo(0, 7, 45, 9, "ESCALA", this.vistas.filter(v => !v.papel).map(v => "1:" + v.E).filter((e, i, a) => a.indexOf(e) === i).join(" / ") || "S/E");
    campo(45, 7, 30, 9, "FORMATO", nomF);
    campo(75, 7, 25, 9, "UNIDAD", "mm");
    campo(100, 7, 40, 9, "LÁMINA N°", info.lamina || "1 de 1");
    campo(140, 7, 40, 9, "REVISIÓN", "0");
    dx.text("ROTULO", ...R(1.5, 2.2), 1.8 * S, "Generado con AURA. Verifique el cálculo y las cotas antes de construir. No medir sobre el plano.");
    caja(0, 0, 180, 7);

    // Notas generales sobre la viñeta
    const ny = ALTO_ROTULO + 6 + altoNotas;
    dx.text("TEXTOS", ...R(0, ny - 4), 3.5 * S, "NOTAS GENERALES");
    dx.line("TEXTOS", ...R(0, ny - 5.2), ...R(48, ny - 5.2));
    lineasNotas.forEach((l, i) => dx.text("TEXTOS", ...R(0, ny - 10 - i * 3.6), 2.2 * S, l));

    return dx.archivo(CAPAS_PLANO);
  }
}

// Contexto de dibujo de una vista: coordenadas reales (mm) del elemento; los altos de texto y las separaciones
// de cotas se dan en mm de papel
function contexto(dx, P, k, E, S) {
  const pp = (mmPapel) => mmPapel * E;             // mm de papel → unidades de la vista
  const v = {
    E, pp,
    line: (ly, x1, y1, x2, y2) => dx.line(ly, ...P(x1, y1), ...P(x2, y2)),
    poly: (ly, pts, c = true) => dx.poly(ly, pts.map(([x, y]) => P(x, y)), c),
    circle: (ly, x, y, r) => dx.circle(ly, ...P(x, y), r * k),
    arc: (ly, x, y, r, a1, a2) => dx.arc(ly, ...P(x, y), r * k, a1, a2),
    punto: (ly, x, y, d) => dx.punto(ly, ...P(x, y), d * k),
    text: (ly, x, y, hPapel, t, h, vv, rot) => dx.text(ly, ...P(x, y), hPapel * S, t, h, vv, rot),
    // Cota horizontal entre x1 y x2, medida desde yRef, con la línea a "dist" mm de papel (negativo = abajo)
    cotaH(x1, x2, yRef, dist, txt) {
      const y = yRef + pp(dist), s = Math.sign(dist) || 1, t = pp(1.2);
      v.line("COTAS", x1, y, x2, y);
      for (const x of [x1, x2]) { v.line("COTAS", x, yRef + s * pp(1), x, y + s * pp(1.5)); v.line("COTAS", x - t, y - t, x + t, y + t); }
      v.text("COTAS", (x1 + x2) / 2, y + pp(0.8), 2.2, txt ?? fmtCota(Math.abs(x2 - x1)), 1, 0);
    },
    cotaV(y1, y2, xRef, dist, txt) {
      const x = xRef + pp(dist), s = Math.sign(dist) || 1, t = pp(1.2);
      v.line("COTAS", x, y1, x, y2);
      for (const y of [y1, y2]) { v.line("COTAS", xRef + s * pp(1), y, x + s * pp(1.5), y); v.line("COTAS", x - t, y - t, x + t, y + t); }
      v.text("COTAS", x - pp(0.8), (y1 + y2) / 2, 2.2, txt ?? fmtCota(Math.abs(y2 - y1)), 1, 0, 90);
    },
    // Texto con línea de referencia (flecha simple) desde (x1, y1) hasta el texto en (x2, y2)
    referencia(x1, y1, x2, y2, t, ly = "TEXTOS") {
      v.line(ly, x1, y1, x2, y2);
      const der = x2 >= x1;
      v.line(ly, x2, y2, x2 + (der ? 1 : -1) * pp(2), y2);
      v.circle(ly, x1, y1, pp(0.4));
      v.text(ly, x2 + (der ? 1 : -1) * pp(3), y2, 2.2, t, der ? 0 : 2, 2);
    },
    // Achurado de corte (líneas a 45°) dentro de un rectángulo
    achurado(x0, y0, x1, y1, sep = 3) {
      const d = pp(sep), w = x1 - x0, h = y1 - y0;
      for (let c = d; c < w + h; c += d) {
        const ax = x0 + Math.max(0, c - h), ay = y0 + Math.min(c, h), bx = x0 + Math.min(c, w), by = y0 + Math.max(0, c - w);
        v.line("ACHURADO", ax, ay, bx, by);
      }
    },
    // Símbolo de nivel (triángulo con cota) en (x, y) con el texto a la derecha
    nivel(x, y, t) {
      const a = pp(2);
      v.poly("NIVELES", [[x, y], [x - a * 0.6, y + a], [x + a * 0.6, y + a]]);
      v.line("NIVELES", x - a * 0.6, y + a, x + pp(16), y + a);
      v.text("NIVELES", x + a, y + a + pp(0.8), 2.2, t);
    },
  };
  return v;
}

const fmtCota = (mm) => Math.round(mm).toLocaleString("es-CL");

function partirTexto(t, n) {
  const out = []; let l = "";
  for (const w of String(t).split(/\s+/)) {
    if (l && (l + " " + w).length > n) { out.push(l); l = w; } else l = l ? l + " " + w : w;
  }
  if (l) out.push(l);
  return out;
}

// Datos de la viñeta: proyecto activo (proyectos.js) o, si no hay, el último calculista y oficina ingresados
async function datosViñeta() {
  const d = { proyecto: "", mandante: "", calculista: "", oficina: "" };
  try {
    if (typeof proyectoActivoId === "function" && proyectoActivoId()) {
      const p = await Proyectos.obtener(proyectoActivoId());
      if (p) Object.assign(d, { proyecto: p.nombre || "", mandante: p.mandante || "", calculista: p.calculista || "", oficina: p.oficina || "" });
    }
  } catch { /* sin proyecto o sin conexión: viñeta con los datos locales */ }
  try { d.calculista ||= localStorage.getItem("auraCalculista") || ""; d.oficina ||= localStorage.getItem("auraOficina") || ""; } catch { /* sin almacenamiento */ }
  return d;
}

async function descargarPlano(plano, nombre) {
  const info = await datosViñeta();
  descargarBlob(new Blob([plano.archivo(info)], { type: "application/dxf" }), nombre);
}
