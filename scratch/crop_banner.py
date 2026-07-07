from PIL import Image

img = Image.open('C:/Users/Omkar Ahirrao/.gemini/antigravity-ide/brain/e6f09f65-c7d9-4735-b6b1-53b3580bb37c/media__1783275161767.png')

# The card starts around x=144, but let's detect the exact left and right boundaries of the blue rows
width, height = img.size
min_x = width
max_x = 0

for y in range(544, 677):
    for x in range(width):
        r, g, b, *a = img.getpixel((x, y))
        if b > 50 and b > r * 1.3 and b > g * 1.3:
            if x < min_x:
                min_x = x
            if x > max_x:
                max_x = x

print(f"Card horizontally bounds: x={min_x} to x={max_x}")

# Let's crop the entire banner card
banner_card = img.crop((min_x, 544, max_x, 676))
banner_card.save('public/match-jerseys-banner.png')
print("Saved entire banner card to public/match-jerseys-banner.png")

# Now let's crop just the jerseys from the right side.
# Let's crop from the center of the banner to the right edge.
# The banner width is max_x - min_x = 566 - 145 = 421.
# Let's crop the right 45% of the banner card.
center_x = min_x + int((max_x - min_x) * 0.55)
jerseys = img.crop((center_x, 544, max_x, 676))
jerseys.save('public/match-jerseys.png')
print("Saved cropped jerseys to public/match-jerseys.png")
