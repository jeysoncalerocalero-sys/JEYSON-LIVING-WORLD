
const $ = (id) => document.getElementById(id);
const clamp = (n, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(n) || 0));

const defaults = {
  level: 1,
  xp: 0,
  coins: 100,
  happiness: 90,
  energy: 90,
  affection: 50,
  last: Date.now()
};

let state;
try {
  state = { ...defaults, ...JSON.parse(localStorage.getItem("jeyson_world_save") || "{}") };
} catch {
  state = { ...defaults };
}

for (const key of ["level", "xp", "coins", "happiness", "energy", "affection"]) {
  state[key] = Number(state[key]);
  if (!Number.isFinite(state[key])) state[key] = defaults[key];
}
state.level = Math.max(1, state.level);
state.xp = Math.max(0, state.xp);
state.coins = Math.max(0, state.coins);
state.happiness = clamp(state.happiness);
state.energy = clamp(state.energy);
state.affection = clamp(state.affection);

function save() {
  state.last = Date.now();
  try {
    localStorage.setItem("jeyson_world_save", JSON.stringify(state));
  } catch {}
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
  toast.timer = setTimeout(() => el.classList.remove("show"), 2300);
}

/* PERSONAJE: carga 3D de forma segura y ofrece alternativa */
const mount = $("scene");
let character = null;
let arms = [];
let legs = [];
let head = null;
let aura = null;
let stars = [];
let autoRotate = false;
let targetRotation = 0;
let danceUntil = 0;
let sleepUntil = 0;
let threeReady = false;

function showFallback(message = "") {
  if (!mount) return;

  mount.innerHTML = `
    <div id="jeyson-fallback" style="
      width:100%;height:100%;min-height:300px;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;position:relative;overflow:hidden;
      background:radial-gradient(ellipse at center,#315b3b 0%,#172b20 55%,transparent 100%);
      border-radius:22px;color:#fff;font-family:system-ui,sans-serif;">
      <div style="
        width:150px;height:190px;position:relative;
        animation:jeysonFloat 2.4s ease-in-out infinite;">
        <div style="
          position:absolute;top:4px;left:27px;width:96px;height:82px;
          background:#dca77e;border-radius:48% 48% 44% 44%;
          box-shadow:inset -8px -4px 0 #b9825e;">
        </div>
        <div style="
          position:absolute;top:-7px;left:22px;width:108px;height:48px;
          background:#241b18;border-radius:50% 50% 35% 35%;
          box-shadow:0 -7px 0 #241b18, -5px 9px 0 #241b18, 7px 10px 0 #241b18;">
        </div>
        <div style="position:absolute;top:34px;left:49px;width:9px;height:12px;background:#171715;border-radius:50%;box-shadow:39px 0 #171715;"></div>
        <div style="
          position:absolute;top:54px;left:61px;width:24px;height:10px;
          border-bottom:3px solid #57352a;border-radius:50%;">
        </div>
        <div style="
          position:absolute;top:79px;left:17px;width:116px;height:88px;
          background:#63b746;border-radius:35px 35px 18px 18px;
          box-shadow:inset -9px -3px 0 #43872f;">
          <div style="position:absolute;top:48px;left:37px;width:42px;height:22px;border:2px solid #d2f79d;border-radius:5px;"></div>
        </div>
        <div style="position:absolute;top:91px;left:0;width:29px;height:69px;background:#63b746;border-radius:18px;transform:rotate(12deg);"></div>
        <div style="position:absolute;top:91px;right:0;width:29px;height:69px;background:#63b746;border-radius:18px;transform:rotate(-12deg);"></div>
        <div style="position:absolute;top:157px;left:30px;width:30px;height:27px;background:#202b2c;border-radius:9px;"></div>
        <div style="position:absolute;top:157px;right:30px;width:30px;height:27px;background:#202b2c;border-radius:9px;"></div>
        <div style="position:absolute;top:175px;left:21px;width:43px;height:15px;background:#f1f0e5;border-radius:10px;"></div>
        <div style="position:absolute;top:175px;right:21px;width:43px;height:15px;background:#f1f0e5;border-radius:10px;"></div>
      </div>
      <div style="margin-top:12px;font-size:20px;font-weight:800;letter-spacing:2px;">JEYSON ✦</div>
      <div style="font-size:12px;opacity:.8;margin-top:5px;">Tu compañero virtual</div>
      <div id="fallback-message" style="font-size:11px;opacity:.65;margin-top:8px;text-align:center;padding:0 15px;">${message}</div>
      <style>
        @keyframes jeysonFloat {
          0%,100% { transform:translateY(0) rotate(-1deg); }
          50% { transform:translateY(-8px) rotate(1deg); }
        }
      </style>
    </div>
  `;
}

