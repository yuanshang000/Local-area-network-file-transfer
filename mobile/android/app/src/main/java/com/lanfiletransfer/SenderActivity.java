package com.lanfiletransfer;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import com.lanfiletransfer.network.SocketManager;
import com.lanfiletransfer.utils.NetworkUtils;

import org.json.JSONObject;

public class SenderActivity extends AppCompatActivity implements SocketManager.SocketListener {

    private static final int PORT = 3000;
    private static final int FILE_PICK_REQUEST_CODE = 2001;
    private static final int CAMERA_PERMISSION_REQUEST = 3001;

    // UI Components
    private LinearLayout selectFileLayout;
    private LinearLayout connectLayout;
    private LinearLayout transferLayout;
    private Button selectFileButton;
    private TextView selectedFileText;
    private Button nextButton;
    private TextView hintText;
    private Button scanQRButton;
    private Button inputCodeButton;
    private Button bluetoothButton;
    private TextView fileNameText;
    private ProgressBar progressBar;
    private TextView progressText;

    // Managers
    private SocketManager socketManager;
    private BluetoothAdapter bluetoothAdapter;

    // State
    private Uri selectedFileUri;
    private String selectedFileName;
    private boolean isConnected = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sender);

        initViews();
        initManagers();
    }

    private void initViews() {
        selectFileLayout = findViewById(R.id.selectFileLayout);
        connectLayout = findViewById(R.id.connectLayout);
        transferLayout = findViewById(R.id.transferLayout);
        
        selectFileButton = findViewById(R.id.selectFileButton);
        selectedFileText = findViewById(R.id.selectedFileText);
        nextButton = findViewById(R.id.nextButton);
        
        hintText = findViewById(R.id.hintText);
        scanQRButton = findViewById(R.id.scanQRButton);
        inputCodeButton = findViewById(R.id.inputCodeButton);
        bluetoothButton = findViewById(R.id.bluetoothButton);
        
        fileNameText = findViewById(R.id.fileNameText);
        progressBar = findViewById(R.id.progressBar);
        progressText = findViewById(R.id.progressText);

        selectFileButton.setOnClickListener(v -> selectFile());
        nextButton.setOnClickListener(v -> showConnectOptions());
        
        scanQRButton.setOnClickListener(v -> checkCameraPermissionAndScan());
        inputCodeButton.setOnClickListener(v -> showCodeInputDialog());
        bluetoothButton.setOnClickListener(v -> discoverBluetoothDevices());
    }

    private void initManagers() {
        socketManager = new SocketManager();
        socketManager.setListener(this);
        
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    /**
     * 选择文件
     */
    private void selectFile() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, "选择要发送的文件"), FILE_PICK_REQUEST_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_PICK_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            selectedFileUri = data.getData();
            if (selectedFileUri != null) {
                selectedFileName = getFileName(selectedFileUri);
                selectedFileText.setText("已选择: " + selectedFileName);
                nextButton.setEnabled(true);
            }
        } else {
            // QR code scan result
            IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
            if (result != null && result.getContents() != null) {
                handleQRCode(result.getContents());
            }
        }
    }

    /**
     * 获取文件名
     */
    private String getFileName(Uri uri) {
        String fileName = "未知文件";
        android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null);
        if (cursor != null && cursor.moveToFirst()) {
            int nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
            if (nameIndex >= 0) {
                fileName = cursor.getString(nameIndex);
            }
            cursor.close();
        }
        return fileName;
    }

    /**
     * 显示连接选项
     */
    private void showConnectOptions() {
        selectFileLayout.setVisibility(View.GONE);
        connectLayout.setVisibility(View.VISIBLE);
    }

    /**
     * 检查相机权限并扫描
     */
    private void checkCameraPermissionAndScan() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, 
                new String[]{Manifest.permission.CAMERA}, 
                CAMERA_PERMISSION_REQUEST);
        } else {
            startQRScan();
        }
    }

    /**
     * 开始二维码扫描
     */
    private void startQRScan() {
        IntentIntegrator integrator = new IntentIntegrator(this);
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE);
        integrator.setPrompt("扫描接收方的二维码");
        integrator.setCameraId(0);
        integrator.setBeepEnabled(true);
        integrator.setOrientationLocked(false);
        integrator.initiateScan();
    }

    /**
     * 处理二维码内容
     */
    private void handleQRCode(String qrData) {
        try {
            JSONObject json = new JSONObject(qrData);
            String ip = json.getString("ip");
            String code = json.getString("code");
            
            connectToServer(ip, code);
            
        } catch (Exception e) {
            Toast.makeText(this, "无效的二维码", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * 显示数字码输入对话框
     */
    private void showCodeInputDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("输入4位匹配码");
        
        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_NUMBER);
        input.setHint("请输入接收方显示的4位数字");
        builder.setView(input);
        
        builder.setPositiveButton("连接", (dialog, which) -> {
            String code = input.getText().toString().trim();
            if (code.length() == 4) {
                // 热点IP通常是 192.168.43.1
                String ip = NetworkUtils.getHotspotIpAddress(this);
                if (ip == null) ip = "192.168.43.1";
                connectToServer(ip, code);
            } else {
                Toast.makeText(this, "请输入4位数字", Toast.LENGTH_SHORT).show();
            }
        });
        
        builder.setNegativeButton("取消", null);
        builder.show();
    }

    /**
     * 蓝牙发现设备
     */
    private void discoverBluetoothDevices() {
        if (bluetoothAdapter == null) {
            Toast.makeText(this, "设备不支持蓝牙", Toast.LENGTH_SHORT).show();
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) 
                == PackageManager.PERMISSION_GRANTED) {
                startActivity(enableBtIntent);
            }
            return;
        }

        // 启动蓝牙扫描
        Toast.makeText(this, "正在搜索附近设备...", Toast.LENGTH_SHORT).show();
        
        com.lanfiletransfer.network.BluetoothManager btManager = 
            new com.lanfiletransfer.network.BluetoothManager(this);
        
        btManager.setDiscoveryListener(new com.lanfiletransfer.network.BluetoothManager.DeviceDiscoveryListener() {
            @Override
            public void onDeviceFound(String code, String deviceName, String hotspotInfo) {
                runOnUiThread(() -> {
                    // 显示发现的设备
                    showBluetoothDeviceDialog(code, deviceName, hotspotInfo);
                });
            }

            @Override
            public void onScanFailed(int errorCode) {
                runOnUiThread(() -> 
                    Toast.makeText(SenderActivity.this, "蓝牙扫描失败: " + errorCode, Toast.LENGTH_SHORT).show());
            }
        });
        
        btManager.startScanning();
        
        // 5秒后停止扫描
        new android.os.Handler().postDelayed(() -> {
            btManager.stopScanning();
        }, 5000);
    }

    /**
     * 显示蓝牙发现的设备对话框
     */
    private void showBluetoothDeviceDialog(String code, String deviceName, String hotspotInfo) {
        new AlertDialog.Builder(this)
            .setTitle("发现设备")
            .setMessage(String.format(
                "设备名称: %s\n匹配码: %s\n\n是否连接到此设备？\n\n(将通过WiFi热点进行文件传输)",
                deviceName, code))
            .setPositiveButton("连接", (dialog, which) -> {
                // 连接到设备（通过WiFi热点）
                // 热点信息已通过蓝牙获取
                String ip = "192.168.43.1"; // 热点的默认IP
                connectToServer(ip, code);
            })
            .setNegativeButton("取消", null)
            .show();
    }

    /**
     * 连接到服务器
     */
    private void connectToServer(String serverIp, String code) {
        hintText.setText("正在连接到 " + serverIp + "...");
        socketManager.connect(serverIp, PORT);
        
        new android.os.Handler().postDelayed(() -> {
            if (socketManager.isConnected()) {
                socketManager.connectWithCode(code);
            }
        }, 1000);
    }

    /**
     * 开始传输文件
     */
    private void startTransfer() {
        connectLayout.setVisibility(View.GONE);
        transferLayout.setVisibility(View.VISIBLE);
        
        fileNameText.setText(selectedFileName);
        progressBar.setProgress(0);
        progressText.setText("0%");
        
        socketManager.sendFile(selectedFileUri.getPath(), "receiver");
    }

    // SocketManager.SocketListener 接口实现

    @Override
    public void onConnected() {
        runOnUiThread(() -> {
            isConnected = true;
            hintText.setText("已连接到服务器");
            socketManager.registerDevice("Sender", "mobile");
        });
    }

    @Override
    public void onDisconnected() {
        runOnUiThread(() -> {
            isConnected = false;
            Toast.makeText(this, "连接已断开", Toast.LENGTH_SHORT).show();
        });
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
                hintText.setText("已连接: " + name);
                startTransfer();
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onFileRequest(JSONObject file) {
        // 发送方不需要处理
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
            Toast.makeText(this, "文件传输完成", Toast.LENGTH_LONG).show();
            finish();
        });
    }

    @Override
    public void onCodeGenerated(String code) {
        // 发送方不需要生成
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (socketManager != null) {
            socketManager.disconnect();
        }
    }
}