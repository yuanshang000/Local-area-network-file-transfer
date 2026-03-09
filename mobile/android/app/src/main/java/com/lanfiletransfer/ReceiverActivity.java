package com.lanfiletransfer;

import android.net.wifi.WifiConfiguration;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.lanfiletransfer.network.BluetoothManager;
import com.lanfiletransfer.network.HotspotManager;
import com.lanfiletransfer.network.SocketManager;
import com.lanfiletransfer.utils.CodeGenerator;
import com.lanfiletransfer.utils.NetworkUtils;
import com.lanfiletransfer.utils.QRCodeGenerator;

import org.json.JSONObject;

public class ReceiverActivity extends AppCompatActivity implements SocketManager.SocketListener {

    private static final String TAG = "ReceiverActivity";
    private static final int PORT = 3000;
    private static final int HOTSPOT_CHECK_DELAY = 2000; // 2秒后检查热点状态

    // UI Components
    private TextView hotspotStatusText;
    private LinearLayout codeLayout;
    private TextView connectionCodeText;
    private LinearLayout qrLayout;
    private ImageView qrCodeImageView;
    private TextView waitingText;
    private LinearLayout transferLayout;
    private TextView fileNameText;
    private ProgressBar progressBar;
    private TextView progressText;

    // Managers
    private HotspotManager hotspotManager;
    private SocketManager socketManager;
    private BluetoothManager bluetoothManager;