async function start3D() {
  if (!mount) return;

  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
    );

    mount.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.8, 7.5);
    camera.lookAt(0, 1.45, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "pan-y";

    scene.add(new THREE.HemisphereLight(0xe5ffe8, 0x303b32, 2.1));

    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-3, 6, 5);
    scene.add(light);

    const rim = new THREE.PointLight(0x9bf56d, 12, 12);
    rim.position.set(3, 3, -2);
    scene.add(rim);

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

    const mat = (color, roughness = 0.8) =>
      new THREE.MeshStandardMaterial({ color, roughness });

    const skin = mat(0xdca77e);
    const hair = mat(0x241b18);
    const hoodie = mat(0x63b746);
    const pants = mat(0x202b2c);
    const shoes = mat(0xf1f0e5);
    const dark = mat(0x171715);
    const detail = mat(0xd2f79d);

    function addMesh(geometry, material, parent, x, y, z) {
      const obj = new THREE.Mesh(geometry, material);
      obj.position.set(x, y, z);
      parent.add(obj);
      return obj;
    }

    function ball(parent, material, x, y, z, sx, sy, sz) {
      const obj = addMesh(
        new THREE.SphereGeometry(1, 18, 14),
        material, parent, x, y, z
      );
      obj.scale.set(sx, sy, sz);
      return obj;
    }

    function capsule(parent, material, x, y, z, radius, length) {
      return addMesh(
        new THREE.CapsuleGeometry(radius, length, 4, 10),
        material, parent, x, y, z
      );
    }

    character = new THREE.Group();
    scene.add(character);
    arms = [];
    legs = [];
    stars = [];

    for (const side of [-1, 1]) {
      legs.push(capsule(character, pants, side * 0.21, 0.62, 0, 0.14, 0.48));
      ball(character, shoes, side * 0.22, 0.17, 0.1, 0.18, 0.11, 0.3);
    }

    const torso = capsule(character, hoodie, 0, 1.45, 0, 0.39, 0.55);
    torso.scale.z = 0.76;

    ball(character, hoodie, 0, 1.82, -0.02, 0.36, 0.22, 0.3);

    const pocket = addMesh(
      new THREE.BoxGeometry(0.35, 0.18, 0.04),
      detail, character, 0, 1.32, 0.29
    );
    pocket.material = hoodie;

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.37, 1.76, 0);
      character.add(pivot);

      capsule(pivot, hoodie, side * 0.05, -0.28, 0, 0.12, 0.37);
      ball(pivot, skin, side * 0.07, -0.52, 0.02, 0.11, 0.12, 0.11);
      arms.push(pivot);
    }

    capsule(character, skin, 0, 2.0, 0, 0.11, 0.15);

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

    const smile = addMesh(
      new THREE.TorusGeometry(0.075, 0.009, 6, 16, Math.PI),
      dark, head, 0, -0.14, 0.36
    );
    smile.rotation.z = Math.PI;

    ball(head, hair, 0, 0.35, -0.02, 0.43, 0.24, 0.38);

    for (let i = 0; i < 17; i++) {
      const angle = (i / 17) * Math.PI * 2;
      ball(
        head, hair,
        Math.cos(angle) * 0.32,
        0.25 + Math.sin(i * 2.1) * 0.08,
        Math.sin(angle) * 0.26,
        0.12, 0.13, 0.12
      );
    }

    for (let i = 0; i < 7; i++) {
      ball(head, hair, (i - 3) * 0.1, 0.4 + Math.sin(i * 2) * 0.04, 0.22, 0.12, 0.11, 0.12);
    }

    ball(character, detail, 0.18, 1.5, 0.29, 0.045, 0.045, 0.02);

    aura = new THREE.Group();
    character.add(aura);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.02, 6, 40),
      new THREE.MeshBasicMaterial({ color: 0xb9fa77 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    aura.add(ring);

    for (let i = 0; i < 8; i++) {
      const star = addMesh(
        new THREE.OctahedronGeometry(0.05),
        new THREE.MeshBasicMaterial({ color: 0xc7ff8e }),
        character,
        Math.cos(i * Math.PI / 4) * 0.8,
        1.5,
        Math.sin(i * Math.PI / 4) * 0.4
      );
      stars.push(star);
    }

    function resize() {
      if (!mount || !mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(mount);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();

    let dragging = false;
    let lastX = 0;

    renderer.domElement.addEventListener("pointerdown", e => {
      dragging = true;
      lastX = e.clientX;
    });

    renderer.domElement.addEventListener("pointermove", e => {
      if (!dragging) return;
      targetRotation += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
      autoRotate = false;
    });

    const stopDrag = () => { dragging = false; };
    renderer.domElement.addEventListener("pointerup", stopDrag);
    renderer.domElement.addEventListener("pointercancel", stopDrag);
    renderer.domElement.addEventListener("pointerleave", stopDrag);

    threeReady = true;
    if (aura) aura.visible = state.level >= 10;

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (autoRotate) targetRotation += 0.008;
      character.rotation.y += (targetRotation - character.rotation.y) * 0.12;
      character.position.y = Math.sin(t * 2) * 0.025;
      head.rotation.z = Math.sin(t) * 0.02;

      if (Date.now() < danceUntil) {
        character.rotation.z = Math.sin(t * 12) * 0.1;
        arms[0].rotation.z = -1.6 + Math.sin(t * 12) * 0.3;
        arms[1].rotation.z = 1.6 - Math.sin(t * 12) * 0.3;
      } else if (Date.now() < sleepUntil) {
        arms[0].rotation.z = -0.2;
        arms[1].rotation.z = 0.2;
      } else {
        character.rotation.z *= 0.9;
        arms[0].rotation.z = -0.08 + Math.sin(t * 1.6) * 0.04;
        arms[1].rotation.z = 0.08 - Math.sin(t * 1.6) * 0.04;
      }

      aura.visible = state.level >= 10;
      aura.rotation.y = t * 0.6;

      stars.forEach((s, i) => {
        s.visible = state.level >= 5;
        s.rotation.y = t + i;
        s.position.y = 1.5 + Math.sin(t * 2 + i) * 0.5;
      });

      renderer.render(scene, camera);
    }

    animate();
  } catch (error) {
    console.error("No se pudo iniciar el personaje 3D:", error);
    threeReady = false;
    showFallback("Modo alternativo: el 3D no pudo cargarse.");
  }
}

showFallback("Preparando a tu compañero...");
start3D();

/* BOTÓN DE ROTACIÓN */
if ($("rotate-btn")) {
  $("rotate-btn").addEventListener("click", () => {
    autoRotate = !autoRotate;
    toast(autoRotate ? "¡Giremos juntos! ✨" : "Puedes girarme con tu dedo.");
  });
}

/* PROGRESIÓN */
const stages = [
  { level: 1, name: "El comienzo", description: "Un compañero con mucho por descubrir." },
  { level: 5, name: "Personalidad propia", description: "Desbloquea efectos y una presencia más expresiva." },
  { level: 10, name: "Evolución brillante", description: "Aparece un aura especial." },
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
  if ($("level")) $("level").textContent = state.level;
  if ($("coins")) $("coins").textContent = state.coins;
  if ($("xp-label")) $("xp-label").textContent = state.xp + " / 100 XP";
  if ($("xp-bar")) $("xp-bar").style.width = state.xp + "%";

  for (const key of ["happiness", "energy", "affection"]) {
    if ($(key + "-value")) $(key + "-value").textContent = state[key] + "%";
    if ($(key + "-bar")) $(key + "-bar").style.width = state[key] + "%";
  }

  const stage = currentStage();
  if ($("evolution-label")) $("evolution-label").textContent = "Etapa " + stage.level + " · " + stage.name;
  if ($("stage-name")) $("stage-name").textContent = stage.name;
  if ($("stage-description")) $("stage-description").textContent = stage.description;

  if (state.happiness < 30) {
    if ($("mood-label")) $("mood-label").textContent = "UN POCO TRISTE";
    if ($("greeting")) $("greeting").textContent = "¿Me acompañas un ratito?";
    if ($("mood-text")) $("mood-text").textContent = "Un poco de cariño y juego pueden animarme.";
  } else if (state.energy < 25) {
    if ($("mood-label")) $("mood-label").textContent = "CANSADO";
    if ($("greeting")) $("greeting").textContent = "Necesito descansar.";
    if ($("mood-text")) $("mood-text").textContent = "Vamos con calma, ¿sí?";
  } else {
    if ($("mood-label")) $("mood-label").textContent = "AQUÍ CONTIGO";
    if ($("greeting")) $("greeting").textContent = "¡Hey! Qué bueno verte.";
    if ($("mood-text")) $("mood-text").textContent = "Toca el personaje, muévelo y descubre cómo evoluciona.";
  }
}

function doAction(action) {
  switch (action) {
    case "hug":
      state.affection = clamp(state.affection + 8);
      state.happiness = clamp(state.happiness + 5);
      gainXP(8);
      if (arms.length) {
        arms[0].rotation.z = -1.5;
        arms[1].rotation.z = 1.5;
      }
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
      if ($("chat-input")) $("chat-input").focus();
      return;

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

if ($("dance-btn")) {
  $("dance-btn").addEventListener("click", () => {
    danceUntil = Date.now() + 5000;
    gainXP(5);
    save();
    render();
    toast("¡Vamos a bailar! 💃");
  });
}

/* NAVEGACIÓN */
function switchPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  const target = $(page + "-page");
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });
}

