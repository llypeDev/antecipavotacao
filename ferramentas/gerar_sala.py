"""Gera a cena de fundo: sala de aula usada como seção eleitoral, com fila de eleitores.

Cena ilustrada (vetorial) pensada para ficar atrás da urna, com desfoque de
profundidade. Coordenadas em 1600x900. A fila fica à esquerda (visível ao lado
da urna) e os mesários à direita.

Uso:
    python3 ferramentas/gerar_sala.py sala.svg
Depois, rasterize o SVG em 3200x1800 (por exemplo, abrindo no Chromium com
deviceScaleFactor 2 e tirando um screenshot) e salve como img/sala.webp.
"""
import random

W, H = 1600, 900
rnd = random.Random(2026)
partes = []


def add(s):
    partes.append(s)


def pessoa(x, y, h, pele, cabelo, estilo, camisa, calca, sapato='#2b2522', vira=0.0,
           extra=None, saia=False, manga_curta=False, oculos=False, costas=False):
    """Pessoa em pé, pés em (x, y), altura h. vira: -1 (esquerda) .. 1 (direita)."""
    r = h * 0.068
    cab_y = y - h + r
    ombro_y = cab_y + r * 1.75
    quadril_y = y - h * 0.47
    larg_o = h * 0.245
    larg_q = h * 0.19
    dx = vira * r * 0.35
    g = []
    sombra = f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{larg_o*0.7:.1f}" ry="{h*0.018:.1f}" fill="#000" opacity=".18"/>'
    g.append(sombra)
    # pernas
    perna_w = larg_q * 0.42
    if saia:
        g.append(f'<rect x="{x-larg_q*0.32:.1f}" y="{quadril_y:.1f}" width="{perna_w*0.7:.1f}" height="{y-quadril_y-4:.1f}" rx="{perna_w*0.3:.1f}" fill="{pele}"/>')
        g.append(f'<rect x="{x+larg_q*0.32-perna_w*0.7:.1f}" y="{quadril_y:.1f}" width="{perna_w*0.7:.1f}" height="{y-quadril_y-4:.1f}" rx="{perna_w*0.3:.1f}" fill="{pele}"/>')
        g.append(f'<path d="M{x-larg_q*0.55:.1f} {quadril_y-6:.1f} L{x+larg_q*0.55:.1f} {quadril_y-6:.1f} L{x+larg_q*0.7:.1f} {quadril_y+h*0.2:.1f} L{x-larg_q*0.7:.1f} {quadril_y+h*0.2:.1f} Z" fill="{calca}"/>')
    else:
        g.append(f'<rect x="{x-larg_q*0.5:.1f}" y="{quadril_y-4:.1f}" width="{perna_w:.1f}" height="{y-quadril_y:.1f}" rx="{perna_w*0.35:.1f}" fill="{calca}"/>')
        g.append(f'<rect x="{x+larg_q*0.5-perna_w:.1f}" y="{quadril_y-4:.1f}" width="{perna_w:.1f}" height="{y-quadril_y:.1f}" rx="{perna_w*0.35:.1f}" fill="{calca}"/>')
        g.append(f'<rect x="{x-larg_q*0.5:.1f}" y="{quadril_y-4:.1f}" width="{larg_q:.1f}" height="{h*0.08:.1f}" rx="{perna_w*0.3:.1f}" fill="{calca}"/>')
    # sapatos
    for s in (-1, 1):
        sx = x + s * larg_q * 0.28 + vira * 4
        g.append(f'<ellipse cx="{sx:.1f}" cy="{y-3:.1f}" rx="{perna_w*0.62:.1f}" ry="{h*0.016:.1f}" fill="{sapato}"/>')
    # mochila (atrás)
    if extra == 'mochila':
        g.append(f'<rect x="{x-vira*larg_o*0.55-larg_o*0.38:.1f}" y="{ombro_y+h*0.03:.1f}" width="{larg_o*0.76:.1f}" height="{h*0.25:.1f}" rx="{h*0.04:.1f}" fill="#3b4a63"/>')
    # braços
    braco_w = larg_o * 0.2
    braco_h = h * 0.34
    cor_braco = pele if manga_curta else camisa
    for s in (-1, 1):
        bx = x + s * (larg_o * 0.5 - braco_w * 0.35) - braco_w / 2
        g.append(f'<rect x="{bx:.1f}" y="{ombro_y+3:.1f}" width="{braco_w:.1f}" height="{braco_h:.1f}" rx="{braco_w*0.48:.1f}" fill="{cor_braco}"/>')
        if manga_curta:
            g.append(f'<rect x="{bx-1:.1f}" y="{ombro_y+2:.1f}" width="{braco_w+2:.1f}" height="{braco_h*0.32:.1f}" rx="{braco_w*0.45:.1f}" fill="{camisa}"/>')
        g.append(f'<circle cx="{bx+braco_w/2:.1f}" cy="{ombro_y+braco_h+1:.1f}" r="{braco_w*0.52:.1f}" fill="{pele}"/>')
    # tronco
    g.append(f'<path d="M{x-larg_o/2:.1f} {ombro_y+r*0.35:.1f} Q{x-larg_o/2:.1f} {ombro_y:.1f} {x-larg_o*0.3:.1f} {ombro_y:.1f} '
             f'L{x+larg_o*0.3:.1f} {ombro_y:.1f} Q{x+larg_o/2:.1f} {ombro_y:.1f} {x+larg_o/2:.1f} {ombro_y+r*0.35:.1f} '
             f'L{x+larg_q/2+2:.1f} {quadril_y+h*0.02:.1f} L{x-larg_q/2-2:.1f} {quadril_y+h*0.02:.1f} Z" fill="{camisa}"/>')
    g.append(f'<path d="M{x+larg_o*0.12:.1f} {ombro_y:.1f} L{x+larg_o/2:.1f} {ombro_y+r*0.35:.1f} L{x+larg_q/2+2:.1f} {quadril_y+h*0.02:.1f} L{x+larg_q*0.1:.1f} {quadril_y+h*0.02:.1f} Z" fill="#000" opacity=".1"/>')
    # bolsa ao ombro
    if extra == 'bolsa':
        g.append(f'<path d="M{x-larg_o*0.32:.1f} {ombro_y:.1f} L{x+larg_o*0.45:.1f} {quadril_y-h*0.02:.1f}" stroke="#5a3b28" stroke-width="{max(2,h*0.008):.1f}" fill="none"/>')
        g.append(f'<rect x="{x+larg_o*0.3:.1f}" y="{quadril_y-h*0.06:.1f}" width="{larg_o*0.42:.1f}" height="{h*0.09:.1f}" rx="{h*0.015:.1f}" fill="#7a4a2c"/>')
    if extra == 'documento':
        g.append(f'<rect x="{x+larg_o*0.28:.1f}" y="{ombro_y+braco_h-h*0.05:.1f}" width="{larg_o*0.26:.1f}" height="{h*0.06:.1f}" rx="2" fill="#2f6a3a"/>')
    if extra == 'celular':
        g.append(f'<rect x="{x-larg_o*0.05:.1f}" y="{ombro_y+h*0.11:.1f}" width="{larg_o*0.2:.1f}" height="{h*0.06:.1f}" rx="2" fill="#1b1b1f"/>')
    if extra == 'bengala':
        g.append(f'<path d="M{x+larg_o*0.55:.1f} {ombro_y+braco_h:.1f} L{x+larg_o*0.68:.1f} {y-2:.1f}" stroke="#4a3426" stroke-width="{max(2,h*0.012):.1f}" stroke-linecap="round"/>')
    # pescoço e cabeça
    g.append(f'<rect x="{x-r*0.38+dx*0.4:.1f}" y="{cab_y+r*0.6:.1f}" width="{r*0.76:.1f}" height="{r*0.95:.1f}" fill="{pele}"/>')
    # cabelo de trás
    if estilo in ('longo', 'rabo'):
        g.append(f'<path d="M{x-r*1.05+dx:.1f} {cab_y-r*0.1:.1f} Q{x+dx:.1f} {cab_y-r*1.3:.1f} {x+r*1.05+dx:.1f} {cab_y-r*0.1:.1f} L{x+r*1.1+dx:.1f} {cab_y+r*(2.4 if estilo=="longo" else 1.2):.1f} L{x-r*1.1+dx:.1f} {cab_y+r*(2.4 if estilo=="longo" else 1.2):.1f} Z" fill="{cabelo}"/>')
    if estilo == 'cacheado':
        for i in range(9):
            ang = 3.14159 * (1.05 + i * 0.9 / 8)
            import math
            cx = x + dx + math.cos(ang) * r * 0.95
            cy = cab_y + math.sin(ang) * r * 0.95
            g.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r*0.55:.1f}" fill="{cabelo}"/>')
    if costas:
        # de costas: a nuca/cabelo cobre a cabeça
        g.append(f'<ellipse cx="{x+dx:.1f}" cy="{cab_y:.1f}" rx="{r*0.95:.1f}" ry="{r*1.07:.1f}" fill="{cabelo}"/>')
        g.append(f'<ellipse cx="{x+dx-r*0.92:.1f}" cy="{cab_y+r*0.15:.1f}" rx="{r*0.16:.1f}" ry="{r*0.28:.1f}" fill="{pele}"/>')
        g.append(f'<ellipse cx="{x+dx+r*0.92:.1f}" cy="{cab_y+r*0.15:.1f}" rx="{r*0.16:.1f}" ry="{r*0.28:.1f}" fill="{pele}"/>')
        if estilo == 'bone':
            g.append(f'<path d="M{x-r*0.98+dx:.1f} {cab_y-r*0.05:.1f} Q{x+dx:.1f} {cab_y-r*1.45:.1f} {x+r*0.98+dx:.1f} {cab_y-r*0.05:.1f} Z" fill="#2c3e50"/>'
                     f'<rect x="{x+dx-r*0.35:.1f}" y="{cab_y-r*0.25:.1f}" width="{r*0.7:.1f}" height="{r*0.22:.1f}" rx="{r*0.1:.1f}" fill="#d9d4c7" opacity=".7"/>')
        if estilo == 'cacheado':
            import math
            for i in range(12):
                ang = 6.2832 * i / 12
                g.append(f'<circle cx="{x+dx+math.cos(ang)*r*0.85:.1f}" cy="{cab_y+math.sin(ang)*r*0.85:.1f}" r="{r*0.5:.1f}" fill="{cabelo}"/>')
        return '<g>' + ''.join(g) + '</g>'
    g.append(f'<ellipse cx="{x+dx:.1f}" cy="{cab_y:.1f}" rx="{r*0.92:.1f}" ry="{r*1.05:.1f}" fill="{pele}"/>')
    g.append(f'<circle cx="{x+dx+vira*r*0.25-r*0.3:.1f}" cy="{cab_y:.1f}" r="{max(1.2,r*0.09):.1f}" fill="#2a1d17"/><circle cx="{x+dx+vira*r*0.25+r*0.3:.1f}" cy="{cab_y:.1f}" r="{max(1.2,r*0.09):.1f}" fill="#2a1d17"/>')
    # orelha / nariz (leve indicação da direção)
    if abs(vira) > 0.2:
        g.append(f'<ellipse cx="{x+dx-vira*r*0.75:.1f}" cy="{cab_y+r*0.1:.1f}" rx="{r*0.18:.1f}" ry="{r*0.26:.1f}" fill="{pele}" opacity=".9"/>')
    # cabelo da frente
    if estilo in ('curto', 'longo', 'rabo', 'coque'):
        g.append(f'<path d="M{x-r*0.95+dx:.1f} {cab_y+r*0.05:.1f} Q{x-r*0.9+dx:.1f} {cab_y-r*1.15:.1f} {x+dx:.1f} {cab_y-r*1.12:.1f} Q{x+r*0.95+dx:.1f} {cab_y-r*1.1:.1f} {x+r*0.95+dx:.1f} {cab_y+r*0.05:.1f} Q{x+r*0.5+dx:.1f} {cab_y-r*0.45:.1f} {x+dx:.1f} {cab_y-r*0.5:.1f} Q{x-r*0.5+dx:.1f} {cab_y-r*0.45:.1f} {x-r*0.95+dx:.1f} {cab_y+r*0.05:.1f} Z" fill="{cabelo}"/>')
    if estilo == 'coque':
        g.append(f'<circle cx="{x+dx-vira*r*0.6:.1f}" cy="{cab_y-r*1.05:.1f}" r="{r*0.42:.1f}" fill="{cabelo}"/>')
    if estilo == 'calvo':
        g.append(f'<path d="M{x-r*0.95+dx:.1f} {cab_y+r*0.1:.1f} Q{x-r*0.95+dx:.1f} {cab_y-r*0.4:.1f} {x-r*0.7+dx:.1f} {cab_y-r*0.55:.1f} L{x-r*0.7+dx:.1f} {cab_y+r*0.2:.1f} Z" fill="{cabelo}"/>'
                 f'<path d="M{x+r*0.95+dx:.1f} {cab_y+r*0.1:.1f} Q{x+r*0.95+dx:.1f} {cab_y-r*0.4:.1f} {x+r*0.7+dx:.1f} {cab_y-r*0.55:.1f} L{x+r*0.7+dx:.1f} {cab_y+r*0.2:.1f} Z" fill="{cabelo}"/>')
    if estilo == 'bone':
        g.append(f'<path d="M{x-r*0.98+dx:.1f} {cab_y-r*0.1:.1f} Q{x+dx:.1f} {cab_y-r*1.4:.1f} {x+r*0.98+dx:.1f} {cab_y-r*0.1:.1f} Z" fill="{cabelo}"/>'
                 f'<ellipse cx="{x+dx+vira*r*0.9:.1f}" cy="{cab_y-r*0.12:.1f}" rx="{r*0.75:.1f}" ry="{r*0.16:.1f}" fill="{cabelo}"/>')
    if oculos:
        g.append(f'<path d="M{x+dx-r*0.6:.1f} {cab_y:.1f} h{r*0.5:.1f} M{x+dx+r*0.1:.1f} {cab_y:.1f} h{r*0.5:.1f}" stroke="#222" stroke-width="{max(1.5,r*0.12):.1f}"/>')
    return '<g>' + ''.join(g) + '</g>'


