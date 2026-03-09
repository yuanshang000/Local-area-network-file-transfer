// 全局变量
let socket;
let selectedFiles = [];
let currentTargetDevice = null;
let myDeviceName = '';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    initUI();
    initDeviceName();
});

// 初始化WebSocket连接
function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('已连接到服务器');
        updateConnectionStatus(true);
        // 发送设备信息
        sendDeviceInfo();
    });

    socket.on('disconnect', () => {
        console.log('与服务器断开连接');
        updateConnectionStatus(false);
    });

    socket.on('device-joined', (device) => {
        console.log('设备加入:', device.name);
        updateDeviceList();
    });

    socket.on('device-list-update', (devices) => {
        updateDeviceList(devices);
    });

    socket.on('device-disconnected', (data) => {
        console.log('设备断开:', data.id);
        updateDeviceList();
    });

    socket.on('file-transfer-request', (data) => {
        showReceiveModal(data);
    });

    socket.on('file-transfer-accepted', (data) => {
        console.log('文件传输被接受');
        startFileUpload(data.targetId);
    });

    socket.on('file-transfer-rejected', (data) => {
        console.log('文件传输被拒绝');
        addTransferItem(null, 'rejected', data.targetName);
    });

    socket.on('transfer-progress-update', (data) => {
        updateTransferProgress(data);
    });
}

// 初始化UI
function initUI() {
    // 文件输入
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');

    fileInput.addEventListener('change', handleFileSelect);

    // 拖拽支持
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 点击上传区域
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 发送按钮
    document.getElementById('send-btn').addEventListener('click', sendFiles);

    // 接收模态框按钮
    document.getElementById('accept-btn').addEventListener('click', acceptFileTransfer);
    document.getElementById('reject-btn').addEventListener('click', rejectFileTransfer);

    // 设备名称模态框
    document.getElementById('confirm-name-btn').addEventListener('click', confirmDeviceName);
}

// 初始化设备名称
function initDeviceName() {
    const savedName = localStorage.getItem('deviceName');
    if (savedName) {
        myDeviceName = savedName;
        document.getElementById('device-name').textContent = myDeviceName;
    } else {
        showNameModal();
    }

    // 点击设备名称可以修改
    document.getElementById('device-name').addEventListener('click', showNameModal);
}

// 显示设备名称设置模态框
function showNameModal() {
    const modal = document.getElementById('name-modal');
    const input = document.getElementById('device-name-input');
    input.value = myDeviceName || '';
    modal.classList.add('active');
    input.focus();
}

// 确认设备名称
function confirmDeviceName() {
    const input = document.getElementById('device-name-input');
    const name = input.value.trim();
    
    if (name) {
        myDeviceName = name;
        localStorage.setItem('deviceName', name);
        document.getElementById('device-name').textContent = name;
        document.getElementById('name-modal').classList.remove('active');
        
        // 重新发送设备信息
        if (socket && socket.connected) {
            sendDeviceInfo();
        }
    }
}

// 发送设备信息
function sendDeviceInfo() {
    const deviceType = detectDeviceType();
    socket.emit('device-join', {
        name: myDeviceName || '未命名设备',
        type: deviceType
    });
}

// 检测设备类型
function detectDeviceType() {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) {
        return 'Android';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        return 'iOS';
    } else if (/Windows/i.test(userAgent)) {
        return 'Windows';
    } else if (/Mac/i.test(userAgent)) {
        return 'Mac';
    } else if (/Linux/i.test(userAgent)) {
        return 'Linux';
    }
    return 'Unknown';
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.textContent = '已连接';
        statusElement.className = 'status-connected';
    } else {
        statusElement.textContent = '未连接';
        statusElement.className = 'status-disconnected';
    }
}

// 更新设备列表
function updateDeviceList(devices) {
    const devicesList = document.getElementById('devices-list');
    const targetSelect = document.getElementById('target-device');

    if (!devices) {
        // 如果没有传入设备列表，从服务器获取
        fetch('/api/devices')
            .then(response => response.json())
            .then(data => updateDeviceList(data))
            .catch(error => console.error('获取设备列表失败:', error));
        return;
    }

    // 过滤掉自己的设备
    const otherDevices = devices.filter(device => device.name !== myDeviceName);

    if (otherDevices.length === 0) {
        devicesList.innerHTML = '<div class="empty-state"><p>暂无其他在线设备</p></div>';
        targetSelect.innerHTML = '<option value="">暂无在线设备</option>';
        targetSelect.disabled = true;
        return;
    }

    // 更新设备卡片
    devicesList.innerHTML = otherDevices.map(device => `
        <div class="device-card" data-id="${device.id}">
            <div class="device-name">${device.name}</div>
            <div class="device-type">${device.type}</div>
            <div class="device-time">${formatTime(device.connectTime)}</div>
        </div>
    `).join('');

    // 添加点击事件
    devicesList.querySelectorAll('.device-card').forEach(card => {
        card.addEventListener('click', () => selectDevice(card.dataset.id));
    });

    // 更新选择框
    targetSelect.innerHTML = '<option value="">选择接收设备</option>' +
        otherDevices.map(device => `<option value="${device.id}">${device.name} (${device.type})</option>`).join('');
    targetSelect.disabled = false;
}

