(function () {
  "use strict";

  var prefiereMenosMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---- Videos de los reels (solo existen en index.html) ----
     Cada tarjeta reproduce su propio archivo si existe en video/;
     si no, se queda en la fotografía de respaldo (poster) sin
     mostrar ningún error. El video solo se reproduce mientras está
     a la vista (ahorra batería y no distrae fuera de pantalla) y
     siempre hay un botón para pausarlo, como pide WCAG 2.2.2. */
  var reels = Array.prototype.slice.call(document.querySelectorAll(".reel"));

  reels.forEach(function (reel) {
    var video = reel.querySelector(".reel-video");
    var fuente = reel.querySelector("source");
    var boton = reel.querySelector(".reel-pausa");
    if (!video || !boton) return;

    var marcarSinVideo = function () {
      reel.classList.add("sin-video");
    };

    /* Si todavía no hay ningún <source> real (está comentado en el
       HTML a la espera de un video propio), no tiene sentido dejar
       el botón de reproducir visible ni intentar reproducir nada. */
    if (!fuente) {
      marcarSinVideo();
      return;
    }

    fuente.addEventListener("error", marcarSinVideo);
    video.addEventListener("error", marcarSinVideo);

    boton.addEventListener("click", function () {
      if (reel.classList.contains("sin-video")) return;
      if (video.paused) {
        video.play().catch(marcarSinVideo);
      } else {
        video.pause();
      }
    });

    video.addEventListener("play", function () {
      boton.setAttribute("aria-pressed", "true");
      boton.setAttribute("aria-label", "Pausar video de " + (boton.dataset.titulo || ""));
    });
    video.addEventListener("pause", function () {
      boton.setAttribute("aria-pressed", "false");
      boton.setAttribute("aria-label", "Reproducir video de " + (boton.dataset.titulo || ""));
    });

    if (prefiereMenosMovimiento || !("IntersectionObserver" in window)) {
      return;
    }

    var observadorReel = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (reel.classList.contains("sin-video")) return;
          if (entrada.isIntersecting) {
            video.play().catch(marcarSinVideo);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );
    observadorReel.observe(reel);
  });

  /* ---- Contador del resultado de Lighthouse (solo en index.html) ----
     Un único momento animado, con propósito informativo (mostrar
     una mejora real medida), no decorativo. Se dispara una sola
     vez al entrar en el viewport y respeta la preferencia de
     movimiento reducido mostrando el valor final de inmediato. */
  var bloqueEstadistica = document.querySelector("[data-contador]");
  if (bloqueEstadistica) {
    var cifra = bloqueEstadistica.querySelector("[data-num]");
    var desde = parseInt(bloqueEstadistica.getAttribute("data-de"), 10);
    var hasta = parseInt(bloqueEstadistica.getAttribute("data-a"), 10);

    var mostrarFinal = function () {
      cifra.textContent = hasta;
    };

    if (prefiereMenosMovimiento || !("IntersectionObserver" in window)) {
      mostrarFinal();
    } else {
      var yaAnimado = false;
      var animar = function () {
        var inicio = null;
        var duracion = 900;

        var paso = function (marca) {
          if (inicio === null) inicio = marca;
          var avance = Math.min((marca - inicio) / duracion, 1);
          var progreso = 1 - Math.pow(1 - avance, 3); /* ease-out cúbico */
          var valorActual = Math.round(desde + (hasta - desde) * progreso);
          cifra.textContent = valorActual;
          if (avance < 1) {
            window.requestAnimationFrame(paso);
          } else {
            mostrarFinal();
          }
        };
        window.requestAnimationFrame(paso);
      };

      var observadorContador = new IntersectionObserver(
        function (entradas) {
          entradas.forEach(function (entrada) {
            if (entrada.isIntersecting && !yaAnimado) {
              yaAnimado = true;
              animar();
              observadorContador.disconnect();
            }
          });
        },
        { threshold: 0.6 }
      );
      observadorContador.observe(bloqueEstadistica);
    }
  }

  /* ---- Interruptor de precios de Post-producción (solo existe en
     index.html) ----
     Cada tarjeta de plan trae su propio precio por minuto y su
     propio precio por proyecto en atributos data-*. El interruptor
     solo decide cuál de los dos se muestra; los números reales
     viven en el marcado, no en el script. */
  var interruptorPrecio = document.getElementById("boton-interruptor");

  if (interruptorPrecio) {
    var planes = Array.prototype.slice.call(document.querySelectorAll(".plan"));
    var etiquetaMinuto = document.getElementById("etiqueta-minuto");
    var etiquetaProyecto = document.getElementById("etiqueta-proyecto");

    var actualizarPrecios = function (porProyecto) {
      planes.forEach(function (plan) {
        var cifra = plan.querySelector(".cifra");
        var unidad = plan.querySelector(".plan-unidad");
        if (!cifra || !unidad) return;

        if (porProyecto) {
          cifra.textContent = "$" + plan.dataset.precioProyecto;
          unidad.textContent = "COP / proyecto";
        } else {
          cifra.textContent = "$" + plan.dataset.precioMinuto;
          unidad.textContent = "COP / minuto";
        }
      });

      interruptorPrecio.setAttribute("aria-checked", porProyecto ? "true" : "false");
      interruptorPrecio.setAttribute(
        "aria-label",
        porProyecto ? "Cambiar a precio por minuto entregado" : "Cambiar a precio por proyecto completo"
      );

      if (etiquetaMinuto) {
        etiquetaMinuto.classList.toggle("interruptor-etiqueta-activa", !porProyecto);
      }
      if (etiquetaProyecto) {
        etiquetaProyecto.classList.toggle("interruptor-etiqueta-activa", porProyecto);
      }
    };

    interruptorPrecio.addEventListener("click", function () {
      var porProyecto = interruptorPrecio.getAttribute("aria-checked") !== "true";
      actualizarPrecios(porProyecto);
    });
  }
})();