# ---------------- fundo ----------------
add('<defs>'
    '<linearGradient id="teto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6d2c6"/><stop offset="1" stop-color="#e4e0d4"/></linearGradient>'
    '<linearGradient id="parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3ead3"/><stop offset="1" stop-color="#e9dec1"/></linearGradient>'
    '<linearGradient id="barra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cdb3"/><stop offset="1" stop-color="#93bb9f"/></linearGradient>'
    '<linearGradient id="piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8b2a3"/><stop offset="1" stop-color="#d2ccbd"/></linearGradient>'
    '<linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfdcef"/><stop offset="1" stop-color="#eef6f9"/></linearGradient>'
    '<linearGradient id="quadro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f4d3e"/><stop offset="1" stop-color="#27412f"/></linearGradient>'
    '<radialGradient id="luz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffef2" stop-opacity=".9"/><stop offset="1" stop-color="#fffef2" stop-opacity="0"/></radialGradient>'
    '<radialGradient id="vinheta" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>'
    '<linearGradient id="porta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6b48"/><stop offset="1" stop-color="#9c7a52"/></linearGradient>'
    '<filter id="fundoBlur"><feGaussianBlur stdDeviation="2.2"/></filter>'
    '<filter id="meioBlur"><feGaussianBlur stdDeviation="1.6"/></filter>'
    '<filter id="frenteBlur"><feGaussianBlur stdDeviation="3.4"/></filter>'
    '<filter id="giz" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="r"/>'
    '<feDisplacementMap in="SourceGraphic" in2="r" scale="2.5" result="d"/>'
    '<feComponentTransfer in="r" result="m"><feFuncA type="discrete" tableValues="0 .6 1 1 1 1"/></feComponentTransfer>'
    '<feComposite in="d" in2="m" operator="in"/></filter>'
    '</defs>')

