import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'package:dio/dio.dart';

import 'api/api.dart';
import 'pages/login_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 👇 IP LAN de tu PC (misma red que el teléfono)
  const pcLanIp = '192.168.18.3';
  const port = 3000;

  // Si usas EMULADOR (no teléfono físico), pon true
  const usingEmulator = false;

  final baseUrl = await _detectBaseUrl(
    pcLanIp: pcLanIp,
    port: port,
    usingEmulator: usingEmulator,
  );

  // ignore: avoid_print
  print('➡️ Usando API baseUrl: $baseUrl');

  final api = Api(baseUrl);
  runApp(MyApp(api: api));
}

class MyApp extends StatelessWidget {
  final Api api;
  const MyApp({super.key, required this.api});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Activos QR',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
      debugShowCheckedModeBanner: false,
      home: LoginPage(api: api),
    );
  }
}

/// Intenta varios endpoints y devuelve el primero que responde.
/// Para probar conectividad usa GET '/' (público en tu server).
Future<String> _detectBaseUrl({
  required String pcLanIp,
  required int port,
  required bool usingEmulator,
}) async {
  final candidates = <String>[
    if (kIsWeb) 'http://localhost:$port',
    if (kIsWeb) 'http://$pcLanIp:$port',
    if (!kIsWeb && usingEmulator && Platform.isAndroid) 'http://10.0.2.2:$port',
    if (!kIsWeb && usingEmulator && Platform.isIOS) 'http://127.0.0.1:$port',
    if (!kIsWeb) 'http://$pcLanIp:$port',
  ].where((e) => e.isNotEmpty).toList();

  for (final base in candidates) {
    if (await _isReachable(base)) return base;
  }
  // fallback
  return candidates.isNotEmpty ? candidates.first : 'http://$pcLanIp:$port';
}

Future<bool> _isReachable(String base) async {
  try {
    final dio = Dio(BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(seconds: 4),
      receiveTimeout: const Duration(seconds: 4),
    ));
    final r = await dio.get('/');
    return r.statusCode == 200;
  } catch (_) {
    return false;
  }
}
