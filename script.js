
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
  sick: false,
  dead: false,
  bath: 80,
  lastMessage: "¡Estoy feliz de estar contigo! 💚"
};

let state = loadGame();
let messageTimer;

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved || typeof saved !== "object") {
      return { ...defaults };
    }

    return {
      ...defaults,
      ...saved,
      last: Number(saved.last) || Date.now()
    };
  } catch {
    return { ...defaults };
  }
}

function saveGame() {
  state.last = Date.now();

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar la partida.", error);
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function notify(text) {
  state.lastMessage = text;

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
    state.lastMessage =
      `🎉 ¡Jeyson subió al nivel ${state.level}! Ganaste 25 monedas.`;
  }
}

function updateStat(name, amount) {
  if (!(name in state)) return;
  state[name] = clamp(state[name] + amount);
}

function isAlive() {
  if (state.dead || state.health <= 0) {
    state.dead = true;
    state.health = 0;
    return false;
  }
  return true;
}

function performAction(action) {
  if (!isAlive()) {
    notify("💔 La partida terminó. Reinicia para comenzar otra aventura.");
    render();
    return;
  }

  const actions = {
    feed() {
      if (state.coins < 5) {
        notify("🪙 Necesitas 5 monedas para comprar comida.");
        return;
      }
      if (state.hunger >= 100) {
        notify("😋 ¡Ya estoy lleno!");
        return;
      }

      state.coins -= 5;
      updateStat("hunger", 28);
      updateStat("happiness", 4);
      gainXP(5);
      notify("🍎 ¡Qué rico! Gracias por alimentarme.");
    },

    sleep() {
      if (state.energy >= 100) {
        notify("😴 No tengo sueño ahora.");
        return;
      }

      updateStat("energy", 35);
      updateStat("hunger", -7);
      notify("💤 Descansé y recuperé energía.");
    },

    hug() {
      updateStat("affection", 12);
      updateStat("happiness", 12);
      gainXP(5);
      animatePet("happy");
      notify("🤗 ¡Me encanta que me abraces!");
    },

    wash() {
      if (state.bath >= 100) {
        notify("🫧 ¡Ya estoy limpio!");
        return;
      }

      state.bath = clamp(state.bath + 45);
      updateStat("happiness", 6);
      gainXP(3);
      notify("🛁 ¡Qué bien se siente estar limpio!");
    },

    medicine() {
      if (state.health >= 100 && !state.sick) {
        notify("❤️ Estoy bien. No necesito medicina.");
        return;
      }
      if (state.coins < 15) {
        notify("🪙 Necesitas 15 monedas para comprar medicina.");
        return;
      }

      state.coins -= 15;
      state.health = clamp(state.health + 30);
      state.sick = state.health < 40;
      notify("🩺 Recibí mis cuidados. ¡Gracias por ayudarme!");
    },

    play() {
      if (state.energy < 12) {
        notify("🥱 Estoy agotado. Déjame descansar primero.");
        return;
      }
      if (state.hunger < 8) {
        notify("🍎 Tengo demasiada hambre para jugar.");
        return;
      }

      updateStat("happiness", 16);
      updateStat("energy", -12);
      updateStat("hunger", -8);
      gainXP(10);
      animatePet("happy");
      notify("🎾 ¡Me divertí muchísimo contigo!");
    }
  };

  if (!actions[action]) return;

  actions[action]();
  updateCondition();
  saveGame();
  render();
}

function animatePet(animation) {
  const pet = document.getElementById("pet");
  if (!pet) return;

  pet.classList.remove("happy", "sleeping", "sad", "sick");
  void pet.offsetWidth;
  pet.classList.add(animation);

  setTimeout(() => pet.classList.remove(animation), 1800);
}

function runActivity(activity) {
  if (!isAlive()) {
    notify("💔 La partida terminó. Reinicia para comenzar otra aventura.");
    render();
    return;
  }

  if (activity === "quiz") {
    const answer = prompt("🧠 Pregunta rápida:\n¿Cuánto es 7 × 8?");
    if (answer === null) return;

    if (answer.trim() === "56") {
      state.coins += 15;
      gainXP(10);
      notify("🎉 ¡Correcto! Ganaste 15 monedas.");
    } else {
      notify("La respuesta era 56. ¡Puedes intentarlo otra vez!");
    }
  } else if (activity === "treasure") {
    if (state.energy < 8) {
      notify("🥱 Necesito descansar antes de buscar tesoros.");
      return;
    }

    updateStat("energy", -8);
    updateStat("hunger", -3);
    const reward = Math.floor(Math.random() * 16) + 5;
    state.coins += reward;
    gainXP(5);
    notify(`💰 ¡Encontraste ${reward} monedas!`);
  } else if (activity === "dance") {
    if (state.energy < 5) {
      notify("🥱 No tengo energía para bailar.");
      return;
    }

    updateStat("energy", -5);
    updateStat("happiness", 15);
    state.coins += 2;
    gainXP(5);
    animatePet("happy");
    notify("💃 ¡Bailar contigo me hace feliz!");
  }

  updateCondition();
  saveGame();
  render();
}

