# BabyName - Selector de Nombres para Bebé

## Propósito
Ayudar a futuros padres a elegir el nombre ideal para su bebé mediante un proceso de **eliminación progresiva en 3 fases**, sin dependencias externas, funcionando 100% offline al abrir `index.html` en cualquier dispositivo.

> **Registro de decisiones y pendientes:** `MEMORIES.md`. Las normas vigentes son las de este fichero; no duplicar contenido entre ambos.

## Principios de Diseño
1. **Cero dependencias** - HTML/CSS/JS vanilla, sin build, sin npm, sin fetch
2. **Offline-first** - Abre `index.html` directamente en navegador (file://)
3. **Persistencia simple** - `localStorage` con 4 claves: `gender`, `names[]`, `phase`, `phaseState`
4. **Accesible** - HTML semántico, navegación por teclado, contraste WCAG AA, touch targets ≥44px
5. **Responsive Multi-dispositivo** - Mobile-first, breakpoints fluidos:
   - **Smartphone** (≤480px): Sidebar colapsable (hamburguesa), cartas apiladas, botones full-width
   - **Tablet** (481-1024px): Sidebar fija estrecha (200px), grid 2-3 columnas, touch + mouse
   - **Desktop** (>1024px): Sidebar fija ancha (240px), grid 3-4 columnas, hover states, keyboard shortcuts
6. **Progressive Enhancement** - Funciona sin JS (mensaje), mejora con JS

## Flujo de Usuario
```
1. Pantalla inicio → Elige: Niño / Niña
   └─ Guarda gender, copia array fuente (300) → names[], phase=1

2. Sidebar menú fases (siempre visible), con opción a reiniciar con un botón
   - Los botones de fase muestran el estado (pasado/actual/bloqueado) pero **no se navega manualmente** entre fases: el avance es automático al completar cada pantalla.
   ├─ Fase 1: Eliminación (length > 50) → Pantallas de 6, elimina libres
   ├─ Fase 2: Concurso (32 < length ≤ 50) → Pantallas de 3, elimina 1 obligatorio
   └─ Fase 3: Eliminatoria (length = 32) → Torneo 1vs1: 16vos→8vos→4tos→Semis→Final
         └─ Botón "Volver al menú" en cada pantalla guarda phaseState

3. Resultado final (1 nombre) → Pantalla celebración + botón "Reiniciar"
```

## Instrucciones por Fase (Mostradas al Usuario)

### Fase 1: **Eliminación**  *(>50 nombres restantes)*
> **"Revisa los 6 nombres que aparecen. Toca/clickea sobre los que **NO te gustan** para eliminarlos. Puedes eliminar tantos como quieras. Cuando termines, pulsa 'Continuar'."**
- Pantalla: 6 tarjetas en grid (2×3 móvil, 3×2 tablet, 6×1 desktop)
- Acción: Click/tap en tarjeta → toggle "eliminado" (tachado + opacity)
- Validación: Ninguna (puede eliminar 0 a 6)
- Botón: "Continuar" → recalcula phase según nuevo length.

### Fase 2: **Concurso**  *(33-50 nombres restantes)*
> **"Se muestran 3 nombres. Debes **eliminar obligatoriamente 1** de los 3. Elige el que menos te convenza. Repite hasta quedar 32 nombres."**
- Pantalla: 3 tarjetas grandes (stack móvil, row tablet/desktop)
- Acción: Radio button / click en tarjeta → selecciona 1 único
- Validación: **Exigida** 1 selección antes de "Continuar"
- Botón: "Eliminar seleccionado y continuar" → quita 1, recalcula

### Fase 3: **Eliminatoria**  *(Exactamente 32 nombres → 1 ganador)*
> **"Torneo directo: se enfrentan 2 nombres. Elige el **ganador** que pase a la siguiente ronda. Rondas: Dieciseisavos (16) → Octavos (8) → Cuartos (4) → Semifinales (2) → Final (1)."**
- Pantalla: 2 tarjetas enfrentadas (VS central), badge de ronda
- Acción: Click en tarjeta ganadora → avanza a siguiente partido
- Validación: Exigida 1 selección por partido
- Navegación: "Partido X de Y" + breadcrumb de ronda
- Botón: "Siguiente partido" / "Ver siguiente ronda" / "Ver campeón"

### Pantalla Final: **Campeón**
> **"¡Has elegido el nombre perfecto! 🎉"**
- Muestra: Nombre ganador grande, confetti CSS, botón "Reiniciar proceso"

## Stack Técnico
- **HTML5** semántico (`<aside>`, `<section>`, `<dialog>`, `<menu>`, `<article>`)
- **CSS** Custom Properties, Grid/Flexbox, Container Queries, `clamp()` fluido
- **JS** IIFE único en `<script>` (sin módulos, compatible file://)
- **localStorage** API para estado de sesión

## Directrices de Código
- **Nomenclatura**: español para dominio (`nombres`, `eliminar`, `fase`), inglés para técnicas (`state`, `render`, `init`)
- **Comentarios**: JSDoc en funciones públicas, explicación de "por qué" no de "qué"
- **CSS**: BEM modificado (`.phase-card`, `.phase-card--eliminated`, `.sidebar__btn--disabled`)
- **Estado**: Single source of truth en localStorage, UI derivado (reactivo simple via `render()`)
- **Accesibilidad**: `role="button" tabindex="0"` en elementos clickables, focus visible (teclado y lectores de pantalla en *Touch & Keyboard Support*)
- **Responsive**: Unidades relativas (`rem`, `clamp()`), container queries para sidebar, grid auto-fit

## Estructura de Datos (localStorage)
```javascript
// Claves
babyname_gender      // 'boy' | 'girl'
babyname_names       // string[] - nombres vivos (se reduce mutando)
babyname_phase       // 1 | 2 | 3 (calculado dinámicamente por names.length)
babyname_phaseState  // object - estado específico de fase actual (serializado como array, no Set):
                     // Fase 1: { screened: string[] }  // nombres ya mostrados en esta pasada
                     // Fase 2: { screened: string[] }  // nombres ya mostrados en esta pasada
                     // Fase 3: { bracket: string[], round: number, matchIndex: number, winners: string[] }
```

## Arrays Fuente (data/names.js)
```javascript
var NAMES_BOY = ["Hugo", "Mateo", "Lucas", ...]; // entre 300 y 400 nombres
var NAMES_GIRL = ["Lucía", "Sofía", "Martina", ...]; // entre 300 y 400 nombres
```
- **Criterio y fuente exactos** (fecha, URL del INE, método de selección): ver la **cabecera de `data/names.js`** — es el único sitio donde se documenta; no repetirlo aquí ni en `README.md`.
- **Integridad de datos**: entre 300 y 400 elementos por lista y **sin duplicados dentro de cada lista** (ni variantes con/sin tildes ni mayúsculas: no coexisten `"Lucía"` y `"Lucia"`). Tras cualquier edición verificar:
  ```bash
  node --check data/names.js   # sintaxis
  ```
  y que cada lista tenga elementos únicos (comparando en normalizado sin tildes y en minúsculas).

## Breakpoints CSS (Responsive)
```css
:root {
  --sidebar-w: 240px;
  --card-min-w: 140px;
  --gap: 1rem;
  --touch-target: 48px;
}

/* Mobile First */
@media (min-width: 481px)  { /* Tablet */ }
@media (min-width: 769px)  { /* Tablet landscape */ }
@media (min-width: 1025px) { /* Desktop */ }
@media (min-width: 1440px) { /* Large desktop */ }
```

## Touch & Keyboard Support
- **Touch**: `touch-action: manipulation`, passive listeners, swipe en Fase 3 (opcional)
- **Keyboard**: `Tab`/`Shift+Tab` navega, `Enter`/`Space` selecciona, `Esc` cierra sidebar/modal
- **Screen Readers**: `aria-live="polite"` en contador nombres, `aria-pressed` en tarjetas