/* =============================================================
   Panel "Historial de marcadores" (solo existe en arcade.html)
   Lee lo que guardan los juegos con window.Marcadores (localStorage)
   y lo pinta: métricas, récord por juego y las últimas 10 partidas.
   Se refresca solo cuando un juego termina dentro del iframe o
   cuando otra pestaña cambia el almacenamiento (evento "storage").
   Los textos se insertan con textContent, nunca con innerHTML,
   para que un dato manipulado en localStorage no inyecte HTML.
   ============================================================= */
(function () {
  "use strict";

  var M = window.Marcadores;
  var filas = document.getElementById("historial-filas");
  if (!M || !filas) return;

  var records = document.getElementById("historial-records");
  var formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" });

  function celda(fila, texto) {
    var td = document.createElement("td");
    td.textContent = texto;
    fila.appendChild(td);
  }

  function pintar() {
    var metricas = M.metricas();
    document.querySelectorAll("[data-metrica]").forEach(function (el) {
      el.textContent = String(Number(metricas[el.getAttribute("data-metrica")]) || 0);
    });

    var resumen = M.resumen();
    records.textContent = "";
    ["pong", "futbol2d", "aviones", "zombis", "ar"].forEach(function (id) {
      var r = resumen[id];
      var li = document.createElement("li");
      var titulo = document.createElement("b");
      titulo.textContent = M.nombres[id];
      var detalle = document.createElement("span");
      detalle.textContent = r
        ? r.partidas + (r.partidas === 1 ? " partida" : " partidas") + " · mejor: " + r.mejor + " pts · victorias: " + r.victorias
        : "Sin partidas todavía";
      li.appendChild(titulo);
      li.appendChild(detalle);
      records.appendChild(li);
    });

    var lista = M.historial().slice(0, 10);
    filas.textContent = "";
    if (!lista.length) {
      var vacia = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Todavía no hay partidas. ¡Juega una y vuelve aquí!";
      vacia.appendChild(td);
      filas.appendChild(vacia);
      return;
    }
    lista.forEach(function (p) {
      var tr = document.createElement("tr");
      var fecha = new Date(p.fecha);
      celda(tr, isNaN(fecha) ? "—" : formatoFecha.format(fecha));
      celda(tr, p.nombre);
      celda(tr, p.modo || "—");
      celda(tr, p.resultado || "—");
      celda(tr, p.marcador || "—");
      celda(tr, String(p.puntos));
      filas.appendChild(tr);
    });
  }

  M._refrescar = pintar;
  window.addEventListener("storage", function (e) {
    if (!e.key || e.key.indexOf("ac-") === 0) pintar();
  });

  document.getElementById("historial-borrar").addEventListener("click", function () {
    M.borrar();
    pintar();
  });

  pintar();
})();
