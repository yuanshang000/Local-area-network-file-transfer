const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// 存储已连接的设备
const devices = new Map();
// 存储待传输的文件信息
const pendingFiles = new Map();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 * 5 // 限制为5GB
    }
});

// 路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取设备列表
app.get('/api/devices', (req, res) => {
    const deviceList = Array.from(devices.values()).map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        connectTime: device.connectTime
    }));
    res.json(deviceList);
});

// 文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有文件上传' });
    }

    const fileInfo = {
        id: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadTime: new Date().toISOString(),
        uploaderId: req.body.uploaderId
    };

    // 通知所有客户端有新文件
    io.emit('file-uploaded', fileInfo);
    res.json(fileInfo);
});

// 文件下载
app.get('/api/download/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: '文件不存在' });
    }
});

// 获取文件列表
app.get('/api/files', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: '读取文件失败' });
        }

        const fileList = files.map(filename => {
            const filePath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename: filename,
                size: stats.size,
                uploadTime: stats.mtime.toISOString()
            };
        });

        res.json(fileList);
    });
});

// 删除文件
app.delete('/api/files/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        io.emit('file-deleted', { filename: req.params.filename });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '文件不存在' });
    }
});

// WebSocket连接处理
io.on('connection', (socket) => {
    console.log('新设备连接:', socket.id);

    // 设备连接
    socket.on('device-join', (deviceInfo) => {
        const device = {
            id: socket.id,
            name: deviceInfo.name || '未命名设备',
            type: deviceInfo.type || 'unknown',
            connectTime: new Date().toISOString(),
            socket: socket
        };

        devices.set(socket.id, device);
        
        // 通知所有客户端设备列表更新
        io.emit('device-list-update', Array.from(devices.values()));
        
        // 发送当前设备信息给连接的客户端
        socket.emit('device-joined', device);
        
        console.log('设备加入:', device.name, device.type);
    });

    // 请求发送文件
    socket.on('send-file-request', (data) => {
        const targetDevice = devices.get(data.targetId);
        if (targetDevice && targetDevice.socket) {
            targetDevice.socket.emit('file-transfer-request', {
                fromId: socket.id,
                fromName: devices.get(socket.id).name,
                fileName: data.fileName,
                fileSize: data.fileSize
            });
        }
    });

    // 接受文件传输
    socket.on('accept-file-transfer', (data) => {
        const requester = devices.get(data.fromId);
        if (requester && requester.socket) {
            requester.socket.emit('file-transfer-accepted', {
                targetId: socket.id,
                targetName: devices.get(socket.id).name
            });
        }
    });

    // 拒绝文件传输
    socket.on('reject-file-transfer', (data) => {
        const requester = devices.get(data.fromId);
        if (requester && requester.socket) {
            requester.socket.emit('file-transfer-rejected', {
                targetId: socket.id,
                targetName: devices.get(socket.id).name
            });
        }
    });

    // 传输进度更新
    socket.on('transfer-progress', (data) => {
        const targetDevice = devices.get(data.targetId);
        if (targetDevice && targetDevice.socket) {
            targetDevice.socket.emit('transfer-progress-update', data);
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
        const device = devices.get(socket.id);
        if (device) {
            console.log('设备断开连接:', device.name);
            devices.delete(socket.id);
            io.emit('device-disconnected', { id: socket.id });
            io.emit('device-list-update', Array.from(devices.values()));
        }
    });
});

// 获取本机IP地址
function getLocalIP() {
    const interfaces = require('os').networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('=================================');
    console.log('局域网文件传输服务已启动');
    console.log('=================================');
    console.log(`本机访问: http://localhost:${PORT}`);
    console.log(`局域网访问: http://${localIP}:${PORT}`);
    console.log('=================================');
    console.log('请在同一局域网内的设备浏览器中访问上述地址');
    console.log('=================================');
});