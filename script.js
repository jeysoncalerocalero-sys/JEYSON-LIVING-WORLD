
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const $ = (id) => document.getElementById(id);
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const defaults = {
  level: 1, xp: 0, coins: 100, happiness: 90, energy: 90,
  affection: 50, last: Date.now()
};

let state;
try {
  state = { ...defaults, ...JSON.parse(localStorage.getItem("jeyson_world_save") || "{}") };
} catch {
  state = { ...defaults };
}

state.level = Math.max(1, Number(state.level) || 1);
state.xp = Math.max(0, Number(state.xp) || 0);
state.coins = Math.max(0, Number(state.coins) || 0);
state.happiness = clamp(Number(state.happiness) || 0);
state.energy = clamp(Number(state.energy) || 0);
state.affection = clamp(Number(state.affection) || 0);

function save() {
  state.last = Date.now();
  try {
    localStorage.setItem("jeyson_world_save", JSON.stringify(state));
  } catch {}
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2300);
}

/* PERSONAJE 3D */
const mount = $("scene");
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 1.9, 7.8);
camera.lookAt(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdfffe3, 0x303b32, 2.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(-3, 6, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x9bf56d, 16, 12);
rimLight.position.set(3, 3, -2);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.1, 48),
  new THREE.MeshStandardMaterial({
    color: 0x29402d, roughness: 0.85, transparent: true, opacity: 0.75
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.04;
floor.receiveShadow = true;
scene.add(floor);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.9, 40),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.set(0, -0.025, 0);
shadow.scale.set(1.2, 0.65, 1);
scene.add(shadow);

const character = new THREE.Group();
scene.add(character);

const materials = {
  skin: new THREE.MeshStandardMaterial({ color: 0xdca77e, roughness: 0.83 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x241b18, roughness: 0.92 }),
  hoodie: new THREE.MeshStandardMaterial({ color: 0x63b746, roughness: 0.8 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x202b2c, roughness: 0.9 }),
  shoes: new THREE.MeshStandardMaterial({ color: 0xf1f0e5, roughness: 0.8 }),
  sole: new THREE.MeshStandardMaterial({ color: 0x9bd967, roughness: 0.8 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x171715, roughness: 0.3 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff }),
  pink: new THREE.MeshStandardMaterial({ color: 0xc96d70 }),
  detail: new THREE.MeshStandardMaterial({ color: 0xd2f79d, roughness: 0.65 })
};

function mesh(geometry, material, parent, x, y, z) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(x, y, z);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}

function ball(parent, material, x, y, z, sx, sy, sz) {
  const obj = mesh(new THREE.SphereGeometry(1, 20, 16), material, parent, x, y, z);
  obj.scale.set(sx, sy, sz);
  return obj;
}

function capsule(parent, material, x, y, z, radius, length, sx = 1, sz = 1) {
  const obj = mesh(
    new THREE.CapsuleGeometry(radius, length, 5, 12),
    material, parent, x, y, z
  );
  obj.scale.set(sx, 1, sz);
  return obj;
}

/* Piernas y zapatillas */
const legs = [];
for (const side of [-1, 1]) {
  const leg = capsule(character, materials.pants, side * 0.22, 0.64, 0, 0.14, 0.48);
  legs.push(leg);

  ball(character, materials.shoes, side * 0.23, 0.19, 0.11, 0.19, 0.12, 0.32);
  ball(character, materials.sole, side * 0.23, 0.115, 0.12, 0.19, 0.035, 0.31);
}

/* Cuerpo y sudadera */
const torso = mesh(
  new THREE.CapsuleGeometry(0.43, 0.62, 6, 20),
  materials.hoodie, character, 0, 1.48, 0
);
torso.scale.set(1, 1, 0.76);

ball(character, materials.hoodie, 0, 1.9, -0.035, 0.39, 0.25, 0.32);