fundo = []
fundo.append(f'<rect width="{W}" height="90" fill="url(#teto)"/>')
for lx in (330, 800, 1270):
    fundo.append(f'<ellipse cx="{lx}" cy="70" rx="210" ry="60" fill="url(#luz)"/>')
    fundo.append(f'<rect x="{lx-130}" y="30" width="260" height="16" rx="4" fill="#f9f8f0" stroke="#c9c5b8" stroke-width="2"/>')
fundo.append(f'<rect y="90" width="{W}" height="350" fill="url(#parede)"/>')
fundo.append(f'<rect y="440" width="{W}" height="150" fill="url(#barra)"/>')
fundo.append(f'<rect y="436" width="{W}" height="6" fill="#6f9d80"/>')
fundo.append(f'<rect y="586" width="{W}" height="8" fill="#5f8a6e"/>')
# piso com lajotas em perspectiva
fundo.append(f'<rect y="594" width="{W}" height="{H-594}" fill="url(#piso)"/>')
pv = (800, 260)
for i in range(-12, 13):
    xb = 800 + i * 150
    fundo.append(f'<path d="M{pv[0] + (xb-pv[0])*0.36:.0f} 594 L{xb} {H}" stroke="#9f998b" stroke-width="1.4" opacity=".5"/>')
