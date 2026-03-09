# 项目结构说明

## 目录结构

```
c:\Users\lala\Desktop\c\
├── .github/                    # GitHub Actions 配置
│   └── workflows/
│       └── build.yml          # 自动构建工作流
├── desktop/                    # Electron 桌面端
│   ├── assets/                # 图标和资源文件
│   ├── main.js                # Electron 主进程
│   ├── index.html             # 桌面端 UI
│   ├── styles.css             # 桌面端样式
│   ├── renderer.js            # 桌面端渲染进程
│   └── package.json           # 桌面端依赖配置
├── mobile/                     # React Native 移动端
│   ├── android/               # Android 原生代码
│   │   ├── app/
│   │   │   └── src/main/
│   │   │       ├── AndroidManifest.xml
│   │   │       └── ...
│   │   ├── build.gradle       # 应用级构建配置
│   │   ├── settings.gradle    # 项目设置
│   │   └── gradle.properties  # Gradle 属性
│   ├── App.js                 # React Native 主应用
│   ├── index.js               # 应用入口
│   ├── app.json               # 应用配置
│   ├── metro.config.js        # Metro 打包配置
│   └── package.json           # 移动端依赖配置
├── shared/                     # 共享代码
│   └── protocol.js            # 通信协议定义
├── .gitignore                 # Git 忽略文件
├── README.md                  # 项目说明
├── BUILD.md                   # 构建说明
└── PROJECT_STRUCTURE.md       # 本文件
```

## 核心功能模块

### 1. 桌面端

#### main.js (主进程)
- 创建和管理 Electron 窗口
- 系统托盘功能
- 创建/停止虚拟 Wifi 热点
- IPC 通信处理
- 设置存储

#### renderer.js (渲染进程)
- UI 交互逻辑
- WebSocket 客户端连接
- 文件选择和上传
- 二维码生成
- 连接码管理

### 2. 移动端

#### App.js
- React Native 主应用组件
- 页面导航（首页/传输/设置）
- 热点管理
- 文件选择和传输
- 二维码扫描
- Socket.IO 客户端

### 3. 共享协议

#### protocol.js
- 消息类型定义
- 设备信息类
- 连接码生成
- 端口配置

## 技术架构

### 通信流程

1. **设备发现**
   - 设备启动时通过 Socket.IO 连接到服务器
   - 发送设备信息加入设备列表
   - 实时更新在线设备列表

2. **连接建立**
   - 方式一：二维码扫描
     - 发送方生成二维码（包含 IP 和连接码）
     - 接收方扫描二维码解析连接信息
   - 方式二：数字码
     - 双方各自生成 4 位连接码
     - 交换连接码进行匹配

3. **热点创建**
   - 发送方创建虚拟 Wifi 热点
   - 接收方连接到热点
   - 建立点对点连接

4. **文件传输**
   - 发送方选择文件
   - 通过 WebSocket 发送传输请求
   - 接收方确认接收
   - 使用 HTTP 分块传输文件
   - 实时更新传输进度

### 数据流

```
[设备A] --(WiFi)--> [热点] --(WiFi)--> [设备B]
    |                                      |
    +---(WebSocket)--> [服务器] <--(WebSocket)---+
```

## 配置说明

### 桌面端设置

- **固定发送方**: 启用后自动创建热点
- **热点名称**: 自定义热点 SSID
- **热点密码**: 热点连接密码（至少8位）
- **自动创建热点**: 连接时自动创建热点
- **设备名称**: 显示在设备列表中的名称
- **传输端口**: WebSocket 服务器端口
- **保存位置**: 接收文件的保存路径

### 移动端设置

- **设备名称**: 显示在设备列表中的名称
- **热点名称**: 自定义热点 SSID
- **热点密码**: 热点连接密码

## 开发环境

### 桌面端开发

```bash
cd desktop
npm install
npm start
```

### 移动端开发

```bash
cd mobile
npm install
npm start
# 在另一个终端
npm run android
```

## 构建和部署

详见 [BUILD.md](BUILD.md)

## 注意事项

1. **热点权限**: 需要管理员权限才能创建 Windows 热点
2. **Android 权限**: 需要位置、存储、相机等权限
3. **网络要求**: 两台设备需要在同一网络或热点下
4. **防火墙**: 可能需要允许应用通过防火墙