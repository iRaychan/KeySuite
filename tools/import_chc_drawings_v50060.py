"""Embed the supplied CHC dimension PNGs for the existing exact 13-key map."""
import base64
import io
import json
import re
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
names = [
    'CHC 1, 2, 3, 4, 5.png',
    'CHCS, CHCN, 1, 2, 3, 4, 5.png',
    'CHC 8, 10.png',
    'CHCS, CHCN, 8, 10.png',
    'CHC, CHCS, CHCN, 12.png',
    'CHC 15, 16, 20.png',
    'CHCS, CHCN, 15, 16, 20.png',
    'CHC, CHCS, CHCN, 32.png',
    'CHC, CHCS, CHCN, 45.png',
    'CHC, CHCS, CHCN, 64.png',
    'CHC, CHCS, CHCN, 90.png',
    'CHC, CHCS, CHCN, 120, 150.png',
    'CHC, CHCS, CHCN, 200.png',
]
assets = root / 'assets/v50060/chc-dimensions'
assets.mkdir(parents=True, exist_ok=True)
images = {}
for number, name in enumerate(names, 1):
    path = source / name
    image = Image.open(path).convert('RGBA')
    white = Image.new('RGBA', image.size, (255, 255, 255, 255))
    white.alpha_composite(image)
    output = white.convert('RGB')
    buffer = io.BytesIO()
    output.save(buffer, format='PNG', optimize=True)
    payload = buffer.getvalue()
    (assets / f'{number}.png').write_bytes(payload)
    images[str(number)] = 'data:image/png;base64,' + base64.b64encode(payload).decode('ascii')

for relative in ('selector-g1/index.html', 'selector-g1/product.html'):
    path = root / relative
    text = path.read_text()
    text, count = re.subn(r'const G1_DIMENSION_IMAGES=\{[^\n]*\};',
                          lambda _: 'const G1_DIMENSION_IMAGES=' + json.dumps(images, separators=(',', ':')) + ';', text)
    if count != 1:
        raise ValueError(f'Expected one image map in {relative}, found {count}')
    path.write_text(text)
print(f'Embedded {len(images)} original drawings in both CHC Product and Selection print views')
