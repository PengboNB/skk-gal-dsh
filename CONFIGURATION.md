# skk-gal 完整配置指南

本文档说明如何在另一台 Windows 电脑上安装、配置、更新、开发和卸载 `skk-gal`。插件面向 DeepSeek Harness Web `@deepseek-ai/dsh`，不依赖 `gal-view`。

## 1. 环境要求

- Windows 10 或 Windows 11
- Node.js 20 或更高版本，建议使用当前 LTS
- npm 与 PowerShell 5.1 或更高版本
- 已至少成功启动过一次 DSH Web：

```powershell
npx @deepseek-ai/dsh web
```

首次启动会创建 `%USERPROFILE%\.dsh\profiles\web`。安装器需要该目录存在。

## 2. 从便携包安装

1. 下载并解压 `skk-gal-portable.zip`。
2. 在资源管理器中进入解压后的 `skk-gal` 文件夹。
3. 在地址栏输入 `powershell` 并回车，或在该目录右键打开 PowerShell。
4. 运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

5. 关闭旧的 DSH 终端，再重新启动：

```powershell
npx @deepseek-ai/dsh web
```

6. 打开 `http://127.0.0.1:3080/`，在会话顶部选择“丝柯克剧场”。

安装器会将运行文件复制到：

```text
%USERPROFILE%\.dsh\plugins\skk-gal
```

并在 Web profile 中添加相对依赖。安装完成后，原始解压目录可以移动或删除。

## 3. 从源码安装

克隆仓库后执行：

```powershell
git clone https://github.com/pengbo123654789-ux/skk-gal-dsh.git
cd skk-gal-dsh
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

然后重新启动 DSH Web。

## 4. 插件设置

插件提供两个设置入口，二者使用同一份配置。

### 剧场内设置

进入“丝柯克剧场”，点击右上角“界面设置”。可以调整：

- 玩家名称：显示在底部用户专属对话框中。
- 打字速度：控制最新智能体回复的逐字显示速度；选择“直接显示”后会跳过逐字动画，整段回复立即出现。
- 角色动态：启用或关闭角色呼吸、摆动和光晕动画。
- 回复风格：启用或关闭丝柯克主题的回复风格提示词。

### DSH 快捷设置

点击 DSH 左下角“设置”，选择侧栏中的“GAL 视窗”。这里可以调整同样的选项，并通过“打开剧场”立即返回丝柯克剧场。

插件加载后主题会全局应用；即使当前没有选定工作区或刚打开新对话，也能看到丝柯克风格的新对话启动页、内置高清修复背景与配套侧栏样式。从新对话启动页发出第一条消息后，插件会在会话标签出现时自动切换到“丝柯克剧场”。进入已有会话的“丝柯克剧场”后，点击“显示全文”可展开或收起实时工作流；每段思考与工具调用显示在其对应回复卡片内，顺序为“思考与执行 → 回复”。智能体请求越权操作或任务选择/确认时，剧场内会出现待处理任务面板：可直接提交“允许一次 / 拒绝 / 选择结果”，也可点击“打开任务面板”展开 DSH 原生任务面板作为兜底。

## 5. 回复风格的生效范围

回复风格由插件后端通过 DSH 原生 `systemPrompt` 服务动态注入，同时满足以下两个条件时才会生效：

1. “回复风格”设置为“启用丝柯克风格”；
2. 至少一个浏览器页面正在打开“丝柯克剧场”视图。

浏览器每 5 秒发送一次本地活动信号。离开剧场、关闭标签页或超过 15 秒没有活动信号后，提示词会停止注入。关闭设置开关会立即停止注入。插件不会创建工作区级 `AGENTS.md`，因此不会永久影响普通 DSH 对话。

提示词只调整表达风格，不会改变模型、权限、工具或 Agent 预设。

## 6. 设置保存位置

界面设置保存在浏览器的 `localStorage`：

```text
skk-gal:settings
```

回复风格开关还会同步保存到：

```text
%USERPROFILE%\.dsh\skk-gal\settings.json
```

这些数据只保存在当前电脑，不会上传。复制插件到其他电脑时会使用默认设置，目标电脑可独立调整。

## 7. 自定义角色与背景

资源目录：

```text
assets\abyss-background.png
assets\sidebar-abyss.png
assets\skirk-hd.png
```

替换资源时建议保持文件名不变：

- 背景图建议使用 16:9 或更宽的高分辨率 PNG。
- 侧边栏图建议使用竖向图片。
- 角色图必须是带透明通道的 PNG，画布四周保留少量透明边距。

替换后必须重新构建并安装：

```powershell
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

