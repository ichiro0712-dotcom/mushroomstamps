from PIL import Image
import os

img_dir = '/Users/kawashimaichirou/Desktop/バイブコーディング/mushroomstamps/img'
files = [f for f in os.listdir(img_dir) if f.endswith('_ball.png')]

for f in files:
    path = os.path.join(img_dir, f)
    try:
        img = Image.open(path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        # Check corners for transparency
        width, height = img.size
        corners = [
            (0, 0),
            (width-1, 0),
            (0, height-1),
            (width-1, height-1)
        ]
        
        print(f"Checking {f} ({width}x{height}):")
        is_transparent = False
        for x, y in corners:
            pixel = img.getpixel((x, y))
            print(f"  Corner ({x}, {y}): {pixel}")
            if pixel[3] == 0:
                is_transparent = True
        
        if not is_transparent:
            print(f"  WARNING: {f} might not be transparent at corners.")
            
    except Exception as e:
        print(f"Error checking {f}: {e}")
