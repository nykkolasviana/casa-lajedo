/* Casa Palmeiras · interações do site */

const CONFIG = {
  // WhatsApp com DDI + DDD, só dígitos (os links fixos no index.html usam o mesmo número)
  whatsapp: "5587996604281",
  telefoneExibicao: "(87) 99660-4281",
  contato: "Socorro",
};

document.addEventListener("DOMContentLoaded", () => {
  navegacao();
  abas();
  document.querySelectorAll(".slider").forEach(iniciarSlider);
  galeria();
  formulario();
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
});

const reduzMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Topo sólido, item de menu ativo e barra fixa do celular */
function navegacao() {
  if (!("IntersectionObserver" in window)) return;
  const topo = document.getElementById("topo");
  const hero = document.getElementById("inicio");
  const visita = document.getElementById("visita");
  const barra = document.getElementById("barra-movel");
  const estado = { hero: true, visita: false };

  const atualizarBarra = () => {
    if (barra) barra.classList.toggle("is-visivel", !estado.hero && !estado.visita);
  };

  if (topo && hero) {
    new IntersectionObserver(
      ([e]) => {
        estado.hero = e.isIntersecting;
        topo.classList.toggle("is-solido", !e.isIntersecting);
        atualizarBarra();
      },
      { rootMargin: `-${topo.offsetHeight}px 0px 0px 0px` }
    ).observe(hero);
  }
  if (visita) {
    new IntersectionObserver(
      ([e]) => {
        estado.visita = e.isIntersecting;
        atualizarBarra();
      },
      { rootMargin: "0px 0px -35% 0px" }
    ).observe(visita);
  }

  const links = [...document.querySelectorAll(".menu a")];
  const porId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const obsMenu = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-ativo", a === porId.get(e.target.id)));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  ["inicio", ...porId.keys()].forEach((id) => {
    const secao = document.getElementById(id);
    if (secao) obsMenu.observe(secao);
  });
}

/* Escolha Fachada / Área de lazer */
function abas() {
  const lista = document.querySelector('[role="tablist"]');
  if (!lista) return;
  const botoes = [...lista.querySelectorAll('[role="tab"]')];

  const ativar = (botao) => {
    botoes.forEach((b) => {
      const ativo = b === botao;
      b.setAttribute("aria-selected", String(ativo));
      b.tabIndex = ativo ? 0 : -1;
      document.getElementById(b.getAttribute("aria-controls")).hidden = !ativo;
    });
    const slider = document.getElementById(botao.getAttribute("aria-controls")).querySelector(".slider");
    if (slider) sugerirArraste(slider);
  };

  botoes.forEach((botao, i) => {
    botao.addEventListener("click", () => ativar(botao));
    botao.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const proximo = botoes[(i + (e.key === "ArrowRight" ? 1 : -1) + botoes.length) % botoes.length];
      proximo.focus();
      ativar(proximo);
    });
  });
}

/* Comparador hoje x projeto */
function iniciarSlider(el) {
  const range = el.querySelector(".slider__range");
  const botoes = [...(el.closest(".painel")?.querySelectorAll(".alternar__botao") || [])];
  let atual = 50;
  let quadro = null;
  let arrastando = false;
  let moveu = false;
  let inicioX = 0;

  const definir = (valor) => {
    atual = Math.max(0, Math.min(100, valor));
    el.style.setProperty("--pos", `${atual}%`);
    range.value = Math.round(atual);
    range.setAttribute("aria-valuetext", `${Math.round(atual)}% mostrando a casa hoje`);
    botoes.forEach((b) => {
      const alvo = Number(b.dataset.alvo);
      b.setAttribute("aria-pressed", String(Math.abs(atual - alvo) < 3));
    });
  };

  const animarPara = (alvo, duracao = 700, aoTerminar) => {
    cancelAnimationFrame(quadro);
    if (reduzMovimento() || duracao === 0) {
      definir(alvo);
      aoTerminar?.();
      return;
    }
    const de = atual;
    const t0 = performance.now();
    const passo = (agora) => {
      const p = Math.min(1, (agora - t0) / duracao);
      definir(de + (alvo - de) * suave(p));
      if (p < 1) quadro = requestAnimationFrame(passo);
      else aoTerminar?.();
    };
    quadro = requestAnimationFrame(passo);
  };

  const interagiu = () => {
    el.dataset.interagiu = "1";
    el.classList.remove("is-intocado");
    cancelAnimationFrame(quadro);
  };

  const posicao = (e) => {
    const r = el.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };

  el.addEventListener("pointerdown", (e) => {
    arrastando = true;
    moveu = false;
    inicioX = e.clientX;
    el.setPointerCapture(e.pointerId);
    if (e.pointerType !== "touch") {
      interagiu();
      moveu = true;
      el.classList.add("is-arrastando");
      definir(posicao(e));
    }
  });
  el.addEventListener("pointermove", (e) => {
    if (!arrastando) return;
    if (!moveu) {
      // No toque, só arrasta quando o gesto é horizontal; o vertical continua rolando a página
      if (Math.abs(e.clientX - inicioX) < 6) return;
      moveu = true;
      interagiu();
      el.classList.add("is-arrastando");
    }
    definir(posicao(e));
  });
  el.addEventListener("pointerup", (e) => {
    if (arrastando && !moveu) {
      interagiu();
      animarPara(posicao(e), 450);
    }
    arrastando = false;
    el.classList.remove("is-arrastando");
  });
  el.addEventListener("pointercancel", () => {
    arrastando = false;
    el.classList.remove("is-arrastando");
  });

  range.addEventListener("input", () => {
    interagiu();
    definir(Number(range.value));
  });

  botoes.forEach((b) =>
    b.addEventListener("click", () => {
      interagiu();
      animarPara(Number(b.dataset.alvo), 650);
    })
  );

  el._animarPara = animarPara;
  definir(50);

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        sugerirArraste(el);
        obs.disconnect();
      },
      { threshold: 0.55 }
    );
    obs.observe(el);
  }
}

