# 序列号扫描器 (Serial Number Scanner)

一个基于 React + TypeScript + Vite 构建的现代化序列号扫描应用，支持二维码识别和批量处理功能。

## 功能特性

- 📱 **摄像头扫描**: 支持实时摄像头扫描二维码
- 🖼️ **图片识别**: 支持上传图片进行二维码识别
- 📊 **批量处理**: 支持批量扫描和数据导出
- 🌙 **深色模式**: 支持明暗主题切换
- 📱 **响应式设计**: 完美适配移动端和桌面端
- 🔒 **安全访问**: 支持 HTTPS 环境下的摄像头访问

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS
- **状态管理**: Zustand
- **路由管理**: React Router
- **二维码识别**: qr-scanner + jsQR
- **图标库**: Lucide React

## 快速开始

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/serial-number-scanner.git
   cd serial-number-scanner
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   打开浏览器访问 `http://localhost:5173`

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run check
```

## GitHub Pages 部署

本项目已配置自动部署到 GitHub Pages，按以下步骤操作：

### 1. 准备 GitHub 仓库

1. 在 GitHub 上创建新仓库 `serial-number-scanner`
2. 将本地代码推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/serial-number-scanner.git
   git push -u origin main
   ```

### 2. 配置 GitHub Pages

1. 进入 GitHub 仓库设置页面
2. 找到 "Pages" 选项
3. 在 "Source" 中选择 "GitHub Actions"
4. 保存设置

### 3. 自动部署

- 每次推送到 `main` 分支时，GitHub Actions 会自动构建和部署
- 部署完成后，访问 `https://yourusername.github.io/serial-number-scanner`

### 4. 更新配置

在 `package.json` 中更新 `homepage` 字段：
```json
{
  "homepage": "https://yourusername.github.io/serial-number-scanner"
}
```

## 使用说明

### 摄像头扫描
1. 点击主页的 "开始扫描" 按钮
2. 允许浏览器访问摄像头权限
3. 将二维码对准摄像头进行扫描
4. 扫描结果会自动保存到历史记录

### 图片上传
1. 点击 "上传图片" 按钮
2. 选择包含二维码的图片文件
3. 系统会自动识别并提取二维码信息

### 批量处理
1. 在设置中调整批量处理参数
2. 支持连续扫描多个二维码
3. 可导出扫描结果为 CSV 格式

## 浏览器兼容性

- ✅ Chrome 47+
- ✅ Firefox 68+
- ✅ Safari 11+
- ✅ Edge 79+

**注意**: 摄像头功能需要 HTTPS 环境或 localhost 访问

## 开发指南

### 项目结构
```
src/
├── components/     # 可复用组件
├── pages/         # 页面组件
├── hooks/         # 自定义 Hooks
├── store/         # 状态管理
├── services/      # 业务服务
├── lib/           # 工具函数
└── types/         # 类型定义
```

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 使用 Prettier 格式化代码
- 组件采用函数式组件 + Hooks

## 许可证

MIT License
