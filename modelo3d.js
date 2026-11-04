// Visor 3D liviano y sin dependencias: lee un modelo .glb (glTF 2.0 binario, sin texturas) y lo dibuja con WebGL,
// girando solo y con arrastre para orbitar. Usa POSITION, NORMAL, índices, jerarquía de nodos y el color base de
// cada material (con transparencia para el vidrio).
// Uso: Modelo3D.montar(canvas, { url: "modelos/torre.glb" }).listo  → promesa que falla si no hay WebGL o el archivo
"use strict";
const Modelo3D = (() => {
  // ---------- Matrices 4×4 por columnas (como glTF) ----------
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  };
  const identidad = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const traslacion = (x, y, z) => { const m = identidad(); m[12] = x; m[13] = y; m[14] = z; return m; };
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const perspectiva = (fov, asp, n, f) => {
    const t = 1 / Math.tan(fov / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f);
    return m;
  };
  // Nodo glTF: matriz directa o traslación · rotación (cuaternión) · escala
  function matrizNodo(nd) {
    if (nd.matrix) return new Float32Array(nd.matrix);
    const [x, y, z, w] = nd.rotation || [0, 0, 0, 1], [sx, sy, sz] = nd.scale || [1, 1, 1], [tx, ty, tz] = nd.translation || [0, 0, 0];
    return new Float32Array([
      (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
      2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
      2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
      tx, ty, tz, 1]);
  }

  // ---------- Lectura del .glb ----------
  const TIPOS = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
  const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  function leerGLB(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error("El archivo no es un .glb");
    const lj = dv.getUint32(12, true);
    const g = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, lj)));
    const ini = 20 + lj + 8;
    const acceso = (i) => {
      const a = g.accessors[i], bv = g.bufferViews[a.bufferView], T = TIPOS[a.componentType], n = COMP[a.type];
      const off = ini + (bv.byteOffset || 0) + (a.byteOffset || 0), paso = bv.byteStride || 0;
      if (!paso || paso === n * T.BYTES_PER_ELEMENT) return new T(buf.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT));
      const out = new T(a.count * n), src = new T(buf.slice(off, off + paso * (a.count - 1) + n * T.BYTES_PER_ELEMENT)), k = paso / T.BYTES_PER_ELEMENT;
      for (let i = 0; i < a.count; i++) for (let j = 0; j < n; j++) out[i * n + j] = src[i * k + j];
      return out;
    };
    // Geometría en coordenadas del mundo (se aplica la jerarquía una sola vez al cargar)
    const partes = [], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const recorrer = (i, padre) => {
      const nd = g.nodes[i], M = mul(padre, matrizNodo(nd));
      if (nd.mesh != null) for (const p of g.meshes[nd.mesh].primitives) {
        if ((p.mode ?? 4) !== 4) continue;
        const P = acceso(p.attributes.POSITION), N = p.attributes.NORMAL != null ? acceso(p.attributes.NORMAL) : null;
        const pos = new Float32Array(P.length), nor = new Float32Array(P.length);
        for (let v = 0; v < P.length; v += 3) {
          const x = P[v], y = P[v + 1], z = P[v + 2];
          for (let k = 0; k < 3; k++) {
            const w = M[k] * x + M[4 + k] * y + M[8 + k] * z + M[12 + k];
            pos[v + k] = w; if (w < min[k]) min[k] = w; if (w > max[k]) max[k] = w;
          }
          if (N) {
            const a = N[v], b = N[v + 1], c = N[v + 2];
            const nx = M[0] * a + M[4] * b + M[8] * c, ny = M[1] * a + M[5] * b + M[9] * c, nz = M[2] * a + M[6] * b + M[10] * c, l = Math.hypot(nx, ny, nz) || 1;
            nor[v] = nx / l; nor[v + 1] = ny / l; nor[v + 2] = nz / l;
          } else nor[v + 1] = 1;
        }
        const mat = g.materials?.[p.material] || {}, f = mat.pbrMetallicRoughness?.baseColorFactor || [0.6, 0.6, 0.6, 1];
        const color = [0, 1, 2].map(k => Math.pow(f[k], 1 / 2.2));             // lineal → sRGB
        const alfa = mat.alphaMode === "BLEND" ? f[3] : 1;
        partes.push({ pos, nor, ind: p.indices != null ? acceso(p.indices) : null, color, alfa });
      }
      for (const h of nd.children || []) recorrer(h, M);
    };
    for (const r of g.scenes[g.scene || 0].nodes) recorrer(r, identidad());
    return { partes, min, max };
  }

  // ---------- WebGL ----------
  const VS = `attribute vec3 aP; attribute vec3 aN; uniform mat4 uMVP; uniform mat4 uV; varying vec3 vN;
    void main() { vN = (uV * vec4(aN, 0.0)).xyz; gl_Position = uMVP * vec4(aP, 1.0); }`;
  const FS = `precision mediump float; uniform vec4 uColor; uniform float uLuz; varying vec3 vN;
    void main() {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      float d = max(dot(n, normalize(vec3(-0.45, 0.65, 0.6))), 0.0), cielo = 0.5 + 0.5 * n.y;
      vec3 c = uColor.rgb * (0.45 + 0.35 * cielo + 0.7 * d) * uLuz;
      gl_FragColor = vec4(c * uColor.a, uColor.a);
    }`;
  const VS_L = `attribute vec3 aP; uniform mat4 uMVP; void main() { gl_Position = uMVP * vec4(aP, 1.0); }`;
  const FS_L = `precision mediump float; uniform vec4 uColor; void main() { gl_FragColor = vec4(uColor.rgb * uColor.a, uColor.a); }`;

  function programa(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [tipo, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  // Nunca lanza: cualquier falla (sin WebGL, shader, archivo) llega como rechazo de "listo"
  function montar(canvas, opciones = {}) {
    try { return montarVisor(canvas, opciones); } catch (e) { return { listo: Promise.reject(e) }; }
  }

  function montarVisor(canvas, opciones) {
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: !!opciones.captura });
    if (!gl) throw new Error("Este navegador no permite WebGL");
    const ext32 = gl.getExtension("OES_element_index_uint");
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const autoGiro = opciones.girar !== false;
    let giro = opciones.giro ?? 0.7, inclinacion = opciones.inclinacion ?? 0.22, ancho = 0, alto = 0, zoom = 1;
    let modelo = null, visible = true, arrastre = null, pausaHasta = 0, ultimo = 0, corriendo = false;
    const ocultos = new Set();                 // grupos ocultos (por ejemplo "hormigon" para ver la armadura)
    const punteros = new Map();                // para el zoom con dos dedos

    const prog = programa(gl, VS, FS), progL = programa(gl, VS_L, FS_L);
    const u = (p, n) => gl.getUniformLocation(p, n);
    const loc = { aP: gl.getAttribLocation(prog, "aP"), aN: gl.getAttribLocation(prog, "aN"), mvp: u(prog, "uMVP"), v: u(prog, "uV"), color: u(prog, "uColor"), luz: u(prog, "uLuz"),
                  laP: gl.getAttribLocation(progL, "aP"), lmvp: u(progL, "uMVP"), lcolor: u(progL, "uColor") };
    const bufer = (datos, tipo = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(tipo, b); gl.bufferData(tipo, datos, gl.STATIC_DRAW); return b; };

    function subir({ partes, min, max }) {
      const centro = [0, 1, 2].map(k => (min[k] + max[k]) / 2);
      const R = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
      const gpu = partes.filter(p => !(p.ind instanceof Uint32Array) || ext32).map(p => ({
        pos: bufer(p.pos), nor: bufer(p.nor), color: p.color, alfa: p.alfa, grupo: p.grupo,
        ind: p.ind && bufer(p.ind, gl.ELEMENT_ARRAY_BUFFER), n: p.ind ? p.ind.length : p.pos.length / 3,
        tipo: p.ind instanceof Uint32Array ? gl.UNSIGNED_INT : p.ind instanceof Uint8Array ? gl.UNSIGNED_BYTE : gl.UNSIGNED_SHORT }));
      // Retícula del suelo, como un plano
      const L = R * 1.1, paso = L / 6, y = min[1], lin = [];
      for (let i = -6; i <= 6; i++) {
        const t = i * paso;
        lin.push(centro[0] + t, y, centro[2] - L, centro[0] + t, y, centro[2] + L, centro[0] - L, y, centro[2] + t, centro[0] + L, y, centro[2] + t);
      }
      return { gpu, centro, R, reticula: bufer(new Float32Array(lin)), nLin: lin.length / 3 };
    }

    function medir() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = r.width; alto = r.height;
      canvas.width = Math.max(1, Math.round(ancho * dpr)); canvas.height = Math.max(1, Math.round(alto * dpr));
    }

    function dibujar() {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!modelo || !ancho || !alto) return;
      const { centro, R } = modelo, asp = ancho / alto, fov = 0.6;
      const fovH = 2 * Math.atan(Math.tan(fov / 2) * asp), dist = R / Math.sin(Math.min(fov, fovH) / 2) * (opciones.margen ?? 0.92) * zoom;
      const V = mul(traslacion(0, 0, -dist), mul(rotX(inclinacion), mul(rotY(giro), traslacion(-centro[0], -centro[1], -centro[2]))));
      const MVP = mul(perspectiva(fov, asp, Math.max(dist - R * 2, R * 0.01), dist + R * 2), V);

      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(progL);
      gl.uniformMatrix4fv(loc.lmvp, false, MVP); gl.uniform4f(loc.lcolor, 0, 0, 0.545, 0.16);
      gl.bindBuffer(gl.ARRAY_BUFFER, modelo.reticula); gl.enableVertexAttribArray(loc.laP); gl.vertexAttribPointer(loc.laP, 3, gl.FLOAT, false, 0, 0);
      gl.depthMask(false); gl.drawArrays(gl.LINES, 0, modelo.nLin); gl.depthMask(true);

      gl.useProgram(prog);
      gl.uniformMatrix4fv(loc.mvp, false, MVP); gl.uniformMatrix4fv(loc.v, false, V); gl.uniform1f(loc.luz, opciones.luz ?? 1.15);
      gl.enableVertexAttribArray(loc.aP); gl.enableVertexAttribArray(loc.aN);
      for (const transparente of [false, true]) {                  // primero lo opaco; el vidrio después, sin escribir profundidad
        gl.depthMask(!transparente);
        for (const p of modelo.gpu) {
          if ((p.alfa < 1) !== transparente || ocultos.has(p.grupo)) continue;
          gl.uniform4f(loc.color, p.color[0], p.color[1], p.color[2], p.alfa);
          gl.bindBuffer(gl.ARRAY_BUFFER, p.pos); gl.vertexAttribPointer(loc.aP, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, p.nor); gl.vertexAttribPointer(loc.aN, 3, gl.FLOAT, false, 0, 0);
          if (p.ind) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.ind); gl.drawElements(gl.TRIANGLES, p.n, p.tipo, 0); }
          else gl.drawArrays(gl.TRIANGLES, 0, p.n);
        }
      }
      gl.depthMask(true);
    }

    // Un solo bucle de animación; se detiene fuera de pantalla, con la pestaña oculta y con "reducir movimiento"
    function cuadro(t) {
      const dt = ultimo ? Math.min(t - ultimo, 50) : 0; ultimo = t;
      if (!arrastre && t > pausaHasta) giro += dt * 0.00025;
      dibujar();
      if (visible && !document.hidden) requestAnimationFrame(cuadro); else { corriendo = false; ultimo = 0; }
    }
    const seguir = () => {
      if (!modelo || corriendo || quieto || !autoGiro || !visible || document.hidden) return;
      corriendo = true; requestAnimationFrame(cuadro);
    };
    // Sin giro automático se dibuja solo cuando algo cambia (en el próximo cuadro, una vez)
    let pedido = false;
    const redibujar = () => { if (corriendo || pedido) return; pedido = true; requestAnimationFrame(() => { pedido = false; dibujar(); }); };

    // Arrastrar para girar (mouse o dedo), rueda o dos dedos para acercar; con un dedo la página sigue desplazándose
    canvas.style.touchAction = opciones.zoom ? "none" : "pan-y"; canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", (e) => {
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      arrastre = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!arrastre) return;
      if (opciones.zoom && punteros.size === 2 && punteros.has(e.pointerId)) {
        const [a, b] = [...punteros.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
        punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [c, d] = [...punteros.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y);
        if (d0 > 0 && d1 > 0) zoom = Math.max(0.08, Math.min(4, zoom * d0 / d1));
        redibujar(); return;
      }
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      giro += (e.clientX - arrastre.x) * 0.01;
      inclinacion = Math.max(-1.55, Math.min(1.55, inclinacion + (e.clientY - arrastre.y) * 0.006));
      arrastre = { x: e.clientX, y: e.clientY };
      redibujar();
    });
    const soltar = (e) => { punteros.delete(e.pointerId); if (!arrastre || punteros.size) return; arrastre = null; pausaHasta = performance.now() + 1500; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerup", soltar); canvas.addEventListener("pointercancel", soltar);
    if (opciones.zoom) canvas.addEventListener("wheel", (e) => { e.preventDefault(); zoom = Math.max(0.08, Math.min(4, zoom * Math.exp(e.deltaY * 0.0012))); redibujar(); }, { passive: false });

    // En el cuadro siguiente: cambiar el tamaño del canvas dentro del aviso provocaría un bucle de ResizeObserver
    new ResizeObserver(() => requestAnimationFrame(() => { medir(); dibujar(); })).observe(canvas);
    new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; seguir(); }).observe(canvas);
    document.addEventListener("visibilitychange", seguir);
    medir();

    const borrar = () => { if (modelo) { for (const p of modelo.gpu) { gl.deleteBuffer(p.pos); gl.deleteBuffer(p.nor); if (p.ind) gl.deleteBuffer(p.ind); } gl.deleteBuffer(modelo.reticula); } };
    const listo = opciones.url
      ? fetch(opciones.url)
        .then(r => { if (!r.ok) throw new Error(`No se pudo descargar el modelo (${r.status})`); return r.arrayBuffer(); })
        .then(buf => { modelo = subir(leerGLB(buf)); dibujar(); seguir(); })
      : Promise.resolve();
    const VISTAS = { iso: [0.7, 0.45], frente: [0, 0], lado: [Math.PI / 2, 0], planta: [0, 1.55] };
    return {
      listo,
      // Reemplaza la geometría (de Geo3D.armar) conservando la vista y el acercamiento
      fijar(geo) { borrar(); modelo = subir(geo); redibujar(); seguir(); },
      vista(nombre) { const v = VISTAS[nombre]; if (!v) return; [giro, inclinacion] = v; zoom = 1; redibujar(); },
      acercar(f) { zoom = Math.max(0.08, Math.min(4, zoom * f)); redibujar(); },
      mostrar(grupo, si) { if (si) ocultos.delete(grupo); else ocultos.add(grupo); redibujar(); },
      // Imagen PNG de la vista actual (requiere opciones.captura para conservar el búfer)
      capturar() { dibujar(); return canvas.toDataURL("image/png"); },
    };
  }

  return { montar };
})();