/* Bolsillo */
const pocket = mesh(
  new THREE.BoxGeometry(0.4, 0.2, 0.055),
  materials.detail, character, 0, 1.35, 0.305
);
pocket.material = materials.hoodie;
pocket.castShadow = false;

/* Brazos articulados */
const arms = [];
for (const side of [-1, 1]) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.39, 1.82, 0);
  character.add(pivot);

  const arm = capsule(pivot, materials.hoodie, side * 0.055, -0.28, 0, 0.13, 0.38);
  arm.rotation.z = -side * 0.12;
  ball(pivot, materials.skin, side * 0.08, -0.54, 0.015, 0.12, 0.13, 0.12);

  arms.push(pivot);
}

/* Cuello y cabeza */
capsule(character, materials.skin, 0, 2.04, 0, 0.12, 0.17);

const head = new THREE.Group();
head.position.set(0, 2.47, 0);
character.add(head);

ball(head, materials.skin, 0, 0, 0, 0.48, 0.54, 0.41);

/* Orejas */
for (const side of [-1, 1]) {
  ball(head, materials.skin, side * 0.445, -0.04, 0, 0.105, 0.14, 0.09);
  ball(head, materials.pink, side * 0.465, -0.04, 0.045, 0.045, 0.08, 0.035);
}

/* Ojos */
for (const side of [-1, 1]) {
  ball(head, materials.white, side * 0.17, 0.055, 0.355, 0.09, 0.105, 0.045);
  ball(head, materials.eye, side * 0.17, 0.05, 0.395, 0.046, 0.063, 0.025);
  ball(head, materials.white, side * 0.183, 0.075, 0.415, 0.017, 0.022, 0.012);
}

/* Nariz y sonrisa */
ball(head, materials.skin, 0, -0.06, 0.397, 0.055, 0.045, 0.04);

const smile = mesh(
  new THREE.TorusGeometry(0.09, 0.012, 8, 20, Math.PI),
  materials.eye, head, 0, -0.16, 0.395
);
smile.rotation.z = Math.PI;

/* Cabello colocho: mechones esféricos */
ball(head, materials.hair, 0, 0.39, -0.015, 0.45, 0.26, 0.4);

for (let i = 0; i < 17; i++) {
  const angle = (i / 17) * Math.PI * 2;
  const x = Math.cos(angle) * 0.34;
  const z = Math.sin(angle) * 0.27;
  const curl = ball(head, materials.hair, x, 0.28 + Math.sin(i * 2.1) * 0.09, z, 0.13, 0.14, 0.13);
  curl.rotation.z = Math.sin(i) * 0.3;
}
for (let i = 0; i < 7; i++) {
  ball(head, materials.hair, (i - 3) * 0.105, 0.43 + Math.sin(i * 2) * 0.045, 0.24, 0.13, 0.12, 0.13);
}

/* Pequeño emblema de la sudadera */
const emblem = ball(character, materials.detail, 0.2, 1.55, 0.29, 0.055, 0.055, 0.025);

/* Accesorios de evolución */
const aura = new THREE.Group();
character.add(aura);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.64, 0.025, 8, 60),
  new THREE.MeshBasicMaterial({ color: 0xb9fa77, transparent: true, opacity: 0.85 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.02;
aura.add(ring);
aura.visible = false;

const stars = [];
for (let i = 0; i < 8; i++) {
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.055),
    new THREE.MeshStandardMaterial({ color: 0xc7ff8e, emissive: 0x456c25 })
  );
  star.position.set(Math.cos(i * Math.PI / 4) * 0.9, 1.6 + Math.sin(i * 2) * 0.8, Math.sin(i * Math.PI / 4) * 0.5);
  character.add(star);
  stars.push(star);
}
stars.forEach(s => s.visible = false);

