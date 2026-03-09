package com.lanfiletransfer.utils;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

public class NetworkUtils {
    
    private static final String TAG = "NetworkUtils";
    
    /**
     * 获取设备IP地址
     */
    public static String getLocalIpAddress() {
        try {
            Enumeration<NetworkInterface> interfaces = 
                NetworkInterface.getNetworkInterfaces();
            
            while (interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                
                // 跳过回环接口和未启用的接口
                if (networkInterface.isLoopback() || !networkInterface.isUp()) {
                    continue;
                }
                
                Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    
                    // 只处理IPv4地址
                    if (address instanceof Inet4Address) {
                        String ip = address.getHostAddress();
                        // 跳过127.0.0.1等回环地址
                        if (!ip.startsWith("127.")) {
                            Log.d(TAG, "找到IP地址: " + ip);
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "获取IP地址失败", e);
        }
        
        return null;
    }
    
    /**
     * 通过WifiManager获取IP地址（热点模式下）
     */
    public static String getHotspotIpAddress(Context context) {
        try {
            WifiManager wifiManager = (WifiManager) 
                context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            
            if (wifiManager != null) {
                WifiInfo wifiInfo = wifiManager.getConnectionInfo();
                int ipAddress = wifiInfo.getIpAddress();
                
                if (ipAddress != 0) {
                    return formatIpAddress(ipAddress);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "获取热点IP失败", e);
        }
        
        // 热点的默认IP通常是 192.168.43.1
        return "192.168.43.1";
    }
    
    /**
     * 格式化IP地址
     */
    private static String formatIpAddress(int ipAddress) {
        return String.format("%d.%d.%d.%d",
            (ipAddress & 0xff),
            (ipAddress >> 8 & 0xff),
            (ipAddress >> 16 & 0xff),
            (ipAddress >> 24 & 0xff));
    }
}
