# 个人主页

个人主页首页项目，用于展示个人形象、动态视觉效果和作品集入口。

## 项目简介

这是一个基于原生 HTML、CSS、JavaScript 构建的静态个人主页。页面以沉浸式首屏、人物形象渐变、运动主题过渡、作品集入口为主要内容，适合部署为个人官网首页。

## 核心功能

- 沉浸式首屏：视频背景、人物主视觉、个人标识和作品集跳转入口。
- 人物渐变效果：滚动或悬停时在两张人物形象之间切换，并配合进度条展示状态。
- 动态工牌：页面滚动后自动下落，支持拖拽收起和展开。
- 运动主题过渡：通过篮球、跳绳、场地线条等视觉元素承接页面叙事。
- 作品集入口：引导访问外部作品集站点 `http://ok.fuyue.xyz`。
- 背景音乐控制：支持背景音乐自动尝试播放、手动开关和状态提示。
- 鼠标交互：包含视差移动、水波跟随、按钮倾斜等细节动效。
- 静态部署：无需后端服务，可直接托管到 Nginx、GitHub Pages、对象存储或任意静态站点平台。

## 预览
![首页](https://gitee.com/xiao_yong_Zhang/image-bed/raw/master/2026/XiaoYong_2026-06-20_23-11-24.png)
![工牌掉落](https://gitee.com/xiao_yong_Zhang/image-bed/raw/master/2026/XiaoYong_2026-06-20_23-26-08.png)
![](https://gitee.com/xiao_yong_Zhang/image-bed/raw/master/2026/XiaoYong_2026-06-20_23-35-14.png)
![](https://gitee.com/xiao_yong_Zhang/image-bed/raw/master/2026/XiaoYong_2026-06-20_23-35-32.png)
## 目录结构

```text
.
├── index.html        # 页面结构与资源引用
├── styles.css        # 页面样式、动画和响应式布局
├── favicon.ico       # 网站图标
├── image/            # 人物图片、备案图标等图片资源
├── js/
│   ├── app.js        # 页面核心交互逻辑
│   ├── jquery.js     # jQuery 依赖
│   └── neko.js       # 页面附加脚本
├── layer/            # layer 弹层库相关文件
├── ogg/              # 首屏视频和背景音乐资源
└── video/            # 预留视频资源目录
```

## 本地预览

项目是纯静态页面，可以直接打开 `index.html` 预览。

也可以在项目根目录启动一个本地静态服务：

```bash
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 部署方式

将以下文件和目录一起上传到静态站点服务即可：

```text
index.html
styles.css
favicon.ico
image/
js/
layer/
ogg/
video/
```

部署后请确认资源路径保持相对路径结构不变，否则视频、音乐、图片和脚本可能无法正常加载。

## 主要资源

- 首屏背景视频：`ogg/hero-bg.mp4`
- 背景音乐：`ogg/horizon.mp3`
- 人物形象图：`image/人物穿衣.png`、`image/人物写真.png`
- WebP 优化图：`image/人物穿衣.webp`、`image/人物写真.webp`
- 备案图标：`image/beian.jpg`

## 维护说明

- 修改个人文案、作品集链接、备案信息时，主要编辑 `index.html`。
- 调整视觉风格、动画细节和移动端适配时，主要编辑 `styles.css`。
- 调整滚动交互、人物渐变、工牌拖拽、音频控制时，主要编辑 `js/app.js`。
- 大体积视频和图片会影响首屏加载速度，替换资源时建议同步压缩并保留 WebP 格式。

