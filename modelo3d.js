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
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) throw new Error("Este navegador no permite WebGL");
    const ext32 = gl.getExtension("OES_element_index_uint");
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let giro = opciones.giro ?? 0.7, inclinacion = opciones.inclinacion ?? 0.22, ancho = 0, alto = 0;
    let modelo = null, visible = true, arrastre = null, pausaHasta = 0, ultimo = 0, corriendo = false;

    const prog = programa(gl, VS, FS), progL = programa(gl, VS_L, FS_L);
    const u = (p, n) => gl.getUniformLocation(p, n);
    const loc = { aP: gl.getAttribLocation(prog, "aP"), aN: gl.getAttribLocation(prog, "aN"), mvp: u(prog, "uMVP"), v: u(prog, "uV"), color: u(prog, "uColor"), luz: u(prog, "uLuz"),
                  laP: gl.getAttribLocation(progL, "aP"), lmvp: u(progL, "uMVP"), lcolor: u(progL, "uColor") };
    const bufer = (datos, tipo = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(tipo, b); gl.bufferData(tipo, datos, gl.STATIC_DRAW); return b; };

    function subir({ partes, min, max }) {
      const centro = [0, 1, 2].map(k => (min[k] + max[k]) / 2);
      const R = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
      const gpu = partes.filter(p => !(p.ind instanceof Uint32Array) || ext32).map(p => ({
        pos: bufer(p.pos), nor: bufer(p.nor), color: p.color, alfa: p.alfa,
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
      const fovH = 2 * Math.atan(Math.tan(fov / 2) * asp), dist = R / Math.sin(Math.min(fov, fovH) / 2) * (opciones.margen ?? 0.92);
      const V = mul(traslacion(0, 0, -dist), mul(rotX(inclinacion), mul(rotY(giro), traslacion(-centro[0], -centro[1], -centro[2]))));
      const MVP = mul(perspectiva(fov, asp, Math.max(dist - R * 2, R * 0.05), dist + R * 2), V);

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
          if ((p.alfa < 1) !== transparente) continue;
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
      if (!modelo || corriendo || quieto || !visible || document.hidden) return;
      corriendo = true; requestAnimationFrame(cuadro);
    };

    // Arrastrar para girar (mouse o dedo); el desplazamiento vertical de la página sigue funcionando en celulares
    canvas.style.touchAction = "pan-y"; canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", (e) => { arrastre = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
    canvas.addEventListener("pointermove", (e) => {
      if (!arrastre) return;
      giro += (e.clientX - arrastre.x) * 0.01;
      inclinacion = Math.max(-0.05, Math.min(1.2, inclinacion + (e.clientY - arrastre.y) * 0.006));
      arrastre = { x: e.clientX, y: e.clientY };
      if (quieto) dibujar();
    });
    const soltar = () => { if (!arrastre) return; arrastre = null; pausaHasta = performance.now() + 1500; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerup", soltar); canvas.addEventListener("pointercancel", soltar);

    new ResizeObserver(() => { medir(); dibujar(); }).observe(canvas);
    new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; seguir(); }).observe(canvas);
    document.addEventListener("visibilitychange", seguir);
    medir();

    const listo = fetch(opciones.url)
      .then(r => { if (!r.ok) throw new Error(`No se pudo descargar el modelo (${r.status})`); return r.arrayBuffer(); })
      .then(buf => { modelo = subir(leerGLB(buf)); dibujar(); seguir(); });
    return { listo };
  }

  return { montar };
})();
