package com.lanfiletransfer.utils;

import java.util.Random;

public class CodeGenerator {
    
    private static final Random random = new Random();
    
    /**
     * 生成4位数字连接码
     */
    public static String generateConnectionCode() {
        int code = 1000 + random.nextInt(9000); // 1000-9999
        return String.valueOf(code);
    }
    
    /**
     * 验证连接码格式
     */
    public static boolean isValidCode(String code) {
        if (code == null || code.length() != 4) {
            return false;
        }
        try {
            Integer.parseInt(code);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
