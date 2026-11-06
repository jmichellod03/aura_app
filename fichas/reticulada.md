# Ficha normativa: Vigas reticuladas

Verifica cordones, diagonales y montantes según AISC 360-16 LRFD. Puede resolver el modelo o recibir solicitaciones externas, y exporta a SAP2000.

Documentos: AISC 360-16 (español).

## Criterios y límites

- La página del PDF de AISC 360-16 es la impresa + 1.
- AISC 360 no cubre el diseño de perfiles plegados: AISI S100 y NCh 427 no están en el proyecto.
- Las combinaciones siguen NCh 3171, que no está en el proyecto: comprobar directamente en la norma.
- No verifica uniones.

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
|  | Área bruta ; área neta: Ag ; An | B4.3 | AISC 360-16 (español) | 78 |
|  | Factor de corte diferido U (…) | D3 | AISC 360-16 (español) | 77 |
|  | Área neta efectiva: Ae | D3-1 | AISC 360-16 (español) | 78 |
|  | Fluencia en la sección bruta: φtPn | D2-1 | AISC 360-16 (español) | 77 |
|  | Ruptura en la sección neta: φtPn | D2-2 | AISC 360-16 (español) | 77 |
|  | Esbeltez en tracción L/r… — recomendado ≤ 300 | D1 | AISC 360-16 (español) | 46 |
|  | Condiciones (4) Lc/r ≤ 200 y (5) bl/bs < 1.7 de la Sección E5 | E5 | AISC 360-16 (español) | 87 |
|  | Tensión de pandeo elástico: Fe | E3-4 | AISC 360-16 (español) | 85 |
|  | Tensión de pandeo elástico por flexión: Fe | E3-4 | AISC 360-16 (español) | 85 |
|  | Pandeo flexo-torsional: b/t ≤ límite de E5 | E5 | AISC 360-16 (español) | 87 |
|  | Pandeo flexo-torsional: b/t > límite de E5 | E5 | AISC 360-16 (español) | 87 |
|  | Fe flexo-torsional (ejes principales, Cw ≈ 0) | E4-4 | AISC 360-16 (español) | 85 |
|  | Esbeltez modificada eje y (pernos de apriete normal): (Lc/r)m | E6-1 | AISC 360-16 (español) | 88 |
|  | Miembro armado: a/ri ≤ 40 → esbeltez sin modificar | E6-2a | AISC 360-16 (español) | 89 |
|  | Esbeltez modificada eje y: (Lc/r)m | E6-2b | AISC 360-16 (español) | 89 |
|  | Pandeo por flexión: Fex ; Fey | E3-4 | AISC 360-16 (español) | 85 |
|  | Pandeo flexo-torsional: Fez ; Fe | E4-3 | AISC 360-16 (español) | 85 |
|  | Tensión crítica (pandeo inelástico): Fcr | E3-2 | AISC 360-16 (español) | 84 |
|  | Tensión crítica (pandeo elástico): Fcr | E3-3 | AISC 360-16 (español) | 84 |
|  | …: ancho efectivo be (E7) | E7-3 | AISC 360-16 (español) | 91 |
|  | Área efectiva: Ae | E7-1 | AISC 360-16 (español) | 91 |
|  | Resistencia de diseño en compresión: φcPn | E7-1 | AISC 360-16 (español) | 91 |
|  | Resistencia de diseño en compresión: φcPn | E3-1 | AISC 360-16 (español) | 84 |
|  | Ala en flexión (caso 10): λ ; λp ; λr | B4.1b | AISC 360-16 (español) | 65 |
|  | Alma en flexión (caso 15): λ ; λp | B4.1b | AISC 360-16 (español) | 65 |
|  | Longitud no arriostrada ; límites (Cb = 1): Lb ; Lp ; Lr | F2-5 | AISC 360-16 (español) | 97 |
|  | Longitud no arriostrada ; límites (Cb = 1): Lb ; Lp ; Lr | F2-6 | AISC 360-16 (español) | 97 |
|  | Pandeo local del ala: Mn (por analogía con F3) | F3-1 | AISC 360-16 (español) | 98 |
|  | Pandeo local del ala: Mn (por analogía con F3) | F3-2 | AISC 360-16 (español) | 99 |
|  | Corte, resistencia de diseño ; razón: φvVn ; Vu/φvVn | G2-1 | AISC 360-16 (español) | 121 |
|  | Fluencia: Mn | F6-1 | AISC 360-16 (español) | 106 |
|  | Alas en flexión del eje débil (caso 10): λ ; λp ; λr | B4.1b | AISC 360-16 (español) | 65 |
|  | Pandeo local de las alas: Mn | F6-2 | AISC 360-16 (español) | 106 |
|  | Pandeo local de las alas: Fcr ; Mn | F6-3 | AISC 360-16 (español) | 106 |
|  | Corte en las alas, resistencia de diseño ; razón: φvVn ; Vu/φvVn | G6-1 | AISC 360-16 (español) | 127 |
|  | Alas en flexión (caso 17): b/t ; λp ; λr | B4.1b | AISC 360-16 (español) | 65 |
|  | Almas en flexión (caso 19): h/t ; λp ; λr | B4.1b | AISC 360-16 (español) | 65 |
|  | Pandeo local del ala: Mn | F7-2 | AISC 360-16 (español) | 107 |
|  | Pandeo local del ala: be ; Se ; Mn | F7-3 | AISC 360-16 (español) | 107 |
|  | Pandeo local del alma: Mn | F7-6 | AISC 360-16 (español) | 108 |
|  | Pandeo lateral-torsional, longitud no arriostrada ; límites (Cb = 1): Lb ; Lp ; Lr | F7-12 | AISC 360-16 (español) | 108 |
|  | Pandeo lateral-torsional, longitud no arriostrada ; límites (Cb = 1): Lb ; Lp ; Lr | F7-13 | AISC 360-16 (español) | 109 |
|  | Corte, resistencia de diseño ; razón: φvVn ; Vu/φvVn | G4-1 | AISC 360-16 (español) | 126 |
|  | Amplificación P-δ, carga crítica elástica: Pe1 | A-8-5 | AISC 360-16 (español) | 307 |
|  | Par controlante (…peor.barra !== "—" ? | A-8-3 | AISC 360-16 (español) | 307 |
|  | Interacción: … ; …Mu/φbMn → D/C | H1-1a | AISC 360-16 (español) | 129 |
|  | Interacción: … ; …Mu/φbMn → D/C | H1-1b | AISC 360-16 (español) | 129 |
