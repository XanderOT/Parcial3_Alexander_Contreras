/* =============================================================
   Asteroides AR — componentes de A-Frame
   Autor: Alexander Contreras Triviño
   Se carga en el <head> después de aframe.min.js porque los
   componentes deben registrarse antes de que exista <a-scene>.

   Componentes:
     estrellas  → nube de puntos de fondo (un solo draw call)
     generador  → crea N asteroides y los mantiene en juego
     asteroide  → órbita alrededor del jugador, rotación propia y
                  reacción al "click" que emite el cursor (Raycaster)

   Rendimiento (objetivo 60 FPS):
     - Todo el movimiento ocurre en tick(t, dt) usando dt, así la
       velocidad no depende de la frecuencia de la pantalla.
     - Se reutilizan vectores y entidades (pool): al destruir un
       asteroide no se borra del DOM, se reposiciona. Así se evita
       crear y recolectar basura en cada impacto.
     - Las explosiones son entidades temporales que se eliminan al
       terminar su animación para liberar geometría y material.
   ============================================================= */
(function () {
  "use strict";
  if (!window.AFRAME) return;
  var THREE = AFRAME.THREE;

  /* Estado compartido con la interfaz (js/ar-ui.js). */
  window.ARJuego = window.ARJuego || { activo: false, dificultad: 1 };

  AFRAME.registerComponent("estrellas", {
    schema: { cantidad: { type: "int", default: 200 }, radio: { type: "number", default: 40 } },
    init: function () {
      var n = this.data.cantidad, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        pos[i * 3] = r * Math.cos(a) * this.data.radio;
        pos[i * 3 + 1] = u * this.data.radio;
        pos[i * 3 + 2] = r * Math.sin(a) * this.data.radio;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.material = new THREE.PointsMaterial({ color: 0xf4f5f2, size: 0.12, sizeAttenuation: true });
      this.el.setObject3D("mesh", new THREE.Points(geo, this.material));
    },
    remove: function () {
      var m = this.el.getObject3D("mesh");
      if (m) { m.geometry.dispose(); this.material.dispose(); this.el.removeObject3D("mesh"); }
    }
  });

  AFRAME.registerComponent("generador", {
    schema: { cantidad: { type: "int", default: 7 } },
    init: function () {
      for (var i = 0; i < this.data.cantidad; i++) {
        var roca = document.createElement("a-entity");
        roca.setAttribute("mixin", "roca");
        roca.setAttribute("class", "asteroide");
        roca.setAttribute("asteroide", "");
        this.el.appendChild(roca);
      }
    }
  });

  var CENTRO_Y = 1.5;
  var COLORES = ["#8a7a6a", "#7b6f88", "#9a8466", "#6f7f86"];

  AFRAME.registerComponent("asteroide", {
    init: function () {
      this.giro = new THREE.Vector3();
      this.alSerTocado = this.alSerTocado.bind(this);
      this.el.addEventListener("click", this.alSerTocado);
      this.reubicar(true);
    },

    /* Elige una órbita nueva alrededor del jugador. */
    reubicar: function (primeraVez) {
      this.radio = 2.6 + Math.random() * 3;
      this.angulo = Math.random() * Math.PI * 2;
      this.altura = CENTRO_Y + (Math.random() * 1.6 - 0.6);
      this.velocidad = (0.12 + Math.random() * 0.22) * (Math.random() < 0.5 ? -1 : 1);
      this.oscila = Math.random() * Math.PI * 2;
      this.giro.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2);
      var escala = 0.7 + Math.random() * 0.8;
      this.el.object3D.scale.set(escala, escala, escala);
      this.el.setAttribute("material", "color", COLORES[Math.floor(Math.random() * COLORES.length)]);
      this.el.object3D.visible = true;
      this.activo = true;
      if (!primeraVez) this.el.classList.add("asteroide");
    },

    alSerTocado: function () {
      if (!this.activo || !window.ARJuego.activo) return;
      this.activo = false;
      this.el.classList.remove("asteroide");      // el raycaster deja de verlo
      this.el.object3D.visible = false;
      var p = this.el.object3D.position;
      this.explosion(p.x, p.y, p.z);
      this.el.sceneEl.emit("impacto", { x: p.x, y: p.y, z: p.z });
      var self = this;
      setTimeout(function () { self.reubicar(false); }, 700);
    },

    explosion: function (x, y, z) {
      var destello = document.createElement("a-sphere");
      destello.setAttribute("radius", "0.25");
      destello.setAttribute("position", x + " " + y + " " + z);
      destello.setAttribute("material", "color: #f6b944; emissive: #ff5f96; emissiveIntensity: 1; transparent: true; opacity: 0.9; shader: flat");
      destello.setAttribute("animation__crece", "property: scale; to: 3 3 3; dur: 380; easing: easeOutQuad");
      destello.setAttribute("animation__desvanece", "property: material.opacity; to: 0; dur: 380; easing: easeOutQuad");
      destello.addEventListener("animationcomplete__desvanece", function () {
        if (destello.parentNode) destello.parentNode.removeChild(destello);
      });
      this.el.sceneEl.appendChild(destello);
    },

    tick: function (t, dt) {
      if (!this.activo || !dt) return;
      var s = Math.min(dt, 100) / 1000;               // evita saltos tras cambiar de pestaña
      var factor = window.ARJuego.activo ? window.ARJuego.dificultad : 0.6;
      this.angulo += this.velocidad * factor * s;
      var o = this.el.object3D;
      o.position.set(
        Math.cos(this.angulo) * this.radio,
        this.altura + Math.sin(t / 900 + this.oscila) * 0.18,
        Math.sin(this.angulo) * this.radio
      );
      o.rotation.x += this.giro.x * s;
      o.rotation.y += this.giro.y * s;
      o.rotation.z += this.giro.z * s;
    },

    remove: function () {
      this.el.removeEventListener("click", this.alSerTocado);
    }
  });
})();
