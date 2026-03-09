package com.lanfiletransfer.network;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.ParcelUuid;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class BluetoothManager {

    private static final String TAG = "BluetoothManager";
    private static final UUID SERVICE_UUID = UUID.fromString("0000FFF0-0000-1000-8000-00805F9B34FB");

    private Context context;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothLeScanner scanner;

    private AdvertiseCallback advertiseCallback;
    private ScanCallback scanCallback;

    private DeviceDiscoveryListener discoveryListener;

    public interface DeviceDiscoveryListener {
        void onDeviceFound(String code, String deviceName, String address);
        void onScanFailed(int errorCode);
    }

    public BluetoothManager(Context context) {
        this.context = context;
        
        BluetoothManager bluetoothManager = (BluetoothManager) 
            context.getSystemService(Context.BLUETOOTH_SERVICE);
        
        if (bluetoothManager != null) {
            bluetoothAdapter = bluetoothManager.getAdapter();
            if (bluetoothAdapter != null) {
                advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
                scanner = bluetoothAdapter.getBluetoothLeScanner();
            }
        }
    }

    public void setDiscoveryListener(DeviceDiscoveryListener listener) {
        this.discoveryListener = listener;
    }

    /**
     * 检查蓝牙是否可用
     */
    public boolean isBluetoothAvailable() {
        return bluetoothAdapter != null && bluetoothAdapter.isEnabled();
    }

    /**
     * 接收方：广播匹配码和热点信息
     */
    public boolean startAdvertising(String code, String ssid, String password) {
        if (advertiser == null) {
            Log.e(TAG, "设备不支持BLE广播");
            return false;
        }

        if (ActivityCompat.checkSelfPermission(context, 
            Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "缺少蓝牙广播权限");
            return false;
        }

        try {
            // 广播设置
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .build();

            // 广播数据：包含匹配码和热点信息
            JSONObject jsonData = new JSONObject();
            jsonData.put("code", code);
            jsonData.put("ssid", ssid);
            jsonData.put("pwd", password);
            jsonData.put("type", "lan_transfer");
            
            String dataStr = jsonData.toString();
            byte[] data = dataStr.getBytes(StandardCharsets.UTF_8);

            AdvertiseData advertiseData = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(new ParcelUuid(SERVICE_UUID))
                .addServiceData(new ParcelUuid(SERVICE_UUID), data)
                .build();

            advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    Log.d(TAG, "蓝牙广播已启动: " + code);
                }

                @Override
                public void onStartFailure(int errorCode) {
                    Log.e(TAG, "蓝牙广播启动失败: " + errorCode);
                }
            };

            advertiser.startAdvertising(settings, advertiseData, advertiseCallback);
            return true;

        } catch (Exception e) {
            Log.e(TAG, "启动蓝牙广播失败", e);
            return false;
        }
    }

    /**
     * 发送方：扫描附近的设备
     */
    public boolean startScanning() {
        if (scanner == null) {
            Log.e(TAG, "设备不支持BLE扫描");
            return false;
        }

        if (ActivityCompat.checkSelfPermission(context, 
            Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "缺少蓝牙扫描权限");
            return false;
        }

        try {
            ScanSettings settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build();

            scanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    super.onScanResult(callbackType, result);
                    handleScanResult(result);
                }

                @Override
                public void onBatchScanResults(List<ScanResult> results) {
                    super.onBatchScanResults(results);
                    for (ScanResult result : results) {
                        handleScanResult(result);
                    }
                }

                @Override
                public void onScanFailed(int errorCode) {
                    super.onScanFailed(errorCode);
                    if (discoveryListener != null) {
                        discoveryListener.onScanFailed(errorCode);
                    }
                }
            };

            scanner.startScan(null, settings, scanCallback);
            Log.d(TAG, "开始扫描蓝牙设备");
            return true;

        } catch (Exception e) {
            Log.e(TAG, "启动蓝牙扫描���败", e);
            return false;
        }
    }

    /**
     * 处理扫描结果
     */
    private void handleScanResult(ScanResult result) {
        try {
            // 获取扫描记录
            byte[] scanRecord = result.getScanRecord().getBytes();
            
            // 解析服务数据
            android.bluetooth.le.ScanRecord record = result.getScanRecord();
            if (record == null) return;

            byte[] serviceData = record.getServiceData(new ParcelUuid(SERVICE_UUID));
            if (serviceData == null) return;

            // 解析JSON数据
            String jsonStr = new String(serviceData, StandardCharsets.UTF_8);
            JSONObject jsonData = new JSONObject(jsonStr);

            String type = jsonData.optString("type");
            if (!"lan_transfer".equals(type)) return;

            String code = jsonData.getString("code");
            String ssid = jsonData.getString("ssid");
            String password = jsonData.getString("pwd");
            String deviceName = result.getDevice().getName();

            Log.d(TAG, "发现设备: " + code + " - " + deviceName);

            if (discoveryListener != null) {
                discoveryListener.onDeviceFound(code, deviceName != null ? deviceName : ssid, ssid);
            }

        } catch (Exception e) {
            Log.e(TAG, "解析扫描结果失败", e);
        }
    }

    /**
     * 停止广播
     */
    public void stopAdvertising() {
        if (advertiser != null && advertiseCallback != null) {
            if (ActivityCompat.checkSelfPermission(context, 
                Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED) {
                advertiser.stopAdvertising(advertiseCallback);
            }
            advertiseCallback = null;
        }
    }

    /**
     * 停止扫描
     */
    public void stopScanning() {
        if (scanner != null && scanCallback != null) {
            if (ActivityCompat.checkSelfPermission(context, 
                Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED) {
                scanner.stopScan(scanCallback);
            }
            scanCallback = null;
        }
    }

    /**
     * 清理资源
     */
    public void cleanup() {
        stopAdvertising();
        stopScanning();
    }
}
