import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
  NativeModules,
  DeviceEventEmitter
} from 'react-native';
import WifiHotspot from 'react-native-wifi-hotspot';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import QRCode from 'react-native-qrcode-generator';

const { LanTransferModule } = NativeModules;

// 导航页面
const PAGES = {
  HOME: 'home',
  TRANSFER: 'transfer',
  SETTINGS: 'settings'
};

export default function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [isConnected, setIsConnected] = useState(false);
  const [hotspotCreated, setHotspotCreated] = useState(false);
  const [connectCode, setConnectCode] = useState('');
  const [settings, setSettings] = useState({});
  const [socket, setSocket] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [devices, setDevices] = useState([]);
  const [transferItems, setTransferItems] = useState([]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [targetCode, setTargetCode] = useState('');
  
  const qrCodeRef = useRef(null);

  // 初始化
  useEffect(() => {
    loadSettings();
    checkPermissions();
    initSocket();
    checkHotspotStatus();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // 检查权限
  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.CAMERA
        ]);

        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert('权限需要', '应用需要必要的权限才能正常工作');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // 初始化Socket连接
  const initSocket = () => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true
    });

    newSocket.on('connect', () => {
      console.log('已连接到服务器');
      setIsConnected(true);
      sendDeviceInfo();
    });

    newSocket.on('disconnect', () => {
      console.log('与服务器断开连接');
      setIsConnected(false);
    });

    newSocket.on('device-joined', (device) => {
      console.log('设备加入:', device.name);
      loadDeviceList();
    });

    newSocket.on('device-list-update', (deviceList) => {
      setDevices(deviceList.filter(d => d.name !== settings.deviceName));
    });

    newSocket.on('connect-code-generated', (data) => {
      setConnectCode(data.code);
    });

    newSocket.on('connection-established', (data) => {
      console.log('连接已建立:', data);
      setShowQRScanner(false);
      setShowQRCode(false);
      setIsConnected(true);
    });

    newSocket.on('file-transfer-request', (data) => {
      showFileTransferRequest(data);
    });

    newSocket.on('file-transfer-progress', (data) => {
      updateTransferProgress(data);
    });

    newSocket.on('file-transfer-complete', (data) => {
      markTransferComplete(data);
    });

    setSocket(newSocket);
  };

  // 发送设备信息
  const sendDeviceInfo = () => {
    if (socket && socket.connected) {
      socket.emit('device-join', {
        name: settings.deviceName || 'Android设备',
        type: 'mobile',
        platform: 'android',
        role: 'receiver'
      });
    }
  };

  // 加载设置
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        setSettings({
          deviceName: 'Android设备',
          fixedSender: false,
          autoConnect: false
        });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // 保存设置
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  // 检查热点状态
  const checkHotspotStatus = async () => {
    try {
      const isHotspotEnabled = await WifiHotspot.isHotspotEnabled();
      setHotspotCreated(isHotspotEnabled);
    } catch (error) {
      console.error('检查热点状态失败:', error);
    }
  };

  // 创建热点
  const createHotspot = async () => {
    try {
      const ssid = settings.hotspotName || 'LanTransfer';
      const password = settings.hotspotPassword || '12345678';

      await WifiHotspot.createHotspot(ssid, password);
      setHotspotCreated(true);
      Alert.alert('成功', '热点创建成功');
    } catch (error) {
      console.error('创建热点失败:', error);
      Alert.alert('失败', '创建热点失败: ' + error.message);
    }
  };

  // 停止热点
  const stopHotspot = async () => {
    try {
      await WifiHotspot.disableHotspot();
      setHotspotCreated(false);
      Alert.alert('成功', '热点已停止');
    } catch (error) {
      console.error('停止热点失败:', error);
      Alert.alert('失败', '停止热点失败: ' + error.message);
    }
  };

  // 选择文件
  const selectFiles = async () => {
    try {
      const results = await DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true
      });

      const files = results.map((result, index) => ({
        id: Date.now() + '-' + index,
        uri: result.uri,
        name: result.name,
        size: result.size,
        type: result.type
      }));

      setSelectedFiles([...selectedFiles, ...files]);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('用户取消选择');
      } else {
        console.error('选择文件失败:', err);
      }
    }
  };

  // 移除文件
  const removeFile = (fileId) => {
    setSelectedFiles(selectedFiles.filter(f => f.id !== fileId));
  };

  // 发送文件
  const sendFiles = () => {
    if (selectedFiles.length === 0) {
      Alert.alert('提示', '请先选择文件');
      return;
    }

    // 添加传输任务
    selectedFiles.forEach(file => {
      addTransferItem(file, 'sending');
    });

    // 发送传输请求
    socket.emit('file-transfer-request', {
      files: selectedFiles.map(f => ({
        name: f.name,
        size: f.size
      }))
    });

    // 清空选择
    setSelectedFiles([]);
  };

  // 添加传输项目
  const addTransferItem = (file, type) => {
    const newItem = {
      id: Date.now() + Math.random(),
      fileName: file.name,
      fileSize: file.size,
      type: type,
      progress: 0,
      status: type === 'sending' ? '发送中' : '接收中'
    };

    setTransferItems([...transferItems, newItem]);
  };

  // 更新传输进度
  const updateTransferProgress = (data) => {
    setTransferItems(items =>
      items.map(item =>
        item.fileName === data.fileName
          ? { ...item, progress: data.progress, status: `${data.type === 'sending' ? '发送中' : '接收中'} ${Math.round(data.progress)}%` }
          : item
      )
    );
  };

  // 标记传输完成
  const markTransferComplete = (data) => {
    setTransferItems(items =>
      items.map(item =>
        item.fileName === data.fileName
          ? { ...item, progress: 100, status: '传输完成', type: 'completed' }
          : item
      )
    );
  };

  // 显示文件传输请求
  const showFileTransferRequest = (data) => {
    Alert.alert(
      '接收文件',
      `${data.fromName} 想要发送 ${data.files.length} 个文件给您`,
      [
        { text: '拒绝', style: 'cancel', onPress: () => rejectTransfer(data) },
        { text: '接受', onPress: () => acceptTransfer(data) }
      ]
    );
  };

  // 接受传输
  const acceptTransfer = (data) => {
    socket.emit('file-transfer-accept', { fromId: data.fromId });
    data.files.forEach(file => {
      addTransferItem(file, 'receiving');
    });
  };

  // 拒绝传输
  const rejectTransfer = (data) => {
    socket.emit('file-transfer-reject', { fromId: data.fromId });
  };

  // 生成连接码
  const generateConnectCode = () => {
    if (socket) {
      socket.emit('generate-connect-code');
    }
  };

  // 扫描二维码
  const handleQRScan = (e) => {
    setShowQRScanner(false);
    const qrData = e.data;
    
    // 解析二维码数据
    if (qrData.startsWith('lantf://')) {
      const url = new URL(qrData);
      const code = url.searchParams.get('code');
      if (code) {
        connectWithCode(code);
      }
    }
  };

  // 使用数字码连接
  const connectWithCode = (code) => {
    if (!code || code.length !== 4) {
      Alert.alert('错误', '请输入4位数字码');
      return;
    }

    if (socket) {
      socket.emit('connect-with-code', { targetCode: code });
    }
  };

  // 渲染首页
  const renderHomePage = () => (
    <ScrollView style={styles.content}>
      {/* 连接状态 */}
      <View style={styles.statusCard}>
        <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
        <Text style={styles.statusText}>{isConnected ? '已连接' : '未连接'}</Text>
      </View>

      {/* 快速连接 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>快速连接</Text>
        <View style={styles.connectMethods}>
          <TouchableOpacity style={styles.connectMethod} onPress={() => { generateConnectCode(); setShowQRCode(true); }}>
            <Text style={styles.methodIcon}>📱</Text>
            <Text style={styles.methodTitle}>二维码连接</Text>
            <Text style={styles.methodDesc}>扫描二维码快速连接</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.connectMethod} onPress={() => { generateConnectCode(); setCurrentPage(PAGES.TRANSFER); }}>
            <Text style={styles.methodIcon}>🔢</Text>
            <Text style={styles.methodTitle}>数字码连接</Text>
            <Text style={styles.methodDesc}>输入4位数字码连接</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 热点状态 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>热点状态</Text>
        <View style={styles.hotspotCard}>
          <Text style={styles.hotspotStatus}>{hotspotCreated ? '已启动' : '未创建'}</Text>
          <View style={styles.hotspotActions}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary, hotspotCreated && styles.buttonDisabled]}
              onPress={createHotspot}
              disabled={hotspotCreated}
            >
              <Text style={styles.buttonText}>创建热点</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.buttonDanger, !hotspotCreated && styles.buttonDisabled]}
              onPress={stopHotspot}
              disabled={!hotspotCreated}
            >
              <Text style={styles.buttonText}>停止热点</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 已连接设备 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>已连接设备</Text>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>暂无连接设备</Text>
          </View>
        ) : (
          devices.map(device => (
            <View key={device.id} style={styles.deviceCard}>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceType}>{device.platform}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // 渲染传输页面
  const renderTransferPage = () => (
    <ScrollView style={styles.content}>
      {/* 连接码 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>连接码</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeDisplay}>{connectCode || '----'}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={generateConnectCode}>
            <Text style={styles.refreshButtonText}>刷新</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 输入对方连接码 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>连接到其他设备</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="输入对方4位数字码"
          value={targetCode}
          onChangeText={setTargetCode}
          maxLength={4}
          keyboardType="number-pad"
        />
        <TouchableOpacity style={styles.button} onPress={() => connectWithCode(targetCode)}>
          <Text style={styles.buttonText}>连接</Text>
        </TouchableOpacity>
      </View>

      {/* 选择文件 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择文件</Text>
        <TouchableOpacity style={styles.fileSelectButton} onPress={selectFiles}>
          <Text style={styles.fileSelectText}>📁 点击选择文件</Text>
        </TouchableOpacity>

        {selectedFiles.length > 0 && (
          <View style={styles.fileList}>
            {selectedFiles.map(file => (
              <View key={file.id} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeFile(file.id)}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary, selectedFiles.length === 0 && styles.buttonDisabled]}
          onPress={sendFiles}
          disabled={selectedFiles.length === 0}
        >
          <Text style={styles.buttonText}>发送文件</Text>
        </TouchableOpacity>
      </View>

      {/* 传输进度 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>传输进度</Text>
        {transferItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>暂无传输任务</Text>
          </View>
        ) : (
          transferItems.map(item => (
            <View key={item.id} style={[styles.transferItem, item.type === 'completed' && styles.transferItemCompleted]}>
              <View style={styles.transferHeader}>
                <Text style={styles.transferFileName}>{item.fileName}</Text>
                <Text style={styles.transferStatus}>{item.status}</Text>
              </View>
              <View style={styles.transferInfo}>
                <Text style={styles.transferFileSize}>{formatFileSize(item.fileSize)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // 渲染设置页面
  const renderSettingsPage = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>设备设置</Text>
        <Text style={styles.label}>设备名称</Text>
        <TextInput
          style={styles.input}
          value={settings.deviceName || ''}
          onChangeText={(text) => setSettings({ ...settings, deviceName: text })}
          placeholder="输入设备名称"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>热点设置</Text>
        <Text style={styles.label}>热点名称</Text>
        <TextInput
          style={styles.input}
          value={settings.hotspotName || ''}
          onChangeText={(text) => setSettings({ ...settings, hotspotName: text })}
          placeholder="输入热点名称"
        />

        <Text style={styles.label}>热点密码</Text>
        <TextInput
          style={styles.input}
          value={settings.hotspotPassword || ''}
          onChangeText={(text) => setSettings({ ...settings, hotspotPassword: text })}
          placeholder="输入热点密码（至少8位）"
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={() => saveSettings(settings)}>
        <Text style={styles.buttonText}>保存设置</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // 渲染二维码扫描器
  const renderQRScanner = () => (
    <QRCodeScanner
      onRead={handleQRScan}
      flashMode={RNCamera.Constants.FlashMode.off}
      topContent={
        <Text style={styles.centerText}>
          请扫描对方的二维码
        </Text>
      }
      bottomContent={
        <TouchableOpacity style={styles.button} onPress={() => setShowQRScanner(false)}>
          <Text style={styles.buttonText}>取消</Text>
        </TouchableOpacity>
      }
    />
  );

  // 渲染二维码显示
  const renderQRCode = () => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>我的二维码</Text>
        <View style={styles.qrCodeContainer}>
          <QRCode
            value={`lantf://localhost:3000?code=${connectCode}`}
            size={200}
            bgColor="white"
            fgColor="black"
          />
        </View>
        <Text style={styles.connectCodeText}>连接码: {connectCode}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setShowQRCode(false)}>
          <Text style={styles.buttonText}>关闭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>局域网文件传输</Text>
      </View>

      {/* 主内容 */}
      {showQRScanner ? (
        renderQRScanner()
      ) : showQRCode ? (
        renderQRCode()
      ) : (
        <>
          {currentPage === PAGES.HOME && renderHomePage()}
          {currentPage === PAGES.TRANSFER && renderTransferPage()}
          {currentPage === PAGES.SETTINGS && renderSettingsPage()}
        </>
      )}

      {/* 底部导航 */}
      {!showQRScanner && !showQRCode && (
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={[styles.navItem, currentPage === PAGES.HOME && styles.navItemActive]}
            onPress={() => setCurrentPage(PAGES.HOME)}
          >
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navText}>首页</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navItem, currentPage === PAGES.TRANSFER && styles.navItemActive]}
            onPress={() => setCurrentPage(PAGES.TRANSFER)}
          >
            <Text style={styles.navIcon}>📤</Text>
            <Text style={styles.navText}>传输</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navItem, currentPage === PAGES.SETTINGS && styles.navItemActive]}
            onPress={() => setCurrentPage(PAGES.SETTINGS)}
          >
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={styles.navText}>设置</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusDotConnected: {
    backgroundColor: '#4caf50',
  },
  statusDotDisconnected: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  connectMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectMethod: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e4e8',
  },
  methodIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  methodDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  hotspotCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
  },
  hotspotStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  hotspotActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPrimary: {
    backgroundColor: '#4a90e2',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deviceCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
  codeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4a90e2',
    letterSpacing: 8,
    marginBottom: 15,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#4a90e2',
  },
  codeInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 10,
  },
  fileSelectButton: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e4e8',
    marginBottom: 15,
  },
  fileSelectText: {
    fontSize: 18,
  },
  fileList: {
    marginBottom: 15,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
    color: '#f44336',
  },
  transferItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  transferItemCompleted: {
    borderLeftColor: '#4caf50',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transferFileName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transferStatus: {
    fontSize: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f5f7fa',
  },
  transferInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transferFileSize: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e4e8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4a90e2',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  qrCodeContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 15,
  },
  connectCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  centerText: {
    flex: 1,
    fontSize: 18,
    padding: 32,
    color: '#777',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e4e8',
  },
  navItem: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  navItemActive: {
    borderTopWidth: 3,
    borderTopColor: '#4a90e2',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  navText: {
    fontSize: 12,
    color: '#666',
  },
});