#!/usr/bin/env python3
"""Build the 30-slide Portuguese ASTRA deck using approved institutional art.

Reuses the existing PDF/PPTX/HTML exporter and fonts. No image-generation API,
network request or website deployment is performed by this script.
"""
import argparse
import hashlib
import importlib.util
import inspect
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[1]
STAGES = ['GANCHO', 'PROBLEMA', 'SOLUÇÃO', 'DIFERENCIAL', 'PROVA', 'PEDIDO']
NAVY = '#081522'
WHITE = '#F7F5F0'
CYAN = '#7AD7DD'
ORANGE = '#F6AB64'
URL = 'https://astra-junior-mission-trainer.vercel.app/'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--site-dir', type=Path, default=WORKSPACE / 'sites/astra-institutional')
    ap.add_argument('--output-dir', type=Path, default=WORKSPACE / 'artifacts/ASTRA-Pitch-PT-30-Slides-v5')
    args = ap.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    spec = importlib.util.spec_from_file_location('astra_v4', ROOT / 'scripts/build-pitch-v4.py')
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    renderer = adapter.load_renderer()
    assets = {}
    bounds = []

    def asset(name):
        stem = Path(name).stem
        if stem.startswith('fixture-'):
            p = ROOT / 'docs/demo/fixture-captures' / (stem + '.png')
            kind = 'prepared-demo-capture'
        else:
            # Prefer the exact bytes used by the landing page where available.
            p = args.site_dir / 'dist/assets' / (stem + '.webp')
            if not p.exists():
                p = args.site_dir / 'art/english' / (stem + '-en.png')
            kind = 'approved-site-concept-art'
        if not p.is_file():
            raise FileNotFoundError(p)
        assets[stem] = {'path': str(p), 'kind': kind,
                        'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
        return p

    def render(s, tmp, lang, total):
        n = int(s['id'])
        p = asset(s['art'])
        demo = p.name.startswith('fixture-')
        if demo:
            im = Image.new('RGB', (1920, 1080), NAVY)
        else:
            source = Image.open(p).convert('RGB')
            fitted = ImageOps.contain(source, (1920, 1080), Image.Resampling.LANCZOS)
            im = Image.new('RGBA', (1920, 1080), NAVY)
            im.paste(fitted, ((1920-fitted.width)//2, (1080-fitted.height)//2))
            veil = Image.new('RGBA', im.size)
            d = ImageDraw.Draw(veil)
            for x in range(1920):
                alpha = round(218 * (1-min(x/1420, 1)) + 20)
                d.line((x, 0, x, 1080), fill=(8, 21, 34, alpha))
            im = Image.alpha_composite(im, veil).convert('RGB')
        # Consistent header and footer; retain the complete scene between them.
        draw = ImageDraw.Draw(im, 'RGBA')
        for y in range(145):
            draw.line((0, y, 1920, y), fill=(8, 21, 34, round(235*(1-y/145))))
        for y in range(895, 1080):
            draw.line((0, y, 1920, y), fill=(8, 21, 34, round(230*min(1, (y-895)/85))))
        bg = tmp / f'{n:02d}.jpg'
        im.save(bg, quality=94)
        elements = [('picture', 88, 47, 165, 62, str(renderer.BRAND_PNG))]

        def text(x, y, width, value, size, color=WHITE, bold=False):
            if value:
                elements.append(('text', x, y, width, value, size, color, bold))

        def box(x, y, width, height, color):
            elements.append(('box', x, y, width, height, color, 0))

        text(285, 67, 1100, '/  '+s['stage'], 22, CYAN, True)
        text(1700, 67, 150, f'{n:02d} / 30', 22, WHITE, True)
        width = 650 if demo else 995
        size = 76 if demo else 92
        while len(renderer.base.fit_lines(s['headline'], width, size, True))*size*1.22 > 335:
            size -= 2
        headline_lines = renderer.base.fit_lines(s['headline'], width, size, True)
        text(92, 205, width, s['headline'], size, WHITE, True)
        sub_y = round(205 + len(headline_lines)*size*1.22 + 30)
        text(96, sub_y, width, s['subtitle'], 33 if demo else 36)

        if demo:
            elements.append(('picture', 795, 240, 1040, 630, str(p)))
            text(817, 897, 1020, 'DEMO ATUAL · CAPTURA DE CENA PREPARADA', 20, ORANGE, True)
            text(817, 927, 1020, 'Interface original do protótipo · sem recortes de tela', 20)
        if n == 7:
            text(95, 700, 170, '4', 124, ORANGE, True)
            text(218, 763, 720, 'SISTEMAS QUE SE AFETAM', 28, CYAN, True)
        if n == 22:
            text(95, 693, 280, '67', 128, ORANGE, True)
            text(95, 843, 620, 'TESTES DE CPU · NÃO MEDEM APRENDIZAGEM', 20, CYAN, True)
        if n == 24:
            text(95, 665, 280, '33', 128, ORANGE, True)
            text(95, 815, 800, 'ESTUDOS SOBRE JOGOS E APRENDIZAGEM STEM', 22, CYAN, True)
            text(95, 857, 900, 'Wang et al. (2022) · A pesquisa não avaliou o ASTRA.', 22)
        if n == 29:
            text(95, 759, 640, 'ABRA A DEMO', 24, ORANGE, True)
            text(95, 810, 640, 'astra-junior-mission-trainer.vercel.app', 23, WHITE, True)
        if n == 30:
            text(95, 740, 1050, 'Um parceiro ao lado. Um universo para descobrir.', 31, CYAN, True)

        if not demo:
            text(95, 937, 1740, 'VISÃO DE PRODUÇÃO · GERADO POR SI · ARTE GERADA POR IA', 18, CYAN, True)
        # A restrained six-stage navigation makes the argument easy to follow.
        for i, stage in enumerate(STAGES):
            x = 95+i*289
            active = i == (n-1)//5
            box(x, 996, 252, 4, CYAN if active else '#354756')
            text(x, 1014, 252, stage, 19, WHITE if active else '#A8BAC9', active)
        text(1740, 1038, 120, f'{(n-1)*6//60:02d}:{(n-1)*6%60:02d}', 17)

        for element in elements:
            if element[0] == 'text':
                _, x, y, w, value, sz, _, bold = element
                lines = renderer.base.fit_lines(value, w, sz, bold)
                bottom = y+len(lines)*sz*1.28+15
                assert x >= 0 and x+w <= 1920 and bottom <= 1080, (n, value, bottom)
                bounds.append({'slide': n, 'text': value, 'bottom': round(bottom, 1)})
        return bg, elements

    renderer.render = render
    # Reuse the existing exporter while allowing the explicitly requested 30-slide
    # Portuguese version. The earlier six-slide elevator remains unchanged.
    build_source = inspect.getsource(renderer.build)
    old = "assert (len(slides)==30 and data['totalDurationSeconds']==180) if lang=='en' else (len(slides)<=7 and data['totalDurationSeconds']==30)"
    assert old in build_source
    build_source = build_source.replace(old, "assert len(slides)==30 and data['totalDurationSeconds']==180")
    build_source = build_source.replace("if (lang=='en' and n==29) or (lang=='pt' and n==6):", 'if n==29:')
    build_source = build_source.replace("(95,H-(1030 if lang=='en' else 930)-35,1700,H-(1030 if lang=='en' else 930)+5)", '(95,180,735,315)')
    build_source = build_source.replace('docs/presentation/v3/SOURCES_EN.md', 'docs/presentation/v5/SOURCES_PT.md')
    build_source = build_source.replace('Source IDs:', 'IDs das fontes:').replace('Reference:', 'Referências:')
    build_source = build_source.replace('Screenshot: prepared demo scene; interface shown in Portuguese.', 'Captura de cena preparada da demo; interface em português.')
    build_source = build_source.replace('https://astra-mission-trainer.andrevictorandrade.chatgpt.site', URL)
    build_source = build_source.replace('aria-label="Previous"', 'aria-label="Anterior"').replace('aria-label="Next"', 'aria-label="Próximo"')
    exec(compile(build_source, str(Path(__file__)), 'exec'), renderer.__dict__)

    source = ROOT / 'docs/presentation/v5/PITCH_PT.json'
    data = json.loads(source.read_text())
    brand = args.site_dir / 'dist/assets/brand/astra-lockup-dark.svg'
    with tempfile.TemporaryDirectory(prefix='astra-pt-brand-') as tmp:
        renderer.BRAND_PNG = Path(tmp) / 'logo.png'
        subprocess.run(['inkscape', str(brand), '--export-filename='+str(renderer.BRAND_PNG), '--export-width=660'], check=True, capture_output=True)
        logo = Image.open(renderer.BRAND_PNG).convert('RGBA')
        Image.alpha_composite(Image.new('RGBA', logo.size, NAVY), logo).convert('RGB').save(renderer.BRAND_PNG)
        renderer.build(source, args.output_dir, 'ASTRA-Pitch-PT-30-Slides-v5')
    report = {
        'version': 'v5-pt', 'language': 'pt-BR', 'slides': len(data['slides']),
        'secondsPerSlide': 6, 'totalSeconds': data['totalDurationSeconds'],
        'narrationWords': sum(len(s['narration'].split()) for s in data['slides']),
        'newImagesGenerated': False, 'textBoundsChecked': len(bounds),
        'assets': assets, 'limitations': [
            'Approved artwork is reused without regeneration; embedded English art labels remain original.',
            'Demo captures are staged prototype evidence, not production screenshots.',
            'PDF is static; PowerPoint and HTML carry six-second slide timing.',
            'PowerPoint text is editable; concept illustrations are raster images.'
        ]
    }
    (args.output_dir / 'VERIFICATION.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    main()
