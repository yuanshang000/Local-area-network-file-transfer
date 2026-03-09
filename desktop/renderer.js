const { ipcRenderer, remote } = require('electron');
const QRCode = require('qrcode');
const io = require('socket.io-client');

// 全局变量
let socket;
let selectedFiles = [];
let currentTargetDevice = null;
let myConnectCode = null;
let currentSettings = {};
let isHotspotCreated = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initSocket();
    loadSettings();
    checkHotspotStatus();
});

// 初始化UI
function initUI() {
    // 导航菜单
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // 快速连接方法
    document.getElementById('method-qrcode').addEventListener('click', () => {
        showQRCodeModal();
    });

    document.getElementById('method-code').addEventListener('click', () => {
        showCodeModal();
    });

    // 热点操作
    document.getElementById('btn-create-hotspot').addEventListener('click', createHotspot);
    document.getElementById('btn-stop-hotspot').addEventListener('click', stopHotspot);

    // 文件选择
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');

    fileInput.addEventListener('change', handleFileSelect);

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

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 发送文件
    document.getElementById('btn-send').addEventListener('click', sendFiles);

    // 设备选择
    document.getElementById('target-device').addEventListener('change', (e) => {
        currentTargetDevice = e.target.value;
    });

    // 模态框关闭
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // 数字码连接
    document.getElementById('btn-connect-code').addEventListener('click', connectWithCode);
    document.getElementById('btn-refresh-code').addEventListener('click', refreshConnectCode);

    // 角色选择
    document.querySelectorAll('.role-option').forEach(option => {
        option.addEventListener('click', () => {
            const role = option.dataset.role;
            handleRoleSelection(role);
        });
    });

    // 设置
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-reset-settings').addEventListener('click', resetSettings);
    document.getElementById('btn-browse-path').addEventListener('click', browsePath);
}

