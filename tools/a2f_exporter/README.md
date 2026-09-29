# 离线 Audio2Face-3D v3.0 面部帧导出

本工具在 GPU 主机上使用 [NVIDIA 官方 Audio2Face-3D-SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK) 与已生成的 v3.0 TensorRT 模型。输入为 16 kHz 单声道 WAV，输出为具名 blendshape 通道和 60 FPS 时间序列。它不包含 NVIDIA 模型或密钥。

已有 SDK 构建与模型时，在 GPU 主机放入本目录和十句 WAV，再运行：

```bash
export CUDA_PATH=/usr/local/cuda-12.9 TENSORRT_ROOT_DIR=/usr
./tools/a2f_exporter/build-on-sdk.sh /root/Audio2Face-3D-SDK
./tools/a2f_exporter/export-fixtures.sh /root/Audio2Face-3D-SDK
```

`build-on-sdk.sh` 会把本目录链接进 SDK 的 samples CMake 并只编译本工具；不会重新下载模型。`export-fixtures.sh` 优先用 ffmpeg 把讯飞 24 kHz WAV 转为 16 kHz；没有 ffmpeg 时使用 Python 3.11 的 `audioop` 转换。两个脚本都可再次运行，已有面部输出会跳过。导出结果保存在 `runtime/public/fixtures/a2f/NN-face.json`，应用从这些静态文件读取。

2026-09-29 已用官方 v3.0 SDK 和模型在腾讯云 T4 上导出十句，全部为 52 个具名通道、60 FPS，共 164–235 帧/句；本地 `npm test` 检查了 WAV、帧时长、通道映射和非零下颌动作。页面可通过 `cd runtime && npm start` 打开，选择“讯飞声音 + Audio2Face 面部动画（离线样例）”播放。测试机已关机，临时传输公钥已从测试机移除。

当前方案只完成离线样例。实时接入须在本地视觉与舌位效果验收后另行实现流式服务、延迟控制和中断；这批帧不能证明实时效果或教学舌位准确性。
