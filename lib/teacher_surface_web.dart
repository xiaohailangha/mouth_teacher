import 'dart:ui_web' as ui_web;
import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

class TeacherSurface extends StatefulWidget {
  const TeacherSurface({super.key, required this.url});
  final String url;
  @override
  State<TeacherSurface> createState() => _TeacherSurfaceState();
}

class _TeacherSurfaceState extends State<TeacherSurface> {
  static int _nextId = 0;
  late final String _viewType;
  late final web.HTMLIFrameElement _frame;
  @override
  void initState() {
    super.initState();
    _viewType = 'teacher-runtime-${_nextId++}';
    _frame = web.HTMLIFrameElement()
      ..src = widget.url
      ..title = '小虎子实时说话'
      ..allow = 'autoplay'
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%';
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (_) => _frame);
  }

  @override
  void dispose() {
    _frame.src = 'about:blank';
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);
}
