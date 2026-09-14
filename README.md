# Casa Palmeiras · Lajedo-PE

Site de apresentação de uma casa à venda em Lajedo, Pernambuco: 5 quartos (1 suíte com escritório), 3 salas, 5 banheiros, garagem para 4 carros, piscina adulto e infantil e sauna.

Página única em HTML, CSS e JavaScript puros, sem dependências nem etapa de build.

## Ver localmente

Abra o `index.html` no navegador.

## Estrutura

```
index.html                  página única
assets/css/styles.css       identidade visual (cores, tipografia, layout)
assets/js/main.js           comparador antes e depois, galeria, formulário → WhatsApp
assets/img/                 imagens otimizadas (WebP) e imagem de compartilhamento
tools/processar_imagens.py  gera as imagens a partir das fotos originais
```

## Publicar

Qualquer hospedagem estática serve: GitHub Pages, Netlify, Vercel ou Cloudflare Pages. Antes de publicar em domínio próprio, troque `casapalmeiraslajedo.com.br` pelo domínio definitivo nas tags `canonical`, `og:url` e `og:image` do `index.html`.

## Regenerar as imagens

```bash
pip install opencv-python-headless numpy pillow
python tools/processar_imagens.py caminho/para/fotos-originais
```

---

As imagens identificadas como "Projeto" são ilustrativas e representam uma proposta de renovação, não o estado atual do imóvel.
