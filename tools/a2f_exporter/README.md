# 离线 Audio2Face-3D v3.0 面部帧导出

本工具在 GPU 主机上使用 [NVIDIA 官方 Audio2Face-3D-SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK) 与已生成的 v3.0 TensorRT 模型。输入为 16 kHz 单声道 WAV，输出为 52 路面部和 16 路舌头 blendshape 权重、60 FPS 时间序列。它不包含 NVIDIA 模型或密钥。

已有 SDK 构建与模型时，在 GPU 主机放入本目录和十句 WAV，再运行：

```bash
export CUDA_PATH=/usr/local/cuda-12.9 TENSORRT_ROOT_DIR=/usr
./tools/a2f_exporter/build-on-sdk.sh /root/Audio2Face-3D-SDK
./tools/a2f_exporter/export-fixtures.sh /root/Audio2Face-3D-SDK
```

`build-on-sdk.sh` 会把本目录链接进 SDK 的 samples CMake 并只编译本工具；不会重新下载模型。`export-fixtures.sh` 优先用 ffmpeg 把讯飞 24 kHz WAV 转为 16 kHz；没有 ffmpeg 时使用 Python 3.11 的 `audioop` 转换。已有面部与舌头双通道输出会跳过。新版结果保存在 `runtime/public/fixtures/a2f/NN-full.json`，旧版 `NN-face.json` 保留给更新前已打开的页面，避免把不同 schema 发布到同一 URL。

2026-09-29 已用官方 v3.0 SDK 和模型在腾讯云 GPU 上重导十句，全部为 52 路面部、16 路舌头、60 FPS，共 164–235 帧/句；本地 `npm test` 检查 WAV、帧时长、双通道映射和非零下颌、整体舌体动作。页面可通过 `cd runtime && npm start` 打开，选择“讯飞声音 + Audio2Face 面部与舌头动画（离线样例）”播放。测试机已关机，临时传输公钥已从测试机移除。

应用当前仅把 NVIDIA 舌头权重中小虎 R31 模型已有对应动作的部分映射到形态键，并没有直接使用 NVIDIA 舌头顶点几何。`tongueUp` 等整体动作有明显变化；十句的 `tongueTipUp` 最大约 0.02、`tongueStretch` 为 0，所以“啦、哒、嘎”的舌尖/舌根准确发音尚未成立。源舌头与小虎网格拓扑不同，完整几何动画需要另做蒙皮/形变迁移和视觉验收。面部表情输入目前固定为 neutral；A2F 不会仅凭这批音频自动产生丰富的情绪表演。

当前方案只完成离线样例。实时接入须在本地视觉与舌位效果验收后另行实现流式服务、延迟控制和中断；这批帧不能证明实时效果或教学舌位准确性。