yy = 594
passo = 16
while yy < H:
    fundo.append(f'<path d="M0 {yy:.0f} H{W}" stroke="#9f998b" stroke-width="1.2" opacity=".45"/>')
    passo *= 1.32
    yy += passo

# porta (esquerda) com aviso da seção
fundo.append('<rect x="60" y="200" width="200" height="394" fill="#6b5236"/>')
fundo.append('<rect x="72" y="212" width="176" height="382" fill="#f2efe4"/>')  # corredor claro
fundo.append('<path d="M72 212 L200 232 L200 600 L72 594 Z" fill="url(#porta)"/>')  # porta aberta
fundo.append('<circle cx="186" cy="420" r="6" fill="#d9c27a"/>')
fundo.append('<rect x="92" y="290" width="86" height="62" fill="#fffdf6" transform="rotate(-1.5 135 321)"/>')
fundo.append('<text x="135" y="313" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="13" fill="#1f3a8a">SEÇÃO</text>')
fundo.append('<text x="135" y="338" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="#1a1a1a">0158</text>')

# mural com desenhos das crianças
fundo.append('<rect x="300" y="160" width="170" height="210" fill="#c8a46b" stroke="#8a6a43" stroke-width="5"/>')
cores_papel = ['#fff7d6', '#e3f0ff', '#ffe3e3', '#e8ffe0', '#fffefa']
for i, (px, py) in enumerate([(312, 172), (392, 176), (316, 262), (394, 258), (352, 316)]):
    fundo.append(f'<rect x="{px}" y="{py}" width="66" height="76" fill="{cores_papel[i]}" transform="rotate({rnd.uniform(-4,4):.1f} {px+33} {py+38})"/>')
    fundo.append(f'<circle cx="{px+33}" cy="{py+30}" r="12" fill="{rnd.choice(["#f4b400","#db4437","#4285f4","#0f9d58"])}" opacity=".7"/>')
    fundo.append(f'<path d="M{px+12} {py+60} q20 -14 42 0" stroke="#555" stroke-width="2" fill="none" opacity=".6"/>')

