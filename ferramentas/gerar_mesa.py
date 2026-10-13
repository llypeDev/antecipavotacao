"""Gera o tampo da mesa onde a urna fica apoiada e grava em css/estilo.css.

O tampo é visto de frente, em perspectiva, por quem está de pé diante da mesa:
a borda de trás fica escondida atrás da urna e as laterais abrem até sair da
tela. As laterais e os veios convergem num ponto de fuga 40% da largura da
urna acima da borda de trás, perto do horizonte do cenário (img/sala.webp).

Unidades do SVG: 100 = largura da urna. A caixa (.mesa-urna::before) vai de
-120% a 220% da largura da urna (340 unidades) e tem 1,2 urna de altura.

Uso:
    python3 ferramentas/gerar_mesa.py            # atualiza css/estilo.css
"""
import pathlib
import re
from urllib.parse import quote

LARGURA, ALTURA = 340, 120   # viewBox (mesma proporção do aspect-ratio no CSS)
DESLOCAMENTO = 120           # a caixa começa 120% à esquerda da urna
FUGA = 40                    # ponto de fuga acima da borda de trás
ATRAS = (-14, 114)           # borda de trás, em % da largura da urna

x0, x1 = (DESLOCAMENTO + x for x in ATRAS)
cx = (x0 + x1) / 2
k = (ALTURA + FUGA) / FUGA   # quanto a largura cresce até a borda de baixo


def frente(x):
    return cx + (x - cx) * k


N = 16
veios = ''.join(
    f'<line x1="{x0 + (x1 - x0) * i / N:g}" y1="0" x2="{frente(x0 + (x1 - x0) * i / N):g}" y2="{ALTURA}"/>'
    for i in range(1, N))

svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGURA} {ALTURA}" preserveAspectRatio="none">'
    '<defs><linearGradient id="t" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="120">'
    '<stop offset="0" stop-color="#d6b487"/><stop offset=".04" stop-color="#c8a06f"/>'
    '<stop offset=".4" stop-color="#ab8155"/><stop offset="1" stop-color="#83603b"/>'
    '</linearGradient></defs>'
    f'<polygon points="{x0},0 {x1},0 {frente(x1):g},{ALTURA} {frente(x0):g},{ALTURA}" fill="url(#t)"/>'
    f'<g stroke="#5a3a1c" stroke-opacity=".07" stroke-width=".14">{veios}</g>'
    f'<line x1="{x0 + .6:g}" y1=".45" x2="{x1 - .6:g}" y2=".45" stroke="#fff4e0" stroke-opacity=".5" stroke-width=".3"/>'
    f'<polyline points="{frente(x0):g},{ALTURA} {x0},.12 {x1},.12 {frente(x1):g},{ALTURA}" '
    'fill="none" stroke="#6a4728" stroke-width=".3" stroke-linejoin="round"/>'
    '</svg>')

uri = 'data:image/svg+xml,' + quote(svg.replace('"', "'"), safe=":/=,.'-() ")

css = pathlib.Path(__file__).resolve().parent.parent / 'css' / 'estilo.css'
texto = css.read_text()
novo, n = re.subn(
    r'(\.mesa-urna::before \{[^}]*?background: url\(")data:image/svg\+xml,[^"]*("\))',
    lambda m: m.group(1) + uri + m.group(2), texto)
if n != 1:
    raise SystemExit('bloco .mesa-urna::before não encontrado em css/estilo.css')
css.write_text(novo)
print(f'tampo atualizado ({len(uri)} caracteres)')
