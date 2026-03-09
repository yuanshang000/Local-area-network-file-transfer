# 局域网文件传输工具

支持 Windows (exe) 和 Android (apk) 的跨平台文件传输工具，使用虚拟 Wifi 热点进行点对点连接。

## ✨ 功能特性

- 📡 虚拟 Wifi 热点连接（无需外部网络）
- 🔗 两种连接方式：二维码扫描 / 4位数字码
- 📱 跨平台支持：Windows + Android
- ⚙️ 灵活的热点创建设置（固定发送方或动态选择）
- 📤 快速文件传输
- 📊 实时传输进度显示

## 🚀 快速开始

### 通过 GitHub Actions 构建（推荐）

这是最简单的方式，无需本地开发环境：

1. **Fork 本仓库** 或克隆到您的 GitHub 账户
2. **推送到 GitHub**
3. **进入 Actions 页面**：点击仓库顶部的 "Actions" 标签
4. **运行工作流**：
   - 点击 "Build Desktop and Mobile Apps" 工作流
   - 点击 "Run workflow" 按钮
   - 选择分支并点击绿色的 "Run workflow" 按钮
5. **下载构建产物**：
   - 等待构建完成（约 5-10 分钟）
   - 在 Actions 页面找到成功的构建
   - 滚动到底部的 "Artifacts" 部分
   - 下载对应的文件：
     - `lan-file-transfer-windows`: Windows EXE 文件
     - `lan-file-transfer-android`: Android APK 文件

### 自动创建 Release

推送到 `main` 分支时会自动创建 Release，包含构建产物。

### 手动创建 Release

在运行工作流时，勾选 "创建 GitHub Release" 选项，会在构建完成后自动创建 Release。

## 📁 项目结构

```
.
├── desktop/           # Electron 桌面端
├── mobile/           # React Native 移动端
├── shared/           # 共享代码和协议定义
└── .github/          # GitHub Actions 配置
```

## 💻 技术栈

- **桌面端**: Electron + Node.js
- **移动端**: React Native
- **通信**: WebSocket + HTTP
- **构建**: GitHub Actions

## 📖 使用说明

### Windows 端
1. 下载并运行 EXE 文件
2. 设置设备名称和热点参数
3. 创建 Wifi 热点或连接到现有热点
4. 生成二维码或连接码
5. 等待其他设备连接

### Android 端
1. 安装 APK 文件
2. 授予必要权限（位置、存储、相机）
3. 设置设备名称和热点参数
4. 扫描二维码或输入连接码
5. 开始文件传输

### 文件传输
1. 两台设备在同一热点下
2. 使用二维码或数字码完成设备配对
3. 选择文件并发送
4. 实时查看传输进度

## ⚙️ 系统要求

### Windows
- Windows 10 或更高版本
- 管理员权限（创建热点需要）

### Android
- Android 5.0 (API 21) 或更高版本
- 位置权限
- 存储权限
- 相机权限（扫描二维码）

## 🔧 本地开发（可选）

如果需要本地开发或调试：

### 桌面端
```bash
cd desktop
npm install
npm start
```

### 移动端
```bash
cd mobile
npm install
npm start
# 在另一个终端
npm run android
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔐 安全说明

- 文件传输在本地网络进行，不经过互联网
- 不包含任何加密功能（按需求）
- 请确保在可信的网络环境中使用