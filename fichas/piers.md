# Ficha normativa: Muros de corte

Verifica solo el corte de piers importados desde ETABS, reproduciendo la hoja Muro de la planilla IIO348. Flexocompresión y elementos de borde quedan SIN VERIFICAR.

Documentos: ACI 318-08 (español).

## Criterios y límites

- La página del PDF de ACI 318-08 es la impresa + 2.
- Criterio de la planilla, distinto del ACI: φVn usa 0.53 en vez de αc (21.9.4.1) y ρmín en vez de la cuantía dispuesta.
- Criterio de la planilla: el límite 0.75 Vs,máx no es la expresión de 21.9.4.4, que usa 2.12 Acv √f'c en conjunto y 2.65 Acw √f'c por machón.
- Criterio de la planilla: Sv,máx usa Lw/3, y ACI 11.9.9.3 (pág. PDF 201) usa Lw/5; ACI 21.9.2.1 limita a 450 mm.
- ACI 9.3.4(a) (pág. PDF 129) puede exigir φ = 0.60; AURA usa 0.75, como la planilla.
- DS 60 no está en el proyecto: sus exigencias para muros en Chile deben comprobarse directamente.

## Referencias usadas por el cálculo

| Parte del cálculo | Resultado en AURA | Referencia | Documento | Pág. PDF |
|---|---|---|---|---|
| Pier | Límite del corte del acero: Vs ≤ Vs,máx | 11.4.7.9 | ACI 318-08 (español) | 179 |
| Pier | Cuantía requerida ; cuantía mínima: ρ ; ρmín | 21.9.2.1 | ACI 318-08 (español) | 366 |
| Pier | Resistencia al corte: Vu ≤ φVn | 21.9.4.1 | ACI 318-08 (español) | 367 |
| Pier | Límite de resistencia: Vu ≤ 0.75 Vs,máx | 21.9.4.4 | ACI 318-08 (español) | 367 |
| Pier | Límite con Acv ; límite con Acw | 21.9.4.4 | ACI 318-08 (español) | 367 |
