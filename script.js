"use strict";

const $ = id => document.getElementById(id);
const clamp = (n, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(n) || 0));

const SAVE_KEY = "jeyson_world_save";
const defaults = {
  level: 1, xp: 0, coins: 100,
  happiness: 90, energy: 90, affection: 50,
  hygiene: 85, health: 100, anger: 0,
  mood: "happy", illness: null,
  lastVisit: Date.now(), lastCare: Date.now(),
  lastNotice: 0, notificationsEnabled: false,
  quietStart: 22, quietEnd: 8
};

let state;
try {
  state = { ...defaults, ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") };
} catch {
  state = { ...defaults };
}

for (const k of [
  "level", "xp", "coins", "happiness", "energy",
  "affection", "hygiene", "health", "anger"
]) {
  state[k] = Number.isFinite(Number(state[k]))
    ? Number(state[k]) : defaults[k];
}
state.level = Math.max(1, state.level);
state.xp = Math.max(0, state.xp);
state.coins = Math.max(0, state.coins);

for (const k of [
  "happiness", "energy", "affection",
  "hygiene", "health", "anger"
]) state[k] = clamp(state[k]);

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar el progreso.", e);
  }
}

function toast(message) {
  const el = $("toast");
  if (!el) {
    console.log(message);
    return;
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}

function addStyles() {
  if ($("jeyson-extra-style")) return;

  const style = document.createElement("style");
  style.id = "jeyson-extra-style";
  style.textContent = `
    .jeyson-care-panel {
      margin:14px 0;padding:16px;border:1px solid #8ac76c55;
      border-radius:18px;background:#14231e;color:#f2f8ed;
    }
    .jeyson-care-panel h3 { margin:0 0 10px;font-size:17px; }
    .jeyson-care-panel p { color:#cbd8c4;font-size:13px;line-height:1.5; }
    .jeyson-care-actions { display:flex;flex-wrap:wrap;gap:8px;margin-top:12px; }
    .jeyson-care-actions button {
      border:1px solid #8bc86a66;border-radius:12px;
      background:#243b2b;color:#f4ffe9;padding:10px 12px;font-weight:700;
    }
    .jeyson-meter { height:6px;border-radius:99px;background:#ffffff18;overflow:hidden;margin:5px 0 10px; }
    .jeyson-meter span { display:block;height:100%;background:#8ed36d;border-radius:99px; }
    .jeyson-alert { color:#ffd0a6!important; }
    .jeyson-mood-bubble {
      position:absolute;z-index:5;top:10px;right:10px;max-width:80%;
      padding:10px 13px;border:1px solid #b9fa7755;border-radius:15px;
      background:#101b19ee;color:#f5ffe9;font:600 13px/1.4 system-ui;
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);
}
addStyles();

const mount = $("scene");
let character = null;
let arms = [];
let head = null;
let autoRotate = false;
let danceUntil = 0;
let sleepUntil = 0;
let expression = null;

function showFallback() {
  if (!mount) return;

  mount.innerHTML = `
    <div style="min-height:300px;height:100%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;border-radius:22px;
    background:radial-gradient(ellipse,#315b3b,#172b20 70%);
    color:white;font-family:system-ui">
      <div style="font-size:100px;animation:jeysonFloat 2s infinite">🧑🏻‍🚀</div>
      <strong style="font-size:23px;letter-spacing:3px">JEYSON ✦</strong>
      <span style="opacity:.8;font-size:13px">Tu compañero virtual</span>
      <style>@keyframes jeysonFloat {
        0%,100%{transform:translateY(0)}
        50%{transform:translateY(-9px)}
      }</style>
    </div>`;
}

async function start3D() {
  if (!mount) return;

  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
    );

    mount.innerHTML = "";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.8, 7.5);
    camera.lookAt(0, 1.45, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe5ffe8, 0x303b32, 2.1));

    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-3, 6, 5);
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 40),
      new THREE.MeshBasicMaterial({
        color: 0x29402d,
        transparent: true,
        opacity: 0.5
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    scene.add(floor);

    const material = color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

    const skin = material(0xdca77e);
    const hair = material(0x241b18);
    const hoodie = material(0x63b746);
    const pants = material(0x202b2c);
    const shoes = material(0xf1f0e5);
    const dark = material(0x171715);
    const detail = material(0xd2f79d);

    function mesh(geometry, mat, parent, x, y, z) {
      const obj = new THREE.Mesh(geometry, mat);
      obj.position.set(x, y, z);
      parent.add(obj);
      return obj;
    }

    function ball(parent, mat, x, y, z, sx, sy, sz) {
      const obj = mesh(
        new THREE.SphereGeometry(1, 18, 14),
        mat, parent, x, y, z
      );
      obj.scale.set(sx, sy, sz);
      return obj;
    }

    function capsule(parent, mat, x, y, z, radius, length) {
      return mesh(
        new THREE.CapsuleGeometry(radius, length, 4, 10),
        mat, parent, x, y, z
      );
    }

    character = new THREE.Group();
    scene.add(character);
    arms = [];

    for (const side of [-1, 1]) {
      capsule(character, pants, side * 0.21, 0.62, 0, 0.14, 0.48);
      ball(character, shoes, side * 0.22, 0.17, 0.1, 0.18, 0.11, 0.3);
    }

    const torso = capsule(character, hoodie, 0, 1.45, 0, 0.39, 0.55);
    torso.scale.z = 0.76;
    ball(character, hoodie, 0, 1.82, -0.02, 0.36, 0.22, 0.3);

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.37, 1.76, 0);
      character.add(pivot);
      capsule(pivot, hoodie, side * 0.05, -0.28, 0, 0.12, 0.37);
      ball(pivot, skin, side * 0.07, -0.52, 0.02, 0.11, 0.12, 0.11);
      arms.push(pivot);
    }

    capsule(character, skin, 0, 2, 0, 0.11, 0.15);

    head = new THREE.Group();
    head.position.set(0, 2.4, 0);
    character.add(head);

    ball(head, skin, 0, 0, 0, 0.43, 0.49, 0.38);

    for (const side of [-1, 1]) {
      ball(head, skin, side * 0.41, -0.03, 0, 0.09, 0.12, 0.08);
      ball(head, dark, side * 0.15, 0.04, 0.33, 0.045, 0.06, 0.025);
      ball(head, shoes, side * 0.16, 0.06, 0.35, 0.014, 0.018, 0.01);
    }

    ball(head, skin, 0, -0.05, 0.37, 0.045, 0.04, 0.035);
    const mouth = mesh(
      new THREE.TorusGeometry(0.075, 0.009, 6, 16, Math.PI),
      dark, head, 0, -0.14, 0.36
    );
    mouth.rotation.z = Math.PI;

    ball(head, hair, 0, 0.35, -0.02, 0.43, 0.24, 0.38);

    for (let i = 0; i < 17; i++) {
      const angle = i / 17 * Math.PI * 2;
      ball(
        head, hair,
        Math.cos(angle) * 0.32,
        0.25 + Math.sin(i * 2.1) * 0.08,
        Math.sin(angle) * 0.26,
        0.12, 0.13, 0.12
      );
    }

    for (let i = 0; i < 7; i++) {
      ball(head, hair, (i - 3) * 0.1, 0.4 + Math.sin(i * 2) * 0.04,
        0.22, 0.12, 0.11, 0.12);
    }

    ball(character, detail, 0.18, 1.5, 0.29, 0.045, 0.045, 0.02);

    expression = { skin, hoodie, mouth };

    function resize() {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    resize();
    window.addEventListener("resize", resize);

    renderer.domElement.addEventListener("pointerdown", event => {
      renderer.domElement.dataset.dragX = event.clientX;
    });

    renderer.domElement.addEventListener("pointermove", event => {
      if (event.buttons && character) {
        const previous = Number(renderer.domElement.dataset.dragX || event.clientX);
        character.rotation.y += (event.clientX - previous) * 0.012;
        renderer.domElement.dataset.dragX = event.clientX;
      }
    });

    function animate() {
      requestAnimationFrame(animate);

      const now = Date.now();

      if (character) {
        if (autoRotate) character.rotation.y += 0.008;

        if (now < danceUntil) {
          character.rotation.y += 0.035;
          character.position.y = Math.sin(now / 90) * 0.08;
          arms.forEach((arm, i) => {
            arm.rotation.z = Math.sin(now / 100 + i * Math.PI) * 0.8;
          });
        } else if (now < sleepUntil) {
          character.position.y = -0.05;
          if (head) head.rotation.z = 0.08;
        } else {
          character.position.y = Math.sin(now / 600) * 0.025;
          arms.forEach(arm => arm.rotation.z *= 0.85);
          if (head) head.rotation.z *= 0.85;
        }

        if (expression) {
          if (state.illness) {
            expression.skin.color.set(0xb9cba1);
            expression.hoodie.color.set(0x557b52);
          } else if (state.anger >= 65) {
            expression.skin.color.set(0xdca77e);
            expression.hoodie.color.set(0x9b563d);
          } else {
            expression.skin.color.set(0xdca77e);
            expression.hoodie.color.set(0x63b746);
          }
        }
      }

      renderer.render(scene, camera);
    }

    animate();
  } catch (error) {
    console.warn("No se pudo iniciar el personaje 3D.", error);
    showFallback();
  }
}

start3D();

const moodText = {
  happy: {
    label: "FELIZ",
    greeting: "¡Volviste! 💚",
    message: "Me alegra tenerte aquí.",
    emoji: "😊"
  },
  sad: {
    label: "TRISTE",
    greeting: "Te extrañé… 🥺",
    message: "Me he sentido un poquito solo. Quédate conmigo.",
    emoji: "🥺"
  },
  angry: {
    label: "ENFADADO",
    greeting: "¡Ah, bueno! 😤",
    message: "Me molestó que me dejaras tanto tiempo solo.",
    emoji: "😠"
  },
  sick: {
    label: "ENFERMITO",
    greeting: "No me siento muy bien… 🤒",
    message: "Necesito que me cuides y me ayudes a recuperarme.",
    emoji: "🤒"
  },
  tired: {
    label: "CANSADO",
    greeting: "Tengo sueño… ☾",
    message: "Necesito descansar un rato.",
    emoji: "😴"
  }
};

function getMood() {
  if (state.illness) return "sick";
  if (state.energy < 18) return "tired";
  if (state.anger >= 65) return "angry";
  if (state.happiness < 38 || state.affection < 20) return "sad";
  return "happy";
}

function currentStage() {
  if (state.level >= 20) {
    return {
      level: 4,
      name: "Jeyson Legendario",
      description: "Un compañero fuerte, lleno de recuerdos y cariño."
    };
  }
  if (state.level >= 10) {
    return {
      level: 3,
      name: "Jeyson Evolucionado",
      description: "Ha crecido gracias al tiempo que compartes con él."
    };
  }
  if (state.level >= 5) {
    return {
      level: 2,
      name: "Jeyson Aventurero",
      description: "Cada cuidado y cada juego lo ayudan a crecer."
    };
  }
  return {
    level: 1,
    name: "Jeyson Bebé",
    description: "Pequeño, sensible y feliz cuando vienes a verlo."
  };
}

function gainXP(amount) {
  state.xp += amount;

  while (state.xp >= 100) {
    state.xp -= 100;
    state.level += 1;
    state.coins += 20;
    toast("¡JEYSON subió al nivel " + state.level + "! +20 monedas ✨");
  }
}

function ensureCarePanel() {
  if ($("jeyson-care-panel")) return;

  const panel = document.createElement("section");
  panel.id = "jeyson-care-panel";
  panel.className = "jeyson-care-panel";

  panel.innerHTML = `
    <h3>💚 Cuidados de JEYSON</h3>
    <p id="jeyson-status-detail">Estoy esperando que vengas a verme.</p>
    <div id="jeyson-extra-stats"></div>
    <div class="jeyson-care-actions">
      <button type="button" data-jcare="medicine">🩹 Curarme</button>
      <button type="button" data-jcare="comfort">🫶 Tranquilizarme</button>
      <button type="button" data-jcare="wash">🚿 Asearme</button>
      <button type="button" data-jcare="notify">🔔 Avisos</button>
    </div>
    <p id="jeyson-notify-status"></p>
    <p>Horario tranquilo: 22:00–08:00. Los avisos locales no están garantizados si el juego está cerrado.</p>
  `;

  const carePage = $("care-page");
  if (carePage) carePage.appendChild(panel);
  else if ($("home-page")) $("home-page").appendChild(panel);

  panel.addEventListener("click", event => {
    const button = event.target.closest("[data-jcare]");
    if (!button) return;

    switch (button.dataset.jcare) {
      case "medicine": careIllness(); break;
      case "comfort": comfort(); break;
      case "wash": doAction("wash"); break;
      case "notify": toggleNotifications(); break;
    }
  });
}

function addMoodBubble() {
  const stage = document.querySelector(".stage");
  if (!stage) return;

  let bubble = $("jeyson-mood-bubble");
  if (!bubble) {
    bubble = document.createElement("div");
    bubble.id = "jeyson-mood-bubble";
    bubble.className = "jeyson-mood-bubble";
    stage.style.position = "relative";
    stage.appendChild(bubble);
  } else if (bubble.parentElement !== stage) {
    stage.appendChild(bubble);
  }

  const copy = moodText[state.mood] || moodText.happy;
  bubble.textContent = copy.emoji + " " +
    (state.mood === "happy" ? "¡Estoy feliz de verte!" : copy.message);
}

function render() {
  state.mood = getMood();

  if ($("level")) $("level").textContent = state.level;
  if ($("coins")) $("coins").textContent = state.coins;
  if ($("xp-label")) $("xp-label").textContent = state.xp + " / 100 XP";
  if ($("xp-bar")) $("xp-bar").style.width = state.xp + "%";

  for (const key of ["happiness", "energy", "affection"]) {
    const value = $(key + "-value");
    const bar = $(key + "-bar");
    if (value) value.textContent = Math.round(state[key]) + "%";
    if (bar) bar.style.width = state[key] + "%";
  }

  const stage = currentStage();
  if ($("evolution-label")) {
    $("evolution-label").textContent = "Etapa " + stage.level + " · " + stage.name;
  }
  if ($("stage-name")) $("stage-name").textContent = stage.name;
  if ($("stage-description")) $("stage-description").textContent = stage.description;

  const copy = moodText[state.mood] || moodText.happy;
  if ($("mood-label")) $("mood-label").textContent = copy.label;
  if ($("greeting")) $("greeting").textContent = copy.greeting;
  if ($("mood-text")) $("mood-text").textContent = copy.message;

  if ($("jeyson-status-detail")) {
    let extra = "";
    if (state.illness) {
      extra = " Tengo " + state.illness.name + " y necesito cuidados.";
    }
    if (state.anger >= 65) {
      extra += " Estoy enfadado; primero tranquilízame.";
    }
    $("jeyson-status-detail").textContent =
      "Ánimo: " + copy.label +
      ". Salud: " + Math.round(state.health) +
      "%. Higiene: " + Math.round(state.hygiene) + "%." + extra;
  }

  if ($("jeyson-extra-stats")) {
    $("jeyson-extra-stats").innerHTML = `
      <p>❤️ Salud: ${Math.round(state.health)}%</p>
      <div class="jeyson-meter"><span style="width:${state.health}%"></span></div>
      <p>🚿 Higiene: ${Math.round(state.hygiene)}%</p>
      <div class="jeyson-meter"><span style="width:${state.hygiene}%"></span></div>
      <p>😤 Enfado: ${Math.round(state.anger)}%</p>
      <div class="jeyson-meter"><span style="width:${state.anger}%;background:#e5a06c"></span></div>
      ${state.illness
        ? `<p class="jeyson-alert">🤒 Malestar: ${state.illness.name} · recuperación ${Math.round(state.illness.progress || 0)}%</p>`
        : ""}
    `;
  }

  const notifyStatus = $("jeyson-notify-status");
  if (notifyStatus) {
    notifyStatus.textContent = state.notificationsEnabled
      ? "🔔 Avisos activados mientras el juego pueda ejecutarse."
      : "Los avisos están desactivados.";
  }

  addMoodBubble();
}

function comfort() {
  state.anger = clamp(state.anger - 35);
  state.affection = clamp(state.affection + 8);
  state.happiness = clamp(state.happiness + 5);
  state.lastCare = Date.now();
  gainXP(4);
  save();
  render();
  toast("Gracias por tranquilizarme. 💚");
}

function careIllness() {
  if (!state.illness) {
    toast("¡Ahora mismo no estoy enfermo! 💚");
    return;
  }

  state.health = clamp(state.health + 22);
  state.happiness = clamp(state.happiness + 4);
  state.illness.progress = clamp((state.illness.progress || 0) + 35);
  state.lastCare = Date.now();

  if (state.illness.progress >= 100 || state.health >= 90) {
    state.illness = null;
    state.health = Math.max(state.health, 75);
    toast("¡Me estoy recuperando! Gracias por cuidarme. 💚");
  } else {
    toast("Me siento un poquito mejor, pero necesito descansar. 🩹");
  }

  gainXP(5);
  save();
  render();
}

function doAction(action) {
  const now = Date.now();

  if (action === "play" && state.illness) {
    state.anger = clamp(state.anger + 5);
    toast("Hoy no puedo jugar, me siento enfermo. Cuídame primero. 🤒");
    save();
    render();
    return;
  }

  if (action === "play" && state.energy < 18) {
    state.anger = clamp(state.anger + 4);
    toast("Estoy demasiado cansado para jugar. 😴");
    save();
    render();
    return;
  }

  if (action === "play" && state.anger >= 65) {
    toast("¡Ahora no! Estoy de malas. Tranquilízame primero. 😤");
    return;
  }

  switch (action) {
    case "hug":
      state.affection = clamp(state.affection + 10);
      state.happiness = clamp(state.happiness + 7);
      state.anger = clamp(state.anger - 12);
      gainXP(8);
      toast("Un abrazo para ti y otro para mí. 💚");
      break;

    case "play":
      state.happiness = clamp(state.happiness + 12);
      state.energy = clamp(state.energy - 9);
      state.hygiene = clamp(state.hygiene - 3);
      state.anger = clamp(state.anger - 8);
      danceUntil = now + 2300;
      gainXP(12);
      toast("¡Qué divertido! +12 XP ✨");
      break;

    case "talk":
      switchPage("chat");
      if ($("chat-input")) $("chat-input").focus();
      state.affection = clamp(state.affection + 3);
      state.lastCare = now;
      save();
      render();
      return;

    case "sleep":
      state.energy = clamp(state.energy + 24);
      state.health = clamp(state.health + (state.illness ? 8 : 2));
      sleepUntil = now + 3000;
      gainXP(3);
      toast("Un descansito me viene bien. ☾");
      break;

    case "feed":
      if (state.coins < 5) {
        toast("No tienes suficientes monedas.");
        return;
      }
      state.coins -= 5;
      state.energy = clamp(state.energy + 10);
      state.happiness = clamp(state.happiness + 8);
      state.health = clamp(state.health + 2);
      gainXP(4);
      toast("¡Gracias por la comida! 🍜");
      break;

    case "wash":
      state.hygiene = clamp(state.hygiene + 28);
      state.happiness = clamp(state.happiness + 4);
      state.health = clamp(state.health + 2);
      gainXP(3);
      toast("¡Ahora me siento fresco! 🚿");
      break;

    default:
      return;
  }

  state.lastCare = now;
  save();
  render();
}

function switchPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  const target = $(page + "-page");
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });
}

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => doAction(button.dataset.action));
});

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => switchPage(button.dataset.page));
});

if ($("rotate-btn")) {
  $("rotate-btn").addEventListener("click", () => {
    autoRotate = !autoRotate;
    toast(autoRotate ? "¡Giremos juntos! ✨" : "Puedes girarme con tu dedo.");
  });
}

if ($("dance-btn")) {
  $("dance-btn").addEventListener("click", () => {
    if (state.illness || state.energy < 18 || state.anger >= 65) {
      toast("No tengo ánimo para bailar ahora. Cuídame primero. 💚");
      return;
    }

    danceUntil = Date.now() + 5000;
    state.energy = clamp(state.energy - 8);
    state.happiness = clamp(state.happiness + 5);
    state.lastCare = Date.now();
    gainXP(5);
    save();
    render();
    toast("¡Vamos a bailar! 💃");
  });
}

if ($("reset-btn")) {
  $("reset-btn").addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres reiniciar tu progreso?")) return;
    state = { ...defaults, lastVisit: Date.now(), lastCare: Date.now() };
    save();
    render();
    toast("Progreso reiniciado.");
  });
}

function applyElapsedTime() {
  const now = Date.now();
  const last = Number(state.lastVisit) || now;
  const hours = Math.min(720, Math.max(0, (now - last) / 3600000));

  if (hours > 0) {
    state.happiness = clamp(state.happiness - Math.min(70, hours * 2.2));
    state.energy = clamp(state.energy - Math.min(65, hours * 1.5));
    state.affection = clamp(state.affection - Math.min(55, hours * 1.1));
    state.hygiene = clamp(state.hygiene - Math.min(80, hours * 2));
    state.health = clamp(
      state.health - Math.min(35, hours * (state.hygiene < 25 ? 1.2 : 0.25))
    );
    state.anger = clamp(state.anger + Math.min(35, hours * 1.1));

    if (!state.illness &&
        (state.health < 55 || state.hygiene < 18) &&
        Math.random() < Math.min(0.85, 0.18 + hours * 0.05)) {
      const illnesses = [
        "resfriado virtual",
        "cansancio fuerte",
        "malestar de pancita"
      ];
      state.illness = {
        name: illnesses[Math.floor(Math.random() * illnesses.length)],
        progress: 0
      };
      state.health = Math.min(state.health, 65);
    }
  }

  state.lastVisit = now;
}

function quietTime() {
  const hour = new Date().getHours();
  const start = Number(state.quietStart ?? 22);
  const end = Number(state.quietEnd ?? 8);

  return start > end
    ? hour >= start || hour < end
    : hour >= start && hour < end;
}

async function toggleNotifications() {
  if (!("Notification" in window)) {
    toast("Este navegador no admite notificaciones.");
    return;
  }

  if (state.notificationsEnabled) {
    state.notificationsEnabled = false;
    save();
    render();
    toast("Notificaciones desactivadas.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      toast("No se concedió permiso para notificaciones.");
      return;
    }

    state.notificationsEnabled = true;
    save();
    render();
    toast("Avisos activados mientras el juego pueda ejecutarse. 🔔");
  } catch {
    toast("No se pudieron activar las notificaciones.");
  }
}

function maybeNotify() {
  if (!state.notificationsEnabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted" ||
      quietTime()) return;

  const now = Date.now();
  const interval = (30 + Math.random() * 60) * 60 * 1000;

  if (now - Number(state.lastNotice || 0) < interval) return;

  const messages = {
    sad: "Oye… ¿sigues ahí? Hoy me siento un poquito solo. ¿Puedes venir a verme? 🥺",
    angry: "¡Ah, bueno! Te desapareces y luego vienes como si nada. 😤",
    sick: "No me siento muy bien… creo que necesito que me cuides un rato. 💚",
    tired: "Tengo mucho sueño. ¿Me ayudas a descansar? ☾",
    happy: "¡Hola! Solo quería saludarte. 💚"
  };

  try {
    new Notification("JEYSON ✦", {
      body: messages[state.mood] || messages.happy,
      tag: "jeyson-mood"
    });
    state.lastNotice = now;
    save();
  } catch (error) {
    console.warn("No se pudo mostrar el aviso.", error);
  }
}

function ensureServiceWorker() {
  if ("serviceWorker" in navigator &&
      location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function addMoodControls() {
  ensureCarePanel();

  if ($("dance-btn")) {
    $("dance-btn").title =
      "Bailar consume energía. JEYSON puede negarse si está enfermo, agotado o enfadado.";
  }
}

applyElapsedTime();
state.lastVisit = Date.now();
addMoodControls();
render();
save();
ensureServiceWorker();

setInterval(() => {
  const now = Date.now();

  state.happiness = clamp(state.happiness - 0.18);
  state.energy = clamp(state.energy - 0.12);
  state.affection = clamp(state.affection - 0.08);
  state.hygiene = clamp(state.hygiene - 0.14);

  if (state.hygiene < 20) {
    state.health = clamp(state.health - 0.15);
  }

  if (!state.illness &&
      (state.hygiene < 15 || state.health < 45) &&
      Math.random() < 0.08) {
    const illnesses = [
      "resfriado virtual",
      "malestar de pancita",
      "cansancio fuerte"
    ];
    state.illness = {
      name: illnesses[Math.floor(Math.random() * illnesses.length)],
      progress: 0
    };
    toast("JEYSON no se siente bien. Ven a cuidarlo. 🤒");
  }

  if (state.happiness < 35 && Math.random() < 0.15) {
    state.anger = clamp(state.anger + 2);
  }

  if (state.illness &&
      state.health > 92 &&
      state.illness.progress >= 70) {
    state.illness = null;
  }

  state.lastVisit = now;
  save();
  render();
  maybeNotify();
}, 5 * 60 * 1000);

/* El chat requiere un servidor para conectar una IA real. */
function addBubble(text, who) {
  const messages = $("chat-messages");
  if (!messages) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble " + who;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

if ($("chat-form")) {
  $("chat-form").addEventListener("submit", async event => {
    event.preventDefault();

    const input = $("chat-input");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    addBubble(message, "user");
    input.value = "";

    if ($("send-btn")) $("send-btn").disabled = true;
    if ($("chat-status")) {
      $("chat-status").textContent = "Intentando conectar...";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      if (!response.ok) throw new Error("Servidor no disponible");

      const data = await response.json();
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("Respuesta no válida");
      }

      addBubble(data.reply, "bot");

      if ($("chat-status")) {
        $("chat-status").textContent = "Conversación conectada";
      }
    } catch {
      addBubble(
        "Todavía no estoy conectado a una inteligencia artificial real. 💚 El chat necesita configurar un servidor seguro.",
        "bot"
      );

      if ($("chat-status")) {
        $("chat-status").textContent =
          "Falta conectar la inteligencia artificial";
      }
    } finally {
      if ($("send-btn")) $("send-btn").disabled = false;
    }
  });
}
