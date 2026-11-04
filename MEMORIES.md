# BabyName - Registro de Decisiones y Estado

> Registro de decisiones (por qué y cuándo) y estado de pendientes.
> **Las normas vigentes viven en `AGENTS.md`** — no duplicar aquí reglas ni hechos.

## Estado y Pendientes de Implementar
- [x] Dataset INE: `data/names.js` con nombres únicos (BOY 399, GIRL 375, sin duplicados, dentro del rango 300-400 aprobado)
- [x] Pantalla inicial: selección género + copia array → localStorage
- [x] Sidebar: 3 botones con estados visuales (pasado/actual/bloqueado) + hamburguesa móvil + overlay
- [x] Fase 1: Vista 6 cartas responsive, click elimina (toggle), badge contador, instrucción visible
- [x] Fase 2: Vista 3 cartas, selección única, validación 1 obligatorio, instrucción visible
- [x] Fase 3: Bracket aleatorio, rondas con nombre (16vos→Final), 1vs1, instrucción + breadcrumb ronda + "Partido X de Y"
- [x] Pantalla final: campeón + confetti CSS + botón "Reiniciar todo"
- [x] Persistencia phaseState en cada "Volver al menú" (guarda estado y ofrece "Reanudar")
- [ ] Test manual: file:// en Chrome/Firefox/Safari + iOS Safari + Android Chrome

## Registro de Decisiones

### v0.2 - Unificación documental (2026-11-03)
- **Un solo criterio, dos ficheros con roles separados** (Opción B):
  - `AGENTS.md` → normas vigentes ("qué se hace").
  - `MEMORIES.md` → este registro: decisiones pasadas + estado/pendientes ("por qué, cuándo y qué falta").
  - **Regla anti-divergencia:** ningún hecho o norma se escribe en ambos ficheros.
- **Directrices de Código** trasladadas de este fichero a `AGENTS.md` (eran contenido único aquí; aquí solo queda constancia de que se definieron en v0.1).
- **`README.md`**: corregidos hechos — ejemplo `const` → `var` (coincide con `data/names.js`) y créditos apuntan a la cabecera de `data/names.js` en vez de repetir la fuente.
- **`.opencode/commands/feature.md`**: referencia rota `MEMORY.md` → `MEMORIES.md`.

### v0.4 - Correcciones y mejoras visuales (2026-11-04)
- **Fase 2**: lote siempre de 3 nombres (reset de `screened` si quedan < 3 para no mostrar 1 o 2 solos).
- **Fase 3**: eliminado botón "Siguiente Partido" y botón "Ver campeón"; avance automático al elegir ganador en cada partido y ronda.
- **Bienvenida**: mensaje de proceso guardado incluye la fase actual (ej. "Fase 2 · Concurso").
- **Colores distintivos**: borde del header, botón principal, tarjetas seleccionadas y título cambian según fase (`phase-1/2/3`). Label VS cambia por ronda (`round-0` a `round-4`) con matiz distinto (azul, verde, naranja, rojo, púrpura).
- **Layout**: 2 columnas paralelas (sidebar + main) con CSS Grid; misma altura, mismo nivel de inicio bajo el header.
- **Diseño visual**: paleta cálida sin clichés de bebé; tipografía serif para el nombre del campeón; botones género en azulado/rosáceo.
- **Información del desarrollador**: botón "i" en el header + dialog con desarrollador, versión, fecha y advertencia de errores.
- **Sidebar**: z-index corregido (60) para que no quede bajo el overlay con blur en móvil.

### v0.1 - Inicialización (2025-10-25)
> Resumen histórico del estado acordado en esa fecha; **para las normas vigentes consulta `AGENTS.md`** (si algo cambió después, manda AGENTS.md).

Decisiones arquitectónicas confirmadas:
- **Vanilla JS only** - Sin frameworks, sin build tools, sin módulos ES6
- **file:// compatible** - Un solo `app.js` cargado via `<script>`, sin fetch
- **Arrays hardcodeados** - `data/names.js` con 300+300 nombres reales INE
- **localStorage minimal** - 4 claves: gender, names[], phase, phaseState
- **Sin historial eliminados** - Solo array vivo `names[]` que se reduce
- **Sidebar lateral** - Menú fases siempre visible (colapsable en móvil <481px)
- **3 fases deterministas** por length del array:
  - Fase 1 (Eliminación): length > 50 → pantallas de 6, multi-eliminación libre
  - Fase 2 (Concurso): 32 < length ≤ 50 → pantallas de 3, elimina 1 obligatorio
  - Fase 3 (Eliminatoria): length = 32 → bracket 1vs1 hasta 1 ganador
- **Responsive multi-dispositivo** - Mobile-first, 4 breakpoints, touch+mouse+keyboard
- **Instrucciones contextuales** - Texto guía visible en cada fase/ronda
- Se definieron también las **Directrices de Código** (nomenclatura, BEM, JSDoc, estado, accesibilidad, responsive); desde v0.2 viven en `AGENTS.md`.

### Notas para Futuras Versiones
- vacío aún
