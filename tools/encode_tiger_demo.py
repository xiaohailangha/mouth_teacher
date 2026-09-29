"""Encode the already rendered mouth-test PNG frames into an MP4 preview."""

import os
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).with_name(".vendor")))
import imageio_ffmpeg  # noqa: E402


preview_dir = Path(r"D:\AI语言训练\卡通人物\小虎子人物\预览")
frames = sorted((preview_dir / "动作帧").glob("frame_*.png"))
output = preview_dir / "小虎男孩_嘴部动作验证.mp4"
assert len(frames) == 39, f"Expected 39 rendered frames, got {len(frames)}"
assert not output.exists(), "Refusing to overwrite the preview video"
with Image.open(frames[0]) as image:
    size = image.size
writer = imageio_ffmpeg.write_frames(str(output), size=size, fps=12, codec="libx264",
                                     pix_fmt_in="rgb24", quality=8,
                                     output_params=["-movflags", "+faststart"])
writer.send(None)
try:
    for path in frames:
        with Image.open(path) as image:
            assert image.size == size, path
            writer.send(image.convert("RGB").tobytes())
finally:
    writer.close()
print(f"TIGER_DEMO_VIDEO={output} size={os.path.getsize(output)} frames={len(frames)}")
