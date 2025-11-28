from PIL import Image
import os

def split_characters():
    source_path = "img/characters.png"
    output_dir = "img"
    
    # Character names in order
    names = ["kikurage", "eringi", "shiitake", "shimeji", "enoki", "matsutake"]
    
    try:
        img = Image.open(source_path)
        width, height = img.size
        
        # Assuming 6 characters equally spaced horizontally
        char_width = width // 6
        
        print(f"Image size: {width}x{height}")
        print(f"Character width: {char_width}")
        
        for i, name in enumerate(names):
            # Crop: left, top, right, bottom
            left = i * char_width
            right = left + char_width
            box = (left, 0, right, height)
            
            char_img = img.crop(box)
            
            # Save as PNG with transparency (assuming source has it or we keep it)
            output_path = os.path.join(output_dir, f"{name}.png")
            char_img.save(output_path)
            print(f"Saved {output_path}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    split_characters()