前端构建会将图片转换为 Data URL 写入 `.dsh-plugin\client.js`，运行时不读取开发目录中的绝对路径，也不需要联网加载素材。

## 8. 开发与验证

安装开发依赖：

```powershell
npm install
```

构建客户端：

```powershell
npm run build
```

运行单元测试：

```powershell
npm test
```

验证已构建文件是否与源码一致：

```powershell
npm run check
```

生成便携 ZIP：

```powershell
npm run pack:portable
```

输出位置：

```text
dist\skk-gal-portable.zip
```

## 9. 对话归档与内容管理

在 DSH 设置中打开“GAL 视窗”，下方的“对话内容管理”会列出当前用户的已保存会话、工作目录、会话 ID和归档状态。未归档会话可直接使用 DSH 官方接口归档。

DSH `0.1.0-rc.6` 的归档只是从侧边栏隐藏，不会删除内容：

```text
对话日志：%USERPROFILE%\.dsh\sessions\<项目目录>\<会话ID>\session.jsonl.zstd
归档索引：%USERPROFILE%\.dsh\storages\workspace.json
投影缓存：%USERPROFILE%\.dsh\storages\session_projcache.json
```

该插件为没有官方删除接口的 DSH rc.6 提供安全的两阶段删除：先归档会话，再点击“删除”并输入会话标题确认。操作会立即进入待处理队列；完全退出 DSH 后，随插件携带的助手会把日志移到 `%USERPROFILE%\.dsh\session-trash`，并同步清理 `workspace.json` 与 `session_projcache.json`。重新启动 DSH 后可在同一设置页恢复，或再次输入标题后永久删除。删除与恢复均不依赖安装盘符，队列、回收站和助手都使用当前 Windows 用户目录，因此随压缩包迁移后仍可使用。

由于这些文件属于 DSH 内部持久化格式，插件不会在 DSH 运行时提供一键永久删除，以避免并发写入造成索引损坏。

## 10. 更新插件

获取新版本后，在新版项目目录重新执行：

```powershell
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

安装器会替换 `%USERPROFILE%\.dsh\plugins\skk-gal`，但不会删除 `%USERPROFILE%\.dsh\skk-gal\settings.json`。随后重新启动 DSH。

## 11. 卸载

在项目或便携包目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
```

卸载后重新启动 DSH。若还要清除个人设置，可手动删除：

```powershell
Remove-Item -LiteralPath "$env:USERPROFILE\.dsh\skk-gal" -Recurse -Force
```

该命令只删除本插件的用户设置，不会删除其他 DSH 配置。

## 12. 常见问题

### 提示 `install.ps1` 不存在

PowerShell 当前目录不在插件文件夹。先进入实际解压目录：

```powershell
cd "完整的\skk-gal\目录"
Test-Path .\install.ps1
```

返回 `True` 后再运行安装命令。

### 安装器提示找不到 DSH Web profile

先执行一次：

```powershell
npx @deepseek-ai/dsh web
```

看到地址后按 `Ctrl+C` 关闭，再运行安装器。

### 看不到“丝柯克剧场”标签

1. 确认安装命令没有报错。
2. 完全关闭正在运行的 DSH 终端。
3. 重新执行 `npx @deepseek-ai/dsh web`。
4. 在浏览器中按 `Ctrl+F5` 强制刷新。

### 设置页没有“GAL 视窗”

这通常是浏览器仍在使用旧的客户端模块。重启 DSH 后按 `Ctrl+F5`。

### 端口 3080 被占用

查找占用进程：

```powershell
Get-NetTCPConnection -LocalPort 3080 -State Listen
```

关闭旧的 DSH 终端，或按照当前 DSH 版本支持的参数选择其他端口。

## 13. 可移植性说明

- 运行文件不包含开发电脑的绝对路径。
- 图片内嵌于客户端构建产物，不依赖网络 URL。
- 安装器使用 `%USERPROFILE%` 定位目标电脑的 DSH 目录。
- Web profile 使用 `file:../../plugins/skk-gal` 相对依赖。
- 最终用户无需安装 `esbuild` 或保留 `node_modules`。
- 用户设置按电脑独立保存，不会随 ZIP 泄露。

## 14. 素材与许可证

插件代码采用 MIT 许可证。角色、游戏名称及相关美术元素的权利归各自权利人所有。本项目为非官方个人界面定制；公开分发或二次发布素材前，请自行确认拥有相应授权。
