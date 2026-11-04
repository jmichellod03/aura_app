# AURA — Ingeniería estructural

App web (PWA) de verificación estructural según normas chilenas y AISC. HTML + JavaScript puro,
sin build ni dependencias de npm. Se publica con GitHub Pages desde la rama `main` (carpeta raíz).
Todo el texto de la interfaz, las memorias y los commits va en **español (Chile)**.

## Estructura

- `index.html`: inicio, proyectos y enlaces a cada herramienta.
- Páginas de cálculo, cada una autónoma (HTML + CSS + JS en el mismo archivo):
  - `acero.html`: vigas y columnas laminadas, AISC 360-16 LRFD.
  - `reticulada.html`: vigas reticuladas (cordones, diagonales y montantes), AISC 360-16 LRFD.
    - Formulario en pasos: 1 geometría y acero, 2 cargas, 3 perfiles y longitudes, 4 origen de las solicitaciones.
    - Solicitaciones (`fuente`): por defecto las calcula AURA con `analizar()` (rigidez directa, pórtico plano, misma idealización que el `.s2k`, peso propio en D) y `solicitacionesAura()` (envolventes NCh 3171 por grupo con D, L, Lr, S y W —sin las combinaciones sísmicas, que se declaran en el alcance—, pares (P, M) por barra y combinación para los cordones, flecha en valor absoluto con D + L, D + Lr, D + S y D + W). Alternativa: ingresarlas desde un modelo externo. El `.s2k` sirve para comprobar en SAP2000.
    - Longitudes: L_y del cordón inferior = luz por defecto (`def.ly`); si se reduce y el cordón queda comprimido, el veredicto pide verificar los arriostramientos laterales.
    - Barras a tracción (Cap. D) y compresión (Cap. E, con E5 para ángulos y E6 para 2L).
    - Dos hipótesis de carga (`sModo`): costaneras **sobre los nudos** (barras articuladas, solo carga axial) o **entre nudos** (cordones continuos: ambos cordones a flexocompresión con B1 y H1-1; canales C con F2/F3 y G2, tubos rectangulares con F7 y G4; con otros perfiles quedan "sin verificar" y no dan CUMPLE).
    - Canales en los cordones (`cs_ori`, `ci_ori`): por defecto **alma perpendicular al plano, alas hacia el interior** (`orientarCanal`: x = eje débil del perfil en el plano, simetría fuera del plano, tracción por las alas, flexión F6 y corte G6, ejes locales girados 90° en SAP); opción alma en el plano (F2/F3, G2).
    - La memoria incluye una sección de alcance, hipótesis y limitaciones; no debe concluir "cumple" sobre algo que no se verificó.
    - Geometría en `geometria(tipo, n)`: en la Warren los nudos superiores van a media distancia, para que todos los nudos de los cordones reciban barras.
    - Plano DXF (`generarDXF()`, clase `Dxf`): R12 en Windows-1252, milímetros y por capas; elevación con ejes, contornos, numeración, apoyos y cotas; detalles de secciones ampliados a escala indicada; cuadro de barras con pesos; notas. No dibuja uniones.
    - Exporta el modelo a SAP2000 (`.s2k`, kgf-m, plano XZ, combinaciones NCh 3171 y envolvente ENV). Según la hipótesis, las cargas en kgf/m van como fuerzas en los nudos (todas las barras articuladas, dejando en cada nudo un solo extremo sin liberar para que sea estable) o distribuidas en el cordón superior. El encabezado sigue el formato de SAP2000 v26.
  - `placa.html`: losa con placa colaborante Instadeck 0,8 mm (Cintac).
    - Sigue el procedimiento del fabricante con sus tablas (SDI 1991): Tabla I sobrecarga admisible (columna de la primera luz tabulada ≥ L, sin interpolar), Tabla II deformaciones por número de tramos (más la flecha de servicio con 5qL⁴/384EI y límite L/240, L/300 o L/360: sin alzaprimas, el peso propio sobre la placa sola con E_s·I⁺ y q_D + q_L sobre la compuesta con E_c·I_c; con alzaprimas, todo sobre la compuesta), Tabla III alzaprimado temporal y Tabla IV peso propio y cubicación. Los valores no se recalculan.
    - Espesor `eh`: automático (el menor que cumple la losa) o fijo. La demanda es carga permanente adicional + sobrecarga de uso; el peso propio se suma solo si se marca `ppDem` (la Tabla I ya lo considera). Cargas puntuales: +30 % y aviso de punzonamiento.
    - Malla de retracción ≥ 1,8 cm²/m con s ≤ mín(5e_h ; 45 cm) (ACI 318-08 7.12.2.2); el área se calcula con el diámetro y el espaciamiento de la barra (`dMalla`, `sMalla`). Conectores en los apoyos: Q_n con AISC I8-1 (R_g, R_p) o dato del fabricante; resistencia ≥ 11,2 tf por metro de ancho (nota d de la Tabla I); altura ≥ 38 mm sobre la cresta y recubrimiento ≥ 13 mm (I8.2d); un conector más bajo que el nervio da D/C infinito. f'c ≥ 214 kgf/cm² (21 MPa, I1.3). Sin conectores la losa queda "sin verificar".
    - Viga de apoyo (`serieV`, `perfilV`): catálogo de acero.html (HEA, HEB, IPE, IPN) u "otro" con el área `Asv`. Con perfil del catálogo se verifica d ≤ 2,5 t_f (I8.1) y el ancho del ala para los conectores ((n−1)·4d + 1,6d, I8.2d); estas verificaciones y w_r ≥ 50 mm (I3.2c, con `DECK`) llevan `viga: true`, no cambian el espesor automático y el veredicto las informa como fallas de la viga. Los conectores van en todos los valles (nota d).
    - Plano DXF (`generarDXF()`, clases `Dxf` y `detalle` copiadas de reticulada.html): elevación entre vigas con alzaprimas, elevación de la viga con conectores (si se calcula la viga), cortes A-A y B-B a 5:1 y notas. La geometría de cresta y valle de la placa (`DECK`) es aproximada, medida del dibujo de la ficha.
    - Opcional: conectores de la viga de apoyo con acción compuesta completa (I3.1a, I3-1a/b, I3.2c); no se verifica la flexión de la viga compuesta ni la armadura negativa.
  - `hormigon.html`: ACI 318-08.
  - `muro.html`: muro de contención en voladizo de hormigón armado, por metro de muro. Sigue el procedimiento del curso Diseño de Proyectos de Ingeniería (pautas y ejemplo del profesor, planillas Blockpad del usuario).
    - Geometría: pantalla con trasdós vertical y talud hacia el pie (`ec` en el coronamiento, `eb` en la base), zapata (`Bp`, `Bt`, `Hf`) y dentellón opcional (`bd`, `hd`, `xd` desde la punta). Relleno horizontal (β = 0, ψ = 90°). Ejes: x desde la punta del pie, y desde la base de la zapata.
    - Estabilidad: Rankine (K_a, K_p) con H = H_f + H_m en el plano del talón; volcamiento, deslizamiento (μ = tan(2φ_s/3), c' = 0,5 c_s, pasivo solo en el dentellón, total o nulo según `pasivo`) y tensión de contacto (tercio central o 2N/3x). El pasivo no entra en el momento resistente. `qEstab`: la sobrecarga sobre el talón suma peso estabilizante (como el ejemplo del curso).
    - Sismo: C_sh = 0,5 A_0, C_sv = 0,7 C_sh, K_as de Mononobe-Okabe con δ = 2φ_r/3; ΔDE_a a 2H/3 y ΔDE_q a H/2; fuerzas inerciales C_sh·W (relleno con R_i). FS mínimos editables (por defecto 1,5 / 1,5 / 3 y 1,265 / 1,1 / 2).
    - Diseño ACI 318-08: 1,6 H + 1,0 E; flexión con μ = M_u/(φ 0,85 f'c b d²) y cuantías del curso (0,0018 b d principal, 0,0015 b d cara opuesta, 0,001 b h por cara de repartición, ρ ≤ 0,75 ρ_b); espaciamiento propuesto en múltiplos de 2,5 cm con s ≤ mín(3h ; 45). Pantalla sísmica según `critPant` ("curso": H y todas las fuerzas, conservador; "pantalla": H_m y su inercia). Pie: presión de servicio × 1,6 (o U ponderado en sismo) − 0,9 peso propio, corte a d de la cara (15.5.2). Talón: sin reacción del suelo, 1,2 D + 1,6 L (sismo (1,2 + C_sv) D + 1,0 L).
  - `madera.html`: NCh 1198:2024.
  - `mle.html`: NCh 2165 y NCh 1198.
  - `espectros.html`: NCh 433, DS 117 y NCh 2369.
  - `vial.html` y `rigido.html`: Manual de Carreteras Vol. 3 / AASHTO 93.
- `memo.js`: memoria de cálculo compartida (pasos desplegables con KaTeX, `.tex`, `.zip` para Overleaf con figuras PNG).
- `proyectos.js`: proyectos y elementos guardados (IndexedDB local o Supabase si hay sesión).
- `nube.js`: cliente Supabase y sesión. La clave es la *publishable*, no la de servicio.
- `sw.js`: service worker para uso sin conexión.
- `supabase/`: esquema SQL de la base de datos.

## Convenciones de cálculo

- Unidades internas: **kgf y cm** (tensiones en kgf/cm², momentos en kgf·cm). Las entradas pueden venir en m, mm, kgf·m o tf; se convierten al leer los datos.
- Aceros chilenos: A37-24ES, A42-27ES y A52-34ES; E = 2.100.000 kgf/cm² y G = 810.000 kgf/cm².
- Números en pantalla con `fmt(x, d)` (formato es-CL: coma decimal, punto de miles).
- En LaTeX, usar `` L`...` `` (`String.raw`) y `tn(x, d)` para los números.
- Cada verificación muestra la razón demanda/capacidad (D/C) y la referencia a la ecuación o cláusula de la norma (por ejemplo `"E3-2"` o `"Tabla D3.1"`).
- Clase `Memo` (definida en cada página):
  - `h()`: sección; `sub()`: subsección.
  - `row(k, v, ref)`: fila de resultados.
  - `eq(tex, ref)`: ecuación con valores reemplazados.
  - `p(tex, soloTex)`: párrafo.
  - `note()`: advertencia.
  - `raw()`: LaTeX directo (tablas).
- Validar las entradas con `datosInvalidos(reglas)` de `memo.js`. Con datos inválidos no se calcula y `ultimoTex` queda vacío, para no mostrar un "CUMPLE" falso.
- El veredicto usa la clase `.verdict ok|bad`. Para que `proyectos.js` lea el resumen, el texto debe contener `razón máxima = X`.

## Al agregar o cambiar una página de cálculo

1. **Página:** copiar la cabecera y los estilos de `acero.html` para mantener el aspecto.
2. **Integración con proyectos:** definir `window.AURA_MEMO = { tipo, elemento(), tex(), nombre(), recalcular(valores) }`. Todos los campos del formulario deben estar dentro de `<main>` y tener `id`, porque así se guardan y se restauran.
3. **Registro en la app:**
   - agregar la página a `PAGINAS_CALCULO` en `proyectos.js`;
   - agregar el enlace en `index.html`;
   - agregarla a `ARCHIVOS` en `sw.js`.
4. **Versiones y caché:** al publicar cambios, subir `VERSION` en `sw.js` para que los dispositivos actualicen la copia sin conexión. Si se modifica `memo.js` o `proyectos.js`, subir también el `?v=N` con que lo cargan las páginas.
5. **Recursos externos:** solo KaTeX (cdnjs) y supabase-js (jsdelivr). No agregar otras dependencias externas.

## Catálogos de perfiles

- `acero.html`: catálogo Cintac de laminados HEA, HEB, IPE e IPN (A, I y W del catálogo; Z, J y Cw calculados).
- `reticulada.html`:
  - UPN laminados (A e I de Prodalam / Cintac);
  - canales C y ángulos L plegados Cintac. Las propiedades se calculan con la línea media y un radio interior igual al espesor, y reproducen el peso del catálogo.
  - tubos rectangulares y cuadrados Cintac (sección `R`): línea media con radio interior igual al espesor; para la verificación se usa el espesor de diseño 0,93e (B4.2) y para el modelo SAP el nominal.
- Fuentes: catálogo general Cintac 2020, catálogo Prodalam y catálogo de vigas laminadas Cintac.

## Probar

- Servir la carpeta con `python3 -m http.server` y abrir la página en el navegador. No abrir con `file://`, porque el service worker no funciona así.
- Revisar que no haya errores en la consola y que la memoria `.tex` compile en Overleaf.
- Comprobar a mano al menos un resultado contra la norma cuando se agregue una verificación nueva.