// 选择设备
function selectDevice(deviceId) {
    currentTargetDevice = deviceId;
    
    // 更新UI
    document.querySelectorAll('.device-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.id === deviceId) {
            card.classList.add('selected');
        }
    });

    // 更新选择框
    document.getElementById('target-device').value = deviceId;
    updateSendButton();
}

// 处理文件选择
function handleFileSelect(event) {
    const files = event.target.files;
    handleFiles(files);
}

// 处理文件
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileData = {
            id: Date.now() + '-' + i,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type
        };
        selectedFiles.push(fileData);
    }
    updateSelectedFiles();
    updateSendButton();
}

// 更新已选文件列表
function updateSelectedFiles() {
    const container = document.getElementById('selected-files');
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = selectedFiles.map(file => `
        <div class="file-item" data-id="${file.id}">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <button class="remove-file" onclick="removeFile('${file.id}')">×</button>
        </div>
    `).join('');
}

// 移除文件
function removeFile(fileId) {
    selectedFiles = selectedFiles.filter(f => f.id !== fileId);
    updateSelectedFiles();
    updateSendButton();
}

// 更新发送按钮状态
function updateSendButton() {
    const sendBtn = document.getElementById('send-btn');
    const hasFiles = selectedFiles.length > 0;
    const hasTarget = currentTargetDevice !== null && document.getElementById('target-device').value !== '';
    
    sendBtn.disabled = !(hasFiles && hasTarget);
}

