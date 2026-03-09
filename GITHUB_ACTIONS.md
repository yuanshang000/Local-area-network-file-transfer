# GitHub Actions 使用说明

## 📋 工作流说明

项目现在有两个独立的构建工作流：

### 1. Build Windows EXE (`build-windows.yml`)
- 触发条件：
  - 推送到 `desktop/` 目录
  - 推送到 `.github/workflows/build-windows.yml`
  - 手动触发（workflow_dispatch）

### 2. Build Android APK (`build-android.yml`)
- 触发条件：
  - 推送到 `mobile/` 目录
  - 推送到 `.github/workflows/build-android.yml`
  - 手动触发（workflow_dispatch）

## 🚀 使用方法

### 方式一：自动触发（推荐）

当您修改代码时，工作流会自动触发：

- **修改桌面端代码** → 自动触发 Windows 构建
- **修改移动端代码** → 自动触发 Android 构建

### 方式二：手动触发

1. 进入 GitHub 仓库的 **Actions** 标签页
2. 选择对应的工作流：
   - **Build Windows EXE** - 构建桌面端
   - **Build Android APK** - 构建移动端
3. 点击 **Run workflow** 按钮
4. 选择分支并点击绿色的 **Run workflow** 按钮
5. 可选：勾选 **创建 GitHub Release**

## 🎯 优势

### 独立构建的好处

1. **节省时间**
   - 只需要重新构建修改的部分
   - 例如：Windows 构建失败后，只需重新构建 Windows，不需要等待 Android

2. **更快的迭代**
   - 修改桌面端 → 只需等待 Windows 构建（约 3-5 分钟）
   - 修改移动端 → 只需等待 Android 构建（约 5-10 分钟）

3. **更清晰的问题定位**
   - 如果某个平台构建失败，可以单独调试
   - 不会因为一个平台的问题影响另一个平台

## 📦 下载构建产物

### 从 Actions 页面下载
1. 进入 Actions 页面
2. 找到成功的构建
3. 滚动到底部的 **Artifacts** 部分
4. 下载对应的文件

### 从 Releases 页面下载
如果在运行工作流时勾选了"创建 GitHub Release"：
1. 进入仓库的 **Code** 标签页
2. 点击右侧的 **Releases**
3. 找到对应的版本并下载

## 🔄 同时构建两个平台

如果需要同时构建 Windows 和 Android：

1. 分别进入两个工作流
2. 依次点击 **Run workflow**
3. 两个构建会并行运行

## 📝 注意事项

- Windows 构建较快（约 3-5 分钟）
- Android 构建较慢（约 5-10 分钟）
- 两个构建完全独立，互不影响
- 每个工作流都可以独立创建 Release