# quadro-negro com giz
fundo.append('<rect x="510" y="128" width="580" height="250" rx="4" fill="#7b5a3a"/>')
fundo.append('<rect x="522" y="140" width="556" height="226" fill="url(#quadro)"/>')
fundo.append('<ellipse cx="640" cy="330" rx="90" ry="22" fill="#fff" opacity=".05"/><ellipse cx="960" cy="200" rx="110" ry="30" fill="#fff" opacity=".05"/>')
fundo.append('<rect x="505" y="376" width="590" height="10" rx="3" fill="#6a4d31"/>')
fundo.append('<rect x="560" y="369" width="26" height="8" rx="2" fill="#f4f2ea"/><rect x="600" y="370" width="16" height="7" rx="2" fill="#f2d4d4"/><rect x="1010" y="364" width="46" height="13" rx="2" fill="#4a3a2b"/>')
giz = 'font-family="Carlito, Liberation Sans, sans-serif" fill="#f2f2ec" filter="url(#giz)"'
fundo.append(f'<text x="800" y="212" text-anchor="middle" {giz} font-size="46" opacity=".9">Eleições 2026</text>')
fundo.append(f'<text x="800" y="268" text-anchor="middle" {giz} font-size="34" opacity=".85">2º turno · 25/10</text>')
fundo.append(f'<text x="800" y="326" text-anchor="middle" {giz} font-size="26" opacity=".75">Seção 0158 · Zona 001</text>')
fundo.append('<path d="M640 226 h320" stroke="#f2f2ec" stroke-width="2.5" opacity=".5"/>')

