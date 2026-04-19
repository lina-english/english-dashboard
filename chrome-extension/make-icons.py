"""生成扩展图标 - 深蓝底 + 白色星星"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).parent / "icons"
OUT.mkdir(exist_ok=True)

BG = (0, 102, 179)   # ITW blue
FG = (255, 255, 255)

def make_icon(size: int) -> None:
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    # 星星 emoji 用字体太重,直接用文字 "繁"
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", int(size * 0.6))
    except OSError:
        font = ImageFont.load_default()
    text = "繁"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]), text, fill=FG, font=font)
    img.save(OUT / f"icon-{size}.png")
    print(f"  [ok] icon-{size}.png")

for s in (16, 48, 128):
    make_icon(s)
print("done")