// 发送文件
function sendFiles() {
    if (selectedFiles.length === 0 || !currentTargetDevice) {
        return;
    }

    const targetDeviceName = document.querySelector(`.device-card[data-id="${currentTargetDevice}"] .device-name`)?.textContent || '未知设备';

    // 添加传输任务到列表
    selectedFiles.forEach(file => {
        addTransferItem(file, 'sending', targetDeviceName);
    });

    // 发送传输请求
    socket.emit('send-file-request', {
        targetId: currentTargetDevice,
        fileName: selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length}个文件`,
        fileSize: selectedFiles.reduce((total, f) => total + f.size, 0)
    });

    // 清空选择
    selectedFiles = [];
    updateSelectedFiles();
    updateSendButton();
}

// 开始文件上传
function startFileUpload(targetId) {
    // 实际上传逻辑
    const formData = new FormData();
    
    // 这里简化处理，实际应该跟踪每个文件的传输进度
    selectedFiles.forEach(file => {
        formData.append('files', file.file);
    });
    
    // 使用Fetch API上传文件
    const transferItems = document.querySelectorAll('.transfer-item.sending');
    let currentIndex = 0;

    function uploadNextFile() {
        if (currentIndex >= selectedFiles.length) {
            // 所有文件上传完成
            return;
        }

        const file = selectedFiles[currentIndex];
        const formData = new FormData();
        formData.append('file', file.file);
        formData.append('uploaderId', socket.id);

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100;
                const transferItem = transferItems[currentIndex];
                if (transferItem) {
                    const progressBar = transferItem.querySelector('.progress-fill');
                    if (progressBar) {
                        progressBar.style.width = progress + '%';
                    }
                    const progressText = transferItem.querySelector('.transfer-status');
                    if (progressText) {
                        progressText.textContent = `上传中 ${Math.round(progress)}%`;
                    }
                }
                
                // 发送进度更新
                socket.emit('transfer-progress', {
                    targetId: targetId,
                    fileName: file.name,
                    progress: progress
                });
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const transferItem = transferItems[currentIndex];
                if (transferItem) {
                    transferItem.classList.remove('sending');
                    transferItem.classList.add('completed');
                    const progressBar = transferItem.querySelector('.progress-fill');
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.classList.remove('sending');
                        progressBar.classList.add('completed');
                    }
                    const statusText = transferItem.querySelector('.transfer-status');
                    if (statusText) {
                        statusText.textContent = '传输完成';
                        statusText.style.background = '#4caf50';
                        statusText.style.color = '#fff';
                    }
                }
                currentIndex++;
                uploadNextFile();
            } else {
                // 上传失败
                const transferItem = transferItems[currentIndex];
                if (transferItem) {
                    transferItem.classList.remove('sending');
                    transferItem.classList.add('failed');
                    const statusText = transferItem.querySelector('.transfer-status');
                    if (statusText) {
                        statusText.textContent = '传输失败';
                        statusText.style.background = '#f44336';
                        statusText.style.color = '#fff';
                    }
                }
                currentIndex++;
                uploadNextFile();
            }
        });

        xhr.addEventListener('error', () => {
            // 上传失败
            const transferItem = transferItems[currentIndex];
            if (transferItem) {
                transferItem.classList.remove('sending');
                transferItem.classList.add('failed');
                const statusText = transferItem.querySelector('.transfer-status');
                if (statusText) {
                    statusText.textContent = '传输失败';
                    statusText.style.background = '#f44336';
                    statusText.style.color = '#fff';
                }
            }
            currentIndex++;
            uploadNextFile();
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    }

    uploadNextFile();
}

// 显示接收文件模态框
let currentReceiveRequest = null;

function showReceiveModal(data) {
    currentReceiveRequest = data;
    const modal = document.getElementById('receive-modal');
    const message = document.getElementById('receive-message');
    message.textContent = `${data.fromName} 想要发送文件 "${data.fileName}" 给您 (${formatFileSize(data.fileSize)})`;
    modal.classList.add('active');
}

// 接受文件传输
function acceptFileTransfer() {
    if (currentReceiveRequest) {
        socket.emit('accept-file-transfer', {
            fromId: currentReceiveRequest.fromId
        });
        document.getElementById('receive-modal').classList.remove('active');
        addTransferItem({
            name: currentReceiveRequest.fileName,
            size: currentReceiveRequest.fileSize
        }, 'receiving', currentReceiveRequest.fromName);
        loadReceivedFiles();
    }
}

// 拒绝文件传输
function rejectFileTransfer() {
    if (currentReceiveRequest) {
        socket.emit('reject-file-transfer', {
            fromId: currentReceiveRequest.fromId
        });
        document.getElementById('receive-modal').classList.remove('active');
    }
}

// 添加传输项目
function addTransferItem(file, type, targetName) {
    const transferList = document.getElementById('transfer-list');
    
    // 移除空状态
    const emptyState = transferList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const transferItem = document.createElement('div');
    transferItem.className = `transfer-item ${type}`;
    transferItem.innerHTML = `
        <div class="transfer-header">
            <span class="transfer-file-name">${file ? file.name : '未知文件'}</span>
            <span class="transfer-status">${type === 'sending' ? '等待中' : type === 'receiving' ? '接收中' : '已拒绝'}</span>
        </div>
        <div class="transfer-info">
            <span>${file ? formatFileSize(file.size) : '0 KB'}</span>
            <span>${targetName}</span>
        </div>
        ${type !== 'rejected' ? '<div class="progress-bar"><div class="progress-fill ' + type + '" style="width: 0%"></div></div>' : ''}
    `;
    
    transferList.appendChild(transferItem);
}

// 更新传输进度
function updateTransferProgress(data) {
    const transferItems = document.querySelectorAll('.transfer-item.receiving');
    transferItems.forEach(item => {
        const fileName = item.querySelector('.transfer-file-name').textContent;
        if (fileName === data.fileName) {
            const progressBar = item.querySelector('.progress-fill');
            const statusText = item.querySelector('.transfer-status');
            
            if (progressBar) {
                progressBar.style.width = data.progress + '%';
            }
            
            if (statusText) {
                statusText.textContent = `接收中 ${Math.round(data.progress)}%`;
            }
        }
    });

    // 当接收完成时，刷新接收文件列表
    if (data.progress === 100) {
        setTimeout(() => {
            transferItems.forEach(item => {
                const fileName = item.querySelector('.transfer-file-name').textContent;
                if (fileName === data.fileName) {
                    item.classList.remove('receiving');
                    item.classList.add('completed');
                    const progressBar = item.querySelector('.progress-fill');
                    if (progressBar) {
                        progressBar.classList.remove('receiving');
                        progressBar.classList.add('completed');
                    }
                    const statusText = item.querySelector('.transfer-status');
                    if (statusText) {
                        statusText.textContent = '传输完成';
                        statusText.style.background = '#4caf50';
                        statusText.style.color = '#fff';
                    }
                }
            });
            loadReceivedFiles();
        }, 500);
    }
}

// 加载接收的文件列表
function loadReceivedFiles() {
    fetch('/api/files')
        .then(response => response.json())
        .then(files => {
            const container = document.getElementById('received-files');
            
            if (files.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>暂无接收文件</p></div>';
                return;
            }

            container.innerHTML = files.map(file => `
                <div class="received-item">
                    <div class="received-info">
                        <div class="received-name">${file.filename}</div>
                        <div class="received-meta">
                            <span>${formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>${formatTime(file.uploadTime)}</span>
                        </div>
                    </div>
                    <div class="received-actions">
                        <a href="/api/download/${file.filename}" class="btn btn-primary" download>下载</a>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => console.error('加载文件列表失败:', error));
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// 格式化时间
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN');
}

// 监听设备选择变化
document.getElementById('target-device').addEventListener('change', (e) => {
    if (e.target.value) {
        currentTargetDevice = e.target.value;
        document.querySelectorAll('.device-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.id === currentTargetDevice) {
                card.classList.add('selected');
            }
        });
    } else {
        currentTargetDevice = null;
        document.querySelectorAll('.device-card').forEach(card => {
            card.classList.remove('selected');
        });
    }
    updateSendButton();
});