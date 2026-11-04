# BabyName - Selector de Nombres para Bebé

> Aplicación web offline para elegir el nombre perfecto mediante eliminación progresiva en 3 fases. Sin dependencias, funciona abriendo `index.html` directamente en el navegador.

## 🎯 Características
...

## 🚀 Uso Rápido

```bash
# Solo abre el archivo en tu navegador
open index.html
# o doble click en index.html
# o arrastra index.html a la ventana del navegador
```

**No requiere:** Node.js, npm, Docker, servidor web, base de datos, conexión a internet.

## 📱 Capturas de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BIENVENIDA                                               │
│    ┌─────────────┐  ┌─────────────┐                         │
│    │    👶 Niño  │  │   👶 Niña   │  → 300 nombres cada uno │
│    └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SIDEBAR + FASE 1: ELIMINACIÓN                            │
│ ┌─────────┐ ┌─────────────────────────────────────────────┐ │
│ │ Fases   │ │  Revisa 6 nombres. Toca los que NO te       │ │
│ │ 1● Elim │ │  gustan para eliminarlos. Puedes eliminar   │ │
│ │ 2○ Conc │ │  tantos como quieras. [Continuar]           │ │
│ │ 3○ Elim │ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │ │
│ │         │ │ │Hugo│ │Mate│ │Luc │ │Leo │ │Mar │ │Dan │  │ │
│ │ Prog: ██│ │ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │ │
│ └─────────┘ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓ (cuando ≤50 nombres)
┌─────────────────────────────────────────────────────────────┐
│ 3. FASE 2: CONCURSO                                         │
│    "Elimina 1 de 3 obligatoriamente"                        │
│    ┌──────┐  ┌──────┐  ┌──────┐                             │
│    │ Hugo │  │ Mate │  │ Lucas│  → Radio buttons, 1 solo  │
│    └──────┘  └──────┘  └──────┘                             │
│    [Eliminar seleccionado y continuar]                      │
└─────────────────────────────────────────────────────────────┘
                              ↓ (cuando 32 nombres)
┌─────────────────────────────────────────────────────────────┐
│ 4. FASE 3: ELIMINATORIA (TORNEO)                            │
│    Dieciseisavos → Octavos → Cuartos → Semis → Final        │
│    ┌──────────┐     VS     ┌──────────┐                     │
│    │  Hugo    │             │  Lucas   │  → Click ganador   │
│    └──────────┘             └──────────┘                     │
│    Partido 1 de 16 — Dieciseisavos                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CAMPEÓN 🎉                                               │
│    ¡Has elegido el nombre perfecto!                         │
│          MARTÍN                                              │
│    [Empezar de nuevo]                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🏗 Estructura del Proyecto



## 💾 Persistencia (localStorage)

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `babyname_gender` | string | `'boy'` \| `'girl'` |
| `babyname_names` | string[] | Array vivo de nombres restantes (se reduce) |
| `babyname_phase` | number | Fase actual: `1` \| `2` \| `3` (calculado por length) |
| `babyname_phaseState` | object | Estado específico de la fase activa |

**Ejemplo `phaseState`:**

```

## ⌨️ Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `Tab` / `Shift+Tab` | Navegar entre elementos |
| `Enter` / `Espacio` | Seleccionar tarjeta / botón |
| `Esc` | Cerrar sidebar (móvil) / volver al menú |
| `Flechas` | Navegar entre tarjetas (en grids) |

## 🎨 Personalización

### Colores (CSS Custom Properties)

```

### Cambiar dataset de nombres
Edita `data/names.js`:
```js
var NAMES_BOY = ["Tu", "Lista", "Personalizada"];
var NAMES_GIRL = ["Tus", "Nombres", "Favoritos"];
```
Los arrays pueden tener cualquier longitud (mínimo 32 para llegar a fase 3).

## 🧪 Testing Manual

### Checklist por dispositivo
- [ ] **Móvil (375px)**: Sidebar hamburguesa, grids apilados, botones full-width
- [ ] **Tablet (768px)**: Sidebar fija 200px, grids 2-3 columnas
- [ ] **Desktop (1440px)**: Sidebar 240px, grids 6/3 columnas, hover states
- [ ] **Teclado only**: `Tab` navega todo, `Enter` selecciona, focus visible
- [ ] **Screen reader**: NVDA/VoiceOver anuncia cambios, instrucciones leídas
- [ ] **Modo oscuro**: Colores adaptados, contraste OK
- [ ] **file://**: Abre directo sin servidor, sin errores de CORS
- [ ] **Persistencia**: Recarga → mantiene fase, nombres, selección

### Navegadores probados
- Chrome/Edge 120+ ✅
- Firefox 120+ ✅
- Safari 17+ (macOS/iOS) ✅
- Samsung Internet ✅

## 📝 Desarrollo

### Añadir nombres
```bash
# Edita data/names.js directamente
# Mantén 300 por género para balance, pero cualquier número >32 funciona
```

### Modificar fases
Los umbrales están en `app.js` → `PHASE_CONFIG`:
```js
const PHASE_CONFIG = {
  1: { minNames: 51, maxNames: 300, screenSize: 6, multiSelect: true },
  2: { minNames: 33, maxNames: 50, screenSize: 3, multiSelect: false, mustEliminate: 1 },
  3: { minNames: 32, maxNames: 32, screenSize: 2 }
};
```

### Debug en consola
```js
// Ver estado actual
BabyName.Store.getNames()
BabyName.Store.getPhase()
BabyName.Store.getPhaseState()

// Forzar fase
BabyName.App.navigateToPhase(3)

// Reset
BabyName.Store.reset(); location.reload()
```

## 📄 Licencia

MIT - Úsalo libremente para proyectos personales o comerciales.

## 🙏 Créditos

- **Datos**: Instituto Nacional de Estadística (INE) - criterio exacto en la cabecera de `data/names.js`
- **Fuente**: Inter (Google Fonts, cargada localmente vía `<link preconnect>`)
- **Iconos**: SVG inline, sin librerías externas

---

**¿Problemas?** Abre la consola del navegador (F12) y revisa errores. La app está diseñada para ser simple y robusta - si algo falla, suele ser por `localStorage` lleno o modo privado (incógnito) que bloquea storage.