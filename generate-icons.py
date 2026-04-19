"""生成英语学习看板 PWA 图标。
运行：python generate-icons.py
输出到 icons/ 目录。
"""
from PIL import Image, ImageDraw, ImageFont
import os

# ITW 品牌蓝 → 渐变到浅蓝
BG_TOP = (0, 102, 179)        # #0066b3
BG_BOTTOM = (0, 150, 220)     # 浅一点的蓝
FG = (255, 255, 255)
ACCENT = (255, 200, 0)        # 黄色点缀

OUT_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

# 尝试加载字体
def load_font(size, bold=True):
    candidates = [
        r'C:\Windows\Fonts\msyhbd.ttc',    # 微软雅黑 Bold
        r'C:\Windows\Fonts\msyh.ttc',       # 微软雅黑
        r'C:\Windows\Fonts\segoeuib.ttf',   # Segoe UI Bold
        r'C:\Windows\Fonts\arialbd.ttf',    # Arial Bold
        r'C:\Windows\Fonts\arial.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_icon(size, maskable=False, filename=None):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 可遮罩图标需要在中心 80% 安全区内作图，外围留 10% 边距
    # 普通图标也用圆角方形，让视觉更清爽
    if maskable:
        # 整个图填满蓝色（安卓会自动裁圆）
        for y in range(size):
            ratio = y / size
            r = int(BG_TOP[0] * (1 - ratio) + BG_BOTTOM[0] * ratio)
            g = int(BG_TOP[1] * (1 - ratio) + BG_BOTTOM[1] * ratio)
            b = int(BG_TOP[2] * (1 - ratio) + BG_BOTTOM[2] * ratio)
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        content_pad = int(size * 0.18)  # 安全区内部绘制
    else:
        # 圆角矩形背景
        radius = int(size * 0.22)
        # 渐变填充（逐行）
        for y in range(size):
            ratio = y / size
            r = int(BG_TOP[0] * (1 - ratio) + BG_BOTTOM[0] * ratio)
            g = int(BG_TOP[1] * (1 - ratio) + BG_BOTTOM[1] * ratio)
            b = int(BG_TOP[2] * (1 - ratio) + BG_BOTTOM[2] * ratio)
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        # 再用一个圆角 mask 裁掉四角
        mask = Image.new('L', (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)
        img.putalpha(mask)
        content_pad = int(size * 0.08)

    # 在图上画大写 "E"（主 logo 字样）
    draw = ImageDraw.Draw(img)

    # 字号：E 占画面约 55%
    e_size = int(size * 0.58)
    e_font = load_font(e_size, bold=True)
    text = 'E'
    bbox = draw.textbbox((0, 0), text, font=e_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1] - int(size * 0.06)  # 往上移一点给下方 "英语" 留位置
    draw.text((tx, ty), text, fill=FG, font=e_font)

    # 下方小字 "英语"
    sub_size = int(size * 0.13)
    sub_font = load_font(sub_size, bold=True)
    sub_text = '英语'
    sbbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    sw = sbbox[2] - sbbox[0]
    sh = sbbox[3] - sbbox[1]
    sx = (size - sw) / 2 - sbbox[0]
    sy = size - sh - int(size * 0.14) - sbbox[1]
    draw.text((sx, sy), sub_text, fill=FG, font=sub_font)

    # 右上角小点（装饰）
    dot_r = int(size * 0.05)
    dot_cx = int(size * 0.78)
    dot_cy = int(size * 0.22)
    draw.ellipse(
        [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
        fill=ACCENT,
    )

    out_path = os.path.join(OUT_DIR, filename)
    img.save(out_path, 'PNG')
    print(f'  [ok] {filename}  ({size}x{size})')
    return out_path


if __name__ == '__main__':
    print('Generating PWA icons -> icons/')
    make_icon(192, maskable=False, filename='icon-192.png')
    make_icon(512, maskable=False, filename='icon-512.png')
    make_icon(512, maskable=True, filename='icon-maskable-512.png')
    make_icon(180, maskable=False, filename='apple-touch-icon.png')
    make_icon(32, maskable=False, filename='favicon-32.png')
    print('Done.')
