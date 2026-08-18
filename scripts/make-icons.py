#!/usr/bin/env python3
"""
tabBar 图标生成（微信官方建议尺寸 81x81 PNG）。

刻意用代码画而不是找图：三个图标要和主题色严格一致（未选中 #9CA3AF /
选中森林绿 #34D399），而且以后调色只要改这里重跑，不用回去找设计源文件。

画法是 4 倍超采样再缩回去 —— PIL 的 ImageDraw 不做抗锯齿，直接画 81px
边缘会有明显锯齿。

用法：python3 scripts/make-icons.py
依赖：pillow
"""
import os
from PIL import Image, ImageDraw

SIZE = 81
SS = 4  # 超采样倍数
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "tab")

IDLE = (156, 163, 175, 255)   # #9CA3AF
ACTIVE = (52, 211, 153, 255)  # #34D399


def canvas():
    img = Image.new("RGBA", (SIZE * SS, SIZE * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def s(*vals):
    """把 81 坐标系里的数值缩放到超采样画布"""
    return tuple(v * SS for v in vals)


def draw_shelf(d, color):
    """绘本馆：一本摊开的书"""
    w = 5 * SS
    # 书脊
    d.line(s(40.5, 22, 40.5, 62), fill=color, width=w)
    # 左右两页的外轮廓（上缘微微上翘，像翻开的纸）
    d.line(s(40.5, 24, 18, 20), fill=color, width=w)
    d.line(s(18, 20, 12, 24), fill=color, width=w)
    d.line(s(12, 24, 12, 58), fill=color, width=w)
    d.line(s(12, 58, 40.5, 62), fill=color, width=w)
    d.line(s(40.5, 24, 63, 20), fill=color, width=w)
    d.line(s(63, 20, 69, 24), fill=color, width=w)
    d.line(s(69, 24, 69, 58), fill=color, width=w)
    d.line(s(69, 58, 40.5, 62), fill=color, width=w)
    # 页面上的文字线
    d.line(s(21, 34, 33, 36), fill=color, width=3 * SS)
    d.line(s(48, 36, 60, 34), fill=color, width=3 * SS)


def draw_words(d, color):
    """生词本：一张带书签的单词卡"""
    w = 5 * SS
    d.rounded_rectangle(s(14, 18, 67, 63), radius=8 * SS, outline=color, width=w)
    # 卡片上的三条词条线，长短不一才像字
    d.line(s(25, 34, 47, 34), fill=color, width=4 * SS)
    d.line(s(25, 45, 56, 45), fill=color, width=4 * SS)
    # 右上角书签
    d.polygon(s(52, 18, 62, 18, 62, 33, 57, 28, 52, 33), fill=color)


def draw_me(d, color):
    """我的：一个小人"""
    w = 5 * SS
    d.ellipse(s(29, 17, 52, 40), outline=color, width=w)
    # 肩线：一段圆弧，两端收在底边
    d.arc(s(15, 42, 66, 88), start=180, end=360, fill=color, width=w)


ICONS = {
    "shelf": draw_shelf,
    "words": draw_words,
    "me": draw_me,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, painter in ICONS.items():
        for suffix, color in (("", IDLE), ("-on", ACTIVE)):
            img, d = canvas()
            painter(d, color)
            img = img.resize((SIZE, SIZE), Image.LANCZOS)
            path = os.path.join(OUT, f"{name}{suffix}.png")
            img.save(path, "PNG", optimize=True)
            print(f"  ✓ {os.path.relpath(path, os.path.join(os.path.dirname(__file__), '..'))}"
                  f"  {os.path.getsize(path)} B")


if __name__ == "__main__":
    main()
