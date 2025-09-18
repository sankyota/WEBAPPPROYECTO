import 'package:dio/dio.dart';

class Activo {
  final int? id;
  final String itemCode; // SKU
  final String? itemName;
  final String? marca;
  final String? modelo;
  final String? barCode;

  // Campos extra de tu tabla
  final String? estado;            // 'Disponible', 'Pérdida', 'Mantenimiento'
  final String? fechaCompra;       // 'yyyy-MM-dd'
  final double? price;             // decimal(10,2)
  final String? currency;          // 'USD' | 'PEN'
  final int? quantityOnStock;
  final int? itemsGroupCode;
  final String? fechaBaja;
  final String? motivoBaja;

  Activo({
    this.id,
    required this.itemCode,
    this.itemName,
    this.marca,
    this.modelo,
    this.barCode,
    this.estado,
    this.fechaCompra,
    this.price,
    this.currency,
    this.quantityOnStock,
    this.itemsGroupCode,
    this.fechaBaja,
    this.motivoBaja,
  });

  factory Activo.fromJson(Map<String, dynamic> j) => Activo(
        id: (j['id'] is int)
            ? j['id'] as int
            : (j['id'] is String ? int.tryParse(j['id']) : null),
        itemCode:
            (j['ItemCode'] ?? j['itemCode'] ?? j['codigo'] ?? '').toString(),
        itemName: j['ItemName'] as String?,
        marca: j['marca'] as String?,
        modelo: j['modelo'] as String?,
        barCode: (j['BarCode'] ?? j['barcode']) as String?,
        estado: j['estado'] as String?,
        fechaCompra: _asDateYmd(j['fecha_compra']),
        price: _asDouble(j['Price']),
        currency: _asCurrency(j['Currency']),
        quantityOnStock: _asInt(j['QuantityOnStock']),
        itemsGroupCode: _asInt(j['ItemsGroupCode']),
        fechaBaja: _asDateYmd(j['FechaBaja']),
        motivoBaja: j['MotivoBaja'] as String?,
      );

  Map<String, dynamic> toCreatePayload() => {
        "ItemCode": itemCode,
        "ItemName": itemName ?? "NO ESPECIFICADO",
        "marca": (marca == null || marca!.trim().isEmpty)
            ? "NO ESPECIFICADA"
            : marca,
        "modelo":
            (modelo == null || modelo!.trim().isEmpty) ? "NO ESPECIFICADO" : modelo,
        "fecha_compra": fechaCompra,
        "Price": price ?? 0.0,
        "Currency": _asCurrency(currency) ?? "USD",
        "BarCode": barCode,
        "QuantityOnStock": quantityOnStock ?? 0,
        "ItemsGroupCode": itemsGroupCode,
        "FechaBaja": fechaBaja,
        "MotivoBaja": motivoBaja,
      };

  static String? _asDateYmd(dynamic v) {
    if (v == null) return null;
    final s = v.toString();
    if (s.isEmpty) return null;
    // admite 'yyyy-MM-dd', DateTime, o 'yyyy-MM-ddTHH:mm:ss...'
    if (v is DateTime) {
      return '${v.year.toString().padLeft(4, '0')}-'
          '${v.month.toString().padLeft(2, '0')}-'
          '${v.day.toString().padLeft(2, '0')}';
    }
    return s.length >= 10 ? s.substring(0, 10) : s;
  }

  static double? _asDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString().replaceAll(',', '.'));
  }

  static int? _asInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    return int.tryParse(v.toString());
  }

  static String? _asCurrency(dynamic v) {
    if (v == null) return null;
    final s = v.toString().toUpperCase();
    if (s == 'USD' || s == 'PEN') return s;
    return null;
  }
}

class Api {
  final Dio _dio;

