import 'package:flutter/material.dart';
import 'teacher_surface_stub.dart'
    if (dart.library.js_interop) 'teacher_surface_web.dart'
    if (dart.library.io) 'teacher_surface_native.dart';

void main() => runApp(const MouthTeacherApp());

class MouthTeacherApp extends StatelessWidget {
  const MouthTeacherApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: '小虎子 · 中文说话练习',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      fontFamily: 'NotoSansSC',
      colorSchemeSeed: const Color(0xFF477963),
      useMaterial3: true,
    ),
    home: const MouthTeacherPage(),
  );
}

class MouthTeacherPage extends StatefulWidget {
  const MouthTeacherPage({super.key, this.modelBuilder});
  final Widget Function()? modelBuilder;
  @override
  State<MouthTeacherPage> createState() => _MouthTeacherPageState();
}

class _MouthTeacherPageState extends State<MouthTeacherPage> {
  final _url = TextEditingController(
    text: const String.fromEnvironment(
      'TEACHER_URL',
      defaultValue: 'http://127.0.0.1:8787/',
    ),
  );
  String _address = const String.fromEnvironment(
    'TEACHER_URL',
    defaultValue: 'http://127.0.0.1:8787/',
  );
  String? _error;
  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  void _connect() {
    final uri = Uri.tryParse(_url.text.trim());
    if (uri == null ||
        !['http', 'https'].contains(uri.scheme) ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty) {
      setState(() => _error = '请输入有效的服务地址，不要输入密钥');
      return;
    }
    setState(() {
      _address = uri.toString();
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('小虎子 · 中文说话练习'),
      actions: [
        IconButton(
          tooltip: '语音服务地址',
          icon: const Icon(Icons.settings_outlined),
          onPressed: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            builder: (context) => Padding(
              padding: EdgeInsets.fromLTRB(
                24,
                24,
                24,
                24 + MediaQuery.viewInsetsOf(context).bottom,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('开发服务地址'),
                  const SizedBox(height: 12),
                  const Text(
                    'iPad 与 Windows 连接同一家庭 Wi-Fi，在电脑用 -Lan 启动后，填写窗口中的 Home LAN 地址。首次连接需家庭连接码；127.0.0.1 指向 iPad 自己。密钥仅在 Windows 配置。',
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _url,
                    decoration: const InputDecoration(labelText: '服务 URL'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () {
                      _connect();
                      Navigator.pop(context);
                    },
                    child: const Text('连接'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
    body: SafeArea(
      child: Column(
        children: [
          if (_error != null)
            Padding(padding: const EdgeInsets.all(12), child: Text(_error!)),
          Expanded(
            child:
                widget.modelBuilder?.call() ??
                TeacherSurface(key: ValueKey(_address), url: _address),
          ),
        ],
      ),
    ),
  );
}