    // State
    private String connectionCode;
    private String downloadPath;
    private String hotspotSSID;
    private String hotspotPassword;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_receiver);

        initViews();
        initManagers();
        loadDownloadPath();
        
        // 自动创建热点并显示连接信息
        createHotspotAndShowInfo();
    }

    private void initViews() {
        hotspotStatusText = findViewById(R.id.hotspotStatusText);
        codeLayout = findViewById(R.id.codeLayout);
        connectionCodeText = findViewById(R.id.connectionCodeText);
        qrLayout = findViewById(R.id.qrLayout);
        qrCodeImageView = findViewById(R.id.qrCodeImageView);
        waitingText = findViewById(R.id.waitingText);
        transferLayout = findViewById(R.id.transferLayout);
        fileNameText = findViewById(R.id.fileNameText);
        progressBar = findViewById(R.id.progressBar);
        progressText = findViewById(R.id.progressText);
    }

    private void initManagers() {
        hotspotManager = new HotspotManager(this);
        socketManager = new SocketManager();
        socketManager.setListener(this);
    }

    /**
     * 加载下载路径
     */
    private void loadDownloadPath() {
        android.content.SharedPreferences prefs = 
            getSharedPreferences("Settings", MODE_PRIVATE);
        downloadPath = prefs.getString("download_path", 
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath());
    }

    /**
     * 创建热点并显示连接信息
     */
    private void createHotspotAndShowInfo() {
        // 生成连接码
        connectionCode = CodeGenerator.generateConnectionCode();
        
        hotspotStatusText.setText("正在创建虚拟WiFi热点...");

        boolean success = hotspotManager.createHotspot("LAN-Transfer", "12345678");
        
        if (success) {
            // Android 8.0+ 使用 LocalOnlyHotspot，需要等待回调
            // 延迟检查热点配置
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                updateHotspotInfo();
            }, HOTSPOT_CHECK_DELAY);
        } else {
            // 创建失败或旧版本，显示默认信息
            updateHotspotInfoLegacy();
        }
    }

    /**
     * 更新热点信息（Android 8.0+）
     */
    private void updateHotspotInfo() {
        WifiConfiguration config = hotspotManager.getHotspotConfiguration();
        
        if (config != null) {
            hotspotSSID = config.SSID;
            hotspotPassword = config.preSharedKey;
            
            // 移除SSID的引号
            if (hotspotSSID != null && hotspotSSID.startsWith("\"") && hotspotSSID.endsWith("\"")) {
                hotspotSSID = hotspotSSID.substring(1, hotspotSSID.length() - 1);
            }
            
            // 移除密码的引号
            if (hotspotPassword != null && hotspotPassword.startsWith("\"") && hotspotPassword.endsWith("\"")) {
                hotspotPassword = hotspotPassword.substring(1, hotspotPassword.length() - 1);
            }
        } else {
            hotspotSSID = "LAN-Transfer";
            hotspotPassword = "12345678";
        }
        
        showConnectionInfo();
    }

    /**
     * 更新热点信息（旧版本）
     */
    private void updateHotspotInfoLegacy() {
        hotspotSSID = "LAN-Transfer";
        hotspotPassword = "12345678";
        
        showConnectionInfo();
    }

    /**
     * 显示连接信息
     */
    private void showConnectionInfo() {
        // 更新热点状态
        if (hotspotManager.isHotspotEnabled()) {
            hotspotStatusText.setText(String.format(
                "虚拟WiFi热点已创建\n名称: %s\n密码: %s", hotspotSSID, hotspotPassword));
        } else {
            hotspotStatusText.setText(String.format(
                "创建热点失败\n请手动开启热点:\n名称: %s\n密码: %s", hotspotSSID, hotspotPassword));
        }
        
        // 显示连接码
        connectionCodeText.setText(connectionCode);
        codeLayout.setVisibility(View.VISIBLE);
        
        // 生成并显示二维码
        generateQRCode();
        
        // 启动服务器
        startServer();
    }

    /**
     * 生成二维码
     */
    private void generateQRCode() {
        String ip = NetworkUtils.getHotspotIpAddress(this);
        String qrData = QRCodeGenerator.generateConnectionData(ip, connectionCode, "Receiver");
        android.graphics.Bitmap qrBitmap = QRCodeGenerator.generateQRCode(qrData, 200, 200);
        
        if (qrBitmap != null) {
            qrCodeImageView.setImageBitmap(qrBitmap);
            qrLayout.setVisibility(View.VISIBLE);
        }
    }

    /**
     * 启动服务器
     */
    private void startServer() {
        String ip = NetworkUtils.getHotspotIpAddress(this);
        if (ip == null) ip = "192.168.43.1";
        socketManager.connect(ip, PORT);
        
        // 启动蓝牙广播匹配码
        startBluetoothAdvertising();
        
        waitingText.setText("等待发送方连接...");
    }
    
    /**
     * 启动蓝牙广播
     */
    private void startBluetoothAdvertising() {
        bluetoothManager = new BluetoothManager(this);
        
        if (bluetoothManager.isBluetoothAvailable()) {
            boolean success = bluetoothManager.startAdvertising(
                connectionCode, 
                hotspotSSID != null ? hotspotSSID : "LAN-Transfer", 
                hotspotPassword != null ? hotspotPassword : "12345678"
            );
            
            if (success) {
                Log.d(TAG, "蓝牙广播已启动: " + connectionCode);
            } else {
                Log.e(TAG, "蓝牙广播启动失败");
            }
        } else {
            Log.w(TAG, "蓝牙不可用，跳过广播");
        }
    }

    // SocketManager.SocketListener 接口实现

    @Override
    public void onConnected() {
        runOnUiThread(() -> {
            waitingText.setText("已连接到服务器");
            socketManager.registerDevice("Receiver", "mobile");
        });
    }

    @Override
    public void onDisconnected() {
        runOnUiThread(() -> 
            Toast.makeText(this, "连接已断开", Toast.LENGTH_SHORT).show());
    }

    @Override
    public void onConnectionFailed(String error) {
        runOnUiThread(() -> 
            Toast.makeText(this, "连接失败: " + error, Toast.LENGTH_SHORT).show());
    }

    @Override
    public void onDeviceFound(JSONObject device) {
        runOnUiThread(() -> {
            try {
                String name = device.getString("name");
                waitingText.setText("已连接: " + name);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onFileRequest(JSONObject file) {
        runOnUiThread(() -> {
            try {
                String fileName = file.getString("name");
                long fileSize = file.getLong("size");
                
                hotspotStatusText.setVisibility(View.GONE);
                codeLayout.setVisibility(View.GONE);
                qrLayout.setVisibility(View.GONE);
                waitingText.setVisibility(View.GONE);
                transferLayout.setVisibility(View.VISIBLE);
                
                fileNameText.setText(fileName + " (" + formatFileSize(fileSize) + ")");
                progressBar.setProgress(0);
                progressText.setText("准备接收...");
                
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onFileProgress(JSONObject progress) {
        runOnUiThread(() -> {
            try {
                int percent = progress.getInt("percent");
                progressBar.setProgress(percent);
                progressText.setText(percent + "%");
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onFileComplete(JSONObject result) {
        runOnUiThread(() -> {
            progressText.setText("接收完成");
            Toast.makeText(this, "文件已保存到: " + downloadPath, Toast.LENGTH_LONG).show();
            new Handler(Looper.getMainLooper()).postDelayed(() -> finish(), 2000);
        });
    }

    @Override
    public void onCodeGenerated(String code) {
        // 已在本地生成
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp-1) + "B";
        return String.format("%.1f %s", bytes / Math.pow(1024, exp), pre);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (socketManager != null) {
            socketManager.disconnect();
        }
        if (bluetoothManager != null) {
            bluetoothManager.cleanup();
        }
        if (hotspotManager != null && hotspotManager.isHotspotEnabled()) {
            hotspotManager.disableHotspot();
        }
    }
}