import 'package:flutter/material.dart';
import '../api/api.dart';
import 'scan_page.dart';

class ActivosPage extends StatefulWidget {
  final Api api;
  const ActivosPage({super.key, required this.api});

  @override
  State<ActivosPage> createState() => _ActivosPageState();
}

class _ActivosPageState extends State<ActivosPage> {
  final _ctrl = TextEditingController();
  List<Activo> _items = [];
  List<Activo> _filtered = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await widget.api.listarActivos();
      setState(() {
        _items = list;
        _filtered = list;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applyFilter() {
    final q = _ctrl.text.trim().toLowerCase();
    if (q.isEmpty) {
      setState(() => _filtered = _items);
      return;
    }
    setState(() {
      _filtered = _items.where((a) {
        final s = [
          a.itemCode,
          a.itemName ?? '',
          a.marca ?? '',
          a.modelo ?? '',
          a.barCode ?? '',
        ].join(' ').toLowerCase();
        return s.contains(q);
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Activos')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: const InputDecoration(
                      hintText: 'Buscar por ItemCode / nombre / marca / modelo',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (_) => _applyFilter(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _load,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      itemCount: _filtered.length,
                      itemBuilder: (ctx, i) {
                        final a = _filtered[i];
                        final subtitle = [
                          if (a.itemName?.isNotEmpty == true) a.itemName,
                          if (a.marca?.isNotEmpty == true) a.marca,
                          if (a.modelo?.isNotEmpty == true) a.modelo,
                          if (a.barCode?.isNotEmpty == true) 'QR:${a.barCode}',
                        ].whereType<String>().join(' • ');
                        return ListTile(
                          leading: const Icon(Icons.inventory_2),
                          title: Text(a.itemCode),
                          subtitle: subtitle.isEmpty ? null : Text(subtitle),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ScanPage(api: widget.api)),
        ),
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Escanear'),
      ),
    );
  }
}
