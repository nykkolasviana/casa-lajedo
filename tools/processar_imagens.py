"""
Gera as imagens otimizadas do site a partir das fotos originais.

Requisitos: pip install opencv-python-headless numpy pillow
Uso:        python tools/processar_imagens.py [pasta-das-fotos-originais]
            (sem argumento, usa a pasta fotos-originais/ na raiz do projeto, ignorada pelo git)

- Alinha os pares "hoje x projeto" (fachada e área de lazer) para o comparador.
- Desfoca as placas institucionais visíveis na fachada atual.
- Exporta WebP em várias larguras (srcset) + JPEG 1200x630 para compartilhamento.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "fotos-originais"
DESTINO = RAIZ / "assets" / "img"
DESTINO.mkdir(parents=True, exist_ok=True)


def ler(nome):
    im = cv2.imread(str(ORIGEM / nome), cv2.IMREAD_COLOR)
    if im is None:
        raise FileNotFoundError(ORIGEM / nome)
    return im


def escala(s):
    return np.array([[s, 0, 0], [0, s, 0], [0, 0, 1]], dtype=np.float64)


def translacao(tx, ty):
    return np.array([[1, 0, tx], [0, 1, ty], [0, 0, 1]], dtype=np.float64)


def para_pil(bgr):
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


def exportar(img: Image.Image, nome, larguras, qualidade=80):
    """Salva nome-<largura>.webp para cada largura (sem ampliar além do original)."""
    geradas = []
    for w in larguras:
        w = min(w, img.width)
        h = round(img.height * w / img.width)
        out = img.resize((w, h), Image.LANCZOS) if w != img.width else img
        caminho = DESTINO / f"{nome}-{w}.webp"
        out.save(caminho, "WEBP", quality=qualidade, method=6)
        geradas.append((caminho.name, w, h, caminho.stat().st_size // 1024))
    for g in geradas:
        print(f"  {g[0]:34s} {g[1]}x{g[2]}  {g[3]} KB")


def nitidez_suave(img: Image.Image):
    return img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))


def fachada():
    """Foto atual (1024px) alinhada ao render do projeto via SIFT + RANSAC."""
    print("Fachada")
    antes = ler("4 entrada atual.jpg")
    depois = ler("depos 2 entrada.jpeg")
    W = 2000
    H_d = round(depois.shape[0] * W / depois.shape[1])
    depois_w = cv2.resize(depois, (W, H_d), interpolation=cv2.INTER_AREA)
    s_antes = W / antes.shape[1]
    antes_w = cv2.resize(antes, None, fx=s_antes, fy=s_antes, interpolation=cv2.INTER_CUBIC)

    sift = cv2.SIFT_create(nfeatures=20000)
    ka, da = sift.detectAndCompute(cv2.cvtColor(antes_w, cv2.COLOR_BGR2GRAY), None)
    kd, dd = sift.detectAndCompute(cv2.cvtColor(depois_w, cv2.COLOR_BGR2GRAY), None)
    pares = cv2.BFMatcher().knnMatch(da, dd, k=2)
    bons = [m for m, n in pares if m.distance < 0.75 * n.distance]
    pa = np.float32([ka[m.queryIdx].pt for m in bons])
    pd = np.float32([kd[m.trainIdx].pt for m in bons])
    H, _ = cv2.findHomography(pa, pd, cv2.RANSAC, 4.0)

    # Warp direto do original para o quadro final (evita reamostrar duas vezes)
    H_total = H @ escala(s_antes)
    hoje = cv2.warpPerspective(antes, H_total, (W, H_d), flags=cv2.INTER_LANCZOS4,
                               borderMode=cv2.BORDER_REPLICATE)
    hoje = para_pil(hoje)

    # Desfoque das placas institucionais (coordenadas normalizadas do quadro)
    for x0, y0, x1, y1 in [(0.025, 0.505, 0.475, 0.635), (0.165, 0.535, 0.245, 0.72)]:
        caixa = tuple(round(v) for v in (x0 * W, y0 * H_d, x1 * W, y1 * H_d))
        regiao = hoje.crop(caixa).filter(ImageFilter.GaussianBlur(18))
        mascara = Image.new("L", regiao.size, 0)
        borda = 14
        mascara.paste(255, (borda, borda, regiao.width - borda, regiao.height - borda))
        mascara = mascara.filter(ImageFilter.GaussianBlur(borda / 2))
        hoje.paste(regiao, caixa[:2], mascara)

    exportar(nitidez_suave(hoje), "fachada-hoje", [960, 1600, 2000])
    exportar(para_pil(cv2.resize(depois, (W, H_d), interpolation=cv2.INTER_AREA)),
             "fachada-projeto", [240, 960, 1600, 2000])


def lazer():
    """Aéreo diurno x render noturno: homografia por pontos de referência manuais."""
    print("Área de lazer")
    antes = ler("Atual Cima 1.jpeg")      # 4096 x 4096
    depois = ler("Depois Cima 2.jpeg")    # 8192 x 8192
    # Pontos em coordenadas 1000x1000 de cada imagem (quinas da piscina, vértice
    # da escadaria, muros, gramado, extremos da escada).
    p_antes = np.float32([(295, 606), (638, 553), (358, 437), (455, 350), (92, 832), (880, 835),
                          (683, 172), (541, 318), (541, 392), (655, 268), (285, 305)])
    p_depois = np.float32([(315, 687), (628, 640), (358, 553), (460, 495), (105, 880), (880, 870),
                           (652, 370), (540, 475), (545, 522), (632, 440), (318, 458)])
    H1000, _ = cv2.findHomography(p_antes, p_depois, 0)

    # Recorte comum (espaço 1000): evita bordas sem cobertura da foto atual
    cx0, cy0, cx1, cy1 = 80, 330, 910, 1000
    OUT_W = 2000
    k = OUT_W / (cx1 - cx0)
    OUT_H = round((cy1 - cy0) * k)
    H_total = escala(k) @ translacao(-cx0, -cy0) @ H1000 @ escala(1000 / antes.shape[1])
    hoje = cv2.warpPerspective(antes, H_total, (OUT_W, OUT_H), flags=cv2.INTER_AREA,
                               borderMode=cv2.BORDER_REPLICATE)
    H_proj = escala(k) @ translacao(-cx0, -cy0) @ escala(1000 / depois.shape[1])
    projeto = cv2.warpPerspective(depois, H_proj, (OUT_W, OUT_H), flags=cv2.INTER_AREA)
    exportar(para_pil(hoje), "lazer-hoje", [960, 1600, 2000])
    exportar(para_pil(projeto), "lazer-projeto", [240, 960, 1600, 2000])

    # Hero: render noturno completo (quadrado) — o CSS faz o enquadramento
    completo = para_pil(cv2.resize(depois, (2400, 2400), interpolation=cv2.INTER_AREA))
    exportar(completo, "hero-noite", [900, 1600, 2400], qualidade=78)

    # Imagem de compartilhamento (WhatsApp / redes): 1200x630, JPEG
    faixa = completo.crop((0, 700, 2400, 700 + 1260)).resize((1200, 630), Image.LANCZOS)
    faixa.save(DESTINO / "og-casa-palmeiras.jpg", "JPEG", quality=84, optimize=True, progressive=True)
    print("  og-casa-palmeiras.jpg 1200x630")


def fotos_avulsas():
    print("Fotos avulsas")
    varanda = Image.open(ORIGEM / "3 at ual.png").convert("RGB")
    exportar(varanda, "varanda-hoje", [960, 1600, 2000])

    jardim = Image.open(ORIGEM / "2 autal.jpeg").convert("RGB")
    # Recorte à direita do painel de cartazes: palmeiras, varanda e garagem coberta
    x0 = round(jardim.width * 0.31)
    exportar(jardim.crop((x0, 0, jardim.width, jardim.height)), "jardim-hoje", [960, 1600, 2000])


if __name__ == "__main__":
    fachada()
    lazer()
    fotos_avulsas()