// 初始化Socket连接
function initSocket() {
    // 连接到本地服务器
    socket = io('http://localhost:3000');

    socket.on('connect', () => {
        console.log('已连接到服务器');
        updateConnectionStatus(true);
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

    socket.on('connect-code-generated', (data) => {
        myConnectCode = data.code;
        updateConnectCodeDisplay();
    });

    socket.on('connection-established', (data) => {
        console.log('连接已建立:', data);
        closeAllModals();
        updateConnectionStatus(true);
    });

    socket.on('file-transfer-request', (data) => {
        showFileTransferRequest(data);
    });

    socket.on('file-transfer-progress', (data) => {
        updateTransferProgress(data);
    });

    socket.on('file-transfer-complete', (data) => {
        markTransferComplete(data);
        loadReceivedFiles();
    });
}

// 页面切换
function switchPage(pageName) {
    // 更新导航
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // 更新页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    if (connected) {
        statusDot.classList.remove('offline');
        statusDot.classList.add('online');
        statusText.textContent = '已连接';
    } else {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = '未连接';
    }
}

// 发送设备信息
function sendDeviceInfo() {
    const deviceInfo = {
        name: currentSettings.deviceName || 'Windows设备',
        type: 'desktop',
        platform: 'windows',
        role: 'sender' // 默认为发送方
    };

    socket.emit('device-join', deviceInfo);
}

// 创建热点
async function createHotspot() {
    try {
        const result = await ipcRenderer.invoke('create-hotspot', {
            ssid: currentSettings.hotspotName || 'LanTransfer',
            password: currentSettings.hotspotPassword || '12345678'
        });

        if (result.success) {
            isHotspotCreated = true;
            updateHotspotStatus(true);
            await updateHotspotDetails();
        }
    } catch (error) {
        console.error('创建热点失败:', error);
        alert('创建热点失败: ' + error.message);
    }
}

// 停止热点
async function stopHotspot() {
    try {
        const result = await ipcRenderer.invoke('stop-hotspot');

        if (result.success) {
            isHotspotCreated = false;
            updateHotspotStatus(false);
        }
    } catch (error) {
        console.error('停止热点失败:', error);
        alert('停止热点失败: ' + error.message);
    }
}

// 检查热点状态
async function checkHotspotStatus() {
    try {
        const status = await ipcRenderer.invoke('get-hotspot-status');
        isHotspotCreated = status.isRunning;
        updateHotspotStatus(status.isRunning);

        if (status.isRunning) {
            await updateHotspotDetails();
        }
    } catch (error) {
        console.error('检查热点状态失败:', error);
    }
}

// 更新热点状态UI
function updateHotspotStatus(isRunning) {
    const statusText = document.getElementById('hotspot-status');
    const createBtn = document.getElementById('btn-create-hotspot');
    const stopBtn = document.getElementById('btn-stop-hotspot');
    const details = document.getElementById('hotspot-details');

    if (isRunning) {
        statusText.textContent = '已启动';
        statusText.classList.add('active');
        createBtn.disabled = true;
        stopBtn.disabled = false;
        details.classList.remove('hidden');
    } else {
        statusText.textContent = '未创建';
        statusText.classList.remove('active');
        createBtn.disabled = false;
        stopBtn.disabled = true;
        details.classList.add('hidden');
    }
}

// 更新热点详情
async function updateHotspotDetails() {
    try {
        const localIP = await ipcRenderer.invoke('get-local-ip');
        document.getElementById('hotspot-ssid').textContent = currentSettings.hotspotName || 'LanTransfer';
        document.getElementById('hotspot-password').textContent = currentSettings.hotspotPassword || '12345678';
        document.getElementById('local-ip').textContent = localIP;
        
        // 生成并显示连接码
        if (!myConnectCode) {
            myConnectCode = generateConnectCode();
        }
        const codeElement = document.getElementById('hotspot-code');
        if (codeElement) {
            codeElement.textContent = myConnectCode;
        }
    } catch (error) {
        console.error('获取热点详情失败:', error);
    }
}

// 生成4位数字连接码
function generateConnectCode() {
    return String(1000 + Math.floor(Math.random() * 9000));
}

// 更新设备列表
function updateDeviceList(devices) {
    const deviceList = document.getElementById('device-list');
    const targetSelect = document.getElementById('target-device');

    if (!devices) {
        // 从服务器获取设备列表
        socket.emit('get-device-list');
        return;
    }

    // 过滤掉自己
    const otherDevices = devices.filter(device => device.name !== currentSettings.deviceName);

    if (otherDevices.length === 0) {
        deviceList.innerHTML = '<div class="empty-state"><p>暂无连接设备</p></div>';
        targetSelect.innerHTML = '<option value="">暂无连接设备</option>';
        targetSelect.disabled = true;
        return;
    }

    // 更新设备卡片
    deviceList.innerHTML = otherDevices.map(device => `
        <div class="device-card">
            <div class="device-name">${device.name}</div>
            <div class="device-type">${device.platform}</div>
            <div class="device-ip">${device.ip}</div>
        </div>
    `).join('');

    // 更新选择框
    targetSelect.innerHTML = '<option value="">选择接收设备</option>' +
        otherDevices.map(device => `<option value="${device.id}">${device.name}</option>`).join('');
    targetSelect.disabled = false;
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
    const sendBtn = document.getElementById('btn-send');
    const hasFiles = selectedFiles.length > 0;
    const hasTarget = currentTargetDevice !== null && document.getElementById('target-device').value !== '';

    sendBtn.disabled = !(hasFiles && hasTarget);
}

// 发送文件
function sendFiles() {
    if (selectedFiles.length === 0 || !currentTargetDevice) {
        return;
    }

    // 添加传输任务到列表
    selectedFiles.forEach(file => {
        addTransferItem(file, 'sending');
    });

    // 发送传输请求
    socket.emit('file-transfer-request', {
        targetId: currentTargetDevice,
        files: selectedFiles.map(f => ({
            name: f.name,
            size: f.size
        }))
    });

    // 清空选择
    selectedFiles = [];
    updateSelectedFiles();
    updateSendButton();
}

// 添加传输项目
function addTransferItem(file, type) {
    const transferList = document.getElementById('transfer-list');

    // 移除空状态
    const emptyState = transferList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const transferItem = document.createElement('div');
    transferItem.className = `transfer-item ${type}`;
    transferItem.dataset.fileName = file.name;
    transferItem.innerHTML = `
        <div class="transfer-header">
            <span class="transfer-file-name">${file.name}</span>
            <span class="transfer-status">${type === 'sending' ? '发送中' : '接收中'}</span>
        </div>
        <div class="transfer-info">
            <span>${formatFileSize(file.size)}</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
    `;

    transferList.appendChild(transferItem);
}

// 更新传输进度
function updateTransferProgress(data) {
    const transferItems = document.querySelectorAll('.transfer-item');
    transferItems.forEach(item => {
        if (item.dataset.fileName === data.fileName) {
            const progressBar = item.querySelector('.progress-fill');
            const statusText = item.querySelector('.transfer-status');

            if (progressBar) {
                progressBar.style.width = data.progress + '%';
            }

            if (statusText) {
                statusText.textContent = `${data.type === 'sending' ? '发送中' : '接收中'} ${Math.round(data.progress)}%`;
            }
        }
    });
}

// 标记传输完成
function markTransferComplete(data) {
    const transferItems = document.querySelectorAll('.transfer-item');
    transferItems.forEach(item => {
        if (item.dataset.fileName === data.fileName) {
            item.classList.remove('sending', 'receiving');
            item.classList.add('completed');

            const progressBar = item.querySelector('.progress-fill');
            if (progressBar) {
                progressBar.style.width = '100%';
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
}

// 加载接收的文件列表
function loadReceivedFiles() {
    // 这里应该从服务器获取接收的文件列表
    // 暂时使用模拟数据
    const receivedList = document.getElementById('received-list');
    // 实现文件列表加载逻辑
}

// 显示二维码模态框
async function showQRCodeModal() {
    const modal = document.getElementById('modal-qrcode');
    const qrcodeDisplay = document.getElementById('qrcode-display');

    // 生成连接码
    socket.emit('generate-connect-code');

    // 生成二维码
    try {
        const localIP = await ipcRenderer.invoke('get-local-ip');
        const qrData = `lantf://${localIP}:3000?code=${myConnectCode || '----'}`;
        await QRCode.toCanvas(qrcodeDisplay, qrData, {
            width: 200,
            margin: 2
        });

        document.getElementById('connect-code').textContent = myConnectCode || '----';
        document.getElementById('connect-ip').textContent = localIP;

        modal.classList.add('active');
    } catch (error) {
        console.error('生成二维码失败:', error);
        alert('生成二维码失败');
    }
}

// 显示数字码模态框
function showCodeModal() {
    const modal = document.getElementById('modal-code');

    // 生成连接码
    socket.emit('generate-connect-code');

    modal.classList.add('active');
}

// 更新连接码显示
function updateConnectCodeDisplay() {
    const codeElement = document.getElementById('my-code');
    if (codeElement && myConnectCode) {
        codeElement.textContent = myConnectCode;
    }
}

// 使用数字码连接
function connectWithCode() {
    const targetCode = document.getElementById('target-code').value.trim();

    if (targetCode.length !== 4 || !/^\d{4}$/.test(targetCode)) {
        alert('请输入4位数字码');
        return;
    }

    socket.emit('connect-with-code', { targetCode });
}

// 刷新连接码
function refreshConnectCode() {
    socket.emit('generate-connect-code');
}

// 显示角色选择模态框
function showRoleModal() {
    document.getElementById('modal-role').classList.add('active');
}

// 处理角色选择
function handleRoleSelection(role) {
    closeAllModals();

    if (role === 'receiver') {
        // 接收方创建虚拟WiFi热点
        if (!isHotspotCreated) {
            createHotspot();
        }
    } else {
        // 发送方需要连接到接收方的热点
        alert('请连接到接收方的虚拟WiFi热点:\n\n名称: ' + (currentSettings.hotspotName || 'LanTransfer') + '\n密码: ' + (currentSettings.hotspotPassword || '12345678') + '\n\n连接后使用二维码或数字码连接');
    }
}

// 加载设置
async function loadSettings() {
    try {
        currentSettings = await ipcRenderer.invoke('get-settings');
        applySettingsToUI();
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 应用设置到UI
function applySettingsToUI() {
    document.getElementById('setting-fixed-sender').checked = currentSettings.fixedSender || false;
    document.getElementById('setting-hotspot-name').value = currentSettings.hotspotName || 'LanTransfer';
    document.getElementById('setting-hotspot-password').value = currentSettings.hotspotPassword || '12345678';
    document.getElementById('setting-auto-create').checked = currentSettings.autoCreateHotspot || false;
    document.getElementById('setting-device-name').value = currentSettings.deviceName || 'Windows设备';
    document.getElementById('setting-port').value = currentSettings.port || 3000;
    document.getElementById('setting-save-path').value = currentSettings.savePath || '';
}

// 保存设置
async function saveSettings() {
    const settings = {
        fixedSender: document.getElementById('setting-fixed-sender').checked,
        hotspotName: document.getElementById('setting-hotspot-name').value.trim(),
        hotspotPassword: document.getElementById('setting-hotspot-password').value.trim(),
        autoCreateHotspot: document.getElementById('setting-auto-create').checked,
        deviceName: document.getElementById('setting-device-name').value.trim(),
        port: parseInt(document.getElementById('setting-port').value),
        savePath: document.getElementById('setting-save-path').value.trim()
    };

    // 验证
    if (settings.hotspotPassword.length < 8) {
        alert('热点密码至少需要8个字符');
        return;
    }

    try {
        await ipcRenderer.invoke('save-settings', settings);
        currentSettings = settings;
        alert('设置已保存');
    } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败');
    }
}

// 重置设置
async function resetSettings() {
    if (!confirm('确定要重置所有设置为默认值吗？')) {
        return;
    }

    const defaultSettings = {
        fixedSender: false,
        hotspotName: 'LanTransfer',
        hotspotPassword: '12345678',
        autoCreateHotspot: false,
        deviceName: 'Windows设备',
        port: 3000,
        savePath: ''
    };

    try {
        await ipcRenderer.invoke('save-settings', defaultSettings);
        currentSettings = defaultSettings;
        applySettingsToUI();
        alert('设置已重置');
    } catch (error) {
        console.error('重置设置失败:', error);
        alert('重置设置失败');
    }
}

// 浏览路径
async function browsePath() {
    const { dialog } = require('electron').remote || require('@electron/remote');

    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        document.getElementById('setting-save-path').value = result.filePaths[0];
    }
}

// 关闭所有模态框
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// 暴露全局函数
window.removeFile = removeFile;