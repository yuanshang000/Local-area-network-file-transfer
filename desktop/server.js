/**
 * 局域网文件传输 - Socket.IO 服务器
 */

const http = require('http');
const express = require('express');
const SocketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const PORT = 3000;

// 创建 Express 应用
const app = express();
const server = http.createServer(app);
const io = SocketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// 存储设备信息
const devices = new Map();
const connectCodes = new Map(); // code -> socketId

// 生成连接码
function generateConnectCode() {
    return String(1000 + Math.floor(Math.random() * 9000));
}

// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log('客户端已连接:', socket.id);

    // 设备加入
    socket.on('device-join', (deviceInfo) => {
        console.log('设备加入:', deviceInfo.name);
        
        const device = {
            id: socket.id,
            name: deviceInfo.name || '未知设备',
            type: deviceInfo.type || 'unknown',
            platform: deviceInfo.platform || 'unknown',
            role: deviceInfo.role || 'sender',
            ip: socket.handshake.address,
            connectTime: new Date().toISOString()
        };
        
        devices.set(socket.id, device);
        
        // 广播设备列表更新
        io.emit('device-list-update', Array.from(devices.values()));
        io.emit('device-joined', device);
        
        socket.emit('device-joined', device);
    });

    // 设备注册
    socket.on('register-device', (data) => {
        const device = devices.get(socket.id);
        if (device) {
            device.role = data.role || device.role;
            device.type = data.type || device.type;
            devices.set(socket.id, device);
        }
    });

    // 生成连接码
    socket.on('generate-connect-code', () => {
        const code = generateConnectCode();
        connectCodes.set(code, socket.id);
        socket.emit('connect-code-generated', { code });
        console.log('生成连接码:', code, '->', socket.id);
        
        // 5分钟后过期
        setTimeout(() => {
            if (connectCodes.get(code) === socket.id) {
                connectCodes.delete(code);
            }
        }, 5 * 60 * 1000);
    });

    // 使用连接码连接
    socket.on('connect-with-code', (data) => {
        const targetSocketId = connectCodes.get(data.targetCode);
        
        if (targetSocketId) {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                // 通知双方建立连接
                targetSocket.emit('connection-established', {
                    from: socket.id,
                    code: data.targetCode
                });
                socket.emit('connection-established', {
                    to: targetSocketId,
                    code: data.targetCode
                });
                console.log('连接建立:', socket.id, '<->', targetSocketId);
            }
        } else {
            socket.emit('connection-failed', { error: '无效的连接码' });
        }
    });

    // 获取设备列表
    socket.on('get-device-list', () => {
        socket.emit('device-list-update', Array.from(devices.values()));
    });

    // 文件传输请求
    socket.on('file-transfer-request', (data) => {
        const targetSocketId = data.targetId;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
            targetSocket.emit('file-transfer-request', {
                from: socket.id,
                files: data.files
            });
        }
    });

    // 文件传输接受
    socket.on('file-transfer-accept', (data) => {
        const targetSocketId = data.targetId;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
            targetSocket.emit('file-transfer-accept', {
                from: socket.id
            });
        }
    });

    // 文件传输进度
    socket.on('file-transfer-progress', (data) => {
        const targetSocketId = data.targetId;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
            targetSocket.emit('file-transfer-progress', {
                fileName: data.fileName,
                progress: data.progress,
                type: data.type
            });
        }
    });

    // 文件传输完成
    socket.on('file-transfer-complete', (data) => {
        const targetSocketId = data.targetId;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
            targetSocket.emit('file-transfer-complete', {
                fileName: data.fileName,
                success: data.success
            });
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log('客户端断开连接:', socket.id);
        
        const device = devices.get(socket.id);
        if (device) {
            io.emit('device-disconnected', { id: socket.id, name: device.name });
            devices.delete(socket.id);
        }
        
        // 清除相关的连接码
        for (const [code, socketId] of connectCodes.entries()) {
            if (socketId === socket.id) {
                connectCodes.delete(code);
            }
        }
    });
});

// 启动服务器
function startServer() {
    return new Promise((resolve, reject) => {
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Socket.IO 服务器运行在端口 ${PORT}`);
            resolve(PORT);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`端口 ${PORT} 已被使用，尝试下一个端口`);
                server.listen(PORT + 1, '0.0.0.0', () => {
                    console.log(`Socket.IO 服务器运行在端口 ${PORT + 1}`);
                    resolve(PORT + 1);
                });
            } else {
                reject(err);
            }
        });
    });
}

// 停止服务器
function stopServer() {
    return new Promise((resolve) => {
        server.close(() => {
            console.log('服务器已关闭');
            resolve();
        });
    });
}

module.exports = {
    startServer,
    stopServer,
    io
};
