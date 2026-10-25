
"use strict";

const SAVE_KEY = "jeyson_world_save";

const defaults = {
  name: "Jeyson",
  hunger: 85,
  energy: 90,
  happiness: 90,
  health: 100,
  affection: 50,
  coins: 100,
  xp: 0,
  level: 1,
  last: Date.now(),
  items: [],
  achievements: [],
  sick: false
};

let state = loadGame();
let messageTimer;

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    return saved ? { ...defaults, ...saved } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function saveGame() {
  state.last = Date.now();

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar el progreso.", error);
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function notify(text) {
  const element = document.getElementById("message");
  if (!element) return;

  element.textContent = text;
  element.classList.remove("hidden");

  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    element.classList.add("hidden");
  }, 3500);
}

function gainXP(amount) {
  state.xp += amount;

  while (state.xp >= state.level * 100) {
    state.xp -= state.level * 100;
    state.level++;
    state.coins += 25;
    notify(`🎉 ¡Jeyson subió al nivel ${state.level}! +25 monedas`);
  }
}

function updateStat(name, amount) {
  if (!(name in state)) return;
  state[name] = clamp(Number(state[name]) + amount);
}

function performAction(action) {
  const actions = {
    feed() {
      if (state.coins < 5) {
        notify("Te faltan monedas para comprar comida.");
        return;
      }
      if (state.hunger >= 100) {
        notify("Jeyson ya está satisfecho.");
        return;
      }

      state.coins -= 5;
      updateStat("hunger", 25);
      updateStat("happiness", 4);
      gainXP(5);
      notify("🍎 ¡Jeyson comió y se siente mejor!");
    },

    sleep() {
      updateStat("energy", 35);
      updateStat("hunger", -8);
      notify("💤 Jeyson descansó un rato.");
    },

    hug() {
      updateStat("affection", 12);
      updateStat("happiness", 12);
      gainXP(5);
      animatePet("happy");
      notify("💚 Jeyson se siente querido.");
    },

    wash() {
      updateStat("happiness", 8);
      gainXP(3);
      notify("🫧 ¡Jeyson está limpio!");
    },

    medicine() {
      if (state.coins < 15) {
        notify("Necesitas 15 monedas para la medicina.");
        return;
      }
      state.coins -= 15;
      state.sick = false;
      updateStat("health", 25);
      notify("🩺 Jeyson recibió cuidados.");
    },

    play() {
      if (state.energy < 10) {
        notify("Jeyson está cansado. Déjalo descansar.");
        return;
      }
      updateStat("happiness", 15);
      updateStat("energy", -12);
      updateStat("hunger", -8);
      gainXP(10);
      animatePet("happy");
      notify("🎾 ¡Jugaron juntos! Ganaste experiencia.");
    }
  };

  if (!actions[action]) return;

  actions[action]();
  saveGame();
  render();
}

function animatePet(animation) {
  const pet = document.getElementById("pet");
  if (!pet) return;

  pet.classList.remove("happy", "sleeping");
  void pet.offsetWidth;
  pet.classList.add(animation);

  if (animation !== "sleeping") {
    setTimeout(() => pet.classList.remove(animation), 1400);
  }
}

function runActivity(activity) {
  if (activity === "quiz") {
    const answer = prompt(
      "🧠 Pregunta rápida:\n¿Cuánto es 7 × 8?"
    );

    if (answer === null) return;

    if (answer.trim() === "56") {
      state.coins += 15;
      gainXP(10);
      notify("🎉 ¡Respuesta correcta! Ganaste 15 monedas.");
    } else {
      notify("Casi. La respuesta correcta era 56. ¡Inténtalo otra vez!");
    }
  }

  if (activity === "treasure") {
    if (state.energy < 8) {
      notify("Jeyson necesita descansar antes de buscar tesoros.");
      return;
    }

    updateStat("energy", -8);
    const reward = Math.floor(Math.random() * 16) + 5;
    state.coins += reward;
    gainXP(5);
    notify(`💰 ¡Encontraste ${reward} monedas!`);
  }

  if (activity === "dance") {
    updateStat("energy", -5);
    updateStat("happiness", 15);
    state.coins += 2;
    gainXP(5);
    animatePet("happy");
    notify("💃 ¡Jeyson bailó contigo!");
  }

  saveGame();
  render();
}

function tick() {
  const now = Date.now();
  const elapsed = Math.max(0, now - Number(state.last || now));
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return;

  updateStat("hunger", -minutes);
  updateStat("energy", -Math.floor(minutes / 2));
  updateStat("happiness", -Math.floor(minutes / 3));

  if (state.hunger < 15 || state.energy < 10) {
    state.health = clamp(state.health - Math.max(1, Math.floor(minutes / 5)));
    state.sick = state.health < 40;
  }

  state.last = now;
  saveGame();
  render();
}

function render() {
  setText("coins", state.coins);
  setText("level", state.level);
  setText("xp", `${state.xp}/${state.level * 100}`);
  setText("pet-name", state.name);

  const stats = [
    ["hunger", state.hunger],
    ["energy", state.energy],
    ["happiness", state.happiness],
    ["health", state.health],
    ["affection", state.affection]
  ];

  for (const [name, value] of stats) {
    setText(`${name}-value`, `${Math.round(value)}%`);

    const bar = document.getElementById(`${name}-bar`);
    if (bar) {
      bar.style.width = `${clamp(value)}%`;
      bar.classList.toggle("low", value < 25);
    }
  }

  const pet = document.getElementById("pet");
  if (pet) {
    pet.classList.toggle("sick", state.sick);
    pet.textContent = state.sick ? "🤒" : "🐻";
  }

  const mood = document.getElementById("pet-message");
  if (mood) {
    if (state.health <= 0) {
      mood.textContent = "Jeyson necesita ayuda urgente.";
    } else if (state.sick) {
      mood.textContent = "No me siento bien... ¿me cuidas?";
    } else if (state.hunger < 25) {
      mood.textContent = "Tengo mucha hambre...";
    } else if (state.energy < 20) {
      mood.textContent = "Tengo sueño. ¿Descansamos?";
    } else if (state.happiness < 25) {
      mood.textContent = "Estoy triste. Juega conmigo.";
    } else {
      mood.textContent = "¡Estoy feliz de estar contigo! 💚";
    }
  }

  setText("progress-level", state.level);
  setText("progress-xp", state.xp);
  setText("progress-affection", `${state.affection}%`);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function switchTab(tab) {
  document.querySelectorAll("[data-page]").forEach(page => {
    page.classList.toggle("hidden", page.dataset.page !== tab);
  });

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
}

function resetGame() {
  if (!confirm("¿Quieres borrar todo el progreso y empezar de nuevo?")) {
    return;
  }

  state = { ...defaults, last: Date.now() };
  saveGame();
  render();
  notify("Nuevo comienzo. ¡Cuida bien de Jeyson! 💚");
}

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    performAction(actionButton.dataset.action);
    return;
  }

  const activityButton = event.target.closest("[data-activity]");
  if (activityButton) {
    runActivity(activityButton.dataset.activity);
    return;
  }

  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    switchTab(tabButton.dataset.tab);
    return;
  }

  if (event.target.closest("#reset-game")) {
    resetGame();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  tick();
  render();
  setInterval(tick, 60000);
});
