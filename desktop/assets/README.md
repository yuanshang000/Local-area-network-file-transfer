# Assets 文件夹

此文件夹用于存放应用程序图标和资源文件。

## 需要的文件

- `icon.png` - 应用图标 (推荐 512x512 PNG)
- `icon.ico` - Windows 图标 (推荐 256x256 ICO)

## 当前状态

由于没有提供图标文件，构建时会使用默认图标或占位符。

## 如何添加图标

1. 准备您的应用图标
2. 将 `icon.png` 和 `icon.ico` 文件放入此文件夹
3. 重新构建应用程序

## 工具推荐

- 在线图标生成器: https://icoconvert.com/
- ImageMagick: `convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico`