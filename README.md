# skk-gal

`skk-gal` 是一个从零实现的 DeepSeek Harness Web GAL 对话插件。它不依赖 `gal-view`，也不读取原插件目录或 npm 缓存；背景、丝柯克立绘和前端逻辑全部随插件分发。

完整的安装、设置、自定义、更新与故障排查说明请阅读 [CONFIGURATION.md](./CONFIGURATION.md)。

## 功能

- 在会话页新增“丝柯克剧场”视图
- 智能体多轮回复在角色左侧以独立卡片分隔展示，底部为用户专属输入与最近发言区
- 单层角色立绘，带轻微呼吸、衣摆感整体摆动与深渊光晕
- 对话逐字显示或直接显示、显示全文、自动显示、对话记录、界面设置
- 内置输入框，沿用 DSH 原生发送管线
- 插件设置内置“丝柯克回复风格”开关；仅当该视图打开且开关启用时动态注入，离开视图自动失效
- DSH 设置页新增“GAL 视窗”快捷设置，可调整玩家名称、打字速度、角色动态和回复风格并一键返回剧场
- 插件主题全局生效，尚未选择工作区时也会显示深渊背景与配套侧栏
- 新对话启动页会单独适配为丝柯克风格，并使用内置高清修复背景，不必先进入已有会话
- 在新对话启动页发出第一条消息后，会自动切换到“丝柯克剧场”视图
- “显示全文”按回复逐段展开实时工作流，每段思考、工具调用与对应回复保持在同一张卡片内
- GAL 视图内直接显示待处理任务面板，支持操作授权、任务选择/确认反馈，并可一键打开 DSH 原生任务面板兜底
- “GAL 视窗”设置中提供安全的对话内容管理：归档会话可在线加入删除队列，DSH 退出后自动移入可恢复的本地回收站
- 移动端自适应，并尊重系统的“减少动态效果”设置
- 所有图片以内联 Data URL 编入 `.dsh-plugin/client.js`，运行时无外部文件路径和网络依赖
- 提示词与前后端通信逻辑随插件分发；开关只保存在目标电脑的 `%USERPROFILE%\.dsh\skk-gal\settings.json`

## 安装

1. 将整个 `skk-gal` 文件夹复制到目标电脑。
2. 目标电脑需已安装 Node.js，并至少成功运行过一次 `npx @deepseek-ai/dsh web`。
3. 在 PowerShell 中进入本目录并运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

4. 重新启动 DSH：

```powershell
npx @deepseek-ai/dsh web
```

安装器会把插件复制到 `%USERPROFILE%\.dsh\plugins\skk-gal`，并以相对依赖写入当前 Web profile。因此源文件夹之后可以移动或删除。

## 便携包

开发目录中运行：

```powershell
npm run pack:portable
```

输出为 `dist\skk-gal-portable.zip`。将 ZIP 发给其他电脑，解压后运行其中的 `install.ps1` 即可。

## 开发与验证

仅开发阶段需要安装 `esbuild`：

```powershell
npm install
npm run build
npm test
npm run check
```

最终用户使用已构建的 `.dsh-plugin/client.js`，无需安装开发依赖。

## 卸载

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
```

## 资源说明

本目录中的角色和背景素材仅用于个人界面定制。对外分发前，请确认你拥有相应素材的再分发权；插件源代码采用 MIT 许可证，不会改变图片素材本身的权利归属。
