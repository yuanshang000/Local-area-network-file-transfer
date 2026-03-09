package com.lanfiletransfer.network;

import android.util.Log;

import org.json.JSONObject;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class SocketManager {
    
    private static final String TAG = "SocketManager";
    
    private Socket socket;
    private SocketListener listener;
    private boolean isConnected = false;
    
    public interface SocketListener {
        void onConnected();
        void onDisconnected();
        void onConnectionFailed(String error);
        void onDeviceFound(JSONObject device);
        void onFileRequest(JSONObject file);
        void onFileProgress(JSONObject progress);
        void onFileComplete(JSONObject result);
        void onCodeGenerated(String code);
    }
    
    public void setListener(SocketListener listener) {
        this.listener = listener;
    }
    
    /**
     * 连接到服务器
     */
    public void connect(String serverIp, int port) {
        try {
            String url = "http://" + serverIp + ":" + port;
            Log.d(TAG, "连接到: " + url);
            
            IO.Options options = new IO.Options();
            options.forceNew = true;
            options.reconnection = true;
            options.timeout = 10000;
            
            socket = IO.socket(url, options);
            
            setupEventListeners();
            socket.connect();
            
        } catch (Exception e) {
            Log.e(TAG, "连接失败", e);
            if (listener != null) {
                listener.onConnectionFailed(e.getMessage());
            }
        }
    }
    
    /**
     * 设置事件监听器
     */
    private void setupEventListeners() {
        socket.on(Socket.EVENT_CONNECT, args -> {
            Log.d(TAG, "已连接");
            isConnected = true;
            if (listener != null) {
                listener.onConnected();
            }
        });
        
        socket.on(Socket.EVENT_DISCONNECT, args -> {
            Log.d(TAG, "已断开");
            isConnected = false;
            if (listener != null) {
                listener.onDisconnected();
            }
        });
        
        socket.on(Socket.EVENT_CONNECT_ERROR, args -> {
            Log.e(TAG, "连接错误: " + args[0]);
            if (listener != null) {
                listener.onConnectionFailed(args[0].toString());
            }
        });
        
        socket.on("code-generated", args -> {
            String code = (String) args[0];
            Log.d(TAG, "收到连接码: " + code);
            if (listener != null) {
                listener.onCodeGenerated(code);
            }
        });
        
        socket.on("device-found", args -> {
            JSONObject device = (JSONObject) args[0];
            Log.d(TAG, "发现设备: " + device);
            if (listener != null) {
                listener.onDeviceFound(device);
            }
        });
        
        socket.on("file-request", args -> {
            JSONObject file = (JSONObject) args[0];
            Log.d(TAG, "收到文件请求: " + file);
            if (listener != null) {
                listener.onFileRequest(file);
            }
        });
        
        socket.on("file-progress", args -> {
            JSONObject progress = (JSONObject) args[0];
            if (listener != null) {
                listener.onFileProgress(progress);
            }
        });
        
        socket.on("file-complete", args -> {
            JSONObject result = (JSONObject) args[0];
            Log.d(TAG, "文件传输完成: " + result);
            if (listener != null) {
                listener.onFileComplete(result);
            }
        });
    }
    
    /**
     * 断开连接
     */
    public void disconnect() {
        if (socket != null) {
            socket.disconnect();
            socket.off();
            socket = null;
            isConnected = false;
        }
    }
    
    /**
     * 注册设备
     */
    public void registerDevice(String deviceName, String deviceType) {
        if (socket != null && isConnected) {
            try {
                JSONObject data = new JSONObject();
                data.put("name", deviceName);
                data.put("type", deviceType);
                socket.emit("register", data);
            } catch (Exception e) {
                Log.e(TAG, "注册设备失败", e);
            }
        }
    }
    
    /**
     * 发送文件
     */
    public void sendFile(String filePath, String targetDevice) {
        if (socket != null && isConnected) {
            try {
                JSONObject data = new JSONObject();
                data.put("path", filePath);
                data.put("target", targetDevice);
                socket.emit("send-file", data);
            } catch (Exception e) {
                Log.e(TAG, "发送文件失败", e);
            }
        }
    }
    
    /**
     * 使用连接码连接
     */
    public void connectWithCode(String code) {
        if (socket != null && isConnected) {
            try {
                JSONObject data = new JSONObject();
                data.put("code", code);
                socket.emit("connect-code", data);
            } catch (Exception e) {
                Log.e(TAG, "连接码连接失败", e);
            }
        }
    }
    
    public boolean isConnected() {
        return isConnected;
    }
}
