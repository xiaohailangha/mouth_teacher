# 小虎子 · 儿童中文言语训练

Flutter + Three.js 实时角色 + Azure Speech 服务端。当前页面使用 R31 口部模型，语音请求统一走 Azure Speech；已保存的 Azure 实测录音可用于对照。支持新中文动态合成、暂停定格、续播和停止。Azure 返回的 55 通道面部帧默认经过小虎子模型校正，也可切换“Azure 全脸表情”实验对照；口型与发音教学质量仍需验收，Boy 角色也不等于已确认四五岁音色。

## 在 Windows 启动

PowerShell：

```powershell
& '.\tools\start_teacher.ps1'
```

打开 http://127.0.0.1:8787/ 。当前默认 R31 角色。Azure 配置已使用 Windows DPAPI 保存，启动时自动读取。更改配置后加 `-Restart`。

从 GitHub 克隆时请先安装 Git LFS，再运行 `git lfs pull` 获取角色模型和字体。语音密钥保存在本机 Windows 配置中，不纳入版本库；新设备需要运行 `tools/configure_speech.ps1` 单独配置。

“让小虎子说”自然读整句；“逐字看舌位”把新输入的汉字逐字合成，并用实测逐字边界与 Viseme 时间驱动舌位方向示意。目前支持 80 字以内汉字及标点，拼音自动生成，多音字需核对。卷舌与舌尖元音等细节会标记待细分；不把相同 Viseme 编号视作相同舌位。“看口腔内部”也提供 l / i / g 慢动作示意，支持定格和切换剖视。两种视图可以共用一次正在播放的语音。

也可双击项目中的 `启动小虎子.cmd`。两台 iPad 在同一家庭 Wi-Fi 验证时，双击 `启动家庭模式.cmd`，在 iPad Safari 打开启动窗口的 Home LAN 地址，输入窗口显示的 8 位家庭连接码。家庭模式重启会中断尚未完成的合成请求，并使旧连接码、会话失效。此模式尚未经过真实 iPad 和家庭路由网络验收。

详细成果、验证证据与未完成边界见 [REALTIME_STATUS.md](REALTIME_STATUS.md)。

- `runtime/public/character-v3/`：含完整头发、35 个头部基础形态键、独立舌部与手势骨骼姿态。
- `runtime/public/oral-view.mjs`：口腔剖视与示意舌体，保留原舌头网格。
- `runtime/pronunciation.mjs`、`runtime/public/articulation.mjs`：明确读音、真实逐字边界与舌位方向映射。
- `runtime/public/retarget.mjs`：Azure 面部帧与 Viseme ID 到小虎子嘴型的联合映射。
- `runtime/public/player.mjs`：以真实音频播放位置为时钟的播放器。
- `tools/build_realtime_teacher_v3.py`：从原验证文件生成独立工作副本和实时资产。
- `tools/verify_v3_guided.cjs`：新句子逐字观察、定格、跨视图续播与平板视口检查。
- `tools/verify_runtime_acceptance.cjs`：真实语音、暂停续播、取消竞态和响应式页面验收。
- `lib/`：Flutter Web iframe / iOS WKWebView 外壳。

原始模型与 Faceit 工作文件保留；当前嘴型仍需发音教学质量验收，iPad 尚未真机验证。