// ---------------------------------------------------------------------------
// Geometría paramétrica para los modelos de las herramientas: cajas, extrusiones de un contorno (perfiles con
// acuerdos, losas, muros) y tubos (barras de armadura, conectores). Unidades libres (las páginas usan mm);
// x = largo del elemento, y = vertical, z = ancho. Colores en sRGB 0–1 por material.
// ---------------------------------------------------------------------------
const Geo3D = (() => {
  const MAT = {
    acero: [0.40, 0.46, 0.56], hormigon: [0.74, 0.74, 0.72], armadura: [0.72, 0.26, 0.14], madera: [0.80, 0.62, 0.38],
    mle: [0.86, 0.70, 0.46], mle2: [0.76, 0.58, 0.35], osb: [0.86, 0.76, 0.52], placa: [0.66, 0.70, 0.76], suelo: [0.60, 0.50, 0.36],
    relleno: [0.70, 0.60, 0.44], asfalto: [0.22, 0.22, 0.24], base: [0.76, 0.69, 0.56], subbase: [0.66, 0.59, 0.46], subrasante: [0.55, 0.45, 0.32],
    critico: [0.90, 0.36, 0.0],
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // Acumula triángulos por (material, transparencia, grupo)
  class Escena {
    constructor() { this.capas = new Map(); }
    _capa(mat, alfa, grupo) {
      const k = `${mat}|${alfa}|${grupo}`;
      if (!this.capas.has(k)) this.capas.set(k, { color: Array.isArray(mat) ? mat : MAT[mat] || MAT.acero, alfa, grupo, p: [], n: [] });
      return this.capas.get(k);
    }
    // Triángulo con normal plana (o normales por vértice si se dan)
    tri(o, a, b, c, na) {
      const c0 = this._capa(o.mat, o.alfa ?? 1, o.grupo || o.mat), n = na || norm(cruz(sub(b, a), sub(c, a)));
      c0.p.push(...a, ...b, ...c);
      if (na) c0.n.push(...na[0], ...na[1], ...na[2]); else c0.n.push(...n, ...n, ...n);
    }
    quad(o, a, b, c, d) { this.tri(o, a, b, c); this.tri(o, a, c, d); }
    caja(o, x0, x1, y0, y1, z0, z1) {
      const P = (x, y, z) => [x, y, z];
      const v = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
      for (const [a, b, c, d] of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]]) this.quad(o, v[a], v[b], v[c], v[d]);
    }
    // Extrusión de un contorno 2D (lista de [u, v], sin repetir el primero) entre w0 y w1;
    // aPunto(u, v, w) → [x, y, z] define la orientación (por defecto contorno en el plano z-y, extruido en x)
    extruir(o, contorno, w0, w1, aPunto = (u, v, w) => [w, v, u]) {
      const pts = area(contorno) < 0 ? contorno.slice().reverse() : contorno;
      const tris = triangular(pts);
      const A = (i, w) => aPunto(pts[i][0], pts[i][1], w);
      for (const [i, j, k] of tris) { this.tri(o, A(i, w0), A(k, w0), A(j, w0)); this.tri(o, A(i, w1), A(j, w1), A(k, w1)); }
      for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; this.quad(o, A(i, w0), A(j, w0), A(j, w1), A(i, w1)); }
    }
    // Tubo circular de radio r entre p1 y p2 (barras, conectores)
    tubo(o, p1, p2, r, lados = 10) {
      const eje = norm(sub(p2, p1)), ref = Math.abs(eje[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = norm(cruz(eje, ref)), w = cruz(eje, u), anillo = [];
      for (let i = 0; i < lados; i++) { const t = i / lados * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t); anillo.push([u[0] * c + w[0] * s, u[1] * c + w[1] * s, u[2] * c + w[2] * s]); }
      for (let i = 0; i < lados; i++) {
        const j = (i + 1) % lados, n1 = anillo[i], n2 = anillo[j];
        const a = [p1[0] + n1[0] * r, p1[1] + n1[1] * r, p1[2] + n1[2] * r], b = [p1[0] + n2[0] * r, p1[1] + n2[1] * r, p1[2] + n2[2] * r];
        const c = [p2[0] + n2[0] * r, p2[1] + n2[1] * r, p2[2] + n2[2] * r], d = [p2[0] + n1[0] * r, p2[1] + n1[1] * r, p2[2] + n1[2] * r];
        this.tri(o, a, b, c, [n1, n2, n2]); this.tri(o, a, c, d, [n1, n2, n1]);
      }
    }
    // Barra por una polilínea (tramos rectos); los dobleces se pasan ya discretizados con arco()
    barra(o, pts, r) { for (let i = 1; i < pts.length; i++) this.tubo(o, pts[i - 1], pts[i], r, 8); }
    // Geometría lista para Modelo3D: { partes, min, max }
    armar() {
      const partes = [], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (const c of this.capas.values()) {
        if (!c.p.length) continue;
        for (let i = 0; i < c.p.length; i += 3) for (let k = 0; k < 3; k++) { const v = c.p[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
        partes.push({ pos: new Float32Array(c.p), nor: new Float32Array(c.n), ind: null, color: c.color, alfa: c.alfa, grupo: c.grupo });
      }
      if (!partes.length) { min.fill(0); max.fill(1); }
      return { partes, min, max };
    }
  }

  // Puntos de un arco en el plano dado por los vectores e1, e2 (centro c, radio r, ángulos en radianes)
  function arco(c, e1, e2, r, a0, a1, n = 8) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n, x = Math.cos(t) * r, y = Math.sin(t) * r; out.push([c[0] + e1[0] * x + e2[0] * y, c[1] + e1[1] * x + e2[1] * y, c[2] + e1[2] * x + e2[2] * y]); }
    return out;
  }
  function area(p) { let s = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; s += p[i][0] * p[j][1] - p[j][0] * p[i][1]; } return s / 2; }
  // Triangulación por recorte de orejas (contornos simples en sentido antihorario)
  function triangular(p) {
    const idx = p.map((_, i) => i), out = [];
    const cruzZ = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const dentro = (q, a, b, c) => cruzZ(a, b, q) >= 0 && cruzZ(b, c, q) >= 0 && cruzZ(c, a, q) >= 0;
    let guarda = 0;
    while (idx.length > 3 && guarda++ < 10000) {
      let hecho = false;
      for (let i = 0; i < idx.length; i++) {
        const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
        const a = p[ia], b = p[ib], c = p[ic];
        if (cruzZ(a, b, c) <= 1e-12) continue;
        if (idx.some(k => k !== ia && k !== ib && k !== ic && dentro(p[k], a, b, c))) continue;
        out.push([ia, ib, ic]); idx.splice(i, 1); hecho = true; break;
      }
      if (!hecho) break;
    }
    if (idx.length === 3) out.push(idx.slice());
    return out;
  }
  // Contorno de un perfil doble T con acuerdos (centrado; u = ancho, v = alto)
  function dobleT(b, h, tw, tf, r, n = 5) {
    const B = b / 2, H = h / 2, W = tw / 2, out = [[-B, -H], [B, -H], [B, -H + tf]];
    const esquina = (cx, cy, a0, a1) => { for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } };
    esquina(W + r, -H + tf + r, -Math.PI / 2, -Math.PI);
    esquina(W + r, H - tf - r, Math.PI, Math.PI / 2);
    out.push([B, H - tf], [B, H], [-B, H], [-B, H - tf]);
    esquina(-W - r, H - tf - r, Math.PI / 2, 0);
    esquina(-W - r, -H + tf + r, 0, -Math.PI / 2);
    out.push([-B, -H + tf]);
    return out;
  }
  return { Escena, MAT, arco, dobleT, triangular };
})();

