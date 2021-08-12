from PIL import Image, ImageDraw
import numpy as np

if __name__ == "__main__":
    im = Image.open("colormaps/test.png")
    a = np.asarray(im).copy()
    print(a)
    for i in range(180):
        if i < 60:
            a[0][i] = [0, 255, 0, 255]
        elif i < 120:
            a[0][i] = [0, 0, 255, 255]
        else:
            a[0][i] = [255, 0, 0, 255]
    im2 = Image.fromarray(a)
    im2.save("colormaps/rgb.png")
    im2.show()
