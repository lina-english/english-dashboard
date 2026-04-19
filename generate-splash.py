"""生成 iOS PWA 启动图（splash screen）。
避免用户从主屏点开时出现白屏闪一下，换成 ITW 蓝 + E logo。
"""
from PIL import Image, ImageDraw, ImageFont
import os

BG_TOP = (0, 102, 179)
BG_BOTTOM = (0, 150, 220)
FG = (255, 255, 255)
ACCENT = (255, 200, 0)

OUT_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(OUT_DIR, exist_ok=True)


def load_font(size):
    for path in [r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\arialbd.ttf']:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_splash(width, height, filename):
    img = Image.new('RGB', (width, height), BG_TOP)
    draw = ImageDraw.Draw(img)
    # 垂直渐变
    for y in range(height):
        ratio = y / height
        r = int(BG_TOP[0] * (1 - ratio) + BG_BOTTOM[0] * ratio)
        g = int(BG_TOP[1] * (1 - ratio) + BG_BOTTOM[1] * ratio)
        b = int(BG_TOP[2] * (1 - ratio) + BG_BOTTOM[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # ===== 三层垂直居中布局：E logo / 中文标题 / 英文标题 =====
    # 以画面中心为锚点，E 在上方，文字在下方
    center_y = height // 2

    # 1) E logo
    logo_size = int(min(width, height) * 0.22)
    font_e = load_font(logo_size)
    text = 'E'
    bbox = draw.textbbox((0, 0), text, font=font_e)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    e_x = (width - tw) // 2 - bbox[0]
    e_y = center_y - th - int(height * 0.04)  # E 在中心上方
    draw.text((e_x, e_y), text, fill=FG, font=font_e)

    # 2) 中文副标（在 E 下方，留空隙）
    sub_size = int(min(width, height) * 0.045)
    font_sub = load_font(sub_size)
    cn_text = '英语学习看板'
    cb = draw.textbbox((0, 0), cn_text, font=font_sub)
    cnw = cb[2] - cb[0]
    cn_x = (width - cnw) // 2 - cb[0]
    cn_y = e_y + th + int(height * 0.035)
    draw.text((cn_x, cn_y), cn_text, fill=FG, font=font_sub)

    # 3) 英文副标（在中文下方）
    en_text = 'English Dashboard'
    en_size = int(min(width, height) * 0.038)
    font_en = load_font(en_size)
    eb = draw.textbbox((0, 0), en_text, font=font_en)
    enw = eb[2] - eb[0]
    enh = cb[3] - cb[1]
    en_x = (width - enw) // 2 - eb[0]
    en_y = cn_y + enh + int(height * 0.015)
    draw.text((en_x, en_y), en_text, fill=(255, 255, 255, 200), font=font_en)

    # 4) 黄色装饰点（E 右上角）
    dot_r = int(min(width, height) * 0.012)
    dcx = e_x + tw + int(dot_r * 1.2)
    dcy = e_y + int(th * 0.12)
    draw.ellipse([dcx - dot_r, dcy - dot_r, dcx + dot_r, dcy + dot_r], fill=ACCENT)

    out = os.path.join(OUT_DIR, filename)
    img.save(out, 'PNG')
    print(f'  [ok] {filename}  {width}x{height}')


# iOS 各机型屏幕尺寸（竖屏 @ native pixels）
# 资料来源：Apple HIG + iPhone 屏幕规格
IOS_SPLASH_SIZES = [
    # iPhone 15 Pro Max / 14 Pro Max
    (1290, 2796, 'splash-1290x2796.png'),
    # iPhone 15 / 15 Pro / 14 Pro
    (1179, 2556, 'splash-1179x2556.png'),
    # iPhone 14 Plus / 13 Pro Max / 12 Pro Max
    (1284, 2778, 'splash-1284x2778.png'),
    # iPhone 13 / 13 Pro / 12 / 12 Pro / 14
    (1170, 2532, 'splash-1170x2532.png'),
    # iPhone 11 Pro Max / XS Max
    (1242, 2688, 'splash-1242x2688.png'),
    # iPhone 11 / XR
    (828, 1792, 'splash-828x1792.png'),
    # iPhone X / XS / 11 Pro
    (1125, 2436, 'splash-1125x2436.png'),
    # iPhone 8 Plus / 7 Plus / 6s Plus
    (1242, 2208, 'splash-1242x2208.png'),
    # iPhone 8 / 7 / 6s / SE2 / SE3
    (750, 1334, 'splash-750x1334.png'),
    # iPhone SE 1st gen
    (640, 1136, 'splash-640x1136.png'),
]


if __name__ == '__main__':
    print('Generating iOS splash screens -> icons/')
    for w, h, name in IOS_SPLASH_SIZES:
        make_splash(w, h, name)
    print('Done.')
