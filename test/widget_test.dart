import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mouth_teacher/main.dart';

void main() {
  testWidgets('shows the 3D mouth teacher controls', (tester) async {
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(home: MouthTeacherPage(modelBuilder: () => const SizedBox())),
    );

    expect(find.text('小虎子 · 中文说话练习'), findsOneWidget);
    await tester.tap(find.byTooltip('语音服务地址'));
    await tester.pumpAndSettle();
    expect(find.text('开发服务地址'), findsOneWidget);
    expect(find.text('连接'), findsOneWidget);
  });
}
