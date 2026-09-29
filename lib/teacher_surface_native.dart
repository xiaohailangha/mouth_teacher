import 'dart:io';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

class TeacherSurface extends StatefulWidget {
  const TeacherSurface({super.key, required this.url});
  final String url;
  @override
  State<TeacherSurface> createState() => _TeacherSurfaceState();
}

class _TeacherSurfaceState extends State<TeacherSurface>
    with WidgetsBindingObserver {
  WebViewController? _controller;
  String? _error;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (Platform.isIOS || Platform.isAndroid || Platform.isMacOS) {
      final PlatformWebViewControllerCreationParams params =
          Platform.isIOS || Platform.isMacOS
          ? WebKitWebViewControllerCreationParams(
              allowsInlineMediaPlayback: true,
              mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
            )
          : const PlatformWebViewControllerCreationParams();
      _controller = WebViewController.fromPlatformCreationParams(params)
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (_) {
              if (mounted) setState(() => _error = null);
            },
            onNavigationRequest: (request) {
              final destination = Uri.tryParse(request.url);
              final service = Uri.parse(widget.url);
              return destination != null &&
                      ['http', 'https'].contains(destination.scheme) &&
                      destination.origin == service.origin
                  ? NavigationDecision.navigate
                  : NavigationDecision.prevent;
            },
            onWebResourceError: (error) {
              if (mounted && error.isForMainFrame == true) {
                setState(() => _error = '服务未连接：请检查地址及网络。');
              }
            },
          ),
        )
        ..loadRequest(Uri.parse(widget.url));
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      _controller?.runJavaScript('window.teacher?.pause()').catchError((_) {});
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.runJavaScript('window.teacher?.stop()').catchError((_) {});
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null) {
      return const Center(
        child: Text('Windows 请使用 flutter run -d chrome 验证实时渲染。'),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                setState(() => _error = null);
                _controller!.loadRequest(Uri.parse(widget.url));
              },
              child: const Text('重新连接'),
            ),
          ],
        ),
      );
    }
    return WebViewWidget(controller: _controller!);
  }
}
