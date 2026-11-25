/* =============================================================
   Sala de juegos (solo existe en arcade.html)
   Pestañas accesibles (patrón tablist de WAI-ARIA) para elegir
   entre los juegos. Cada juego vive en su propia página dentro
   de juegos/ y se carga en un iframe solo cuando se elige: así el
   juego 3D (Three.js) no se descarga si nadie lo abre, y el juego
   que se deja de ver se descarga para que no siga sonando ni
   gastando batería en segundo plano.
   ============================================================= */
(function () {
  "use strict";

  var pestanas = Array.prototype.slice.call(document.querySelectorAll(".pestana-juego"));
  if (!pestanas.length) return;

  var fichas = Array.prototype.slice.call(document.querySelectorAll("[data-ficha]"));

  function panelDe(pestana) {
    return document.getElementById(pestana.getAttribute("aria-controls"));
  }

  function activar(pestana, enfocar) {
    pestanas.forEach(function (otra) {
      var activa = otra === pestana;
      var panel = panelDe(otra);
      var marco = panel.querySelector("iframe");

      otra.setAttribute("aria-selected", activa ? "true" : "false");
      otra.tabIndex = activa ? 0 : -1;
      panel.hidden = !activa;

      if (activa) {
        if (marco.getAttribute("src") !== marco.dataset.src) {
          marco.setAttribute("src", marco.dataset.src);
          if (window.Marcadores) window.Marcadores.metrica("aperturas");
        }
      } else if (marco.hasAttribute("src")) {
        marco.removeAttribute("src");
      }
    });

    var juego = pestana.dataset.juego;
    fichas.forEach(function (ficha) {
      ficha.hidden = ficha.dataset.ficha !== juego;
    });

    if (history.replaceState) {
      history.replaceState(null, "", "#" + juego);
    }
    if (enfocar) pestana.focus();
  }

  pestanas.forEach(function (pestana, i) {
    pestana.addEventListener("click", function () {
      activar(pestana, false);
    });

    pestana.addEventListener("keydown", function (e) {
      var destino = null;
      if (e.key === "ArrowRight") destino = pestanas[(i + 1) % pestanas.length];
      if (e.key === "ArrowLeft") destino = pestanas[(i - 1 + pestanas.length) % pestanas.length];
      if (e.key === "Home") destino = pestanas[0];
      if (e.key === "End") destino = pestanas[pestanas.length - 1];
      if (destino) {
        e.preventDefault();
        activar(destino, true);
      }
    });
  });

  /* Pantalla completa del marco del juego. Si el navegador no la
     permite, el botón se oculta y queda el enlace a otra pestaña. */
  Array.prototype.slice.call(document.querySelectorAll("[data-pantalla-completa]")).forEach(function (boton) {
    var panel = document.getElementById(boton.getAttribute("data-pantalla-completa"));
    var marco = panel.querySelector(".marco-juego");
    var pedir = marco.requestFullscreen || marco.webkitRequestFullscreen;

    if (!pedir) {
      boton.hidden = true;
      return;
    }

    boton.addEventListener("click", function () {
      var resultado = pedir.call(marco);
      var iframe = marco.querySelector("iframe");
      if (resultado && resultado.then) {
        resultado.then(function () {
          if (iframe) iframe.focus();
        }).catch(function () {
          boton.hidden = true;
        });
      } else if (iframe) {
        iframe.focus();
      }
    });
  });

  /* Abre el juego indicado en la dirección (arcade.html#zombis). */
  var inicial = pestanas.filter(function (p) {
    return "#" + p.dataset.juego === window.location.hash;
  })[0] || pestanas[0];
  activar(inicial, false);
})();
