/* =====================================================
   PORTFOLIO — Allan Samuel Gómez Pérez
   script.js — Interactividad + Animaciones avanzadas
   ===================================================== */

/* =====================================================
   1. RED DE PARTÍCULAS — Canvas background animado
      Las partículas flotan, se conectan entre sí con
      líneas y reaccionan al movimiento del cursor.
   ===================================================== */
(function initParticleNetwork() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');

  const ACCENT_R = 99, ACCENT_G = 202, ACCENT_B = 183;
  const PARTICLE_COUNT    = 72;
  const CONNECTION_DIST   = 160;
  const MOUSE_REPEL_DIST  = 120;
  const MOUSE_REPEL_FORCE = 0.012;
  const SPEED             = 0.35;

  let W, H, particles;
  const mouse = { x: -9999, y: -9999 };

  /* Redimensionar canvas al tamaño de la ventana */
  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };

  /* Clase partícula */
  class Particle {
    constructor() { this.reset(true); }

    reset(randomPos = false) {
      this.x  = randomPos ? Math.random() * W : (Math.random() < 0.5 ? 0 : W);
      this.y  = randomPos ? Math.random() * H : Math.random() * H;
      this.vx = (Math.random() - 0.5) * SPEED;
      this.vy = (Math.random() - 0.5) * SPEED;
      this.r  = Math.random() * 1.8 + 0.6;
      this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
      /* Repulsión del cursor */
      const dx    = this.x - mouse.x;
      const dy    = this.y - mouse.y;
      const dist  = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_REPEL_DIST && dist > 0) {
        const force = (MOUSE_REPEL_DIST - dist) / MOUSE_REPEL_DIST;
        this.vx += (dx / dist) * force * MOUSE_REPEL_FORCE * 8;
        this.vy += (dy / dist) * force * MOUSE_REPEL_FORCE * 8;
      }

      /* Fricción para evitar aceleración infinita */
      this.vx *= 0.995;
      this.vy *= 0.995;

      this.x += this.vx;
      this.y += this.vy;

      /* Rebotar en bordes */
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
      this.x = Math.max(0, Math.min(W, this.x));
      this.y = Math.max(0, Math.min(H, this.y));
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ACCENT_R},${ACCENT_G},${ACCENT_B},${this.alpha})`;
      ctx.fill();
    }
  }

  /* Inicializar partículas */
  const init = () => {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  };

  /* Loop de animación */
  const animate = () => {
    ctx.clearRect(0, 0, W, H);

    /* Dibujar conexiones entre partículas cercanas */
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i], p2 = particles[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        const d  = Math.sqrt(dx * dx + dy * dy);

        if (d < CONNECTION_DIST) {
          const opacity = (1 - d / CONNECTION_DIST) * 0.25;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${ACCENT_R},${ACCENT_G},${ACCENT_B},${opacity})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }

      /* Conexión especial con el cursor */
      const mp = particles[i];
      const mx = mp.x - mouse.x, my = mp.y - mouse.y;
      const md = Math.sqrt(mx * mx + my * my);
      if (md < CONNECTION_DIST * 1.5) {
        const opacity = (1 - md / (CONNECTION_DIST * 1.5)) * 0.5;
        ctx.beginPath();
        ctx.moveTo(mp.x, mp.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(${ACCENT_R},${ACCENT_G},${ACCENT_B},${opacity})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      particles[i].update();
      particles[i].draw();
    }

    requestAnimationFrame(animate);
  };

  /* Punto luminoso en la posición del cursor */
  const drawMouseGlow = () => {
    if (mouse.x < 0) return;
    const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 80);
    grad.addColorStop(0, `rgba(${ACCENT_R},${ACCENT_G},${ACCENT_B},0.08)`);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 80, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  };

  /* Eventos */
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('resize', () => { resize(); });

  init();
  animate();
})();


/* =====================================================
   2. EFECTO TILT 3D + SPOTLIGHT EN TARJETAS
      Aplica rotación perspectiva y un gradiente de luz
      que sigue el cursor dentro de cada tarjeta.
   ===================================================== */
(function initCardEffects() {
  /* Selecciona todas las tarjetas interactivas */
  const cards = document.querySelectorAll(
    '.skill-card, .project-card, .experience__card, .stat-chip, .contact-link'
  );

  cards.forEach(card => {
    /* Crea la capa de spotlight si no existe */
    if (!card.querySelector('.card-spotlight')) {
      const spot = document.createElement('div');
      spot.className = 'card-spotlight';
      card.appendChild(spot);
    }
    const spotlight = card.querySelector('.card-spotlight');

    let rafId = null;
    let currentX = 0, currentY = 0;
    let targetX  = 0, targetY  = 0;
    let isHovered = false;

    /* Animación suave del tilt con lerp */
    const lerp = (a, b, t) => a + (b - a) * t;

    const animateTilt = () => {
      if (!isHovered) return;

      currentX = lerp(currentX, targetX, 0.1);
      currentY = lerp(currentY, targetY, 0.1);

      card.style.transform =
        `perspective(800px) rotateX(${currentY}deg) rotateY(${currentX}deg) translateZ(6px) scale(1.02)`;

      rafId = requestAnimationFrame(animateTilt);
    };

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      animateTilt();
    });

    card.addEventListener('mousemove', (e) => {
      const rect   = card.getBoundingClientRect();
      const relX   = e.clientX - rect.left;
      const relY   = e.clientY - rect.top;
      const centerX = rect.width  / 2;
      const centerY = rect.height / 2;

      /* Tilt máximo: ±10 grados */
      targetX = ((relX - centerX) / centerX) * 10;
      targetY = -((relY - centerY) / centerY) * 10;

      /* Mover el spotlight siguiendo el cursor */
      spotlight.style.background = `radial-gradient(
        280px circle at ${relX}px ${relY}px,
        rgba(99,202,183,0.12) 0%,
        rgba(99,202,183,0.04) 40%,
        transparent 70%
      )`;
      spotlight.style.opacity = '1';
    });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
      targetX = 0; targetY = 0;
      cancelAnimationFrame(rafId);

      /* Resetear suavemente */
      card.style.transition = 'transform 0.6s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease, border-color 0.3s ease';
      card.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)';
      spotlight.style.opacity = '0';
    });
  });
})();


/* =====================================================
   3. EFECTO MAGNÉTICO EN BOTONES CTA
      Los botones del hero se "atraen" levemente hacia
      el cursor cuando está cerca.
   ===================================================== */
(function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn');

  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect  = btn.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) * 0.3;
      const dy    = (e.clientY - cy) * 0.3;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease';
      btn.style.transform  = 'translate(0,0)';
    });
  });
})();


/* =====================================================
   4. AURORA DINÁMICA — El fondo del hero sigue el cursor
      con un gradiente radial suave.
   ===================================================== */
(function initAurora() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  let mx = 50, my = 50;
  let cx = 50, cy = 50;

  const update = () => {
    cx += (mx - cx) * 0.04;
    cy += (my - cy) * 0.04;
    hero.style.setProperty('--aurora-x', cx + '%');
    hero.style.setProperty('--aurora-y', cy + '%');
    requestAnimationFrame(update);
  };

  window.addEventListener('mousemove', (e) => {
    mx = (e.clientX / window.innerWidth)  * 100;
    my = (e.clientY / window.innerHeight) * 100;
  });

  update();
})();


/* =====================================================
   5. TEXTO DEL HERO — Efecto de escritura suave
      El título se "construye" letra a letra al cargar.
   ===================================================== */
(function initTypingEffect() {
  const titleEl = document.querySelector('.hero__title');
  if (!titleEl) return;

  const text = titleEl.textContent.trim();
  titleEl.textContent = '';
  titleEl.style.opacity = '1';
  titleEl.style.animation = 'none';

  let i = 0;
  const type = () => {
    if (i <= text.length) {
      titleEl.textContent = text.slice(0, i);
      i++;
      setTimeout(type, i < 10 ? 60 : 28);
    } else {
      /* Agregar cursor parpadeante al final */
      titleEl.innerHTML = text + '<span class="type-cursor">|</span>';
      setTimeout(() => {
        const cur = titleEl.querySelector('.type-cursor');
        if (cur) cur.style.animation = 'typeCursorBlink 1s step-end infinite';
      }, 100);
    }
  };

  /* Iniciar después de la animación de entrada */
  setTimeout(type, 900);
})();


/* =====================================================
   6. CURSOR PERSONALIZADO (solo desktop con mouse)
   ===================================================== */
(function initCustomCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const cursor     = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  const animateRing = () => {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
  };
  animateRing();

  document.querySelectorAll('a, button, .skill-card, .project-card, .experience__card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform    = 'translate(-50%,-50%) scale(2.5)';
      cursorRing.style.width    = '56px';
      cursorRing.style.height   = '56px';
      cursorRing.style.borderColor = 'var(--accent)';
      cursorRing.style.background  = 'rgba(99,202,183,0.04)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform    = 'translate(-50%,-50%) scale(1)';
      cursorRing.style.width    = '36px';
      cursorRing.style.height   = '36px';
      cursorRing.style.borderColor = 'rgba(99,202,183,0.5)';
      cursorRing.style.background  = 'transparent';
    });
  });
})();


/* =====================================================
   7. NAVBAR — Fondo difuso al hacer scroll
   ===================================================== */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();


/* =====================================================
   8. MENÚ HAMBURGUESA (móvil)
   ===================================================== */
(function initHamburger() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  let menuOpen = false;

  const toggleMenu = (open) => {
    menuOpen = open;
    hamburger.classList.toggle('open', open);
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => toggleMenu(!menuOpen));
  document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });
})();


/* =====================================================
   9. REVEAL EN SCROLL (IntersectionObserver)
   ===================================================== */
(function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();


/* =====================================================
   10. SCROLL SUAVE — Fallback para navegadores antiguos
   ===================================================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});