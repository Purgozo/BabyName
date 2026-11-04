/**
 * BabyName - Lógica principal de la aplicación
 * Vanilla JS, IIFE, compatible file://, sin dependencias
 * Gestiona 3 fases de eliminación con persistencia en localStorage
 *
 * Nomenclatura: español para dominio, inglés para técnicas.
 * Fuente de verdad: localStorage (4 claves). render() deriva la UI del estado.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  // Constantes y claves de almacenamiento
  /* ------------------------------------------------------------------ */

  const LS_GENDER = 'babyname_gender';
  const LS_NAMES = 'babyname_names';
  const LS_PHASE = 'babyname_phase';
  const LS_PHASE_STATE = 'babyname_phaseState';

  const VERSION = 'v0.4';
  const RELEASE_DATE = '04/11/2026';

  const CONFIG = {
    // Umbrales de fase (derivados de names.length)
    phase1Max: 50,   // > 50  → Fase 1
    phase2Min: 33,   // 33-50 → Fase 2
    phase3Target: 32, // === 32 → Fase 3

    // Tamaño de lote (pantalla) por fase
    f1BatchSize: 6,
    f2BatchSize: 3,

    // Fase 3: rondas y partidos por ronda (total 31 partidos)
    f3Rounds: ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinales', 'Final'],
    f3MatchesPerRound: [16, 8, 4, 2, 1]
  };

  /* ------------------------------------------------------------------ */
  // Store: capa sobre localStorage con fallback en memoria (modo privado)
  /* ------------------------------------------------------------------ */

  const Store = {
    /** Carga el estado desde localStorage o devuelve estado inicial vacío. */
    load: function () {
      try {
        const gender = localStorage.getItem(LS_GENDER);
        const namesRaw = localStorage.getItem(LS_NAMES);
        const phaseRaw = localStorage.getItem(LS_PHASE);
        const phaseStateRaw = localStorage.getItem(LS_PHASE_STATE);

        if (gender === null && namesRaw === null) {
          return { gender: null, names: [], phase: 1, phaseState: {} };
        }

        return {
          gender: gender || null,
          names: namesRaw ? JSON.parse(namesRaw) : [],
          phase: phaseRaw ? parseInt(phaseRaw, 10) : 1,
          phaseState: phaseStateRaw ? JSON.parse(phaseStateRaw) : {}
        };
      } catch (err) {
        // localStorage bloqueado (modo incógnito / cupo lleno): estado en memoria
        console.warn('BabyName: localStorage no disponible, estado en memoria', err);
        return { gender: null, names: [], phase: 1, phaseState: {} };
      }
    },

    /** Persiste el estado completo en localStorage. */
    save: function (state) {
      try {
        localStorage.setItem(LS_GENDER, state.gender);
        localStorage.setItem(LS_NAMES, JSON.stringify(state.names));
        localStorage.setItem(LS_PHASE, String(state.phase));
        localStorage.setItem(LS_PHASE_STATE, JSON.stringify(state.phaseState));
      } catch (err) {
        console.warn('BabyName: no se pudo persistir en localStorage', err);
      }
    },

    /** Borra todo el estado y vuelve a pantalla inicial. */
    reset: function () {
      try {
        localStorage.removeItem(LS_GENDER);
        localStorage.removeItem(LS_NAMES);
        localStorage.removeItem(LS_PHASE);
        localStorage.removeItem(LS_PHASE_STATE);
      } catch (err) {
        console.warn('BabyName: no se pudo limpiar localStorage', err);
      }
    }
  };

  /* ------------------------------------------------------------------ */
  // Estado de la aplicación (single source of truth en localStorage)
  /* ------------------------------------------------------------------ */

  let state = Store.load();

  // Selección tentativa de la pantalla actual (no se persiste hasta "Continuar")
  let tentative = { eliminated: new Set(), selected: null };

  // Selección tentativa en Fase 3 (ganador y perdedor)
  let f3SelectedWinner = null;
  let f3SelectedLoser = null;

  // Fase previa para detectar cambios de fase (solo en memoria, no persiste)
  let previousPhase = null;

  // Cuando el usuario pide "Volver al menú" se guarda phaseState y se vuelve a
  // la pantalla de inicio sin borrar el progreso (se ofrece "Reanudar").
  let forceWelcome = false;

  /* ------------------------------------------------------------------ */
  // Referencias DOM
  /* ------------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  const screens = {
    welcome: $('screenWelcome'),
    phase: $('screenPhase'),
    champion: $('screenChampion')
  };

  const $counterValue = $('counterValue');
  const $phaseTitle = $('phaseTitle');
  const $phaseInstruction = $('phaseInstruction');
  const $phaseContent = $('phaseContent');
  const $btnPhaseAction = $('btnPhaseAction');

  const $btnHamburger = $('btnHamburger');
  const $sidebar = $('sidebar');
  const $btnReset = $('btnReset');
  const $btnBackMenu = $('btnBackMenu');
  const $btnResetChampion = $('btnResetChampion');
  const $btnInfo = $('btnInfo');

  const $dlgReset = $('dlgReset');
  const $btnCancelReset = $('btnCancelReset');
  const $btnConfirmReset = $('btnConfirmReset');
  const $dlgInfo = $('dlgInfo');
  const $btnCloseInfo = $('btnCloseInfo');
  const $dlgPhaseChange = $('dlgPhaseChange');
  const $btnPhaseChangeOk = $('btnPhaseChangeOk');

  const $choiceBoy = $('choiceBoy');
  const $choiceGirl = $('choiceGirl');
  const $welcomeResume = $('welcomeResume');
  const $btnResume = $('btnResume');
  const $btnNew = $('btnNew');

  /* ------------------------------------------------------------------ */
  // Utilidades
  /* ------------------------------------------------------------------ */

  /**
   * Calcula la fase vigente a partir del número de nombres vivos.
   * Devuelve 1 | 2 | 3. Cuando queda 1 nombre se trata como "campeón"
   * (se gestiona desde render() y no como fase).
   * @param {string[]} names
   * @returns {1|2|3}
   */
  function computePhase(names) {
    const len = names.length;
    if (len > CONFIG.phase1Max) return 1;
    if (len >= CONFIG.phase2Min) return 2; // 33-50
    if (len === CONFIG.phase3Target) return 3;
    return 1; // fallback seguro
  }

  function normalizeName(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setAttrChecked(el, checked) {
    el.setAttribute('aria-checked', String(checked));
    el.classList.toggle('choice--selected', checked);
  }

  /* ------------------------------------------------------------------ */
  // Persistencia
  /* ------------------------------------------------------------------ */

  function persist() {
    // Fase se recalca siempre desde names.length (no se confía al valor guardado)
    state.phase = computePhase(state.names);
    Store.save(state);
  }

  /* ------------------------------------------------------------------ */
  // Sidebar y menú de fases (estados visuales, sin navegación manual)
  /* ------------------------------------------------------------------ */

  function renderSidebar() {
    const phase = state.phase;
    [1, 2, 3].forEach((n) => {
      const btn = $('btnPhase' + n);
      btn.classList.remove('sidebar__btn--actual', 'sidebar__btn--passed', 'sidebar__btn--blocked');
      if (n === phase) {
        btn.classList.add('sidebar__btn--actual');
      } else if (n < phase) {
        btn.classList.add('sidebar__btn--passed');
      } else {
        btn.classList.add('sidebar__btn--blocked');
      }
    });
    $btnHamburger.setAttribute('aria-expanded', String($sidebar.classList.contains('sidebar--open')));
  }

  function toggleSidebar() {
    $sidebar.classList.toggle('sidebar--open');
    const open = $sidebar.classList.contains('sidebar--open');
    $btnHamburger.setAttribute('aria-expanded', String(open));
  }

  function closeSidebar() {
    $sidebar.classList.remove('sidebar--open');
    $btnHamburger.setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------------------------------------------ */
  // Contador
  /* ------------------------------------------------------------------ */

  function renderCounter() {
    $counterValue.textContent = state.names.length;
  }

  /* ------------------------------------------------------------------ */
  // Pantalla de bienvenida
  /* ------------------------------------------------------------------ */

  function renderWelcome() {
    // ¿Hay proceso guardado?
    const hasState = state.gender && state.names.length > 0;
    $welcomeResume.hidden = !hasState;
    if (hasState) {
      const phaseNames = { 1: 'Eliminación', 2: 'Concurso', 3: 'Eliminatoria' };
      const phase = state.phase;
      const phaseName = phaseNames[phase] || 'desconocida';
      $('resumeMessage').textContent = 'Hay un proceso guardado en Fase ' + phase + ' · ' + phaseName + '.';
    }

    setAttrChecked($choiceBoy, state.gender === 'boy');
    setAttrChecked($choiceGirl, state.gender === 'girl');
  }

  function startWithGender(gender) {
    const source = gender === 'boy' ? NAMES_BOY : NAMES_GIRL;
    state.gender = gender;
    state.names = shuffle(source).slice(); // copia del array fuente
    state.phaseState = {};
    previousPhase = null;
    persist();
    render();
  }

  /* ------------------------------------------------------------------ */
  // Fase 1: Eliminación (lotes de 6, elimina libremente)
  /* ------------------------------------------------------------------ */

  function renderPhase1() {
    const { names, phaseState } = state;
    const screened = new Set(phaseState.screened || []);
    let pool = names.filter((n) => !screened.has(n));

    // Si se agotó el lote, se reinicia el pool para una nueva pasada
    if (pool.length === 0) {
      phaseState.screened = [];
      screened.clear();
      pool = names.slice();
    }

    const batch = pool.slice(0, CONFIG.f1BatchSize);
    const eliminated = tentative.eliminated;

    $phaseContent.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'card-grid card-grid--6';

    batch.forEach((name) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.role = 'button';
      card.tabIndex = 0;
      card.className = 'phase-card phase-card--f1';
      card.setAttribute('aria-pressed', 'false');
      card.dataset.name = name;
      if (eliminated.has(name)) {
        card.classList.add('phase-card--eliminated');
        card.setAttribute('aria-pressed', 'true');
      }

      card.innerHTML = '<span class="phase-card__name">' + escapeHtml(name) + '</span>';
      card.addEventListener('click', () => toggleF1Card(card, name));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleF1Card(card, name);
        }
      });
      grid.appendChild(card);
    });

    $phaseContent.appendChild(grid);

    $btnPhaseAction.textContent = 'Continuar';
    $btnPhaseAction.disabled = false;
    $btnPhaseAction.onclick = continuePhase1;
  }

  function toggleF1Card(card, name) {
    const currently = tentative.eliminated.has(name);
    if (currently) {
      tentative.eliminated.delete(name);
      card.classList.remove('phase-card--eliminated');
      card.setAttribute('aria-pressed', 'false');
    } else {
      tentative.eliminated.add(name);
      card.classList.add('phase-card--eliminated');
      card.setAttribute('aria-pressed', 'true');
    }
  }

  function continuePhase1() {
    const { names, phaseState } = state;
    const batch = getCurrentBatchPhase1(); // nombres mostrados ahora

    // 1. Eliminar los tentativos del array vivo
    state.names = names.filter((n) => !tentative.eliminated.has(n));

    // 2. Marcar el lote mostrado como screenado
    const screened = new Set(phaseState.screened || []);
    batch.forEach((n) => screened.add(n));
    phaseState.screened = Array.from(screened);

    tentative.eliminated.clear();
    persist();
    render();
  }

  function getCurrentBatchPhase1() {
    // Recalcula el lote mostrado (misma lógica que renderPhase1) para saber qué screenar
    const { names, phaseState } = state;
    const screened = new Set(phaseState.screened || []);
    let pool = names.filter((n) => !screened.has(n));
    if (pool.length === 0) return names.slice(0, CONFIG.f1BatchSize);
    return pool.slice(0, CONFIG.f1BatchSize);
  }

  /* ------------------------------------------------------------------ */
  // Fase 2: Concurso (lotes de 3, elimina 1 obligatorio)
  /* ------------------------------------------------------------------ */

  function renderPhase2() {
    const { names, phaseState } = state;
    const screened = new Set(phaseState.screened || []);
    let pool = names.filter((n) => !screened.has(n));

    if (pool.length === 0 || pool.length < CONFIG.f2BatchSize) {
      // Nunca mostrar 1 o 2 nombres solos en Fase 2: resetear screened
      // para completar el lote obligatorio de 3 nombres.
      phaseState.screened = [];
      screened.clear();
      pool = names.slice();
    }

    const batch = pool.slice(0, CONFIG.f2BatchSize);

    $phaseContent.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'card-grid card-grid--3';

    let selected = tentative.selected;

    batch.forEach((name) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.role = 'button';
      card.tabIndex = 0;
      card.className = 'phase-card phase-card--f2';
      card.setAttribute('aria-checked', 'false');
      card.dataset.name = name;
      if (selected === name) {
        card.classList.add('phase-card--selected');
        card.setAttribute('aria-checked', 'true');
      }

      card.innerHTML = '<span class="phase-card__name">' + escapeHtml(name) + '</span>';
      card.addEventListener('click', () => selectF2Card(name));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectF2Card(name);
        }
      });
      grid.appendChild(card);
    });

    $phaseContent.appendChild(grid);

    $btnPhaseAction.textContent = 'Eliminar seleccionado y continuar';
    $btnPhaseAction.disabled = selected === null;
    $btnPhaseAction.onclick = continuePhase2;
  }

  function selectF2Card(name) {
    tentative.selected = tentative.selected === name ? null : name;
    renderPhase2(); // re-render para reflejar la única selección
  }

  function continuePhase2() {
    if (tentative.selected === null) return;
    state.names = state.names.filter((n) => n !== tentative.selected);

    const batch = getCurrentBatchPhase2();
    const screened = new Set(state.phaseState.screened || []);
    batch.forEach((n) => screened.add(n));
    state.phaseState.screened = Array.from(screened);

    tentative.selected = null;
    persist();
    render();
  }

  function getCurrentBatchPhase2() {
    const { names, phaseState } = state;
    const screened = new Set(phaseState.screened || []);
    let pool = names.filter((n) => !screened.has(n));
    if (pool.length === 0) return names.slice(0, CONFIG.f2BatchSize);
    return pool.slice(0, CONFIG.f2BatchSize);
  }

  /* ------------------------------------------------------------------ */
  // Fase 3: Eliminatoria (torneo 1vs1 hasta 1 ganador)
  /* ------------------------------------------------------------------ */

  function initPhase3() {
    const bracket = shuffle(state.names);
    state.phaseState = {
      bracket: bracket,
      round: 0,
      matchIndex: 0,
      winners: [],
      top8: []
    };
  }

  function renderPhase3() {
    const ps = state.phaseState;
    const roundName = CONFIG.f3Rounds[ps.round];
    const matchesTotal = CONFIG.f3MatchesPerRound[ps.round];
    const matchNumber = ps.matchIndex + 1;

    // Clase de ronda en el body para colores distintivos por ronda
    document.body.className = document.body.className.replace(/round-\d/g, '');
    document.body.classList.add('round-' + ps.round);

    // Partido actual: dos nombres de la ronda
    const bracket = ps.bracket;
    const a = bracket[ps.matchIndex * 2];
    const b = bracket[ps.matchIndex * 2 + 1];

    // Título / breadcrumb
    const isFinalRound = roundName === 'Final';
    $phaseTitle.textContent = isFinalRound ? 'GRAN FINAL!!!' : 'Fase 3 · ' + roundName;
    $phaseTitle.classList.toggle('phase-title--final', isFinalRound);
    $phaseInstruction.textContent = isFinalRound
      ? 'Elige el campeón definitivo. Partido ' + matchNumber + ' de ' + matchesTotal + '.'
      : 'Torneo directo: elige el ganador que pase a la siguiente ronda. Partido ' +
        matchNumber + ' de ' + matchesTotal + ' (' + roundName + ').';

    $phaseContent.innerHTML = '';
    const vs = document.createElement('div');
    vs.className = 'phase3-vs';

    [a, b].forEach((name) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.role = 'button';
      card.tabIndex = 0;
      card.className = 'phase-card phase-card--f3';
      card.setAttribute('aria-pressed', 'false');
      card.dataset.name = name;
      card.innerHTML = '<span class="phase-card__name">' + escapeHtml(name) + '</span>';

      // Aplicar resaltado si esta tarjeta está seleccionada
      if (name === f3SelectedWinner) {
        card.classList.add('phase-card--winner');
        card.setAttribute('aria-pressed', 'true');
      } else if (name === f3SelectedLoser) {
        card.classList.add('phase-card--loser');
      }

      card.addEventListener('click', () => selectF3PhaseCard(name, a, b));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectF3PhaseCard(name, a, b);
        }
      });
      vs.appendChild(card);
    });

    const vsLabel = document.createElement('span');
    vsLabel.className = 'phase3-vs__label';
    vsLabel.textContent = 'VS';
    vs.insertBefore(vsLabel, vs.children[1]); // entre las dos cartas

    $phaseContent.appendChild(vs);

    // Botón contextual: solo visible si hay selección
    const isLastMatch = ps.matchIndex === matchesTotal - 1;

    if (isLastMatch && isFinalRound) {
      $btnPhaseAction.textContent = 'Ver campeón';
      $btnPhaseAction.hidden = f3SelectedWinner === null;
      $btnPhaseAction.disabled = f3SelectedWinner === null;
      $btnPhaseAction.onclick = advancePhase3;
    } else if (isLastMatch) {
      $btnPhaseAction.textContent = 'Ver siguiente ronda';
      $btnPhaseAction.hidden = f3SelectedWinner === null;
      $btnPhaseAction.disabled = f3SelectedWinner === null;
      $btnPhaseAction.onclick = advancePhase3;
    } else {
      $btnPhaseAction.textContent = 'Siguiente partido';
      $btnPhaseAction.hidden = f3SelectedWinner === null;
      $btnPhaseAction.disabled = f3SelectedWinner === null;
      $btnPhaseAction.onclick = advancePhase3;
    }
  }

  function selectF3PhaseCard(name, a, b) {
    // Toggle: si ya está seleccionado este nombre, deseleccionar
    if (f3SelectedWinner === name) {
      f3SelectedWinner = null;
      f3SelectedLoser = null;
    } else {
      f3SelectedWinner = name;
      f3SelectedLoser = name === a ? b : a;
    }
    renderPhase3();
  }

  function selectF3Winner(winner, loser) {
    const ps = state.phaseState;
    ps.winners.push(winner);
    ps.matchIndex++;

    // Capturar perdedor para TOP 8 a partir de cuartos (round >= 2)
    if (ps.round >= 2) {
      ps.top8.push(loser);
    }

    const matchesTotal = CONFIG.f3MatchesPerRound[ps.round];

    if (ps.matchIndex >= matchesTotal) {
      // Ronda terminada
      if (ps.round === CONFIG.f3Rounds.length - 1) {
        // Final terminada → campeón
        state.names = [ps.winners[0]];
        persist();
        render();
        return;
      }
      // Siguiente ronda
      ps.bracket = ps.winners;
      ps.round++;
      ps.matchIndex = 0;
      ps.winners = [];
    }

    persist();
    renderPhase3();
  }

  function advancePhase3() {
    if (f3SelectedWinner === null) return;
    selectF3Winner(f3SelectedWinner, f3SelectedLoser);
  }

  /* ------------------------------------------------------------------ */
  // Pantalla de campeón
  /* ------------------------------------------------------------------ */

  function renderChampion() {
    $('championName').textContent = state.names[0];
    spawnConfetti();

    // Renderizar TOP 8 con colores por clasificación
    const ps = state.phaseState;
    const top8List = $('top8List');
    top8List.innerHTML = '';

    // Campeón
    const championItem = document.createElement('li');
    championItem.className = 'top8__item top8__item--winner';
    championItem.textContent = state.names[0];
    top8List.appendChild(championItem);

    // Los 7 perdedores en orden inverso (mejor a peor)
    const reversed = ps.top8.slice().reverse();

    // Subcampeón (perdedor de la final)
    if (reversed[0]) {
      const item = document.createElement('li');
      item.className = 'top8__item top8__item--runner-up';
      item.textContent = reversed[0];
      top8List.appendChild(item);
    }

    // Semifinalistas (2 nombres, mismo color)
    [reversed[1], reversed[2]].forEach((name) => {
      if (name) {
        const item = document.createElement('li');
        item.className = 'top8__item top8__item--semi';
        item.textContent = name;
        top8List.appendChild(item);
      }
    });

    // Cuartos de final (4 nombres, mismo color)
    [reversed[3], reversed[4], reversed[5], reversed[6]].forEach((name) => {
      if (name) {
        const item = document.createElement('li');
        item.className = 'top8__item top8__item--quarter';
        item.textContent = name;
        top8List.appendChild(item);
      }
    });
  }

  function spawnConfetti() {
    const container = $('confetti');
    container.innerHTML = '';
    const colors = ['#ff4d6d', '#ff9ff3', '#54a0ff', '#5f27cd', '#ffd700', '#48dbfb', '#ff9ff3'];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti__piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.top = Math.random() * -20 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
      piece.style.animationDelay = (Math.random() * 2) + 's';
      piece.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      container.appendChild(piece);
    }
  }

  /* ------------------------------------------------------------------ */
  // render(): punto único de actualización de UI desde el estado
  /* ------------------------------------------------------------------ */

  function render() {
    renderSidebar();
    renderCounter();

    // Clase de fase en el body para colores distintivos por fase
    document.body.className = document.body.className.replace(/phase-\d/g, '');
    document.body.classList.add('phase-' + state.phase);

    const fw = forceWelcome;
    forceWelcome = false; // se consume en esta pasada

    // Qué pantalla mostrar
    const showWelcome = fw || !state.gender || state.names.length === 0;
    const showChampion = state.names.length === 1 && state.gender;

    screens.welcome.hidden = !showWelcome;
    screens.champion.hidden = !showChampion;
    screens.phase.hidden = !(showWelcome === false && showChampion === false);

    // Detección de cambio de fase (1→2, 2→3) y entrada inicial a cualquier fase
    if (!showWelcome && !showChampion) {
      const phase = state.phase;
      if (previousPhase === null) {
        // Primera entrada a una fase: mostrar dialog informativo
        showPhaseChangeDialog(null, phase);
        return;
      } else if (phase !== previousPhase) {
        // Cambio de fase: mostrar dialog informativo y detener el render
        showPhaseChangeDialog(previousPhase, phase);
        return;
      }
    }

    if (showWelcome) {
      renderWelcome();
    } else if (showChampion) {
      renderChampion();
      closeSidebar();
    } else {
      // Pantalla de fase
      const phase = state.phase;
      const roundNames = { 1: 'Fase 1 · Eliminación', 2: 'Fase 2 · Concurso', 3: 'Fase 3 · Eliminatoria' };
      const instructions = {
        1: 'Revisa los 6 nombres. Toca los que NO te gustan para eliminarlos. Puedes eliminar tantos como quieras. Cuando termines, pulsa "Continuar".',
        2: 'Se muestran 3 nombres. Debes eliminar obligatoriamente 1 de los 3. Elige el que menos te convenza. Repite hasta quedar 32 nombres.',
        3: '' // se establece en renderPhase3
      };
      $phaseTitle.textContent = roundNames[phase];
      $phaseInstruction.textContent = instructions[phase];
      $btnBackMenu.onclick = backToMenu;

      if (phase === 1) renderPhase1();
      else if (phase === 2) renderPhase2();
      else if (phase === 3) {
        if (!state.phaseState.bracket || state.phaseState.bracket.length === 0) {
          initPhase3();
        }
        renderPhase3();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  // Acciones globales
  /* ------------------------------------------------------------------ */

  function backToMenu() {
    persist(); // guarda phaseState antes de volver al menú
    forceWelcome = true;
    render();
  }

  function confirmReset() {
    Store.reset();
    state = { gender: null, names: [], phase: 1, phaseState: {} };
    tentative = { eliminated: new Set(), selected: null };
    previousPhase = null;
    render();
  }

  /**
   * Muestra un dialog informativo al cambiar de fase.
   * Detiene el render hasta que el usuario pulse "Entendido".
   * @param {number} from - Fase anterior
   * @param {number} to - Fase nueva
   */
  function showPhaseChangeDialog(from, to) {
    const titles = { 1: 'Fase 1 · Eliminación', 2: 'Fase 2 · Concurso', 3: 'Fase 3 · Eliminatoria' };
    const instructions = {
      1: 'Revisa los 6 nombres que aparecen. <span class="phase-change--highlight--eliminate">Toca los que NO te gustan para eliminarlos</span>. Puedes eliminar tantos como quieras. Cuando termines, pulsa "Continuar".',
      2: 'Se muestran 3 nombres. Debes <span class="phase-change--highlight--eliminate">eliminar</span> obligatoriamente 1 de los 3. Elige el que menos te convenza. Repite hasta quedar 32 nombres.',
      3: 'Torneo directo: elige el <span class="phase-change--highlight--winner">ganador</span> que pase a la siguiente ronda. Rondas: Dieciseisavos → Octavos → Cuartos → Semifinales → Final.'
    };
    $dlgPhaseChange.querySelector('#phaseChangeTitle').textContent = titles[to] || 'Nueva fase';
    $dlgPhaseChange.querySelector('#phaseChangeInstruction').innerHTML = instructions[to] || '';
    $dlgPhaseChange.showModal();
  }

  /* ------------------------------------------------------------------ */
  // Eventos
  /* ------------------------------------------------------------------ */

  function initEvents() {
    // Sidebar
    $btnHamburger.addEventListener('click', toggleSidebar);
    $sidebar.addEventListener('click', (e) => {
      // Clic fuera de botones en móvil cierra el sidebar
      if (e.target.tagName === 'BUTTON') return;
      closeSidebar();
    });

    $('sidebarOverlay').addEventListener('click', closeSidebar);

    // Fase buttons: solo informativos (sin navegación manual, por decisión de diseño)
    [1, 2, 3].forEach((n) => {
      $('btnPhase' + n).addEventListener('click', (e) => {
        e.preventDefault();
        // No navega: el usuario ve el estado pero no accede a otra fase manualmente
      });
    });

    $btnReset.addEventListener('click', () => { $dlgReset.showModal(); });

    $btnCancelReset.addEventListener('click', () => { $dlgReset.close(); });
    $btnConfirmReset.addEventListener('click', confirmReset);
    $btnResetChampion.addEventListener('click', confirmReset);

    $btnInfo.addEventListener('click', () => { $dlgInfo.showModal(); });
    $btnCloseInfo.addEventListener('click', () => { $dlgInfo.close(); });

    $btnPhaseChangeOk.addEventListener('click', () => {
      $dlgPhaseChange.close();
      previousPhase = state.phase; // actualizar para no volver a mostrar el dialog
      render(); // re-renderizar la nueva fase
    });

    // Bienvenida
    $choiceBoy.addEventListener('click', () => startWithGender('boy'));
    $choiceGirl.addEventListener('click', () => startWithGender('girl'));
    $btnResume.addEventListener('click', render);
    $btnNew.addEventListener('click', () => {
      state.gender = null;
      state.names = [];
      state.phaseState = {};
      Store.save(state);
      render();
    });

    // Teclado global
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        if ($dlgReset.open) $dlgReset.close();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  // Escape de HTML (evita inyección de nombres con caracteres raros)
  /* ------------------------------------------------------------------ */

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ------------------------------------------------------------------ */
  // Inicio
  /* ------------------------------------------------------------------ */

  function init() {
    initEvents();
    render();
  }

  init();

  /* ------------------------------------------------------------------ */
  // API de depuración (consulta desde consola)
  /* ------------------------------------------------------------------ */

  window.BabyName = {
    Store: {
      getState: function () { return state; },
      getNames: function () { return state.names; },
      getPhase: function () { return state.phase; },
      getPhaseState: function () { return state.phaseState; },
      getGender: function () { return state.gender; }
    },
    render: render,
    reset: confirmReset
  };

})();
