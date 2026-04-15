from PIL import Image
import os

def crop_transparency(input_path, output_path):
    img = Image.open(input_path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Get the bounding box of the non-transparent part
    bbox = img.getbbox()
    if bbox:
        # Crop to the bounding box
        img_cropped = img.crop(bbox)
        
        # We want to keep it square, so let's find the larger dimension
        width, height = img_cropped.size
        new_size = max(width, height)
        
        # Create a new square image with transparency
        new_img = Image.new('RGBA', (new_size, new_size), (0, 0, 0, 0))
        
        # Paste the cropped image into the center
        paste_x = (new_size - width) // 2
        paste_y = (new_size - height) // 2
        new_img.paste(img_cropped, (paste_x, paste_y))
        
        # Resize to 1024x1024 to maintain standard
        new_img = new_img.resize((1024, 1024), Image.Resampling.LANCZOS)
        
        new_img.save(output_path)
        print(f"Image cropped and saved to {output_path}")
    else:
        print("Image is entirely transparent.")

if __name__ == "__main__":
    crop_transparency('schro-icon-v2.png', 'schro-icon-v2-cropped.png')
