
/* =========================================================
   JEYSON LIVING WORLD — CHAT LOCAL
   Compatible con GitHub Pages y respuestas.json
   ========================================================= */

const $ = (id) => document.getElementById(id);

let jeysonDatabase = null;
const usedAnswers = new Set();
const PARABLE_KEY = "jeyson_ultima_parabola";

/* ---------- CARGAR BASE DE RESPUESTAS ---------- */

async function loadJeysonDatabase() {
  const status = $("chat-status");

  try {
    const response = await fetch("./respuestas.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("No se encontró respuestas.json");
    }

    const data = await response.json();

    if (!data || !data.categorias) {
      throw new Error("La estructura del archivo JSON no es válida");
    }

    jeysonDatabase = data;

    if (status) {
      status.textContent = "JEYSON está listo para conversar 💚";
    }
  } catch (error) {
    console.error("Error al cargar respuestas.json:", error);

    if (status) {
      status.textContent =
        "No pude cargar respuestas.json. Comprueba que esté publicado.";
    }
  }
}

/* ---------- UTILIDADES ---------- */

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function chooseAnswer(list, category = "general") {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  let available = list
    .map((text, index) => ({ text, index }))
    .filter(item =>
      typeof item.text === "string" &&
      item.text.trim() &&
      !usedAnswers.has(category + ":" + item.index)
    );

  if (available.length === 0) {
    list.forEach((_, index) =>
      usedAnswers.delete(category + ":" + index)
    );

    available = list
      .map((text, index) => ({ text, index }))
      .filter(item =>
        typeof item.text === "string" && item.text.trim()
      );
  }

  if (!available.length) return null;

  const selected =
    available[Math.floor(Math.random() * available.length)];

  usedAnswers.add(category + ":" + selected.index);

  return selected.text;
}

/* ---------- PARÁBOLAS: UNA POR DÍA ---------- */

function getLocalDateKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function getParable() {
  const list = jeysonDatabase?.parabolas;

  if (!Array.isArray(list) || list.length === 0) {
    return "Todavía estoy preparando más parábolas. 💚";
  }

  const today = getLocalDateKey();
  let lastDate = "";

  try {
    lastDate = localStorage.getItem(PARABLE_KEY) || "";
  } catch (error) {
    console.warn("No se pudo consultar el almacenamiento local.");
  }

  if (lastDate === today) {
    return (
      "📖 Hoy ya compartí contigo una parábola. " +
      "Mañana podemos descubrir otra. 💚\n\n" +
      "Mientras tanto, dime qué te preocupa y lo hablamos."
    );
  }

  const item = list[Math.floor(Math.random() * list.length)];

  try {
    localStorage.setItem(PARABLE_KEY, today);
  } catch (error) {
    console.warn("No se pudo guardar el límite diario.");
  }

  if (typeof item === "string") {
    return "📖 " + item;
  }

  return "📖 " + (item.titulo || "Una enseñanza para la vida") +
    "\n\n" + (item.texto || item.contenido || "");
}

/* ---------- GUSTOS PERSONALES ---------- */

function getPersonalTasteReply(message) {
  const text = normalizeText(message);

  if (
    text.includes("que sabes de mi") ||
    text.includes("como soy") ||
    text.includes("mis gustos") ||
    text.includes("que me gusta")
  ) {
    return (
      "Por lo que me has contado, te gustan las canciones románticas " +
      "y melancólicas, las letras sinceras y los sonidos suaves y " +
      "relajados. También te gusta cuidar tu apariencia, vestir bien, " +
      "oler bien y llevar accesorios con estilo. Prefieres que te " +
      "hablen de tú y de forma natural, sin frases demasiado cursis. 💚"
    );
  }

  if (
    text.includes("musica") ||
    text.includes("canciones") ||
    text.includes("cantantes") ||
    text.includes("playlist")
  ) {
    return (
      "Por lo que me has contado, te atraen las canciones románticas, " +
      "tristes y sinceras, con voces emotivas y sonidos suaves. " +
      "También te gustan las melodías relajadas y elegantes. 🎧"
    );
  }

  if (
    text.includes("ropa") ||
    text.includes("vestir") ||
    text.includes("estilo") ||
    text.includes("perfume") ||
    text.includes("prendas") ||
    text.includes("accesorios")
  ) {
    return (
      "Te gusta cuidar tu estilo, vestir bien, oler bien y usar " +
      "prendas y accesorios que te hagan sentir elegante. ✨"
    );
  }

  return null;
}

/* ---------- DETECTAR EL TEMA ---------- */

