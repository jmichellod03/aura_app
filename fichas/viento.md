# Ficha normativa: Cargas de viento (versión de prueba)

Determina cargas de viento sobre edificios de planta rectangular según la NCh 432:2025: presión de velocidad, sistema principal (procedimiento direccional o envolvente), carga sobre un marco transversal, fuerzas por piso y componentes y revestimientos. No verifica elementos: entrega cargas de servicio.

Documentos: NCh 432:2025.

## Criterios y límites

- La página del PDF de la NCh 432:2025 es la impresa + 9.
- Versión de prueba: sin validar contra ejemplos publicados.
- Edificios rígidos (G = 0.85 por defecto), de forma regular, con techo plano, a dos aguas o de pendiente única y θ ≤ 45°.
- La zona de viento, la exposición y el cerramiento los elige el usuario.
- La altura media h es la del alero con θ ≤ 10° en techos planos y a dos aguas; en pendiente única siempre es la media.
- La presión interna se evalúa con q_h; no se aplica el factor R_i (5.11.1).
- Direccional: no se aplica la reducción por área del coeficiente −1.3 del techo (Figura 4, nota b).
- Envolvente: solo edificios de baja altura con techo plano o a dos aguas; los casos de torsión se informan por zona, sin desarrollar.
- Fuerzas por piso: altura tributaria hasta la mitad de los pisos vecinos; si rige la carga mínima, las fuerzas se amplifican en proporción (criterio de AURA).
- Componentes: Parte 1 (h ≤ 18.3 m) y Parte 2 (h > 18.3 m, con q_h en todas las zonas). Pendiente única con θ > 30° queda sin verificar.
- No incluye parapetos, aleros, marquesinas, equipos de techo, edificios abiertos ni otras estructuras (cláusula 8).
- NCh 3171 no está en el proyecto.

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
| Parámetros del sitio | Velocidad básica del viento: V | Tabla 1 | NCh 432:2025 | 21 |
| Parámetros del sitio | Velocidad básica del viento: V (estudio de viento) | 5.3.2 | NCh 432:2025 | 26 |
| Parámetros del sitio | Factor de importancia: I | Tabla 2 | NCh 432:2025 | 21 |
| Parámetros del sitio | Factor de direccionalidad: Kd | Tabla 3 | NCh 432:2025 | 27 |
| Parámetros del sitio | Exposición: α ; zg ; zmín | Tabla 6 | NCh 432:2025 | 34 |
| Parámetros del sitio | Categorías de exposición | 5.5.3 | NCh 432:2025 | 28 |
| Parámetros del sitio | Factor de elevación del suelo: Ke | Tabla 4 | NCh 432:2025 | 32 |
| Parámetros del sitio | Condiciones del efecto topográfico: H/Lh | 5.6.1 | NCh 432:2025 | 29 |
| Parámetros del sitio | Factores K1 ; K2 ; K3 | Figura 3 | NCh 432:2025 | 30–31 |
| Parámetros del sitio | Factor topográfico: Kzt | Ec. (1), 5.6.2 | NCh 432:2025 | 29 |
| Presión de velocidad | Altura media del techo: h | 3.2 | NCh 432:2025 | 11 |
| Presión de velocidad | Coeficiente de exposición: Kh, Kz | Tabla 5 | NCh 432:2025 | 33 |
| Presión de velocidad | Presión de velocidad: qh, qz | Ec. (2) | NCh 432:2025 | 32 |
| Efecto de ráfaga y presión interna | Factor de efecto de ráfaga: G | 5.9.2 | NCh 432:2025 | 34 |
| Efecto de ráfaga y presión interna | Coeficiente de presión interna: GCpi | Tabla 7 | NCh 432:2025 | 35 |
| Sistema principal: direccional | Presión de diseño: p | Ec. (4), 6.3.1 | NCh 432:2025 | 37 |
| Sistema principal: direccional | Coeficientes Cp de muros y techos | Figura 4 | NCh 432:2025 | 40–42 |
| Sistema principal: direccional | Casos de carga y torsión: Mz caso 2 | Figura 11 | NCh 432:2025 | 53–54 |
| Sistema principal: direccional | Carga mínima de diseño | 6.1.5 | NCh 432:2025 | 36 |
| Sistema principal: envolvente | Edificio de baja altura | 3 (definición) | NCh 432:2025 | 12 |
| Sistema principal: envolvente | Presión de diseño: p | Ec. (7), 7.3.1 | NCh 432:2025 | 56 |
| Sistema principal: envolvente | Coeficientes GCpf, casos de carga 1 y 2, dimensión a | Figura 12 | NCh 432:2025 | 60 |
| Sistema principal: envolvente | Zona 2 negativa hasta 0.5 W o 2.5 he | 7.3.2.1 | NCh 432:2025 | 57 |
| Sistema principal: envolvente | Zonas de torsión 1T a 6T | Figura 13, 7.3.2.2 | NCh 432:2025 | 57, 61 |
| Sistema principal: envolvente | Carga mínima de diseño | 7.3.6 | NCh 432:2025 | 58 |
| Componentes y revestimientos | Área efectiva de viento: A | 3 (definición) | NCh 432:2025 | 11 |
| Componentes y revestimientos | Presión de diseño, h ≤ 18.3 m: p | Ec. (19), 9.3.2 | NCh 432:2025 | 86 |
| Componentes y revestimientos | Presión de diseño, h > 18.3 m: p | Ec. (20), 9.4.2 | NCh 432:2025 | 91 |
| Componentes y revestimientos | Presión mínima 0.25 kN/m² | 9.2.2 | NCh 432:2025 | 86 |
| Componentes y revestimientos | Muros, zonas 4 y 5 | Figura 24 | NCh 432:2025 | 88–89 |
| Componentes y revestimientos | Techo a dos aguas o plano, θ ≤ 7° | Figura 26 | NCh 432:2025 | 92–93 |
| Componentes y revestimientos | Techo a dos aguas, 7° < θ ≤ 20° | Figura 27 | NCh 432:2025 | 94–95 |
| Componentes y revestimientos | Techo a dos aguas, 20° < θ ≤ 27° | Figura 28 | NCh 432:2025 | 96–97 |
| Componentes y revestimientos | Techo a dos aguas, 27° < θ ≤ 45° | Figura 29 | NCh 432:2025 | 98–99 |
| Componentes y revestimientos | Pendiente única, 3° < θ ≤ 10° | Figura 35 | NCh 432:2025 | 109–110 |
| Componentes y revestimientos | Pendiente única, 10° < θ ≤ 30° | Figura 36 | NCh 432:2025 | 111–112 |
| Componentes y revestimientos | Muros y techos con h > 18.3 m | Figura 40 | NCh 432:2025 | 121–122 |
