/* =============================================================
   Marcadores — persistencia de datos con la API localStorage
   Autor: Alexander Contreras Triviño
   Compartido por el sitio (js/) y por los juegos (juegos/*.html).
   Todo el sitio vive en el mismo origen, así que los juegos dentro
   de un iframe y la página del Arcade leen el mismo almacenamiento.

   Claves que usa:
     ac-historial  → arreglo con las últimas 60 partidas
     ac-metricas   → contadores de interacción (visitas, partidas…)

   API pública (window.Marcadores):
     registrar(juego, datos)  guarda una partida terminada
     metrica(nombre, n)       suma n (por defecto 1) a un contador
     historial()              devuelve las partidas (más reciente primero)
     metricas()               devuelve el objeto de contadores
     resumen()                partidas y mejor puntaje por juego
     borrar()                 vacía historial y métricas
   ============================================================= */
(function () {
  "use strict";

  var CLAVE_HISTORIAL = "ac-historial";
  var CLAVE_METRICAS = "ac-metricas";
  var MAXIMO = 60;

  var NOMBRES = {
    pong: "Pong de Ultratumba",
    futbol2d: "Fútbol 2D Atari",
    aviones: "Iron Skies",
    zombis: "Granja Maldita",
    futbol3d: "Football Evolution 13",
    ar: "Asteroides AR"
  };

  /* Lectura y escritura tolerantes a fallos: en modo privado de
     algunos navegadores localStorage lanza excepciones, y un dato
     corrupto no debe romper la página. */
  function leer(clave, porDefecto) {
    try {
      var txt = localStorage.getItem(clave);
      if (!txt) return porDefecto;
      var valor = JSON.parse(txt);
      return valor && typeof valor === "object" ? valor : porDefecto;
    } catch (e) {
      return porDefecto;
    }
  }

  function escribir(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  function historial() {
    var lista = leer(CLAVE_HISTORIAL, []);
    return Array.isArray(lista) ? lista : [];
  }

  function metricas() {
    return leer(CLAVE_METRICAS, {});
  }

  function metrica(nombre, n) {
    var m = metricas();
    m[nombre] = (Number(m[nombre]) || 0) + (typeof n === "number" ? n : 1);
    escribir(CLAVE_METRICAS, m);
    return m[nombre];
  }

  function registrar(juego, datos) {
    datos = datos || {};
    var lista = historial();
    lista.unshift({
      juego: juego,
      nombre: NOMBRES[juego] || juego,
      modo: String(datos.modo || ""),
      resultado: String(datos.resultado || ""),
      marcador: String(datos.marcador || ""),
      puntos: Number(datos.puntos) || 0,
      extra: datos.extra || null,
      fecha: new Date().toISOString()
    });
    if (lista.length > MAXIMO) lista.length = MAXIMO;
    escribir(CLAVE_HISTORIAL, lista);
    metrica("partidas");
    metrica("partidas:" + juego);
    avisar();
  }

  function resumen() {
    var porJuego = {};
    historial().forEach(function (p) {
      var r = porJuego[p.juego] || (porJuego[p.juego] = { nombre: p.nombre, partidas: 0, mejor: 0, victorias: 0 });
      r.partidas++;
      if (p.puntos > r.mejor) r.mejor = p.puntos;
      if (/victoria|gana j1|completada/i.test(p.resultado)) r.victorias++;
    });
    return porJuego;
  }

  function borrar() {
    try {
      localStorage.removeItem(CLAVE_HISTORIAL);
      localStorage.removeItem(CLAVE_METRICAS);
    } catch (e) { /* sin almacenamiento */ }
    avisar();
  }

  /* Si el juego corre dentro de un iframe del Arcade, avisa a la
     página padre para que refresque el panel al instante (el evento
     "storage" solo llega a otros documentos y no siempre a tiempo). */
  function avisar() {
    try {
      if (window.parent && window.parent !== window && window.parent.Marcadores) {
        window.parent.Marcadores._refrescar();
      }
    } catch (e) { /* otro origen */ }
    if (typeof window.Marcadores._refrescar === "function") window.Marcadores._refrescar();
  }

  window.Marcadores = {
    registrar: registrar,
    metrica: metrica,
    historial: historial,
    metricas: metricas,
    resumen: resumen,
    borrar: borrar,
    nombres: NOMBRES,
    _refrescar: function () {}
  };

  /* Métrica de visitas por página (solo en las páginas del sitio,
     no dentro de los juegos). */
  if (window.parent === window) {
    var pagina = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
    metrica("visitas");
    metrica("visitas:" + pagina);
  }
})();
