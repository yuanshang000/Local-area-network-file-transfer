const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store();

let mainWindow;
let tray;

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile('index.html');

    // 开发模式下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 创建系统托盘
function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示主窗口',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: '隐藏主窗口',
            click: () => {
                mainWindow.hide();
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('局域网文件传输');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
        mainWindow.show();
    });
}

// 应用程序就绪
app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // 不退出应用，保持托盘运行
        // app.quit();
    }
});

// IPC 事件处理

// 创建虚拟Wifi热点
ipcMain.handle('create-hotspot', async (event, { ssid, password }) => {
    return new Promise((resolve, reject) => {
        // 使用netsh命令创建热点
        const commands = [
            `netsh wlan set hostednetwork mode=allow ssid=${ssid} key=${password}`,
            `netsh wlan start hostednetwork`
        ];

        let currentIndex = 0;

        function executeNextCommand() {
            if (currentIndex >= commands.length) {
                resolve({ success: true, ssid, password });
                return;
            }

            const command = commands[currentIndex];
            const process = spawn('cmd.exe', ['/c', command]);

            process.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            process.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    currentIndex++;
                    executeNextCommand();
                } else {
                    reject(new Error(`命令执行失败: ${command}`));
                }
            });
        }

        executeNextCommand();
    });
});

// 停止虚拟Wifi热点
ipcMain.handle('stop-hotspot', async () => {
    return new Promise((resolve, reject) => {
        const process = spawn('cmd.exe', ['/c', 'netsh wlan stop hostednetwork']);

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                reject(new Error('停止热点失败'));
            }
        });
    });
});

// 获取热点状态
ipcMain.handle('get-hotspot-status', async () => {
    return new Promise((resolve) => {
        const process = spawn('cmd.exe', ['/c', 'netsh wlan show hostednetwork']);

        let output = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.on('close', () => {
            const isRunning = output.includes('状态') && output.includes('已启动');
            resolve({ isRunning });
        });
    });
});

// 获取本机IP地址
ipcMain.handle('get-local-ip', async () => {
    const { networkInterfaces } = require('os');
    const interfaces = networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }

    return 'localhost';
});

// 保存设置
ipcMain.handle('save-settings', async (event, settings) => {
    store.set('settings', settings);
    return { success: true };
});

// 获取设置
ipcMain.handle('get-settings', async () => {
    return store.get('settings', {
        fixedSender: false,
        hotspotName: 'LanTransfer',
        hotspotPassword: '12345678',
        autoCreateHotspot: false
    });
});

// 最小化到托盘
ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
});

// 显示窗口
ipcMain.on('show-window', () => {
    mainWindow.show();
});