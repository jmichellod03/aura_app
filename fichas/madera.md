# Ficha normativa: Madera aserrada

Verifica envigados, tabiques, pilares y muros de corte según NCh 1198:2024.

Documentos: NCh 1198:2024.

## Criterios y límites

- La página del PDF de NCh 1198 es la impresa + 12.
- NCh 1198 es un PDF escaneado: la página indicada es donde empieza la sección según su índice o tabla, no siempre la del subpunto.
- Muro de corte: la fuerza horizontal de techo con cos α es criterio de la planilla FULL MADERA.
- NCh 432 (viento) y NCh 1537 no están en el proyecto.
- Especies: pino radiata (Tabla U.1) y las siete con tabla propia de madera seca: pino ponderosa (U.2), pino oregón (U.3), eucaliptus nitens (U.4), raulí (U.5), lenga (U.6), roble (U.7) y acacia dealbata (U.8). Las demás especies de la Tabla A.1 no están en la app.
- Las Tablas U.2 a U.8 no dan compresión normal: el calculista ingresa F_cn para madera seca. Para roble se indica como referencia el valor de la Tabla U.10 de su grupo ES4.
- Especies distintas del pino radiata con H ≥ 20 %: solo pino oregón (grupo E5) y roble (grupo E4), que figuran en la Tabla A.1, con la clase estructural de la Tabla U.11 y los valores de la Tabla U.9 (K_H = 1; al F_cn ingresado se aplica 0.67 de la Tabla 4, nota 1). Para las otras cinco no se calcula en estado verde.
- Bajo 20 % de humedad, las especies distintas del pino radiata usan ΔR de "especies en general" (Tabla 3). El pino radiata mantiene su criterio anterior (ΔR hasta 18 % y Tabla 4 sobre 18 %).
- Factor de altura en flexión y tracción para especies distintas del pino radiata: (50/h)^(1/9) (8.2.2.3). El factor de altura en E (8.2.4.2) y el índice E_cn,h son solo de pino radiata.
- Módulo de corte: G = 0.065 E en coníferas y 0.07 E en latifoliadas (Anexo B.3, G_LT).
- Viga maestra: 0.60 E_f es la nota 2 de la Tabla U.1 (pino radiata); la app la aplica también a las otras especies como criterio.

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
| Factores de modificación y propiedades de diseño | Factor de modificación por duración de la carga (PP ; SC piso ; SC techo…): KD | Anexo G | NCh 1198:2024 | 185 |
| Factores de modificación y propiedades de diseño | Factores por trabajo conjunto ; altura en flexión: Kc ; Khf | 7.1.3 | NCh 1198:2024 | 20 |
| Factores de modificación y propiedades de diseño | Factores por trabajo conjunto ; altura en flexión: Kc ; Khf | 8.2.2.3 | NCh 1198:2024 | 25 |
| Flexión por viento — 8.2.2 | Longitud efectiva ; esbeltez ; tensión crítica ; factor de volcamiento: lv ; λv ; FfE ; Kλ | 8.2.2.4 | NCh 1198:2024 | 25 |
| Flexión por viento — 8.2.2 | Esbeltez de volcamiento: λv ≤ 50 | 8.2.2.4 | NCh 1198:2024 | 25 |
| Flexión por viento — 8.2.2 | Factor de modificación por volcamiento: Kλv | 8.2.2.4 | NCh 1198:2024 | 25 |
| Cizalle por viento — 8.2.3 | Tensión de diseño en cizalle: Fcz,dis | 8.2.3 | NCh 1198:2024 | 30 |
| Deformación por viento (flexión y corte) — 8.2.4 | Deformación lateral: δV ≤ L/… | Tabla 6 | NCh 1198:2024 | 32 |
| Flexión y compresión combinadas — combinación … | Tensión de diseño en compresión normal: Fcn,dis | 8.5 | NCh 1198:2024 | 63 |
| Factores de modificación y propiedades de diseño | Factor de modificación por humedad (flexión ; cizalle ; c. normal ; E): KH | 7.1.1 | NCh 1198:2024 | 20 |
| Factores de modificación y propiedades de diseño | Factor de modificación por duración de la carga (…): KD | 7.1.2 | NCh 1198:2024 | 20 |
| Factores de modificación y propiedades de diseño | Factores por trabajo conjunto ; altura en flexión ; altura en E: Kc ; Khf ; KhE | 7.1.3 | NCh 1198:2024 | 20 |
| Factores de modificación y propiedades de diseño | Factores por trabajo conjunto ; altura en flexión ; altura en E: Kc ; Khf ; KhE | 8.2.2.3 | NCh 1198:2024 | 25 |
| Cizalle — 8.2.3 | Factor por rebaje ; tensión de diseño en cizalle: Kr ; Fcz,dis | 8.2.3 | NCh 1198:2024 | 30 |
| Cizalle — 8.2.3 | Factor por rebaje ; tensión de diseño en cizalle: Kr ; Fcz,dis | 8.7 | NCh 1198:2024 | 67 |
| Peso propio solo con duración de carga permanente — 7.1.2 | Factor de duración permanente ; momento ; corte: KD ; MPP ; VPP | 7.1.2 | NCh 1198:2024 | 20 |
| Deformaciones — 8.2.4 | Razón carga permanente/total ; creep ; factor de creep: g/q ; ρ | 8.2.4.11 | NCh 1198:2024 | 31 |
| Deformaciones — 8.2.4 | Deformación por corte ; módulo de corte: G | 8.2.4.12 | NCh 1198:2024 | 31 |
| Deformaciones — 8.2.4 | Deformación total: δSC+PP ≤ δadm | Tabla 6 | NCh 1198:2024 | 32 |
| Deformaciones — 8.2.4 | Deformación por sobrecarga: δSC ≤ δadm | Tabla 6 | NCh 1198:2024 | 32 |
| Vibraciones de piso — 8.2.4.13 | Frecuencia fundamental: f1 ≥ 9 Hz | 8.2.4.13 | NCh 1198:2024 | 31 |
| Factores de modificación y propiedades de diseño | Factor de humedad (c. paralela ; t. paralela ; c. normal ; E): KH | 7.1.1 | NCh 1198:2024 | 20 |
| Factores de modificación y propiedades de diseño | Factor de duración de la carga (viento): KD | Anexo G | NCh 1198:2024 | 185 |
| Factores de modificación y propiedades de diseño | Factor de altura ; concentración de tensiones: Khf ; Kct | 8.2.2.3 | NCh 1198:2024 | 25 |
| Factores de modificación y propiedades de diseño | Factor de altura ; concentración de tensiones: Khf ; Kct | Tabla 11 | NCh 1198:2024 | 62 |
| Compresión paralela en el pie derecho de borde — 12.4.1 y 8.3 | Tensión crítica de pandeo ; factor de pandeo: FcE ; Kλ | 8.3 | NCh 1198:2024 | 49 |
| Tracción paralela en el pie derecho de borde — 12.4.2 y 8.4 | Tracción paralela: ftp / Ftp,dis | 8.4 | NCh 1198:2024 | 61 |
| Corte en el plano del muro — 12.4.7 a 12.4.10 | Capacidad admisible (…, Sct = … mm): Vc | 12.4.7 | NCh 1198:2024 | 161 |
| Corte en el plano del muro — 12.4.7 a 12.4.10 | Relación de aspecto ; factores: h/b ; KFRA ; Kn | 12.4.9 | NCh 1198:2024 | 161 |
| Corte en el plano del muro — 12.4.7 a 12.4.10 | Relación de aspecto ; factores: h/b ; KFRA ; Kn | 12.4.10 | NCh 1198:2024 | 161 |
| Corte en el plano del muro — 12.4.7 a 12.4.10 | Corte en el plano: vc / Vc,dis | 12.4.8 | NCh 1198:2024 | 161 |
| Desplazamiento lateral del muro — 12.5 | Rigidez aparente de diseño: Ga,dis | 12.5.1 | NCh 1198:2024 | 164 |
| Compresión normal en la solera inferior — 12.4.4 y 8.5 | Compresión normal: fcn / Fcn,dis | 8.5 | NCh 1198:2024 | 63 |
| Propiedades mecánicas admisibles (otras especies) | Tensiones admisibles y módulo de elasticidad: pino ponderosa, pino oregón, eucaliptus nitens | Tablas U.2, U.3, U.4 | NCh 1198:2024 | 226 |
| Propiedades mecánicas admisibles (otras especies) | Tensiones admisibles y módulo de elasticidad: raulí, lenga, roble | Tablas U.5, U.6, U.7 | NCh 1198:2024 | 227 |
| Propiedades mecánicas admisibles (otras especies) | Tensiones admisibles y módulo de elasticidad: acacia dealbata; clases estructurales en estado verde | Tablas U.8, U.9 | NCh 1198:2024 | 228 |
| Propiedades mecánicas admisibles (otras especies) | Clase estructural en estado verde según grupo y grado; referencia de F_cn | Tablas U.10, U.11 | NCh 1198:2024 | 229 |
| Propiedades mecánicas admisibles (otras especies) | Grupo de pino oregón y roble | Tabla A.1 | NCh 1198:2024 | 174 |
| Factores de modificación y propiedades de diseño | Factor de humedad, especies en general: ΔR | Tabla 3 | NCh 1198:2024 | 21 |
| Factores de modificación y propiedades de diseño | Factor de altura, especies distintas del pino radiata: Khf | 8.2.2.3 | NCh 1198:2024 | 28 |
| Pandeo | Coeficiente de proporcionalidad para grados N°1 y N°2: c | Tabla 9 | NCh 1198:2024 | 51 |
| Deformaciones | Módulo de corte en coníferas y latifoliadas: G | Anexo B.3 | NCh 1198:2024 | 175 |
