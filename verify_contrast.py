
import re

def relative_luminance(hex_color):
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join([c*2 for c in hex_color])
    r, g, b = [int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4)]

    def adjust(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)

def contrast_ratio(hex1, hex2):
    l1 = relative_luminance(hex1)
    l2 = relative_luminance(hex2)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

# Values extracted from updated CSS
colors = {
    'default': {
        'accent': '#f2b7a8',
        'text_on_accent': '#2d2d3f'
    },
    'sunrise': {
        'accent': '#f4a261',
        'text_on_accent': '#3d2b20'
    },
    'forest': {
        'accent': '#a3b18a',
        'text_on_accent': '#1a2b1d'
    },
    'twilight': {
        'accent': '#e07a5f',
        'text_on_accent': '#1a222b'
    }
}

print("Checking Contrast Ratios (Target: 4.5:1 for AA)")
all_pass = True
for theme, data in colors.items():
    ratio = contrast_ratio(data['accent'], data['text_on_accent'])
    status = "PASS" if ratio >= 4.5 else "FAIL"
    if status == "FAIL":
        all_pass = False
    print(f"Theme: {theme:10} | Accent: {data['accent']} | Text: {data['text_on_accent']} | Ratio: {ratio:.2f} | {status}")

if not all_pass:
    exit(1)