function resize() {
  const w = Math.max(1, mount.clientWidth);
  const h = Math.max(1, mount.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
new ResizeObserver(resize).observe(mount);
resize();

/* Rotación táctil */
let dragging = false;
let lastX = 0;
let targetRotation = 0;
let autoRotate = false;

renderer.domElement.addEventListener("pointerdown", e => {
  dragging = true;
  lastX = e.clientX;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", e => {
  if (!dragging) return;
  targetRotation += (e.clientX - lastX) * 0.012;
  lastX = e.clientX;
  autoRotate = false;
});
renderer.domElement.addEventListener("pointerup", () => dragging = false);
renderer.domElement.addEventListener("pointercancel", () => dragging = false);
renderer.domElement.addEventListener("click", () => {
  if (!dragging) doAction("hug");
});

$("rotate-btn").addEventListener("click", () => {
  autoRotate = !autoRotate;
  toast(autoRotate ? "¡Giremos juntos! ✨" : "Puedes girarme con tu dedo.");
});

/* Animación */
let danceUntil = 0;
let sleepUntil = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (autoRotate) targetRotation += 0.008;
  character.rotation.y += (targetRotation - character.rotation.y) * 0.12;

  character.position.y = Math.sin(t * 2.1) * 0.035;
  head.rotation.z = Math.sin(t * 1.1) * 0.025;

  if (Date.now() < danceUntil) {
    character.rotation.z = Math.sin(t * 12) * 0.12;
    arms[0].rotation.z = -1.9 + Math.sin(t * 12) * 0.35;
    arms[1].rotation.z = 1.9 - Math.sin(t * 12) * 0.35;
    legs[0].rotation.z = Math.sin(t * 12) * 0.25;
    legs[1].rotation.z = -Math.sin(t * 12) * 0.25;
  } else if (Date.now() < sleepUntil) {
    character.rotation.z = 0;
    arms[0].rotation.z = -0.2;
    arms[1].rotation.z = 0.2;
    character.position.y = -0.06 + Math.sin(t * 1.3) * 0.025;
  } else {
    character.rotation.z *= 0.9;
    arms[0].rotation.z = -0.08 + Math.sin(t * 1.6) * 0.04;
    arms[1].rotation.z = 0.08 - Math.sin(t * 1.6) * 0.04;
    legs[0].rotation.z *= 0.9;
    legs[1].rotation.z *= 0.9;
  }

  aura.visible = state.level >= 10;
  aura.rotation.y = t * 0.6;
  stars.forEach((s, i) => {
    s.visible = state.level >= 5;
    s.rotation.y = t * 1.5 + i;
    s.position.y = 1.5 + Math.sin(t * 2 + i) * 0.65;
  });

  renderer.render(scene, camera);
}
animate();

/* Juego y evolución */
const stages = [
  { level: 1, name: "El comienzo", description: "Un pequeño compañero con mucho por descubrir." },
  { level: 5, name: "Personalidad propia", description: "Desbloquea efectos y una presencia más expresiva." },
  { level: 10, name: "Evolución brillante", description: "Aparece un aura especial alrededor del personaje." },
  { level: 20, name: "Leyenda viviente", description: "La evolución más alta de esta primera versión." }
];

function currentStage() {
  return [...stages].reverse().find(s => state.level >= s.level) || stages[0];
}

function gainXP(amount) {
  state.xp += amount;
  while (state.xp >= 100) {
    state.xp -= 100;
    state.level++;
    state.coins += 25;
    toast("¡Subiste al nivel " + state.level + "! +25 monedas ✨");
  }
}

function render() {
  $("level").textContent = state.level;
  $("coins").textContent = state.coins;
  $("xp-label").textContent = state.xp + " / 100 XP";
  $("xp-bar").style.width = state.xp + "%";

  for (const key of ["happiness", "energy", "affection"]) {
    $(key + "-value").textContent = state[key] + "%";
    $(key + "-bar").style.width = state[key] + "%";
  }

  const stage = currentStage();
  $("evolution-label").textContent = "Etapa " + stage.level + " · " + stage.name;
  $("stage-name").textContent = stage.name;
  $("stage-description").textContent = stage.description;

  if (state.happiness < 30) {
    $("mood-label").textContent = "UN POCO TRISTE";
    $("greeting").textContent = "¿Me acompañas un ratito?";
    $("mood-text").textContent = "Un poco de cariño y juego pueden animarme.";
  } else if (state.energy < 25) {
    $("mood-label").textContent = "CANSADO";
    $("greeting").textContent = "Necesito descansar.";
    $("mood-text").textContent = "Vamos con calma, ¿sí?";
  } else {
    $("mood-label").textContent = "AQUÍ CONTIGO";
    $("greeting").textContent = "¡Hey! Qué bueno verte.";
    $("mood-text").textContent = "Toca el personaje, muévelo y descubre cómo evoluciona.";
  }
}

function doAction(action) {
  switch (action) {
    case "hug":
      state.affection = clamp(state.affection + 8);
      state.happiness = clamp(state.happiness + 5);
      gainXP(8);
      arms[0].rotation.z = -1.5;
      arms[1].rotation.z = 1.5;
      toast("¡Un abrazo para ti! 💚");
      break;
    case "play":
      state.happiness = clamp(state.happiness + 10);
      state.energy = clamp(state.energy - 7);
      gainXP(12);
      danceUntil = Date.now() + 2300;
      toast("¡Qué divertido! +12 XP");
      break;
    case "talk":
      switchPage("chat");
      $("chat-input").focus();
      break;
    case "sleep":
      state.energy = clamp(state.energy + 18);
      sleepUntil = Date.now() + 3000;
      gainXP(3);
      toast("Un descansito me viene bien. ☾");
      break;
    case "feed":
      if (state.coins < 5) {
        toast("No tienes suficientes monedas.");
        return;
      }
      state.coins -= 5;
      state.energy = clamp(state.energy + 6);
      state.happiness = clamp(state.happiness + 7);
      gainXP(4);
      toast("¡Gracias por la comida! 🍜");
      break;
    case "wash":
      state.happiness = clamp(state.happiness + 4);
      gainXP(3);
      toast("¡Ahora me siento fresco! 🚿");
      break;
  }
  save();
  render();
}

document.querySelectorAll("[data-action]").forEach(btn => {
  btn.addEventListener("click", () => doAction(btn.dataset.action));
});

$("dance-btn").addEventListener("click", () => {
  danceUntil = Date.now() + 5000;
  gainXP(5);
  save();
  render();
  toast("¡Vamos a bailar! 💃");
});

function switchPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  $(page + "-page").classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(el =>
    el.classList.toggle("active", el.dataset.page === page)
  );
}
document.querySelectorAll("[data-page]").forEach(btn => {
  btn.addEventListener("click", () => switchPage(btn.dataset.page));
});

$("reset-btn").addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres reiniciar tu progreso?")) return;
  state = { ...defaults, last: Date.now() };
  save();
  render();
  toast("Progreso reiniciado.");
});

/* CHAT: necesita un backend seguro para respuestas reales de IA */
function addBubble(text, who) {
  const el = document.createElement("div");
  el.className = "bubble " + who;
  el.textContent = text;
  $("chat-messages").appendChild(el);
  $("chat-messages").scrollTop = $("chat-messages").scrollHeight;
}

$("chat-form").addEventListener("submit", async event => {
  event.preventDefault();
  const input = $("chat-input");
  const message = input.value.trim();
  if (!message) return;

  addBubble(message, "user");
  input.value = "";
  $("send-btn").disabled = true;
  $("chat-status").textContent = "Intentando conectar...";

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
    $("chat-status").textContent = "Conversación conectada";
  } catch {
    addBubble(
      "Quiero responderte de verdad, pero mi inteligencia artificial todavía no está conectada. 💚 El diseño del chat ya está listo; falta configurar un servidor seguro para que pueda conversar contigo.",
      "bot"
    );
    $("chat-status").textContent = "Falta conectar la inteligencia artificial";
  } finally {
    $("send-btn").disabled = false;
  }
});

render();
save();