  Api(String baseUrl, {String? token})
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 20),
            headers: {
              'Content-Type': 'application/json',
              if (token != null && token.isNotEmpty)
                'Authorization': 'Bearer $token',
            },
          ),
        );

  /// Cambia/borra el token en caliente
  void setAuthToken(String? token) {
    if (token == null || token.isEmpty) {
      _dio.options.headers.remove('Authorization');
    } else {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

   /// Login contra /api/login y guarda el Bearer automáticamente
  /// Devuelve mensajes claros en vez de “DioException…”
  Future<void> login(String username, String password) async {
    try {
      final res = await _dio.post(
        '/api/login',
        data: {'username': username, 'password': password},
        // ← No lances excepción por 4xx; lo manejamos nosotros
        options: Options(validateStatus: (_) => true),
      );

      final sc = res.statusCode ?? 0;

      if (sc == 200 || sc == 201) {
        final token = (res.data is Map)
            ? ((res.data['token'] ??
                res.data['accessToken'] ??
                res.data['jwt']) as String?)
            : null;
        if (token == null || token.isEmpty) {
          throw Exception('La respuesta de /api/login no contiene token.');
        }
        setAuthToken(token);
        return;
      }

      if (sc == 401) {
        // credenciales inválidas
        final msg = (res.data is Map && res.data['error'] != null)
            ? res.data['error'].toString()
            : 'Usuario o contraseña incorrectos.';
        throw Exception(msg);
      }

      if (sc == 403) {
        throw Exception('Acceso denegado. Verifica permisos.');
      }

      final fallback = (res.data is Map && res.data['error'] != null)
          ? res.data['error'].toString()
          : 'Error inesperado (${res.statusCode}).';
      throw Exception(fallback);
    } on DioException catch (e) {
      // errores de red/timeout → mensaje legible
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw Exception(
            'No se pudo conectar con el servidor. Revisa la red o el baseUrl.');
      }
      throw Exception('Error de red: ${e.message}');
    }
  }


  /// /api/ping (opcional en tu server)
  Future<bool> ping() async {
    try {
      final r = await _dio.get('/api/ping');
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// GET /api/activos — array plano o {data:[...]}
  Future<List<Activo>> listarActivos() async {
    try {
      final r = await _dio.get('/api/activos');
      final raw = r.data;

      if (raw is List) {
        return raw
            .whereType<Map>()
            .map((e) => Activo.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      if (raw is Map && raw['data'] is List) {
        final list = raw['data'] as List;
        return list
            .whereType<Map>()
            .map((e) => Activo.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('No autorizado (401). Debes iniciar sesión.');
      }
      if (e.response?.statusCode == 403) {
        throw Exception('Prohibido (403). Token inválido o sin permisos.');
      }
      rethrow;
    }
  }

  /// GET /api/activos/numero-serie/:ItemCode
  Future<Activo?> obtenerPorItemCode(String itemCode) async {
    try {
      final r = await _dio.get('/api/activos/numero-serie/$itemCode');
      if (r.data is Map) {
        return Activo.fromJson(Map<String, dynamic>.from(r.data as Map));
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// POST /api/activos — 1 registro
  Future<bool> crearActivo({
    required String itemCode, // SKU
    String? itemName,
    String? marca,
    String? modelo,
    String? barCode,
    String? fechaCompra, // yyyy-MM-dd
    double? price,
    String? currency, // 'USD' | 'PEN'
    int? quantityOnStock,
    int? itemsGroupCode,
    String? fechaBaja,
    String? motivoBaja,
  }) async {
    final payload = {
      "ItemCode": itemCode,
      "ItemName": (itemName ?? "NO ESPECIFICADO"),
      "marca": (marca == null || marca.trim().isEmpty)
          ? "NO ESPECIFICADA"
          : marca,
      "modelo": (modelo == null || modelo.trim().isEmpty)
          ? "NO ESPECIFICADO"
          : modelo,
      "fecha_compra": fechaCompra,
      "Price": price ?? 0.0,
      "Currency": Activo._asCurrency(currency) ?? "USD",
      "BarCode": barCode,
      "QuantityOnStock": quantityOnStock ?? 0,
      "ItemsGroupCode": itemsGroupCode,
      "FechaBaja": fechaBaja,
      "MotivoBaja": motivoBaja
    };

    final r = await _dio.post('/api/activos', data: payload);
    return r.statusCode == 201 || r.statusCode == 200;
  }

  /// POST /api/activos — batch (tu back acepta array también)
  Future<bool> crearActivosBatch(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return true;
    final r = await _dio.post('/api/activos', data: items);
    return r.statusCode == 201 || r.statusCode == 200;
  }

  /// PUT /api/activos/:id — actualización completa
  Future<bool> actualizarActivo({
    required int id,
    required String itemCode, // SKU
    String? itemName,
    String? marca,
    String? modelo,
    String? barCode,
    String? fechaCompra, // yyyy-MM-dd
    double? price,
    String? currency, // 'USD' | 'PEN'
    int? quantityOnStock,
    int? itemsGroupCode,
    String? fechaBaja,
    String? motivoBaja,
  }) async {
    final body = {
      "ItemCode": itemCode,
      "ItemName": (itemName ?? "NO ESPECIFICADO"),
      "marca": (marca == null || marca.trim().isEmpty)
          ? "NO ESPECIFICADA"
          : marca,
      "modelo": (modelo == null || modelo.trim().isEmpty)
          ? "NO ESPECIFICADO"
          : modelo,
      "fecha_compra": fechaCompra,
      "Price": price ?? 0.0,
      "Currency": Activo._asCurrency(currency) ?? "USD",
      "BarCode": barCode,
      "QuantityOnStock": quantityOnStock ?? 0,
      "ItemsGroupCode": itemsGroupCode,
      "FechaBaja": fechaBaja,
      "MotivoBaja": motivoBaja,
    };
    final r = await _dio.put('/api/activos/$id', data: body);
    return r.statusCode == 200;
  }

  /// PUT /api/activos/:id/estado — 'Disponible' | 'Pérdida'
  Future<bool> actualizarEstado({
    required int id,
    required String estado,
  }) async {
    final r =
        await _dio.put('/api/activos/$id/estado', data: {'estado': estado});
    return r.statusCode == 200;
  }

  /// Registrar por código (barcode): si existe OK; si no, crea con SKU = código
  Future<bool> registrarPorQR(String rawCode) async {
    final code = _extractCode(rawCode);
    final existente = await obtenerPorItemCode(code);
    if (existente != null) return true;
    return crearActivo(itemCode: code);
  }

  /// Alias más semántico para barcodes
  Future<bool> registrarPorCodigo(String rawCode) => registrarPorQR(rawCode);

  /// Extrae ?code= de una URL o devuelve el texto original
  String _extractCode(String raw) {
    final uri = Uri.tryParse(raw);
    if (uri != null && uri.queryParameters.isNotEmpty) {
      return uri.queryParameters['code'] ?? raw;
    }
    return raw;
  }

  bool get isAuthed =>
      (_dio.options.headers['Authorization'] as String?)?.isNotEmpty == true;
}
