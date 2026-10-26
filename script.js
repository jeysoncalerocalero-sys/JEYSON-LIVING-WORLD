
/* =========================================================
   CHAT LOCAL DE JEYSON LIVING WORLD
   Mantiene intactas las funciones anteriores del juego.
   Requiere respuestas.json en la misma carpeta.
   ========================================================= */

let jeysonDatabase = null;
const jeysonUsedAnswers = new Set();
const JEYSON_PARABLE_KEY = "jeyson_ultima_parabola";

async function loadJeysonDatabase() {
  try {
    const response = await fetch("./respuestas.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar respuestas.json");
    }

    const data = await response.json();

    if (!data || !data.categorias) {
      throw new Error("La base de respuestas no es válida");
    }

    jeysonDatabase = data;

    if ($("chat-status")) {
      $("chat-status").textContent =
        "JEYSON está listo para conversar 💚";
    }
  } catch (error) {
    console.error("Error cargando respuestas.json:", error);

    if ($("chat-status")) {
      $("chat-status").textContent =
        "No se pudo cargar respuestas.json. Comprueba que esté publicado.";
    }
  }
}

function jeysonNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function jeysonChooseAnswer(list, category) {
  if (!Array.isArray(list) || !list.length) return null;

  let available = list
    .map((text, index) => ({ text, index }))
    .filter(item =>
      typeof item.text === "string" &&
      item.text.trim() &&
      !jeysonUsedAnswers.has(category + ":" + item.index)
    );

  if (!available.length) {
    list.forEach((_, index) =>
      jeysonUsedAnswers.delete(category + ":" + index)
    );

    available = list
      .map((text, index) => ({ text, index }))
      .filter(item =>
        typeof item.text === "string" && item.text.trim()
      );
  }

  if (!available.length) return null;

  const chosen =
    available[Math.floor(Math.random() * available.length)];

  jeysonUsedAnswers.add(category + ":" + chosen.index);
  return chosen.text;
}

function jeysonGetParable() {
  const list = jeysonDatabase?.parabolas;

  if (!Array.isArray(list) || !list.length) {
    return "Todavía estoy preparando más parábolas. 💚";
  }

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  try {
    if (localStorage.getItem(JEYSON_PARABLE_KEY) === today) {
      return "Hoy ya te conté una parábola. 📖 Mañana habrá otra. " +
        "Mientras tanto, podemos conversar de lo que quieras. 💚";
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

function jeysonDetectCategory(message) {
  const t = jeysonNormalize(message);

  if (/\b(parabola|parabolas|historia con moraleja)\b/.test(t))
    return "parabolas";

  if (/\b(gustos|que sabes de mi|que me gusta|como soy)\b/.test(t))
    return "gustos_del_usuario";

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

function jeysonLocalReply(message) {
  if (!jeysonDatabase) {
    return "Todavía estoy cargando mis respuestas. 💚 " +
      "Espera un momento y vuelve a escribirme.";
  }

  const personal = jeysonPersonalReply(message);
  if (personal) return personal;

  const category = jeysonDetectCategory(message);

  if (category === "parabolas") {
    return jeysonGetParable();
  }

  if (category === "gustos_del_usuario") {
    return "Todavía estoy aprendiendo más sobre tus gustos. 💚";
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
  ) || jeysonDatabase.fallback?.respuesta ||
    "Te escucho. 💚 Cuéntame un poco más para entenderte.";
}

function addBubble(text, who) {
  const messages = $("chat-messages");
  if (!messages) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble " + who;
  bubble.textContent = text;
  bubble.style.whiteSpace = "pre-wrap";

  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function initializeJeysonLocalChat() {
  const form = $("chat-form");

  if (!form || form.dataset.localChatReady === "true") return;

  form.dataset.localChatReady = "true";

  form.addEventListener("submit", event => {
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
      addBubble(jeysonLocalReply(message), "bot");

      if ($("chat-status")) {
        $("chat-status").textContent =
          "Modo local activo · JEYSON está conversando 💚";
      }
    } catch (error) {
      console.error("Error en el chat local:", error);

      addBubble(
        "Tuve un problema al preparar la respuesta. Inténtalo otra vez. 💚",
        "bot"
      );
    } finally {
      if (button) button.disabled = false;
    }
  });
}

initializeJeysonLocalChat();
loadJeysonDatabase();