/* Ao aparecer, a linha percorre a imagem: mostra que dá para arrastar e já revela o antes e o depois */
function sugerirArraste(el) {
  if (reduzMovimento() || el.dataset.interagiu || el.dataset.sugerido || !el._animarPara) return;
  el.dataset.sugerido = "1";
  const roteiro = [
    [88, 1100],
    [12, 1500],
    [50, 1000],
  ];
  let i = 0;
  const proximo = () => {
    if (el.dataset.interagiu || i >= roteiro.length) return;
    const [alvo, duracao] = roteiro[i++];
    el._animarPara(alvo, duracao, () => setTimeout(proximo, 250));
  };
  setTimeout(proximo, 400);
}

/* Galeria com ampliação */
function galeria() {
  const dialogo = document.getElementById("lightbox");
  const botoes = [...document.querySelectorAll(".galeria__botao")];
  if (!dialogo || !botoes.length || typeof dialogo.showModal !== "function") return;

  const img = document.getElementById("lightbox-img");
  const selo = document.getElementById("lightbox-selo");
  const texto = document.getElementById("lightbox-texto");
  const contador = document.getElementById("lightbox-contador");
  let atual = 0;

  const mostrar = (i) => {
    atual = (i + botoes.length) % botoes.length;
    const b = botoes[atual];
    img.src = b.dataset.full;
    img.alt = b.querySelector("img").alt;
    selo.textContent = b.dataset.selo;
    texto.textContent = b.dataset.legenda;
    contador.textContent = `${atual + 1} / ${botoes.length}`;
  };

  botoes.forEach((b, i) =>
    b.addEventListener("click", () => {
      mostrar(i);
      dialogo.showModal();
    })
  );
  document.getElementById("lightbox-fechar").addEventListener("click", () => dialogo.close());
  document.getElementById("lightbox-ant").addEventListener("click", () => mostrar(atual - 1));
  document.getElementById("lightbox-prox").addEventListener("click", () => mostrar(atual + 1));
  dialogo.addEventListener("click", (e) => {
    if (e.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") mostrar(atual + 1);
    if (e.key === "ArrowLeft") mostrar(atual - 1);
  });
  dialogo.addEventListener("close", () => botoes[atual].focus());
}

/* Formulário: monta a mensagem e abre o WhatsApp */
function formulario() {
  const form = document.getElementById("form-visita");
  if (!form) return;
  const status = document.getElementById("form-status");
  const campoNome = form.elements.nome;
  const erroNome = document.getElementById("nome-erro");

  const limparErro = () => {
    campoNome.removeAttribute("aria-invalid");
    erroNome.hidden = true;
  };
  campoNome.addEventListener("input", () => {
    if (campoNome.value.trim()) limparErro();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dados = new FormData(form);
    const nome = String(dados.get("nome") || "").trim();

    if (!nome) {
      campoNome.setAttribute("aria-invalid", "true");
      erroNome.hidden = false;
      campoNome.focus();
      return;
    }
    limparErro();

    const linhas = [
      `Olá, ${CONFIG.contato}! Tenho interesse na Casa Palmeiras, em Lajedo-PE.`,
      `Nome: ${nome}`,
      `Como pretendo comprar: ${dados.get("pagamento")}`,
      `Melhor período para visita: ${dados.get("periodo")}`,
    ];
    const mensagem = String(dados.get("mensagem") || "").trim();
    if (mensagem) linhas.push(`Mensagem: ${mensagem}`);

    status.textContent = `Abrindo o WhatsApp… Se não abrir, chame no ${CONFIG.telefoneExibicao}.`;
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(linhas.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  });
}