# relógio
fundo.append('<circle cx="800" cy="104" r="24" fill="#fbfaf4" stroke="#2b2b2b" stroke-width="4"/>')
fundo.append('<path d="M800 104 L800 88 M800 104 L812 108" stroke="#222" stroke-width="3" stroke-linecap="round"/>')

# janelas basculantes (direita)
for jx in (1150, 1290, 1430):
    fundo.append(f'<rect x="{jx}" y="140" width="130" height="250" fill="#59636b"/>')
    fundo.append(f'<rect x="{jx+6}" y="146" width="118" height="238" fill="url(#ceu)"/>')
    fundo.append(f'<ellipse cx="{jx+40}" cy="330" rx="60" ry="46" fill="#7fae6a" opacity=".75"/><ellipse cx="{jx+100}" cy="350" rx="50" ry="40" fill="#6c9c5c" opacity=".7"/>')
    for k in range(1, 6):
        fundo.append(f'<rect x="{jx+6}" y="{146 + k*40 - 2}" width="118" height="4" fill="#59636b"/>')
    fundo.append(f'<rect x="{jx+63}" y="146" width="4" height="238" fill="#59636b"/>')
fundo.append('<rect x="1140" y="388" width="440" height="10" fill="#d8d2c2"/>')

# aviso na parede
fundo.append('<rect x="1000" y="400" width="110" height="74" fill="#fffef8" transform="rotate(1 1055 437)"/>')
fundo.append('<text x="1055" y="425" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="12" fill="#b3261e">ATENÇÃO</text>')
fundo.append('<text x="1055" y="444" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#222">Tenha em mãos um</text>')
fundo.append('<text x="1055" y="458" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#222">documento com foto</text>')

# carteiras escolares empilhadas no canto direito
def carteira(cx, cy, esc=1.0):
    s = esc
    return (f'<g transform="translate({cx} {cy}) scale({s})">'
            '<rect x="-60" y="-6" width="120" height="12" rx="3" fill="#ddd3b6"/>'
            '<rect x="-56" y="6" width="5" height="80" fill="#2f5b3e"/><rect x="51" y="6" width="5" height="80" fill="#2f5b3e"/>'
            '<rect x="-40" y="24" width="80" height="34" rx="6" fill="#d8ceb2"/>'
            '<rect x="-40" y="58" width="5" height="30" fill="#2f5b3e"/><rect x="35" y="58" width="5" height="30" fill="#2f5b3e"/>'
            '</g>')
