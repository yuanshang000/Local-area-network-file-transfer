package com.lanfiletransfer.network;

import android.content.Context;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Log;

import java.lang.reflect.Method;

public class HotspotManager {
    
    private static final String TAG = "HotspotManager";
    
    private Context context;
    private WifiManager wifiManager;
    private boolean isHotspotEnabled = false;
    
    public HotspotManager(Context context) {
        this.context = context;
        this.wifiManager = (WifiManager) 
            context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    }
    
    /**
     * 创建Wifi热点
     */
    public boolean createHotspot(String ssid, String password) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8.0+ 使用新的API
                return createHotspotOreo(ssid, password);
            } else {
                // 旧版本使用反射
                return createHotspotLegacy(ssid, password);
            }
        } catch (Exception e) {
            Log.e(TAG, "创建热点失败", e);
            return false;
        }
    }
    
    /**
     * Android 8.0+ 创建热点
     */
    private boolean createHotspotOreo(String ssid, String password) {
        try {
            // Android 8.0+ 需要使用 WifiManager.LocalOnlyHotspot
            // 这需要特殊的权限和回调
            Log.d(TAG, "Android Oreo+ hotspot creation");
            
            // 简化实现：提示用户手动开启热点
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Oreo hotspot failed", e);
            return false;
        }
    }
    
    /**
     * 旧版本创建热点（反射）
     */
    private boolean createHotspotLegacy(String ssid, String password) {
        try {
            // 先关闭Wifi
            if (wifiManager.isWifiEnabled()) {
                wifiManager.setWifiEnabled(false);
            }
            
            WifiConfiguration config = new WifiConfiguration();
            config.SSID = ssid;
            config.preSharedKey = password;
            config.hiddenSSID = false;
            config.allowedAuthAlgorithms.set(WifiConfiguration.AuthAlgorithm.OPEN);
            config.allowedProtocols.set(WifiConfiguration.Protocol.RSN);
            config.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK);
            config.allowedPairwiseCiphers.set(WifiConfiguration.PairwiseCipher.CCMP);
            config.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.CCMP);
            
            Method method = wifiManager.getClass().getMethod(
                "setWifiApEnabled", WifiConfiguration.class, boolean.class);
            Boolean result = (Boolean) method.invoke(wifiManager, config, true);
            
            if (result != null && result) {
                isHotspotEnabled = true;
                Log.d(TAG, "热点创建成功: " + ssid);
            }
            
            return result != null && result;
            
        } catch (Exception e) {
            Log.e(TAG, "Legacy hotspot failed", e);
            return false;
        }
    }
    
    /**
     * 关闭热点
     */
    public boolean disableHotspot() {
        try {
            Method method = wifiManager.getClass().getMethod(
                "setWifiApEnabled", WifiConfiguration.class, boolean.class);
            Boolean result = (Boolean) method.invoke(wifiManager, null, false);
            
            if (result != null && result) {
                isHotspotEnabled = false;
                Log.d(TAG, "热点已关闭");
            }
            
            return result != null && result;
            
        } catch (Exception e) {
            Log.e(TAG, "关闭热点失败", e);
            return false;
        }
    }
    
    /**
     * 检查热点状态
     */
    public boolean isHotspotEnabled() {
        try {
            Method method = wifiManager.getClass().getMethod("isWifiApEnabled");
            Boolean result = (Boolean) method.invoke(wifiManager);
            return result != null && result;
        } catch (Exception e) {
            return isHotspotEnabled;
        }
    }
}
