# 离线 Audio2Face-3D v3.0 面部帧导出

本工具在 GPU 主机上使用 [NVIDIA 官方 Audio2Face-3D-SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK) 与已生成的 v3.0 TensorRT 模型。输入为 16 kHz 单声道 WAV，输出为具名 blendshape 通道和 60 FPS 时间序列。它不包含 NVIDIA 模型或密钥。

已有 SDK 构建与模型时，在 GPU 主机克隆本仓库并运行：

```bash
export CUDA_PATH=/usr/local/cuda-12.9 TENSORRT_ROOT_DIR=/usr
./tools/a2f_exporter/build-on-sdk.sh /root/Audio2Face-3D-SDK
./tools/a2f_exporter/export-fixtures.sh /root/Audio2Face-3D-SDK
```

`build-on-sdk.sh` 会把本目录链接进 SDK 的 samples CMake 并只编译本工具；不会重新下载模型。`export-fixtures.sh` 用 ffmpeg 把讯飞 24 kHz WAV 转为 16 kHz，然后离线运行模型。两个脚本都可再次运行，已有面部输出会跳过。导出结果保存在 `runtime/public/fixtures/a2f/NN-face.json`，应用从这些静态文件读取。生成后需验证十个文件的通道、帧数、声音同步和小虎子表情，再更新 manifest 的 `faceSource`、`face` 字段。

当前服务端只用于离线导出。实时接入须等本地静态播放的面部效果验收后再做。
