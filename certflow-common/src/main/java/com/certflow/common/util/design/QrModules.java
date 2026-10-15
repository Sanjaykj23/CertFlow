package com.certflow.common.util.design;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.EncodeHintType;
import com.google.zxing.LuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

/**
 * The renderer receives the QR code as a PNG. To draw it as vector modules in the element's own
 * colours, decode the PNG back to its text and re-encode it without any quiet zone.
 */
final class QrModules {
    private static final Logger log = LoggerFactory.getLogger(QrModules.class);

    private QrModules() {}

    /** Returns [row][col] dark-module flags with no quiet zone, or null if the PNG could not be decoded. */
    static boolean[][] fromPng(byte[] png) {
        if (png == null || png.length == 0) {
            return null;
        }
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(png));
            if (img == null) {
                return null;
            }
            LuminanceSource source = new BufferedImageLuminanceSource(img);
            BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));
            Map<DecodeHintType, Object> decodeHints = new EnumMap<DecodeHintType, Object>(DecodeHintType.class);
            decodeHints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
            Result decoded = new QRCodeReader().decode(bitmap, decodeHints);
            String text = decoded.getText();

            Map<EncodeHintType, Object> hints = new EnumMap<EncodeHintType, Object>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.MARGIN, 0);
            // Requested size 1x1 is smaller than the symbol, so ZXing returns the bare module matrix.
            BitMatrix matrix = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 1, 1, hints);
            int w = matrix.getWidth();
            int h = matrix.getHeight();
            boolean[][] out = new boolean[h][w];
            for (int r = 0; r < h; r++) {
                for (int c = 0; c < w; c++) {
                    out[r][c] = matrix.get(c, r);
                }
            }
            return out;
        } catch (Exception ex) {
            log.warn("Could not extract QR modules from PNG, falling back to the bitmap: {}", ex.toString());
            return null;
        }
    }
}
