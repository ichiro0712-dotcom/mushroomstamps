from PIL import Image, ImageDraw
import os

img_dir = '/Users/kawashimaichirou/Desktop/バイブコーディング/mushroomstamps/img'
files = [f for f in os.listdir(img_dir) if f.endswith('_ball.png')]

# Create a circular mask
mask = Image.new('L', (1024, 1024), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse((10, 10, 1014, 1014), fill=255) # Slightly smaller than full 1024 to crop edges

for f in files:
    path = os.path.join(img_dir, f)
    try:
        img = Image.open(path).convert("RGBA")
        
        # Apply mask
        img.putalpha(mask)
        
        # Save back
        img.save(path)
        print(f"Processed {f}")
            
    except Exception as e:
        print(f"Error processing {f}: {e}")
