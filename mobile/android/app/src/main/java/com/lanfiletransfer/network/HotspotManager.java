package com.lanfiletransfer.network;

import android.content.Context;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.lang.reflect.Method;

public class HotspotManager {
    
    private static final String TAG = "HotspotManager";
    
    private Context context;
    private WifiManager wifiManager;
    private boolean isHotspotEnabled = false;
    private WifiManager.LocalOnlyHotspotReservation hotspotReservation;
    
    public HotspotManager(Context context) {
        this.context = context;
        this.wifiManager = (WifiManager) 
            context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    }
    
    /**
     * 创建Wifi热点（虚拟WiFi，不需要网络）
     */
    public boolean createHotspot(String ssid, String password) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8.0+ 使用 LocalOnlyHotspot（不需要网络）
                return createLocalOnlyHotspot();
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
     * Android 8.0+ 创建本地热点（不需要网络）
     */
    private boolean createLocalOnlyHotspot() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                wifiManager.startLocalOnlyHotspot(new WifiManager.LocalOnlyHotspotCallback() {
                    @Override
                    public void onStarted(WifiManager.LocalOnlyHotspotReservation reservation) {
                        super.onStarted(reservation);
                        hotspotReservation = reservation;
                        isHotspotEnabled = true;
                        
                        WifiConfiguration config = reservation.getWifiConfiguration();
                        Log.d(TAG, "本地热点已创建");
                        Log.d(TAG, "SSID: " + config.SSID);
                        Log.d(TAG, "密码: " + config.preSharedKey);
                    }
                    
                    @Override
                    public void onStopped() {
                        super.onStopped();
                        isHotspotEnabled = false;
                        Log.d(TAG, "本地热点已停止");
                    }
                    
                    @Override
                    public void onFailed(int reason) {
                        super.onFailed(reason);
                        isHotspotEnabled = false;
                        Log.e(TAG, "本地热点创建失败: " + reason);
                    }
                }, new Handler(Looper.getMainLooper()));
                
                return true;
            } catch (Exception e) {
                Log.e(TAG, "LocalOnlyHotspot失败", e);
                return false;
            }
        }
        return false;
    }
    
    /**
     * 旧版本创建热点（反射）
     */
    private boolean createHotspotLegacy(String ssid, String password) {
        try {
            // 先关闭Wifi（如果开启）
            // 注意：创建热点时WiFi会自动关闭
            
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && hotspotReservation != null) {
                hotspotReservation.close();
                hotspotReservation = null;
                isHotspotEnabled = false;
                return true;
            } else {
                Method method = wifiManager.getClass().getMethod(
                    "setWifiApEnabled", WifiConfiguration.class, boolean.class);
                Boolean result = (Boolean) method.invoke(wifiManager, null, false);
                
                if (result != null && result) {
                    isHotspotEnabled = false;
                    Log.d(TAG, "热点已关闭");
                }
                
                return result != null && result;
            }
        } catch (Exception e) {
            Log.e(TAG, "关闭热点失败", e);
            return false;
        }
    }
    
    /**
     * 检查热点状态
     */
    public boolean isHotspotEnabled() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return hotspotReservation != null && isHotspotEnabled;
        }
        
        try {
            Method method = wifiManager.getClass().getMethod("isWifiApEnabled");
            Boolean result = (Boolean) method.invoke(wifiManager);
            return result != null && result;
        } catch (Exception e) {
            return isHotspotEnabled;
        }
    }
    
    /**
     * 获取热点配置（Android 8.0+）
     */
    public WifiConfiguration getHotspotConfiguration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && hotspotReservation != null) {
            return hotspotReservation.getWifiConfiguration();
        }
        return null;
    }
}