package com.lanfiletransfer;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.lanfiletransfer.network.HotspotManager;
import com.lanfiletransfer.network.SocketManager;
import com.lanfiletransfer.utils.CodeGenerator;
import com.lanfiletransfer.utils.NetworkUtils;
import com.lanfiletransfer.utils.QRCodeGenerator;

import org.json.JSONObject;

public class MainActivity extends AppCompatActivity implements SocketManager.SocketListener {

    private static final String TAG = "MainActivity";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_PICK_REQUEST_CODE = 2001;
    private static final int PORT = 3000;

    // UI Components
    private EditText deviceNameEditText;
    private TextView statusText;
    private Button createHotspotButton;
    private Button connectHotspotButton;
    private Button qrCodeButton;
    private Button codeConnectButton;
    private Button selectFileButton;
    private TextView connectionCodeText;
    private ImageView qrCodeImageView;
    private ProgressBar progressBar;

    // Managers
    private HotspotManager hotspotManager;
    private SocketManager socketManager;

    // State
    private boolean isHost = false;
    private String currentCode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        initManagers();
        checkPermissions();
    }

    private void initViews() {
        deviceNameEditText = findViewById(R.id.deviceNameEditText);
        statusText = findViewById(R.id.statusText);
        createHotspotButton = findViewById(R.id.createHotspotButton);
        connectHotspotButton = findViewById(R.id.connectHotspotButton);
        qrCodeButton = findViewById(R.id.qrCodeButton);
        codeConnectButton = findViewById(R.id.codeConnectButton);
        selectFileButton = findViewById(R.id.selectFileButton);
        connectionCodeText = findViewById(R.id.connectionCodeText);
        qrCodeImageView = findViewById(R.id.qrCodeImageView);
        progressBar = findViewById(R.id.progressBar);

        // 设置设备名称
        deviceNameEditText.setText(Build.MODEL);

        // 按钮点击事件
        createHotspotButton.setOnClickListener(v -> createHotspot());
        connectHotspotButton.setOnClickListener(v -> showConnectDialog());
        qrCodeButton.setOnClickListener(v -> showQRCodeConnection());
        codeConnectButton.setOnClickListener(v -> showCodeConnectionDialog());
        selectFileButton.setOnClickListener(v -> selectFile());
    }

    private void initManagers() {
        hotspotManager = new HotspotManager(this);
        socketManager = new SocketManager();
        socketManager.setListener(this);
    }

    private void checkPermissions() {
        String[] permissions;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions = new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VIDEO,
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.CAMERA
            };
        } else {
            permissions = new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE,
                Manifest.permission.CAMERA
            };
        }

        boolean allGranted = true;
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission) 
                != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }

        if (!allGranted) {
            ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, 
                                          @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            if (!allGranted) {
                Toast.makeText(this, "需要所有权限才能正常运行", Toast.LENGTH_LONG).show();
            }
        }
    }

    /**
     * 创建热点
     */
    private void createHotspot() {
        String ssid = "LAN-Transfer-" + CodeGenerator.generateConnectionCode();
        String password = "12345678";

        boolean success = hotspotManager.createHotspot(ssid, password);
        
        if (success) {
            isHost = true;
            updateStatus("热点已创建: " + ssid);
            updateStatus("密码: " + password);
            
            // 生成连接码
            currentCode = CodeGenerator.generateConnectionCode();
            connectionCodeText.setText(currentCode);
            connectionCodeText.setVisibility(View.VISIBLE);
            
            // 连接到自己的服务器
            String ip = NetworkUtils.getHotspotIpAddress(this);
            socketManager.connect(ip, PORT);
            
            updateButtons(true);
        } else {
            Toast.makeText(this, "创建热点失败，请手动开启热点", Toast.LENGTH_LONG).show();
        }
    }

    /**
     * 显示连接对话框
     */
    private void showConnectDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("连接到热点");
        
        final EditText input = new EditText(this);
        input.setHint("输入IP地址");
        builder.setView(input);
        
        builder.setPositiveButton("连接", (dialog, which) -> {
            String ip = input.getText().toString().trim();
            if (!ip.isEmpty()) {
                connectToServer(ip);
            }
        });
        
        builder.setNegativeButton("取消", null);
        builder.show();
    }

    /**
     * 连接到服务器
     */
    private void connectToServer(String serverIp) {
        updateStatus("正在连接到 " + serverIp + "...");
        socketManager.connect(serverIp, PORT);
    }

    /**
     * 显示二维码连接
     */
    private void showQRCodeConnection() {
        if (!socketManager.isConnected()) {
            Toast.makeText(this, "请先连接到服务器", Toast.LENGTH_SHORT).show();
            return;
        }

        String ip = NetworkUtils.getLocalIpAddress();
        String code = currentCode != null ? currentCode : CodeGenerator.generateConnectionCode();
        String deviceName = deviceNameEditText.getText().toString();

        String qrData = QRCodeGenerator.generateConnectionData(ip, code, deviceName);
        android.graphics.Bitmap qrBitmap = QRCodeGenerator.generateQRCode(qrData, 256, 256);

        if (qrBitmap != null) {
            qrCodeImageView.setImageBitmap(qrBitmap);
            qrCodeImageView.setVisibility(View.VISIBLE);
            connectionCodeText.setVisibility(View.GONE);
        } else {
            Toast.makeText(this, "生成二维码失败", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * 显示数字码连接对话框
     */
    private void showCodeConnectionDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("输入连接码");
        
        final EditText input = new EditText(this);
        input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        input.setHint("输入4位数字");
        builder.setView(input);
        
        builder.setPositiveButton("连接", (dialog, which) -> {
            String code = input.getText().toString().trim();
            if (CodeGenerator.isValidCode(code)) {
                socketManager.connectWithCode(code);
            } else {
                Toast.makeText(this, "请输入有效的4位数字码", Toast.LENGTH_SHORT).show();
            }
        });
        
        builder.setNegativeButton("取消", null);
        builder.show();
    }

    /**
     * 选择文件
     */
    private void selectFile() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, "选择文件"), FILE_PICK_REQUEST_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_PICK_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            android.net.Uri uri = data.getData();
            if (uri != null) {
                // TODO: 发送文件
                Toast.makeText(this, "已选择文件: " + uri.getPath(), Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void updateStatus(String status) {
        runOnUiThread(() -> statusText.setText(status));
    }

    private void updateButtons(boolean connected) {
        runOnUiThread(() -> {
            selectFileButton.setEnabled(connected);
        });
    }

    // SocketManager.SocketListener 接口实现

    @Override
    public void onConnected() {
        updateStatus("已连接");
        updateButtons(true);
        
        // 注册设备
        String deviceName = deviceNameEditText.getText().toString();
        socketManager.registerDevice(deviceName, "mobile");
    }

    @Override
    public void onDisconnected() {
        updateStatus("已断开连接");
        updateButtons(false);
    }

    @Override
    public void onConnectionFailed(String error) {
        updateStatus("连接失败: " + error);
        updateButtons(false);
    }

    @Override
    public void onDeviceFound(JSONObject device) {
        try {
            String name = device.getString("name");
            updateStatus("发现设备: " + name);
        } catch (Exception e) {
            Log.e(TAG, "解析设备信息失败", e);
        }
    }

    @Override
    public void onFileRequest(JSONObject file) {
        try {
            String fileName = file.getString("name");
            long fileSize = file.getLong("size");
            
            new AlertDialog.Builder(this)
                .setTitle("接收文件")
                .setMessage("是否接收文件: " + fileName + "\n大小: " + formatFileSize(fileSize))
                .setPositiveButton("接收", (dialog, which) -> {
                    // TODO: 接收文件
                })
                .setNegativeButton("拒绝", null)
                .show();
        } catch (Exception e) {
            Log.e(TAG, "处理文件请求失败", e);
        }
    }

    @Override
    public void onFileProgress(JSONObject progress) {
        try {
            int percent = progress.getInt("percent");
            runOnUiThread(() -> {
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(percent);
            });
        } catch (Exception e) {
            Log.e(TAG, "更新进度失败", e);
        }
    }

    @Override
    public void onFileComplete(JSONObject result) {
        runOnUiThread(() -> {
            progressBar.setVisibility(View.GONE);
            Toast.makeText(this, "文件传输完成", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    public void onCodeGenerated(String code) {
        this.currentCode = code;
        runOnUiThread(() -> {
            connectionCodeText.setText(code);
            connectionCodeText.setVisibility(View.VISIBLE);
        });
    }

    /**
     * 格式化文件大小
     */
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
        if (hotspotManager != null && hotspotManager.isHotspotEnabled()) {
            hotspotManager.disableHotspot();
        }
    }
}
