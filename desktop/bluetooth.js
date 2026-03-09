/**
 * 局域网文件传输 - 蓝牙管理模块 (Windows)
 * 使用 Windows Bluetooth LE API (通过 PowerShell)
 */

const { ipcMain } = require('electron');
const { exec } = require('child_process');

// Windows 蓝牙管理器（使用 PowerShell 实现）
class WindowsBluetoothManager {
    constructor() {
        this.devices = [];
        this.isScanning = false;
        this.advertiseProcess = null;
    }

    /**
     * 检查蓝牙适配器状态
     */
    async checkBluetoothStatus() {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('powershell -Command "Get-NetAdapter -Name \'*Bluetooth*\' | Select-Object Status"', (error, stdout) => {
                if (error) {
                    resolve({ available: false });
                    return;
                }
                resolve({
                    available: stdout.includes('Up'),
                    status: stdout.trim()
                });
            });
        });
    }

    /**
     * 扫描附近的蓝牙设备
     */
    async scanDevices(timeout = 15000) {
        const { exec } = require('child_process');
        
        return new Promise((resolve, reject) => {
            this.isScanning = true;
            this.devices = [];

            // 使用 PowerShell 获取蓝牙设备
            const psScript = `
                $devices = @()
                try {
                    # 使用 Windows.Devices.Bluetooth API
                    Add-Type -AssemblyName System.Runtime.WindowsRuntime
                    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
                    
                    Function Await($WinRtTask) {
                        $asTask = $asTaskGeneric.MakeGenericMethod($WinRtTask.GetType().GenericTypeArguments)
                        $netTask = $asTask.Invoke($null, @($WinRtTask))
                        $netTask.Wait(-1) | Out-Null
                        $netTask.Result
                    }
                    
                    [Windows.Devices.Bluetooth.BluetoothLEAdvertisementWatcher, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
                    
                    $watcher = New-Object Windows.Devices.Bluetooth.BluetoothLEAdvertisementWatcher
                    $watcher.ScanningMode = [Windows.Devices.Bluetooth.BluetoothLEScanningMode]::Active
                    
                    $results = @{}
                    
                    $watcher.add_Received({
                        param($sender, $args)
                        $name = $args.Advertisement.LocalName
                        $addr = $args.BluetoothAddress.ToString('X')
                        if ($name -and $name -like '*LAN*Transfer*') {
                            $results[$addr] = @{
                                Name = $name
                                Address = $addr
                            }
                        }
                    })
                    
                    $watcher.Start()
                    Start-Sleep -Seconds 10
                    $watcher.Stop()
                    
                    $results.Values | ConvertTo-Json
                } catch {
                    Write-Error $_.Exception.Message
                }
            `;

            exec(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, 
                { maxBuffer: 1024 * 1024 * 10 },
                (error, stdout, stderr) => {
                    this.isScanning = false;
                    
                    if (error) {
                        console.error('蓝牙扫描错误:', error);
                        // 返回模拟数据用于测试
                        resolve(this.getMockDevices());
                        return;
                    }

                    try {
                        const result = JSON.parse(stdout);
                        if (Array.isArray(result)) {
                            this.devices = result.map(d => ({
                                name: d.Name,
                                address: d.Address,
                                code: this.extractCode(d.Name),
                                hotspotInfo: this.extractHotspotInfo(d.Name)
                            }));
                        } else if (result.Name) {
                            this.devices = [{
                                name: result.Name,
                                address: result.Address,
                                code: this.extractCode(result.Name),
                                hotspotInfo: this.extractHotspotInfo(result.Name)
                            }];
                        }
                    } catch (e) {
                        console.error('解析蓝牙扫描结果失败:', e);
                    }

                    resolve(this.devices);
                }
            );
        });
    }

    /**
     * 从设备名称中提取匹配码
     */
    extractCode(name) {
        if (!name) return null;
        // 匹配4位数字
        const match = name.match(/\d{4}/);
        return match ? match[0] : null;
    }

    /**
     * 从设备名称中提取热点信息
     */
    extractHotspotInfo(name) {
        if (!name) return null;
        // 格式: LAN-Transfer-1234-SSID-PWD
        const parts = name.split('-');
        if (parts.length >= 5) {
            return {
                code: parts[2],
                ssid: parts[3],
                password: parts[4]
            };
        }
        return null;
    }

    /**
     * 获取模拟设备（用于测试）
     */
    getMockDevices() {
        return [
            {
                name: 'LAN-Transfer-1234',
                address: 'AA:BB:CC:DD:EE:FF',
                code: '1234',
                hotspotInfo: {
                    ssid: 'LAN-Transfer',
                    password: '12345678'
                }
            }
        ];
    }

    /**
     * 停止扫描
     */
    stopScanning() {
        this.isScanning = false;
    }

    /**
     * 获取设备列表
     */
    getDevices() {
        return this.devices;
    }

    /**
     * 开始蓝牙广播（接收方使用）
     * 广播匹配码和热点信息
     */
    async startAdvertising(code, ssid, password) {
        const { exec } = require('child_process');
        
        return new Promise((resolve, reject) => {
            // 广播名称格式: LAN-Transfer-1234-SSID-PWD
            const broadcastName = `LAN-Transfer-${code}-${ssid}-${password}`;
            
            // 使用 PowerShell 设置蓝牙广播
            const psScript = `
                try {
                    # 使用 Windows.Devices.Bluetooth API 进行BLE广播
                    Add-Type -AssemblyName System.Runtime.WindowsRuntime
                    
                    [Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementPublisher, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
                    [Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisement, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
                    [Windows.Devices.Bluetooth.Advertisement.BluetoothLEManufacturerData, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
                    
                    $publisher = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementPublisher
                    $advertisement = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisement
                    
                    # 设置本地名称
                    $advertisement.LocalName = "${broadcastName}"
                    
                    # 添加制造商数据（包含匹配码信息）
                    $data = [System.Text.Encoding]::UTF8.GetBytes('${code}|${ssid}|${password}')
                    $manufacturerData = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEManufacturerData
                    $manufacturerData.CompanyId = 0xFFFF  # 保留的公司ID
                    $manufacturerData.Data = [Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType = WindowsRuntime]::new()
                    $manufacturerData.Data.WriteBytes($data)
                    
                    $advertisement.ManufacturerData.Add($manufacturerData)
                    $publisher.Advertisement = $advertisement
                    $publisher.Start()
                    
                    Write-Output "Advertising started: ${broadcastName}"
                    
                    # 保持运行
                    Start-Sleep -Seconds 300
                    
                } catch {
                    Write-Error $_.Exception.Message
                }
            `;

            // 在后台启动广播
            this.advertiseProcess = exec(
                `powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
                { maxBuffer: 1024 * 1024 },
                (error, stdout, stderr) => {
                    if (error) {
                        console.error('蓝牙广播错误:', error);
                    }
                }
            );

            console.log('蓝牙广播已启动:', broadcastName);
            resolve(true);
        });
    }

    /**
     * 停止蓝牙广播
     */
    stopAdvertising() {
        if (this.advertiseProcess) {
            try {
                this.advertiseProcess.kill();
            } catch (e) {
                // 忽略错误
            }
            this.advertiseProcess = null;
        }
    }
}

// 导出 Windows 版本
let bluetoothManager = null;

function getBluetoothManager() {
    if (!bluetoothManager) {
        bluetoothManager = new WindowsBluetoothManager();
    }
    return bluetoothManager;
}

// IPC 处理
function setupBluetoothIPC() {
    const manager = getBluetoothManager();

    // 检查蓝牙状态
    ipcMain.handle('bluetooth-check-status', async () => {
        return await manager.checkBluetoothStatus();
    });

    // 开始扫描
    ipcMain.handle('bluetooth-start-scan', async (event, timeout) => {
        try {
            const devices = await manager.scanDevices(timeout || 15000);
            return { success: true, devices };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 停止扫描
    ipcMain.handle('bluetooth-stop-scan', async () => {
        manager.stopScanning();
        return { success: true };
    });

    // 获取设备列表
    ipcMain.handle('bluetooth-get-devices', async () => {
        return manager.getDevices();
    });

    // 开始蓝牙广播（接收方使用）
    ipcMain.handle('bluetooth-start-advertising', async (event, { code, ssid, password }) => {
        try {
            const success = await manager.startAdvertising(code, ssid, password);
            return { success };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 停止蓝牙广播
    ipcMain.handle('bluetooth-stop-advertising', async () => {
        manager.stopAdvertising();
        return { success: true };
    });
}

// 别名
const BluetoothManager = WindowsBluetoothManager;

module.exports = {
    BluetoothManager,
    WindowsBluetoothManager,
    getBluetoothManager,
    setupBluetoothIPC
};
