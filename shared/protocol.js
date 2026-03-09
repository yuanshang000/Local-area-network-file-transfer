// 共享协议定义

// 消息类型
const MessageTypes = {
    // 设备相关
    DEVICE_JOIN: 'device-join',
    DEVICE_LEAVE: 'device-leave',
    DEVICE_LIST: 'device-list',
    
    // 连接相关
    CONNECTION_REQUEST: 'connection-request',
    CONNECTION_ACCEPT: 'connection-accept',
    CONNECTION_REJECT: 'connection-reject',
    
    // 热点相关
    HOTSPOT_CREATED: 'hotspot-created',
    HOTSPOT_INFO: 'hotspot-info',
    HOTSPOT_JOIN_REQUEST: 'hotspot-join-request',
    
    // 文件传输相关
    FILE_TRANSFER_REQUEST: 'file-transfer-request',
    FILE_TRANSFER_ACCEPT: 'file-transfer-accept',
    FILE_TRANSFER_REJECT: 'file-transfer-reject',
    FILE_DATA: 'file-data',
    FILE_PROGRESS: 'file-progress',
    FILE_COMPLETE: 'file-complete',
    FILE_ERROR: 'file-error',
    
    // 连接码相关
    CONNECT_CODE_GENERATE: 'connect-code-generate',
    CONNECT_CODE_VERIFY: 'connect-code-verify',
    CONNECT_QRCODE_GENERATE: 'connect-qrcode-generate',
    CONNECT_QRCODE_SCAN: 'connect-qrcode-scan',
    
    // 设置相关
    SETTINGS_UPDATE: 'settings-update',
    SETTINGS_GET: 'settings-get'
};

// 设备信息
class DeviceInfo {
    constructor(id, name, type, platform) {
        this.id = id;
        this.name = name;
        this.type = type; // 'sender' or 'receiver'
        this.platform = platform; // 'windows', 'android'
        this.connectTime = new Date().toISOString();
    }
}

// 连接码生成
function generateConnectCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 文件分块大小 (1MB)
const CHUNK_SIZE = 1024 * 1024;

// 服务器端口配置
const PORTS = {
    WEBSOCKET: 3000,
    HTTP: 3001,
    FILE_SERVER: 3002
};

module.exports = {
    MessageTypes,
    DeviceInfo,
    generateConnectCode,
    CHUNK_SIZE,
    PORTS
};