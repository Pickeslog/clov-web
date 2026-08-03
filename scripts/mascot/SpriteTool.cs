// Sprite measurement / composition helpers backed by System.Drawing (Windows, .NET Framework).
// Kept ASCII-only on purpose: Add-Type writes this to a temp .cs file and non-ASCII comments
// have broken the inline compile in this environment.
//
// No external packages are used. AGENTS.md requires team confirmation before adding one,
// and the logo resize on 2026-08-01 established System.Drawing as the local convention.
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteTool {
    private const int ALPHA_THRESHOLD = 8;

    private static byte[] ReadArgb(Bitmap bmp, out int stride) {
        BitmapData data = bmp.LockBits(new Rectangle(0, 0, bmp.Width, bmp.Height),
            ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        stride = data.Stride;
        byte[] buf = new byte[stride * bmp.Height];
        Marshal.Copy(data.Scan0, buf, 0, buf.Length);
        bmp.UnlockBits(data);
        return buf;
    }

    // { canvasW, canvasH, minX, minY, maxX, maxY, opaquePixelCount }
    // The alpha box is where the character actually is; the canvas is usually larger.
    public static int[] Measure(string path) {
        using (Bitmap bmp = new Bitmap(path)) {
            int w = bmp.Width, h = bmp.Height, stride;
            byte[] buf = ReadArgb(bmp, out stride);

            int minX = w, minY = h, maxX = -1, maxY = -1;
            int area = 0;
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    if (buf[row + x * 4 + 3] > ALPHA_THRESHOLD) {
                        area++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX < 0) return new int[] { w, h, -1, -1, -1, -1, 0 };
            return new int[] { w, h, minX, minY, maxX, maxY, area };
        }
    }

    // Horizontal center of mass of the opaque pixels, in source pixels (-1 if empty).
    // Preferred over the alpha-box center for horizontal alignment: a prop that sticks out
    // on one side (crobi's pencil) drags the box center far more than it drags the mass.
    public static int CentroidX(string path) {
        using (Bitmap bmp = new Bitmap(path)) {
            int w = bmp.Width, h = bmp.Height, stride;
            byte[] buf = ReadArgb(bmp, out stride);
            long sx = 0, n = 0;
            for (int y = 0; y < h; y++) {
                int row = y * stride;
                for (int x = 0; x < w; x++) {
                    if (buf[row + x * 4 + 3] > ALPHA_THRESHOLD) { sx += x; n++; }
                }
            }
            return n == 0 ? -1 : (int)(sx / n);
        }
    }

    // Draws the whole source onto a transparent canvasW x canvasH canvas at `scale`, placing
    // source point (srcAnchorX, srcBaselineY) at canvas point (canvasW * anchorX, baselineY).
    // Anything outside the canvas is clipped -- that is intentional for poses whose art runs
    // off-frame (the string above crobi's `pulled`).
    public static void Compose(string srcPath, string outPath,
                               int canvasW, int canvasH,
                               double scale, double srcAnchorX, double srcBaselineY,
                               double anchorX, double baselineY) {
        using (Bitmap src = new Bitmap(srcPath))
        using (Bitmap dst = new Bitmap(canvasW, canvasH, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(dst)) {
            double dw = src.Width * scale;
            double dh = src.Height * scale;
            double dx = canvasW * anchorX - srcAnchorX * scale;
            double dy = baselineY - srcBaselineY * scale;

            g.Clear(Color.Transparent);
            g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceOver;
            g.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;

            g.DrawImage(src,
                new RectangleF((float)dx, (float)dy, (float)dw, (float)dh),
                new RectangleF(0, 0, src.Width, src.Height),
                GraphicsUnit.Pixel);
            dst.Save(outPath, ImageFormat.Png);
        }
    }
}