function updateCondition() {
  if (state.dead) return;

  const needsArePoor =
    state.hunger < 20 ||
    state.energy < 12 ||
    state.bath < 10;

  if (needsArePoor) {
    state.health = clamp(state.health - 2);
  } else if (
    state.hunger > 60 &&
    state.energy > 50 &&
    state.bath > 30
  ) {
    state.health = clamp(state.health + 1);
  }

  state.sick = state.health < 40;

  if (state.health <= 0) {
    state.health = 0;
    state.dead = true;
    state.lastMessage =
      "💔 Jeyson falleció por falta de cuidados. Puedes reiniciar la partida.";
  }
}

function tick() {
  if (state.dead) {
    render();
    return;
  }

  const now = Date.now();
  const elapsed = Math.max(0, now - state.last);
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return;

  // Evita que una ausencia muy larga vacíe todas las necesidades de golpe.
  const simulatedMinutes = Math.min(minutes, 720);

  updateStat("hunger", -simulatedMinutes * 0.8);
  updateStat("energy", -simulatedMinutes * 0.45);
  updateStat("happiness", -simulatedMinutes * 0.2);
  state.bath = clamp(state.bath - simulatedMinutes * 0.12);

  const vulnerable =
    state.hunger < 20 ||
    state.energy < 12 ||
    state.bath < 10;

  if (vulnerable) {
    state.health = clamp(
      state.health - Math.max(1, simulatedMinutes * 0.08)
    );
  } else if (
    state.hunger > 60 &&
    state.energy > 50 &&
    state.bath > 30
  ) {
    state.health = clamp(
      state.health + Math.min(3, simulatedMinutes * 0.02)
    );
  }

  state.sick = state.health < 40;

  if (state.health <= 0) {
    state.health = 0;
    state.dead = true;
    state.lastMessage =
      "💔 Jeyson falleció por falta de cuidados. Puedes reiniciar la partida.";
  }

  state.last = now;
  saveGame();
  render();
}

function getMood() {
  if (state.dead) {
    return {
      emoji: "🕊️",
      message: "La aventura terminó. Reinicia para volver a jugar.",
      className: "sad"
    };
  }

  if (state.health < 20) {
    return {
      emoji: "🤕",
      message: "Me siento muy mal... necesito que me cuides.",
      className: "sick"
    };
  }

  if (state.sick) {
    return {
      emoji: "🤒",
      message: "No me siento bien. ¿Puedes ayudarme?",
      className: "sick"
    };
  }

  if (state.hunger < 20) {
    return {
      emoji: "🥺",
      message: "Tengo mucha hambre. ¿Me das algo de comer?",
      className: "sad"
    };
  }

  if (state.energy < 15) {
    return {
      emoji: "🥱",
      message: "Estoy agotado. Necesito dormir.",
      className: "sleeping"
    };
  }

  if (state.happiness < 25) {
    return {
      emoji: "😢",
      message: "Me siento triste. ¿Jugamos un rato?",
      className: "sad"
    };
  }

  if (state.bath < 15) {
    return {
      emoji: "😖",
      message: "Necesito un baño para sentirme mejor.",
      className: "sad"
    };
  }

  if (state.happiness > 75 && state.affection > 65) {
    return {
      emoji: "🥰",
      message: "¡Me haces muy feliz! Me encanta estar contigo.",
      className: "happy"
    };
  }

  if (state.happiness > 60) {
    return {
      emoji: "🐻",
      message: "Estoy tranquilo. ¿Qué hacemos hoy?",
      className: ""
    };
  }

  return {
    emoji: "😊",
    message: "Estoy bien. Podemos jugar o descansar juntos.",
    className: ""
  };
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
    ["affection", state.affection],
    ["bath", state.bath]
  ];

  for (const [name, value] of stats) {
    setText(`${name}-value`, `${Math.round(value)}%`);

    const bar = document.getElementById(`${name}-bar`);
    if (bar) {
      bar.style.width = `${clamp(value)}%`;
      bar.classList.toggle("low", value < 25);
    }
  }

  const mood = getMood();
  const pet = document.getElementById("pet");

  if (pet) {
    pet.textContent = mood.emoji;
    pet.classList.remove("happy", "sleeping", "sad", "sick");
    if (mood.className) pet.classList.add(mood.className);
    pet.setAttribute("aria-label", `${state.name}: ${mood.message}`);
  }

  setText("pet-message", mood.message);
  setText("progress-level", state.level);
  setText("progress-xp", state.xp);
  setText("progress-affection", `${Math.round(state.affection)}%`);
  setText("progress-health", `${Math.round(state.health)}%`);
  setText("progress-bath", `${Math.round(state.bath)}%`);

  const resetButton = document.getElementById("reset-game");
  if (resetButton) {
    resetButton.textContent = state.dead ? "Nueva partida" : "Reiniciar";
  }

  document.querySelectorAll("[data-action], [data-activity]").forEach(button => {
    button.disabled = state.dead;
  });
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
  if (!confirm("¿Quieres empezar una nueva partida? Se perderá el progreso actual.")) {
    return;
  }

  state = { ...defaults, last: Date.now() };
  saveGame();
  render();
  notify("🌱 ¡Una nueva aventura comienza!");
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