function detectCategory(message) {
  const text = normalizeText(message);

  if (
    /\b(parabola|parabolas|historia con moraleja|ensenanza con historia)\b/.test(text)
  ) return "parabolas";

  if (
    /\b(sexo|sexual|erotico|picante|caliente|deseo|intimidad|seducir|doble sentido)\b/.test(text)
  ) return "temas_picantes_adultos";

  if (
    /\b(enojado|enojada|rabia|furioso|furiosa|me molesta|odio|ira|enfado|estoy harto|estoy harta)\b/.test(text)
  ) return "enojo";

  if (
    /\b(desamor|ruptura|me dejo|me abandono|mi ex|corazon roto|terminamos|olvidarla|olvidarlo|me fue infiel)\b/.test(text)
  ) return "desamor";

  if (
    /\b(triste|tristeza|solo|sola|soledad|llorar|deprimido|deprimida|dolor|vacio|perdi a alguien|me siento mal|estoy mal)\b/.test(text)
  ) return "tristeza";

  if (
    /\b(consejo|que hago|que debo hacer|ayudame|necesito ayuda|recomiendame|no se que hacer)\b/.test(text)
  ) return "consejos";

  if (
    /\b(amigo|amiga|amistad|amistades|confianza|me traicionaron)\b/.test(text)
  ) return "amistad";

  if (
    /\b(autoestima|no valgo|no sirvo|me siento insuficiente|me odio a mi mismo|no soy suficiente)\b/.test(text)
  ) return "autoestima";

  if (
    /\b(vida|futuro|cambiar mi vida|empezar de nuevo|superarme|motivacion)\b/.test(text)
  ) return "vida";

  if (
    /\b(coquetea|coqueteo|ligar|conquistar|piropos|piropear|seductor)\b/.test(text)
  ) return "coqueteo";

  if (
    /\b(amor|enamorado|enamorada|novia|novio|pareja|te amo|te quiero|romantico|romantica|beso|abrazame)\b/.test(text)
  ) return "amor";

  return null;
}

/* ---------- RESPUESTAS DE APOYO ---------- */

function getSupportReply(message) {
  const text = normalizeText(message);

  if (/\b(hola|buenas|hey|holi|que tal)\b/.test(text)) {
    return "¡Aquí estoy! 💚 Cuéntame, ¿cómo te ha ido hoy?";
  }

  if (/\b(gracias|te agradezco|muchas gracias)\b/.test(text)) {
    return "No tienes que agradecerme. 💚 Me alegra poder acompañarte.";
  }

  if (/\b(te quiero|te amo)\b/.test(text)) {
    return "Qué bonito que me lo digas. 💚 Estoy aquí para escucharte y conversar contigo.";
  }

  if (/\b(adios|hasta luego|me voy|nos vemos)\b/.test(text)) {
    return "Cuídate mucho. 💚 Cuando quieras volver a conversar, aquí tendrás un espacio para expresarte.";
  }

  return null;
}

/* ---------- CREAR RESPUESTA LOCAL ---------- */

function getLocalReply(message) {
  if (!jeysonDatabase) {
    return (
      "Todavía estoy cargando mis respuestas. 💚 " +
      "Espera un momento y vuelve a escribirme."
    );
  }

  const personalReply = getPersonalTasteReply(message);

  if (personalReply) return personalReply;

  const category = detectCategory(message);

  if (category === "parabolas") {
    return getParable();
  }

  if (category) {
    const list = jeysonDatabase.categorias[category];

    if (Array.isArray(list)) {
      const answer = chooseAnswer(list, category);

      if (answer) return answer;
    }
  }

  const supportReply = getSupportReply(message);

  if (supportReply) return supportReply;

  const support = jeysonDatabase.respuestas_de_apoyo;
  const fallback = jeysonDatabase.fallback?.respuesta;

  return (
    chooseAnswer(support, "apoyo") ||
    fallback ||
    "Te escucho. 💚 Cuéntame un poco más para entender lo que quieres decirte."
  );
}

/* ---------- MOSTRAR MENSAJES ---------- */

function addBubble(text, who) {
  const messages = $("chat-messages");

  if (!messages) {
    console.warn("No se encontró el elemento chat-messages.");
    return;
  }

  const bubble = document.createElement("div");

  bubble.className = "bubble " + who;
  bubble.textContent = text;
  bubble.style.whiteSpace = "pre-wrap";

  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

/* ---------- CONECTAR EL FORMULARIO ---------- */

function initializeJeysonChat() {
  const form = $("chat-form");

  if (!form || form.dataset.jeysonReady === "true") {
    return;
  }

  form.dataset.jeysonReady = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = $("chat-input");
    const button = $("send-btn");

    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    addBubble(message, "user");
    input.value = "";

    if (button) button.disabled = true;

    try {
      const reply = getLocalReply(message);
      addBubble(reply, "bot");

      const status = $("chat-status");

      if (status) {
        status.textContent = jeysonDatabase
          ? "Modo local activo · JEYSON está conversando 💚"
          : "Esperando que cargue respuestas.json…";
      }
    } catch (error) {
      console.error("Error en el chat de JEYSON:", error);

      addBubble(
        "Tuve un pequeño problema al preparar la respuesta. " +
        "Intenta escribirme otra vez. 💚",
        "bot"
      );
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* ---------- INICIO ---------- */

function startJeyson() {
  initializeJeysonChat();
  loadJeysonDatabase();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startJeyson);
} else {
  startJeyson();
}
