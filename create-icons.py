#!/usr/bin/env python3
"""Simple script to create proper PNG icon files"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_receipt_icon(size):
    # Create a new image with dark background
    img = Image.new('RGBA', (size, size), (26, 26, 30, 255))
    draw = ImageDraw.Draw(img)
    
    # Scale values based on size
    scale = size / 192
    
    # Draw receipt paper
    paper_margin = int(24 * scale)
    paper_width = size - 2 * paper_margin
    paper_height = int(paper_width * 1.2)  # Receipt aspect ratio
    paper_y = (size - paper_height) // 2
    
    # White receipt background
    draw.rectangle([paper_margin, paper_y, paper_margin + paper_width, paper_y + paper_height], 
                   fill=(255, 255, 255, 255), outline=(200, 200, 200, 255))
    
    # Receipt lines
    line_spacing = int(16 * scale)
    line_margin = int(12 * scale)
    line_start = paper_y + int(20 * scale)
    
    for i in range(6):
        y = line_start + i * line_spacing
        if y > paper_y + paper_height - int(40 * scale):
            break
        line_width = paper_width - 2 * line_margin
        if i == 4:  # Make last line shorter
            line_width = int(line_width * 0.6)
        draw.rectangle([paper_margin + line_margin, y, 
                       paper_margin + line_margin + line_width, y + int(2 * scale)], 
                      fill=(26, 26, 30, 255))
    
    # Draw scan button
    button_width = int(paper_width * 0.7)
    button_height = int(20 * scale)
    button_x = paper_margin + (paper_width - button_width) // 2
    button_y = paper_y + paper_height - int(35 * scale)
    
    draw.rectangle([button_x, button_y, button_x + button_width, button_y + button_height], 
                   fill=(0, 122, 255, 255), outline=None)
    
    # Add "R" text in center as simple icon
    try:
        font_size = int(48 * scale)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Draw "R" in center
    text = "R"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = (size - text_width) // 2
    text_y = (size - text_height) // 2 - int(10 * scale)
    
    # Add shadow
    draw.text((text_x + 2, text_y + 2), text, fill=(0, 0, 0, 100), font=font)
    draw.text((text_x, text_y), text, fill=(0, 122, 255, 255), font=font)
    
    return img

# Create icons directory if it doesn't exist
os.makedirs('public/icons', exist_ok=True)

# Create 192x192 icon
icon_192 = create_receipt_icon(192)
icon_192.save('public/icons/icon-192.png', 'PNG')

# Create 512x512 icon
icon_512 = create_receipt_icon(512)
icon_512.save('public/icons/icon-512.png', 'PNG')

print("Icons created successfully!")