fundo.append(carteira(1350, 500, 1.0))
fundo.append(carteira(1490, 520, 1.1))
fundo.append(carteira(1420, 470, 0.95))

add('<g filter="url(#fundoBlur)">' + ''.join(fundo) + '</g>')

# ---------------- mesa dos mesários (direita, plano médio) ----------------
meio = []
meio.append(pessoa(1265, 640, 230, '#c58c5c', '#2b1d14', 'curto', '#4f6d8f', '#3b3b45', vira=-0.6, oculos=True))
meio.append(pessoa(1395, 640, 222, '#8d5a3a', '#1c1310', 'coque', '#c2694a', '#3b3b45', vira=-0.6))
meio.append('<rect x="1180" y="560" width="300" height="16" rx="3" fill="#c9a67a"/>')
meio.append('<rect x="1190" y="576" width="280" height="76" fill="#b8936a"/>')
meio.append('<rect x="1255" y="588" width="150" height="40" fill="#fffdf6"/>')
meio.append('<text x="1330" y="606" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="12" fill="#1f3a8a">MESA RECEPTORA</text>')
meio.append('<text x="1330" y="622" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#222">Seção 0158</text>')
meio.append('<rect x="1210" y="548" width="70" height="12" rx="2" fill="#f4f1e6"/><rect x="1300" y="546" width="44" height="14" rx="2" fill="#2d2d30"/>')

# ---------------- fila de eleitores (esquerda) ----------------
fila = [
    # x, y(pés), altura, pele, cabelo, estilo, camisa, calça, extra, opções
    (238, 650, 250, '#e3b48e', '#4a3326', 'longo', '#7b9fc4', '#2f3d55', 'bolsa', dict(vira=0.7, saia=False)),
    (172, 662, 262, '#7a4a30', '#141010', 'curto', '#e6e1d3', '#4a4a52', 'documento', dict(vira=0.7, manga_curta=True)),
    (108, 676, 236, '#f0c9a8', '#b8b4ad', 'calvo', '#7a6a55', '#3c3a36', 'bengala', dict(vira=0.6, oculos=True)),
    (330, 640, 228, '#c99570', '#2b1c14', 'rabo', '#c95b6a', '#31384a', 'celular', dict(vira=0.7)),
    (412, 630, 222, '#5e3a26', '#120e0c', 'curto', '#8c8f3a', '#2c2c30', None, dict(vira=0.8)),
    (486, 622, 210, '#eac2a0', '#a8642e', 'longo', '#5a6fb0', '#3a3a3f', 'bolsa', dict(vira=0.8, saia=True)),
]
frente = [
    (60, 900, 560, '#9a6a48', '#1a1412', 'bone', '#3f6f63', '#2a2f3d', 'mochila', dict(vira=0.0, costas=True)),
    (250, 930, 600, '#e7bd9a', '#4a2f20', 'cacheado', '#d9a441', '#3a4256', None, dict(vira=0.0, manga_curta=True, costas=True)),
]
m = []
for (x, y, h, pele, cab, est, cam, calca, extra, op) in fila:
    m.append(pessoa(x, y, h, pele, cab, est, cam, calca, extra=extra, **op))
add('<g filter="url(#meioBlur)">' + ''.join(meio) + ''.join(m) + '</g>')

f = []
for (x, y, h, pele, cab, est, cam, calca, extra, op) in frente:
    f.append(pessoa(x, y, h, pele, cab, est, cam, calca, extra=extra, **op))
add('<g filter="url(#frenteBlur)">' + ''.join(f) + '</g>')

# luz e vinheta
add(f'<rect width="{W}" height="{H}" fill="url(#vinheta)"/>')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">' + ''.join(partes) + '</svg>'
open(__import__('sys').argv[1], 'w').write(svg)
print('ok', len(svg))
