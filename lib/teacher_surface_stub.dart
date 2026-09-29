import 'package:flutter/widgets.dart';

class TeacherSurface extends StatelessWidget {
  const TeacherSurface({super.key, required this.url});
  final String url;
  @override
  Widget build(BuildContext context) =>
      const Center(child: Text('此平台暂不支持实时渲染。'));
}
