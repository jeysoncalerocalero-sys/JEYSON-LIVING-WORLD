
/* =========================================================
   CHAT LOCAL DE JEYSON LIVING WORLD
   Compatible con la navegación existente.
   Requiere respuestas.json junto a script.js.
   ========================================================= */

let jeysonDatabase = null;
const jeysonUsedAnswers = new Set();
const JEYSON_PARABLE_KEY = "jeyson_ultima_parabola";

/* Cargar base de respuestas */
async function jeysonLoadDatabase() {
  const status = document.getElementById("chat-status");

  try {
    const response = await fetch("./respuestas.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();

    if (!data || !data.categorias) {
      throw new Error("Formato de respuestas.json incorrecto");
    }

    jeysonDatabase = data;

    if (status) {
      status.textContent = "Modo local listo. ¡Hablemos! 💚";
    }
  } catch (error) {
    console.error("JEYSON: error cargando respuestas.json", error);

    if (status) {
      status.textContent =
        "No pude cargar respuestas.json. Comprueba que exista en GitHub.";
    }
  }
}

/* Normalizar texto */
function jeysonNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/* Elegir respuestas sin repetir hasta agotar la categoría */
function jeysonChooseAnswer(list, category) {
  if (!Array.isArray(list) || list.length === 0) return null;

  let available = list
    .map((text, index) => ({ text, index }))
    .filter(item =>
      typeof item.text === "string" &&
      item.text.trim() &&
      !jeysonUsedAnswers.has(category + ":" + item.index)
    );

  if (available.length === 0) {
    list.forEach((_, index) => {
      jeysonUsedAnswers.delete(category + ":" + index);
    });

    available = list
      .map((text, index) => ({ text, index }))
      .filter(item =>
        typeof item.text === "string" && item.text.trim()
      );
  }

  if (available.length === 0) return null;

  const selected =
    available[Math.floor(Math.random() * available.length)];

  jeysonUsedAnswers.add(category + ":" + selected.index);
  return selected.text;
}

/* Una parábola como máximo al día en este navegador */
function jeysonGetParable() {
  const list = jeysonDatabase && jeysonDatabase.parabolas;

  if (!Array.isArray(list) || list.length === 0) {
    return "Todavía estoy preparando mis parábolas. 💚";
  }

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  try {
    if (localStorage.getItem(JEYSON_PARABLE_KEY) === today) {
      return "Hoy ya compartí contigo una parábola. 📖 Mañana habrá otra. " +
        "Mientras tanto, podemos hablar de lo que quieras. 💚";
    }
  } catch (error) {
    console.warn("No se pudo consultar el límite diario.");
  }

  const item = list[Math.floor(Math.random() * list.length)];

  try {
    localStorage.setItem(JEYSON_PARABLE_KEY, today);
  } catch (error) {
    console.warn("No se pudo guardar el límite diario.");
  }

  if (typeof item === "string") return "📖 " + item;

  return "📖 " + (item.titulo || "Una enseñanza para la vida") +
    "\n\n" + (item.texto || item.contenido || "");
}

/* Detectar el tema del mensaje */
function jeysonDetectCategory(message) {
  const t = jeysonNormalize(message);

  if (/\b(parabola|parabolas|historia con moraleja)\b/.test(t))
    return "parabolas";

  if (/\b(sexo|sexual|erotico|picante|deseo|intimidad|doble sentido)\b/.test(t))
    return "temas_picantes_adultos";

  if (/\b(enojado|enojada|rabia|furioso|furiosa|enfado|estoy harto|estoy harta)\b/.test(t))
    return "enojo";

  if (/\b(desamor|ruptura|mi ex|corazon roto|terminamos|me dejo|infidelidad)\b/.test(t))
    return "desamor";

  if (/\b(triste|tristeza|soledad|solo|sola|llorar|deprimido|deprimida|vacio|me siento mal)\b/.test(t))
    return "tristeza";

  if (/\b(consejo|que hago|que debo hacer|ayudame|necesito ayuda|no se que hacer)\b/.test(t))
    return "consejos";

  if (/\b(amigo|amiga|amistad|confianza|traicion)\b/.test(t))
    return "amistad";

  if (/\b(autoestima|no valgo|no sirvo|no soy suficiente)\b/.test(t))
    return "autoestima";

  if (/\b(vida|futuro|empezar de nuevo|superarme|motivacion)\b/.test(t))
    return "vida";

  if (/\b(coqueteo|ligar|conquistar|piropos|seductor)\b/.test(t))
    return "coqueteo";

  if (/\b(amor|enamorado|enamorada|novia|novio|pareja|te amo|te quiero|romantico|romantica|beso)\b/.test(t))
    return "amor";

  return null;
}

/* Respuestas sobre gustos que el usuario compartió */
function jeysonPersonalReply(message) {
  const t = jeysonNormalize(message);

  if (/\b(gustos|que sabes de mi|que me gusta|como soy)\b/.test(t)) {
    return "Por lo que me has contado, te gustan las canciones románticas " +
      "y melancólicas, las letras sinceras y los sonidos suaves. También " +
      "te gusta cuidar tu estilo, vestir bien y oler bien. Prefieres " +
      "conversaciones naturales y sinceras. 💚";
  }

  if (/\b(musica|canciones|cantantes|playlist)\b/.test(t)) {
    return "Te gustan las canciones románticas y tristes, las voces " +
      "emotivas y las melodías suaves y relajadas. 🎧";
  }

  if (/\b(ropa|vestir|estilo|perfume|oler bien|accesorios)\b/.test(t)) {
    return "Te gusta cuidar tu apariencia, vestir bien, oler bien y " +
      "llevar accesorios que combinen con tu estilo. ✨";
  }

  return null;
}

/* Preparar respuesta local */
function jeysonLocalReply(message) {
  if (!jeysonDatabase) {
    return "Todavía estoy cargando mis respuestas. 💚 Espera un momento y vuelve a escribirme.";
  }

  const personal = jeysonPersonalReply(message);
  if (personal) return personal;

  const category = jeysonDetectCategory(message);

  if (category === "parabolas") {
    return jeysonGetParable();
  }

  if (category) {
    const answer = jeysonChooseAnswer(
      jeysonDatabase.categorias[category],
      category
    );

    if (answer) return answer;
  }

  const t = jeysonNormalize(message);

  if (/\b(hola|buenas|hey|holi)\b/.test(t)) {
    return "¡Hola! 💚 Qué bueno tenerte aquí. ¿Cómo te ha ido hoy?";
  }

  if (/\b(gracias|te agradezco)\b/.test(t)) {
    return "Aquí estoy para conversar contigo. 💚";
  }

  return jeysonChooseAnswer(
    jeysonDatabase.respuestas_de_apoyo,
    "apoyo"
  ) || (jeysonDatabase.fallback &&
    jeysonDatabase.fallback.respuesta) ||
    "Te escucho. 💚 Cuéntame un poco más para entenderte.";
}

/* Crear burbujas sin duplicar nombres del código anterior */
function jeysonAddBubble(text, who) {
  const messages = document.getElementById("chat-messages");
  if (!messages) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble " + who;
  bubble.textContent = text;
  bubble.style.whiteSpace = "pre-wrap";

  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

/* Activar el chat */
function jeysonInitializeLocalChat() {
  const form = document.getElementById("chat-form");

  if (!form || form.dataset.jeysonLocalReady === "true") return;

  form.dataset.jeysonLocalReady = "true";

  form.addEventListener("submit", event => {
    event.preventDefault();

    const input = document.getElementById("chat-input");
    const button = document.getElementById("send-btn");
    const status = document.getElementById("chat-status");

    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    jeysonAddBubble(message, "user");
    input.value = "";

    if (button) button.disabled = true;

    try {
      jeysonAddBubble(jeysonLocalReply(message), "bot");

      if (status) {
        status.textContent = "Modo local activo · JEYSON conversa contigo 💚";
      }
    } catch (error) {
      console.error("Error en el chat de JEYSON:", error);

      jeysonAddBubble(
        "Tuve un problema preparando la respuesta. Inténtalo otra vez. 💚",
        "bot"
      );
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* Iniciar sin reemplazar las funciones originales del juego */
jeysonInitializeLocalChat();
jeysonLoadDatabase();

/* Navegación: evita registrar el mismo manejador dos veces */
document.querySelectorAll(".tab[data-page]").forEach(button => {
  if (button.dataset.jeysonNavigationReady === "true") return;

  button.dataset.jeysonNavigationReady = "true";

  button.addEventListener("click", () => {
    const page = button.dataset.page;

    document.querySelectorAll(".page").forEach(section => {
      section.classList.toggle("hidden", section.id !== page + "-page");
    });

    document.querySelectorAll(".tab[data-page]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    if (page === "chat") {
      const input = document.getElementById("chat-input");
      if (input) input.focus();
    }
  });
});
