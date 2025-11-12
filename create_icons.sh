#!/bin/bash
# Script to create placeholder icon files with proper dimensions

# Function to create a colored square PNG using ImageMagick or Python
create_icon() {
    local size=$1
    local file=$2
    
    # Try using ImageMagick if available
    if command -v convert &> /dev/null; then
        convert -size ${size}x${size} xc:'#FF4757' -fill white -pointsize $((size/3)) -gravity center -annotate +0+0 '402' "$file"
    # Otherwise use Python with PIL
    elif command -v python3 &> /dev/null; then
        python3 << PYTHON
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    # Create simple colored square without text
    import struct
    size = $size
    # Create minimal PNG manually
    img_data = bytearray()
    for y in range(size):
        img_data.append(0)  # filter type
        for x in range(size):
            img_data.extend([0xFF, 0x47, 0x57, 0xFF])  # RGBA red/orange
    
    import zlib
    compressed = zlib.compress(bytes(img_data))
    
    with open('$file', 'wb') as f:
        # PNG signature
        f.write(b'\x89PNG\r\n\x1a\n')
        # IHDR chunk
        ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
        f.write(struct.pack('>I', 13))
        f.write(b'IHDR')
        f.write(ihdr)
        crc = zlib.crc32(b'IHDR' + ihdr)
        f.write(struct.pack('>I', crc))
        # IDAT chunk
        f.write(struct.pack('>I', len(compressed)))
        f.write(b'IDAT')
        f.write(compressed)
        crc = zlib.crc32(b'IDAT' + compressed)
        f.write(struct.pack('>I', crc))
        # IEND chunk
        f.write(struct.pack('>I', 0))
        f.write(b'IEND')
        f.write(struct.pack('>I', 0xAE426082))
    exit(0)

# If PIL is available, create nicer icon with text
size = $size
img = Image.new('RGBA', (size, size), '#FF4757')
draw = ImageDraw.Draw(img)
try:
    font_size = size // 3
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', font_size)
except:
    font = ImageFont.load_default()
text = '402'
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
position = ((size - text_width) // 2, (size - text_height) // 2)
draw.text(position, text, fill='white', font=font)
img.save('$file')
PYTHON
    else
        echo "Error: Neither ImageMagick nor Python3 found. Cannot create icons."
        exit 1
    fi
}

echo "Creating icon files..."
create_icon 16 icon16.png
create_icon 48 icon48.png
create_icon 128 icon128.png

echo "Icon files created successfully"
ls -lh icon*.png