document.querySelectorAll("[data-page]").forEach(btn => {
  btn.addEventListener("click", () => switchPage(btn.dataset.page));
});

/* REINICIAR PROGRESO */
if ($("reset-btn")) {
  $("reset-btn").addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres reiniciar tu progreso?")) return;
    state = { ...defaults, last: Date.now() };
    save();
    render();
    toast("Progreso reiniciado.");
  });
}

/* CHAT: requiere un servidor para conectar una IA real */
function addBubble(text, who) {
  if (!$("chat-messages")) return;

  const el = document.createElement("div");
  el.className = "bubble " + who;
  el.textContent = text;
  $("chat-messages").appendChild(el);
  $("chat-messages").scrollTop = $("chat-messages").scrollHeight;
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
    if ($("chat-status")) $("chat-status").textContent = "Intentando conectar...";

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
      if ($("chat-status")) $("chat-status").textContent = "Conversación conectada";
    } catch {
      addBubble(
        "Todavía no estoy conectado a una inteligencia artificial real. 💚 El chat necesita configurar un servidor seguro.",
        "bot"
      );
      if ($("chat-status")) $("chat-status").textContent = "Falta conectar la inteligencia artificial";
    } finally {
      if ($("send-btn")) $("send-btn").disabled = false;
    }
  });
}

render();
save();
