/* =============================================================
   Asteroides AR — interfaz, cámara, tiempo y puntaje
   Autor: Alexander Contreras Triviño
   - Cámara: getUserMedia pone el video de la cámara trasera detrás
     de la escena transparente (realidad aumentada "ventana mágica",
     funciona en cualquier teléfono y en la webcam del computador).
   - WebXR: en Android/Chrome A-Frame muestra el botón AR para la
     sesión inmersiva; al entrar se oculta el video (lo pinta el
     propio navegador).
   - Puntaje con racha (x1…x5) y guardado en localStorage mediante
     window.Marcadores al terminar los 60 s.
   ============================================================= */
(function () {
  "use strict";

  var escena = document.getElementById("ar-escena");
  if (!escena) return;

  var $ = function (id) { return document.getElementById(id); };
  var video = $("ar-video");
  var escenario = $("ar-escenario");
  var estrellas = $("estrellas");
  var cursor = $("cursor");
  var juego = window.ARJuego;

  var DURACION = 60;
  var puntos = 0, impactos = 0, racha = 1, ultimoImpacto = 0, tiempo = DURACION, reloj = null;
  var flujo = null, modoXR = false;

  function estado(texto) { $("ar-estado").textContent = "Estado: " + texto; }
  function mensaje(texto) { $("ar-mensaje").textContent = texto; }
  function pintarHud() {
    $("ar-puntos").textContent = puntos;
    $("ar-tiempo").textContent = tiempo;
    $("ar-racha").textContent = "x" + racha;
  }

  /* ---------- Partida ---------- */
  function iniciar() {
    puntos = 0; impactos = 0; racha = 1; tiempo = DURACION; juego.dificultad = 1;
    juego.activo = true;
    pintarHud();
    mensaje("¡Destruye todos los asteroides que puedas!");
    $("ar-iniciar").textContent = "Reiniciar partida";
    if (window.Marcadores) window.Marcadores.metrica("ar");
    clearInterval(reloj);
    reloj = setInterval(function () {
      tiempo--;
      juego.dificultad = 1 + (DURACION - tiempo) / DURACION * 1.5;   // acelera con el tiempo
      if (racha > 1 && performance.now() - ultimoImpacto > 3000) racha = 1;
      pintarHud();
      if (tiempo <= 0) terminar();
    }, 1000);
  }

  function terminar() {
    clearInterval(reloj);
    juego.activo = false;
    tiempo = 0; pintarHud();
    mensaje("¡Tiempo! " + impactos + " asteroides destruidos y " + puntos + " puntos. Guardado en el historial.");
    $("ar-iniciar").textContent = "Jugar otra vez";
    if (window.Marcadores) {
      window.Marcadores.registrar("ar", {
        modo: modoXR ? "WebXR inmersivo" : flujo ? "Cámara (AR)" : "3D sin cámara",
        resultado: "Completada",
        marcador: impactos + " asteroides",
        puntos: puntos,
        extra: { impactos: impactos }
      });
    }
  }

  escena.addEventListener("impacto", function () {
    var ahora = performance.now();
    racha = ahora - ultimoImpacto < 3000 ? Math.min(5, racha + 1) : 1;
    ultimoImpacto = ahora;
    impactos++;
    puntos += 10 * racha;
    pintarHud();
    if (navigator.vibrate) navigator.vibrate(30);
  });

  $("ar-iniciar").addEventListener("click", iniciar);

  /* Espacio dispara al asteroide que está bajo el cursor (accesible
     desde teclado, sin esperar el fusible). */
  document.addEventListener("keydown", function (e) {
    if (e.key !== " " || !juego.activo) return;
    var etiqueta = (e.target.tagName || "").toLowerCase();
    if (etiqueta === "button" || etiqueta === "a" || etiqueta === "input" || etiqueta === "textarea") return;
    e.preventDefault();
    var c = cursor.components.cursor;
    if (c && c.intersectedEl) c.intersectedEl.emit("click");
  });

  /* ---------- Cámara ---------- */
  function apagarCamara() {
    if (flujo) flujo.getTracks().forEach(function (t) { t.stop(); });
    flujo = null;
    video.srcObject = null;
    escenario.classList.remove("con-camara");
    estrellas.setAttribute("visible", true);
    $("ar-camara").setAttribute("aria-pressed", "false");
    $("ar-camara").textContent = "Activar cámara";
    estado("cámara apagada, modo 3D.");
  }

  $("ar-camara").addEventListener("click", function () {
    if (flujo) { apagarCamara(); return; }
    if (!window.isSecureContext) {
      estado("la cámara necesita HTTPS. Abre el sitio publicado (https://…) o usa localhost.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      estado("este navegador no permite usar la cámara.");
      return;
    }
    estado("pidiendo permiso para usar la cámara…");
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }).then(function (s) {
      flujo = s;
      video.srcObject = s;
      escenario.classList.add("con-camara");
      estrellas.setAttribute("visible", false);
      $("ar-camara").setAttribute("aria-pressed", "true");
      $("ar-camara").textContent = "Apagar cámara";
      estado("cámara activa. Mueve el teléfono para buscar asteroides a tu alrededor.");
    }).catch(function (err) {
      estado("no se pudo abrir la cámara (" + (err && err.name ? err.name : "error") + "). Revisa los permisos del navegador.");
    });
  });

  /* ---------- Pantalla completa ---------- */
  $("ar-pantalla").addEventListener("click", function () {
    var pedir = escenario.requestFullscreen || escenario.webkitRequestFullscreen;
    if (pedir) pedir.call(escenario);
  });
  if (!(escenario.requestFullscreen || escenario.webkitRequestFullscreen)) $("ar-pantalla").hidden = true;

  /* ---------- Sesión WebXR inmersiva ---------- */
  escena.addEventListener("enter-vr", function () {
    if (escena.is("ar-mode")) {
      modoXR = true;
      escenario.classList.add("en-xr");
      estrellas.setAttribute("visible", false);
      $("planeta").setAttribute("position", "0 1.2 -2.5");
      estado("realidad aumentada inmersiva (WebXR).");
    }
  });
  escena.addEventListener("exit-vr", function () {
    modoXR = false;
    escenario.classList.remove("en-xr");
    estrellas.setAttribute("visible", !flujo);
    $("planeta").setAttribute("position", "0 1.5 -4");
    estado(flujo ? "cámara activa." : "modo 3D.");
  });

  /* Libera la cámara al salir de la página (batería y privacidad). */
  window.addEventListener("pagehide", function () { if (flujo) apagarCamara(); });

  if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported("immersive-ar").then(function (ok) {
      estado(ok ? "listo. Este dispositivo soporta WebXR: usa el botón AR de la escena o activa la cámara."
                : "listo. Activa la cámara para jugar en realidad aumentada, o juega en 3D arrastrando la vista.");
    }).catch(function () {});
  } else {
    estado("listo. Activa la cámara para jugar en realidad aumentada, o juega en 3D arrastrando la vista.");
  }

  pintarHud();
})();