// ---------------------------------------------------------------------------
// Zona "Vista del elemento" de las páginas de cálculo: el dibujo 2D de la página (copia) y el modelo 3D lado a lado,
// actualizados solos cuando cambian los resultados (se observa el DOM; no se tocan las funciones de cálculo).
//   Zona2D3D.montar({ antes: elemento, fuente2D: () => svg | null, construir: () => Geo3D.Escena | null,
//                     observar: [elementos], capas: [["hormigon", "Hormigón"], ...] })
// ---------------------------------------------------------------------------
const Zona2D3D = (() => {
  function montar({ antes, fuente2D, construir, observar = [], capas = [], titulo = "Vista del elemento" }) {
    const z = document.createElement("section");
    z.className = "zona23"; z.setAttribute("data-sin-figura", "");          // la copia 2D no cuenta como figura de la memoria
    z.innerHTML = `<div class="z23-cab"><b>${titulo}</b>
        <div class="z23-modo" role="group" aria-label="Vista"><button type="button" data-m="2d">2D</button><button type="button" data-m="3d">3D</button><button type="button" data-m="ambos">2D + 3D</button></div></div>
      <div class="z23-cuerpo">
        <div class="z23-2d"></div>
        <div class="z23-3d"><canvas aria-label="Modelo 3D del elemento" role="img"></canvas>
          <div class="z23-bar">
            <button type="button" data-v="iso" title="Vista isométrica">Iso</button><button type="button" data-v="frente">Frente</button><button type="button" data-v="lado">Lado</button><button type="button" data-v="planta">Planta</button>
            <button type="button" data-z="0.8" title="Acercar">+</button><button type="button" data-z="1.25" title="Alejar">−</button>
            ${capas.map(([g, t]) => `<label><input type="checkbox" data-g="${g}" checked> ${t}</label>`).join("")}
          </div>
          <small class="z23-nota">Arrastre para girar · rueda o dos dedos para acercar · escala real</small>
        </div>
      </div>`;
    antes.parentNode.insertBefore(z, antes);
    const p2 = z.querySelector(".z23-2d"), canvas = z.querySelector("canvas");
    let visor = null;
    try { visor = Modelo3D.montar(canvas, { girar: false, zoom: true, captura: true, giro: 0.6, inclinacion: 0.42, margen: 1.02, luz: 1.05 }); }
    catch { /* sin WebGL */ }
    if (!visor || !visor.fijar) z.querySelector(".z23-3d").innerHTML = `<p class="z23-vacio">Este navegador no permite mostrar el modelo 3D (WebGL).</p>`;

    // Modo de vista: en pantallas angostas se parte en 3D para no duplicar el dibujo de la página
    const modo = (m) => { z.dataset.modo = m; z.querySelectorAll(".z23-modo button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m)); };
    z.querySelectorAll(".z23-modo button").forEach(b => b.addEventListener("click", () => modo(b.dataset.m)));
    modo(matchMedia("(max-width: 900px)").matches ? "3d" : "ambos");
    z.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => visor?.vista?.(b.dataset.v)));
    z.querySelectorAll("[data-z]").forEach(b => b.addEventListener("click", () => visor?.acercar?.(+b.dataset.z)));
    z.querySelectorAll("[data-g]").forEach(c => c.addEventListener("change", () => visor?.mostrar?.(c.dataset.g, c.checked)));

    let pendiente = null;
    function actualizar() {
      clearTimeout(pendiente);
      pendiente = setTimeout(() => {
        // 2D: copia del dibujo de la página, sin ids (evita duplicados; los marcadores siguen resolviéndose)
        const s = fuente2D && fuente2D();
        p2.innerHTML = "";
        if (s) {
          const c = s.cloneNode(true);
          c.removeAttribute("id"); c.querySelectorAll("[id]").forEach(e => { if (!e.closest("defs")) e.removeAttribute("id"); });
          c.removeAttribute("role"); p2.appendChild(c);
        } else p2.innerHTML = `<p class="z23-vacio">Sin dibujo 2D para este elemento.</p>`;
        // 3D
        if (visor?.fijar) {
          let esc = null;
          try { esc = construir(); } catch (e) { console.error(e); }
          if (esc) visor.fijar(esc.armar());
          z.classList.toggle("z23-sin3d", !esc);
        }
      }, 120);
    }
    const obs = new MutationObserver(actualizar);
    for (const el of observar) if (el) obs.observe(el, { childList: true, subtree: true, characterData: true });
    actualizar();
    const zona = {
      actualizar,
      // PNG de la vista 3D si está a la vista (la página puede tener más de una zona, como hormigón con viga y losa)
      capturar: () => (visor?.capturar && !z.classList.contains("z23-sin3d") && canvas.getBoundingClientRect().width > 0 ? visor.capturar() : null),
    };
    zonas.push(zona);
    return zona;
  }
  // Para la memoria (memo.js): imagen 3D de la primera zona visible
  const zonas = [];
  window.AURA_3D = () => { for (const zn of zonas) { const u = zn.capturar(); if (u) return u; } return null; };
  return { montar };
})();
