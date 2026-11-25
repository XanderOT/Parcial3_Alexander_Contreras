/* =============================================================
   Alternador de Modo Oscuro / Claro — compartido por todo el sitio
   Se carga en el <head> (sin defer) para aplicar el tema guardado
   antes del primer pintado y evitar el destello de color.
   - Guarda la preferencia en localStorage ("ac-tema").
   - Si no hay preferencia guardada, respeta prefers-color-scheme.
   - Sincroniza pestañas abiertas con el evento "storage".
   - Cualquier botón con [data-alternar-tema] cambia el tema.
   ============================================================= */
(function () {
  "use strict";

  var CLAVE = "ac-tema";
  var raiz = document.documentElement;

  function leer() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardar(valor) {
    try { localStorage.setItem(CLAVE, valor); } catch (e) { /* sin almacenamiento */ }
  }
  function preferido() {
    var guardado = leer();
    if (guardado === "claro" || guardado === "oscuro") return guardado;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "claro" : "oscuro";
  }

  function aplicar(tema) {
    if (tema === "claro") {
      raiz.setAttribute("data-tema", "claro");
    } else {
      raiz.removeAttribute("data-tema");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "claro" ? "#f2f0e9" : "#06070a");
    actualizarBotones(tema);
  }

  function actualizarBotones(tema) {
    var botones = document.querySelectorAll("[data-alternar-tema]");
    for (var i = 0; i < botones.length; i++) {
      var b = botones[i];
      var esClaro = tema === "claro";
      b.setAttribute("aria-pressed", esClaro ? "true" : "false");
      b.setAttribute("aria-label", esClaro ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
      var icono = b.querySelector(".boton-tema-icono");
      var texto = b.querySelector(".boton-tema-texto");
      if (icono) icono.textContent = esClaro ? "☾" : "☀";
      if (texto) texto.textContent = esClaro ? "Oscuro" : "Claro";
    }
  }

  aplicar(preferido());

  document.addEventListener("DOMContentLoaded", function () {
    actualizarBotones(preferido());
    document.addEventListener("click", function (ev) {
      var boton = ev.target.closest ? ev.target.closest("[data-alternar-tema]") : null;
      if (!boton) return;
      var nuevo = raiz.getAttribute("data-tema") === "claro" ? "oscuro" : "claro";
      guardar(nuevo);
      aplicar(nuevo);
      if (window.Marcadores) window.Marcadores.metrica("cambios_tema");
    });
  });

  window.addEventListener("storage", function (ev) {
    if (ev.key === CLAVE) aplicar(preferido());
  });
})();
