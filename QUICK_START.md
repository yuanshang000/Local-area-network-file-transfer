# 快速开始指南

## 🚀 三步获取 exe 和 apk

### 第一步：推送到 GitHub

```bash
# 初始化 Git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://github.com/你的用户名/仓库名.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 第二步：运行 GitHub Actions

1. 打开您的 GitHub 仓库
2. 点击顶部的 **Actions** 标签
3. 找到 **"Build Desktop and Mobile Apps"** 工作流
4. 点击右侧的 **"Run workflow"** 按钮
5. 选择 `main` 分支
6. 点击绿色的 **"Run workflow"** 按钮

### 第三步：下载构建产物

1. 等待构建完成（约 5-10 分钟）
2. 构建完成后，点击进入该次构建
3. 滚动到页面底部的 **"Artifacts"** 部分
4. 下载对应的文件：
   - **lan-file-transfer-windows**: Windows EXE 文件
   - **lan-file-transfer-android**: Android APK 文件

## 📦 自动创建 Release

如果您想自动创建 Release 并发布：

**方式一：推送到 main 分支**
- 推送代码到 `main` 分支会自动创建 Release

**方式二：手动触发**
1. 在运行工作流时，勾选 **"创建 GitHub Release"** 选项
2. 构建完成后会自动创建 Release

## 🎯 常见问题

### Q: 构建失败怎么办？
A: 检查 Actions 页面的错误日志，通常是依赖问题或配置问题。

### Q: 构建需要多长时间？
A: 通常 5-10 分钟，取决于网络速度和 GitHub 服务器负载。

### Q: 可以自定义应用图标吗？
A: 可以！将图标文件放入 `desktop/assets/` 文件夹，然后重新构建。

### Q: APK 需要签名吗？
A: 调试版本不需要签名。如果需要发布版本，需要在 GitHub Secrets 中配置签名信息。

### Q: 支持哪些 Windows 版本？
A: Windows 10 及以上版本。

### Q: 支持哪些 Android 版本？
A: Android 5.0 (API 21) 及以上版本。

## 📝 下一步

下载构建产物后：

1. **Windows 用户**：直接运行 EXE 文件
2. **Android 用户**：安装 APK 文件到手机
3. 两台设备连接到同一 Wifi 热点
4. 使用二维码或数字码进行连接
5. 开始文件传输！

详细使用说明请参考 [README.md](README.md)