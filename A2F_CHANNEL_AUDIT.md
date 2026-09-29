# Audio2Face-3D v3.0 通道与小虎 R31 模型核对

核对范围：`runtime/public/fixtures/a2f/01-full.json` 至 `10-full.json`，讯飞 `x6_shiwangxiaoxin_pro` 十句离线音频。结论只适用于这些样例，不代表 A2F 对所有语音都会输出相同幅度。

- 面部 52 路：名称全部匹配 R31 的非空形态键，并按音频时钟采样。原有表情选项与随机眨眼现在不会在 A2F 播放期间覆盖 A2F 的权重。
- 舌头 16 路：原始值全部保存在帧的 `rawTongue`，分别映射到 16 个独立控制。R31 原有 8 个对应形变，另外 8 个由 `a2f-r31-tongue.mjs` 在加载时给舌网格添加局部形变。新增形变只是实验性几何映射，尚未经过语音治疗师的舌位标定和所有姿态的穿模检查。
- 十句中未出现的通道保留映射，但不能借此声称这些动作已在真实语音下验证。A2F 的舌位是由音频推断的，不等于说话者的实测舌位。

| 原始舌通道 | 十句峰值 | R31 控制 | 来源 |
| --- | ---: | --- | --- |
| tongueTipUp | 0.019 | tongueTipRaisePreview | 原模型 |
| tongueTipDown | 0.083 | tongueTipLowerPreview | 原模型 |
| tongueTipLeft | 0 | tongueTipLeft | 新增实验形变 |
| tongueTipRight | 0 | tongueTipRight | 新增实验形变 |
| tongueRollUp | 0 | tongueTipCurl | 原模型 |
| tongueRollDown | 0.218 | tongueRollDown | 新增实验形变 |
| tongueRollLeft | 0 | tongueRollLeft | 新增实验形变 |
| tongueRollRight | 0 | tongueRollRight | 新增实验形变 |
| tongueUp | 0.470 | tongueMiddleRaise | 原模型 |
| tongueDown | 0.435 | tongueDown | 新增实验形变 |
| tongueLeft | 0.017 | tongueLeft | 原模型 |
| tongueRight | 0.010 | tongueRight | 原模型 |
| tongueIn | 0.715 | tongueRetract | 原模型 |
| tongueStretch | 0 | tongueExtend | 原模型 |
| tongueWide | 0 | tongueWide | 新增实验形变 |
| tongueNarrow | 0.101 | tongueNarrow | 新增实验形变 |

这些数值解释了当前“舌尖基本不动”：`tongueTipUp` 在十句中峰值只有 0.019，页面即使完整接线也无法从它生成明显舌尖抬起。需要区分三件事：通道接线、模型形变质量、A2F 输出本身。下一轮若要逼近官方真人演示，应针对真正发出舌尖/侧向信号的测试音频取得样例，再修改舌网格形变与口腔接触，并做正面、侧面、张口程度组合的视觉验收；不应单纯把低权重放大当成准确发音舌位。
