# 离线 Audio2Face-3D v3.0 面部帧导出

本工具在 GPU 主机上使用 [NVIDIA 官方 Audio2Face-3D-SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK) 与已生成的 v3.0 TensorRT 模型。输入为 16 kHz 单声道 WAV，输出为 52 路面部和 16 路舌头 blendshape 权重、60 FPS 时间序列。它不包含 NVIDIA 模型或密钥。

已有 SDK 构建与模型时，在 GPU 主机放入本目录和十句 WAV，再运行：

```bash
export CUDA_PATH=/usr/local/cuda-12.9 TENSORRT_ROOT_DIR=/usr
./tools/a2f_exporter/build-on-sdk.sh /root/Audio2Face-3D-SDK
./tools/a2f_exporter/export-fixtures.sh /root/Audio2Face-3D-SDK
```

`build-on-sdk.sh` 会把本目录链接进 SDK 的 samples CMake 并只编译本工具；不会重新下载模型。`export-fixtures.sh` 优先用 ffmpeg 把讯飞 24 kHz WAV 转为 16 kHz；没有 ffmpeg 时使用 Python 3.11 的 `audioop` 转换。已有面部与舌头双通道输出会跳过。新版结果保存在 `runtime/public/fixtures/a2f/NN-full.json`，旧版 `NN-face.json` 保留给更新前已打开的页面，避免把不同 schema 发布到同一 URL。

2026-09-29 已用官方 v3.0 SDK 和模型在腾讯云 GPU 上重导十句，全部为 52 路面部、16 路舌头、60 FPS，共 164–235 帧/句；本地 `npm test` 检查 WAV、帧时长、双通道映射和非零下颌、整体舌体动作。页面可通过 `cd runtime && npm start` 打开，直接输入清单中完全相同的句子离线播放。

## 新句子在线推断

GPU 已安装 SDK、模型及本工具时，在 GPU 主机运行 `python3 tools/a2f_exporter/worker.py`。它只监听 `127.0.0.1:8799`，接收最长 30 秒的 24 kHz 单声道 PCM WAV，调用官方 SDK 输出面部和舌头帧。本地电脑通过 SSH 隧道连接，例如 `ssh -N -L 127.0.0.1:8799:127.0.0.1:8799 root@<GPU_IP>`；不要把 GPU 的 8799 端口开放到公网。`worker.py` 需要 Python 3.11、`CUDA_PATH=/usr/local/cuda-12.9` 和 `TENSORRT_ROOT_DIR=/usr`（默认已设置）。

在本地服务的进程环境里配置已有的 `XFYUN_APP_ID`、`XFYUN_API_KEY`、`XFYUN_API_SECRET` 和 `A2F_WORKER_URL=http://127.0.0.1:8799/`，再从 `runtime` 运行 `npm start`。不要将密钥写进仓库。主播放入口对任意新句子依次调用讯飞合成、GPU A2F 推断，再以音频时钟同步播放两路权重；GPU 关机时，十句离线样例仍可用。在线版目前为整句推断后播放，不是低延迟流式服务；实测短句约 8–15 秒生成，随音频长度及云机负载变化。

应用当前仅把 NVIDIA 舌头权重中小虎 R31 模型已有对应动作的部分映射到形态键，并没有直接使用 NVIDIA 舌头顶点几何。`tongueUp` 等整体动作有明显变化；十句的 `tongueTipUp` 最大约 0.02、`tongueStretch` 为 0，所以“啦、哒、嘎”的舌尖/舌根准确发音尚未成立。源舌头与小虎网格拓扑不同，完整几何动画需要另做蒙皮/形变迁移和视觉验收。面部表情输入目前固定为 neutral；A2F 不会仅凭这批音频自动产生丰富的情绪表演。

剖面观察默认勾选“舌体动作增强”，只放大 A2F 的舌体上抬与内收可视权重，峰值限制在 0.85；原始帧文件和声音均不修改。取消勾选即可在同一音频时间点看原始权重。增强不会补出 A2F 没有提供的舌尖动作，也不能作为发音教学标注。离线 WAV 文件支持 HTTP Range，可暂停并拖动到固定帧比较。

当前方案已完成整句在线接入；低延迟流式播放、长句切片和完整舌体几何迁移仍未完成。这批帧不能证明教学舌位准确性。
