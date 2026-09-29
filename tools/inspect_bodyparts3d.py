from pathlib import Path

root = Path(r"D:\AI语言训练\mouth_teacher\work\bodyparts3d_obj")
for file_id in ("FJ2810", "FJ2814", "FJ2761", "FJ3289", "FJ3375", "FJ3269", "FJ1252", "FJ1253", "FJ1279", "FJ1272"):
    path = root / f"{file_id}.obj"
    lows = [float("inf")] * 3
    highs = [float("-inf")] * 3
    count = 0
    with path.open(encoding="utf-8") as source:
        for line in source:
            if not line.startswith("v "):
                continue
            point = [float(value) for value in line.split()[1:4]]
            count += 1
            for axis in range(3):
                lows[axis] = min(lows[axis], point[axis])
                highs[axis] = max(highs[axis], point[axis])
    print(file_id, count, tuple(round(v, 2) for v in lows), tuple(round(v, 2) for v in highs))
