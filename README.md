# 局域网文件传输工具 - 跨平台版本

支持Windows (exe) 和 Android (apk) 的局域网文件传输工具，使用虚拟Wifi热点进行连接。

## 功能特性

- 📡 虚拟Wifi热点连接（无需外部网络）
- 🔗 两种连接方式：二维码扫描 / 4位数字码
- 📱 跨平台支持：Windows + Android
- ⚙️ 灵活的热点创建设置（固定发送方或动态选择）
- 📤 快速文件传输
- 📊 实时传输进度显示

## 技术栈

- **桌面端**: Electron + Node.js
- **移动端**: React Native
- **通信**: WebSocket + HTTP
- **构建**: GitHub Actions

## 项目结构

```
.
├── desktop/           # Electron桌面端
├── mobile/           # React Native移动端
├── shared/           # 共享代码和协议定义
└── .github/          # GitHub Actions配置
```

## 使用说明

1. 桌面端运行编译后的exe文件
2. 手机端安装apk应用
3. 两台设备在同一Wifi热点下（或一台创建热点）
4. 选择连接方式（扫码或输入4位码）
5. 开始传输文件

## 构建

使用GitHub Actions自动构建：
- Windows exe: 在Actions中下载
- Android apk: 在Actions中下载