class Activo {
  final int? id;
  final String codigo;
  final String? descripcion;
  final String? modelo;
  final String? serie;
  final String? area;

  Activo({
    this.id,
    required this.codigo,
    this.descripcion,
    this.modelo,
    this.serie,
    this.area,
  });

  factory Activo.fromJson(Map<String, dynamic> j) => Activo(
        id: j['id'] as int?,
        codigo: j['codigo'] as String,
        descripcion: j['descripcion'] as String?,
        modelo: j['modelo'] as String?,
        serie: j['serie'] as String?,
        area: (j['area'] ?? j['area_nombre']) as String?,
      );
}
