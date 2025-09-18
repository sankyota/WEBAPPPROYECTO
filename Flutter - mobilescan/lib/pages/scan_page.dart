import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../api/api.dart';

class ScanPage extends StatefulWidget {
  final Api api;
  const ScanPage({super.key, required this.api});

  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  bool _handling = false;
  String? _lastCode;

  void _goToForm(String initialCode) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RegistrarActivoForm(
          api: widget.api,
          scannedCode: initialCode, // SKU pre-llenado si viene del escaneo
        ),
      ),
    );
  }

  Future<void> _onDetect(BarcodeCapture cap) async {
    if (_handling) return;

    final candidate = cap.barcodes.firstWhere(
      (b) => b.rawValue != null && b.rawValue!.isNotEmpty && b.format != BarcodeFormat.qrCode,
      orElse: () => Barcode(rawValue: null, format: BarcodeFormat.unknown),
    );

    final code = candidate.rawValue;
    if (code == null || code == _lastCode) return;

    _handling = true;
    _lastCode = code;
    try {
      if (!mounted) return;
      _goToForm(code);
    } finally {
      _handling = false;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar activo')),
      body: Column(
        children: [
          // Cámara SIEMPRE presente (en PC pedirá permiso; si no lo dan, igual tienes el botón manual)
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  controller: _controller,
                  fit: BoxFit.cover,
                  onDetect: _onDetect,
                ),
                // Controles superpuestos (linterna / cambiar cámara)
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: Column(
                    children: [
                      FloatingActionButton.small(
                        heroTag: 'torch',
                        onPressed: () => _controller.toggleTorch(),
                        child: const Icon(Icons.flash_on),
                      ),
                      const SizedBox(height: 8),
                      FloatingActionButton.small(
                        heroTag: 'flip',
                        onPressed: () => _controller.switchCamera(),
                        child: const Icon(Icons.cameraswitch),
                      ),
                    ],
                  ),
                ),
                // Mensaje guía
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 78,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Apunta al código de barras…',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Botón para abrir el formulario manualmente
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _goToForm(""),
                icon: const Icon(Icons.edit_note),
                label: const Text('Registrar manualmente'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// ---------- FORMULARIO DE REGISTRO ----------
class RegistrarActivoForm extends StatefulWidget {
  final Api api;
  final String scannedCode;
  const RegistrarActivoForm({
    super.key,
    required this.api,
    required this.scannedCode,
  });

  @override
  State<RegistrarActivoForm> createState() => _RegistrarActivoFormState();
}

class _RegistrarActivoFormState extends State<RegistrarActivoForm> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _skuCtrl;       // ItemCode (SKU)
  final _itemNameCtrl = TextEditingController();    // requerido
  final _marcaCtrl = TextEditingController();
  final _modeloCtrl = TextEditingController();
  final _precioCtrl = TextEditingController();

  DateTime _fechaCompra = DateTime.now();
  bool _disponible = true;          // Disponible / Pérdida
  String _currency = 'USD';         // USD / PEN
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _skuCtrl = TextEditingController(text: widget.scannedCode); // puede venir vacío
  }

  @override
  void dispose() {
    _skuCtrl.dispose();
    _itemNameCtrl.dispose();
    _marcaCtrl.dispose();
    _modeloCtrl.dispose();
    _precioCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _fechaCompra,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => _fechaCompra = picked);
  }

  String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final itemCode = _skuCtrl.text.trim();
    final nombre   = _itemNameCtrl.text.trim();
    final marca    = _marcaCtrl.text.trim().isEmpty  ? null : _marcaCtrl.text.trim();
    final modelo   = _modeloCtrl.text.trim().isEmpty ? null : _modeloCtrl.text.trim();
    final precio   = double.tryParse(_precioCtrl.text.trim().replaceAll(',', '.')) ?? 0.0;
    final fecha    = _fmt(_fechaCompra);

    try {
      // 1) ¿Existe ya ese SKU?
      final existente = await widget.api.obtenerPorItemCode(itemCode);

      if (existente == null) {
        // 2) Crear activo (SKU = ItemCode). Puedes guardar BarCode = código escaneado si quieres.
        final ok = await widget.api.crearActivo(
          itemCode: itemCode,
          itemName: nombre,
          marca: marca,
          modelo: modelo,
          barCode: widget.scannedCode.isEmpty ? null : widget.scannedCode,
          fechaCompra: fecha,
          price: precio,
          currency: _currency,
        );
        if (!ok) throw Exception('No se pudo crear el activo');
      }

      // 3) Actualizar estado si no es "Disponible"
      if (!_disponible) {
        final activo = await widget.api.obtenerPorItemCode(itemCode);
        if (activo?.id != null) {
          final okEstado = await widget.api.actualizarEstado(
            id: activo!.id!,
            estado: 'Pérdida',
          );
          if (!okEstado) throw Exception('No se pudo actualizar el estado');
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ Activo $itemCode guardado correctamente')),
      );
      Navigator.of(context).pop(); // volver a la cámara
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fechaTxt = _fmt(_fechaCompra);

    return Scaffold(
      appBar: AppBar(title: const Text('Registrar Activo')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _skuCtrl,
                decoration: const InputDecoration(
                  labelText: 'SKU (ItemCode)',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa el SKU' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _itemNameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Item Name',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa el nombre' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _marcaCtrl,
                decoration: const InputDecoration(
                  labelText: 'Marca (opcional)',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _modeloCtrl,
                decoration: const InputDecoration(
                  labelText: 'Modelo (opcional)',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),

              // Moneda USD / PEN
              DropdownButtonFormField<String>(
                value: _currency,
                decoration: const InputDecoration(
                  labelText: 'Moneda (Currency)',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: const [
                  DropdownMenuItem(value: 'USD', child: Text('USD - Dólar')),
                  DropdownMenuItem(value: 'PEN', child: Text('PEN - Sol')),
                ],
                onChanged: (v) => setState(() => _currency = v ?? 'USD'),
              ),

              const SizedBox(height: 12),
              SwitchListTile(
                title: const Text('Disponible'),
                value: _disponible,
                onChanged: (v) => setState(() => _disponible = v),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Fecha de compra',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      controller: TextEditingController(text: fechaTxt),
                      onTap: _pickDate,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _pickDate,
                    child: const Text('Cambiar'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _precioCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Precio',
                  hintText: _currency == 'PEN' ? '0.00 (PEN)' : '0.00 (USD)',
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _guardar,
                  icon: const Icon(Icons.save),
                  label: Text(_saving ? 'Guardando...' : 'Guardar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
