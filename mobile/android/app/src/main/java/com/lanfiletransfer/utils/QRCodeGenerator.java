package com.lanfiletransfer.utils;

import android.graphics.Bitmap;
import android.util.Log;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.QRCodeWriter;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class QRCodeGenerator {
    
    private static final String TAG = "QRCodeGenerator";
    
    /**
     * 生成二维码
     * @param data 二维码数据
     * @param width 宽度
     * @param height 高度
     * @return Bitmap
     */
    public static Bitmap generateQRCode(String data, int width, int height) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);
            
            com.google.zxing.common.BitMatrix bitMatrix = 
                writer.encode(data, BarcodeFormat.QR_CODE, width, height, hints);
            
            int[] pixels = new int[width * height];
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    pixels[y * width + x] = 
                        bitMatrix.get(x, y) ? 0xFF000000 : 0xFFFFFFFF;
                }
            }
            
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            bitmap.setPixels(pixels, 0, width, 0, 0, width, height);
            return bitmap;
            
        } catch (WriterException e) {
            Log.e(TAG, "生成二维码失败", e);
            return null;
        }
    }
    
    /**
     * 生成连接信息JSON
     */
    public static String generateConnectionData(String ipAddress, String code, String deviceName) {
        try {
            JSONObject json = new JSONObject();
            json.put("ip", ipAddress);
            json.put("code", code);
            json.put("device", deviceName);
            json.put("type", "lan_file_transfer");
            return json.toString();
        } catch (Exception e) {
            Log.e(TAG, "生成连接数据失败", e);
            return "";
        }
    }
}
