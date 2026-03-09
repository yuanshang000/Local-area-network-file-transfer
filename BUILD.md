# 构建说明

## GitHub Actions 自动构建

本项目使用 GitHub Actions 自动构建 Windows EXE 和 Android APK。

### 触发构建

构建会在以下情况下自动触发：
- 推送代码到 `main` 或 `develop` 分支
- 创建针对 `main` 分支的 Pull Request
- 手动触发（在 Actions 页面点击 "Run workflow"）

### 下载构建产物

1. 进入 GitHub 仓库的 "Actions" 标签页
2. 选择最近的构建工作流
3. 滚动到页面底部的 "Artifacts" 部分
4. 下载对应的构建产物：
   - `lan-file-transfer-windows`: Windows EXE 文件
   - `lan-file-transfer-android`: Android APK 文件

### 发布版本

当代码推送到 `main` 分支时，会自动创建新的 Release，包含构建产物。

## 本地构建（可选）

### Windows 桌面端

```bash
cd desktop
npm install
npm run build:win
```

构建产物位于 `desktop/dist/` 目录。

### Android 移动端

```bash
cd mobile
npm install
cd android
./gradlew assembleRelease
```

构建产物位于 `mobile/android/app/build/outputs/apk/release/` 目录。

### 签名 APK（可选）

如果要签名 APK，需要准备 keystore 文件并配置以下环境变量：

```bash
KEYSTORE_PASSWORD=你的密钥库密码
KEY_ALIAS=你的密钥别名
KEY_PASSWORD=你的密钥密码
```

然后在 GitHub 仓库的 Secrets 中配置这些变量。

## 依赖要求

- Node.js 18+
- Java 17+
- Android SDK (用于构建 APK)
- Windows 10+ (用于构建 EXE)