import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';

// --- KONFIGURASI ---
const String backendHost = "192.168.1.5:4000";
const String httpUrl = "http://$backendHost";
const String wsUrl = "ws://$backendHost";

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isDeviceOn = false;
  Map<String, dynamic>? _latestData;
  WebSocketChannel? _channel;
  bool _isLoading = false;
  String? _error;
  
  // --- DARK MODE STATE ---
  bool _isDarkMode = false;

  final int _maxDataPoints = 20;
  double _timeCounter = 0;
  
  final List<FlSpot> _tempHistory = [];
  final List<FlSpot> _humHistory = [];
  final List<FlSpot> _soilHistory = [];
  final List<FlSpot> _lightHistory = [];

  @override
  void dispose() {
    _channel?.sink.close();
    super.dispose();
  }

  void _connectWebSocket() {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _channel!.stream.listen((message) {
        if (mounted) {
          final data = jsonDecode(message);
          final sensors = data['sensors'];

          setState(() {
            _latestData = data;
            _timeCounter++;
            
            _tempHistory.add(FlSpot(_timeCounter, (sensors['temperature'] as num).toDouble()));
            _humHistory.add(FlSpot(_timeCounter, (sensors['humidity'] as num).toDouble()));
            _soilHistory.add(FlSpot(_timeCounter, (sensors['soil_moisture'] as num).toDouble()));
            _lightHistory.add(FlSpot(_timeCounter, (sensors['light_level'] as num).toDouble()));

            if (_tempHistory.length > _maxDataPoints) {
              _tempHistory.removeAt(0);
              _humHistory.removeAt(0);
              _soilHistory.removeAt(0);
              _lightHistory.removeAt(0);
            }
          });
        }
      }, onDone: () {
        if (mounted) {
          setState(() {
            _isDeviceOn = false;
          });
        }
      }, onError: (error) {
        if (mounted) {
          setState(() {
            _error = "WebSocket error: $error";
            _isDeviceOn = false;
          });
        }
      });
    } catch (e) {
      setState(() {
        _error = "Gagal connect WS: $e";
      });
    }
  }

  void _resetCharts() {
    _timeCounter = 0;
    _tempHistory.clear();
    _humHistory.clear();
    _soilHistory.clear();
    _lightHistory.clear();
  }

  void _showErrorDialog(String title, String content) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("OK"),
          )
        ],
      ),
    );
  }

  Future<void> _sendCommand(String command) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await http.post(
        Uri.parse("$httpUrl/command"),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'command': command}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        if (command == "ON") {
          setState(() {
            _isDeviceOn = true;
            _latestData = null;
            _resetCharts();
          });
          _connectWebSocket();
        } else {
          setState(() {
            _isDeviceOn = false;
            _latestData = null;
          });
          _channel?.sink.close();
        }
      } else {
        throw Exception("Gagal: ${response.body}");
      }
    } catch (e) {
      String msg = "Error: $e";
      if (e is SocketException) msg = "Tidak bisa connect ke Backend.";
      setState(() => _error = msg);
      _showErrorDialog("Gagal", msg);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: _isDarkMode ? ThemeData.dark() : ThemeData.light(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text("Monitoring IoT"),
          centerTitle: true,
          actions: [
            // Toggle Dark Mode
            IconButton(
              icon: Icon(_isDarkMode ? Icons.light_mode : Icons.dark_mode),
              onPressed: () {
                setState(() {
                  _isDarkMode = !_isDarkMode;
                });
              },
              tooltip: _isDarkMode ? 'Light Mode' : 'Dark Mode',
            ),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  color: Colors.red.shade100,
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade900)),
                ),
              Expanded(
                child: _isDeviceOn ? _buildDataDisplay() : _buildDeviceOffScreen(),
              ),
              _buildControlButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDeviceOffScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.power_off_outlined,
            size: 80,
            color: _isDarkMode ? Colors.grey.shade600 : Colors.grey,
          ),
          const SizedBox(height: 10),
          Text(
            "Alat Mati",
            style: TextStyle(
              fontSize: 18,
              color: _isDarkMode ? Colors.grey.shade400 : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataDisplay() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_latestData == null) {
      return const Center(child: Text("Menunggu data..."));
    }

    final sensors = _latestData!['sensors'];
    final prediction = _latestData!['prediction'];
    final timestamp = DateFormat('HH:mm:ss').format(DateTime.parse(_latestData!['timestamp']).toLocal());

    return ListView(
      children: [
        Text(
          "Update: $timestamp",
          textAlign: TextAlign.center,
          style: TextStyle(color: _isDarkMode ? Colors.grey.shade400 : Colors.grey),
        ),
        const SizedBox(height: 10),
        
        _buildPredictionCard(prediction),
        const SizedBox(height: 20),
        
        _buildSensorGrid(sensors),
        
        const SizedBox(height: 30),
        const Text("Grafik Real-time", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),

        _buildChartSection("Grafik Suhu (°C)", _tempHistory, Colors.orange, 0, 50),
        _buildChartSection("Grafik Kelembaban (%)", _humHistory, Colors.blue, 0, 100),
        _buildChartSection("Grafik Soil Moisture", _soilHistory, Colors.brown, 0, 1024),
        _buildChartSection("Grafik Cahaya", _lightHistory, Colors.yellow.shade800, 0, 1024),
      ],
    );
  }

  Widget _buildPredictionCard(dynamic prediction) {
    final bool shouldWater = prediction['water_class']['prediction'] == 1;
    final String label = prediction['water_class']['label'];
    final String amount = prediction['water_amount']['label'];

    return Card(
      color: shouldWater ? const Color.fromARGB(255, 5, 141, 252) : const Color.fromARGB(255, 14, 255, 22),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  shouldWater ? Icons.water_drop : Icons.check_circle,
                  size: 30,
                  color: Colors.white,
                ),
                const SizedBox(width: 10),
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            if (shouldWater)
              Text(
                "Jumlah Air: $amount",
                style: const TextStyle(fontSize: 16, color: Colors.white),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSensorGrid(dynamic sensors) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      children: [
        _SensorCard(Icons.thermostat, "Suhu", "${sensors['temperature']} °C", Colors.orange, _isDarkMode),
        _SensorCard(Icons.opacity, "Udara", "${sensors['humidity']} %", Colors.blue, _isDarkMode),
        _SensorCard(Icons.grass, "Tanah", "${sensors['soil_moisture']}", Colors.brown, _isDarkMode),
        _SensorCard(Icons.wb_sunny, "Cahaya", "${sensors['light_level']}", Colors.yellow.shade700, _isDarkMode),
      ],
    );
  }

  Widget _buildChartSection(String title, List<FlSpot> data, Color color, double minY, double maxY) {
    // Warna untuk dark mode dan light mode
    final cardColor = _isDarkMode ? Colors.grey.shade900 : Colors.white;
    final gridColor = _isDarkMode ? Colors.grey.shade700 : Colors.grey.shade300;
    final borderColor = _isDarkMode ? Colors.grey.shade600 : Colors.grey.shade300;
    final textColor = _isDarkMode ? Colors.grey.shade400 : Colors.grey.shade700;
    
    return Card(
      elevation: 3,
      color: cardColor,
      margin: const EdgeInsets.only(bottom: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 16),
            
            SizedBox(
              height: 180,
              child: data.isEmpty
                  ? Center(
                      child: Text(
                        "Menunggu data...",
                        style: TextStyle(color: textColor),
                      ),
                    )
                  : LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: (maxY - minY) / 4,
                          getDrawingHorizontalLine: (value) => FlLine(
                            color: gridColor,
                            strokeWidth: 1,
                          ),
                        ),
                        
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 50,
                              interval: (maxY - minY) / 4,
                              getTitlesWidget: (value, meta) {
                                if (value < minY || value > maxY) {
                                  return const SizedBox.shrink();
                                }
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: Text(
                                    value.toStringAsFixed(0),
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: textColor,
                                    ),
                                    textAlign: TextAlign.right,
                                  ),
                                );
                              },
                            ),
                          ),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 28,
                              interval: data.length > 6 ? (data.length / 6).ceilToDouble() : 1,
                              getTitlesWidget: (value, meta) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    value.toInt().toString(),
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: textColor,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        
                        borderData: FlBorderData(
                          show: true,
                          border: Border.all(color: borderColor),
                        ),
                        
                        minY: minY,
                        maxY: maxY,
                        
                        lineTouchData: LineTouchData(
                          touchTooltipData: LineTouchTooltipData(
                            getTooltipColor: (spot) => color,
                            tooltipPadding: const EdgeInsets.all(8),
                            tooltipBorderRadius: BorderRadius.circular(8),
                            getTooltipItems: (spots) => spots.map((spot) {
                              return LineTooltipItem(
                                spot.y.toStringAsFixed(1),
                                const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        
                        lineBarsData: [
                          LineChartBarData(
                            spots: data,
                            isCurved: true,
                            color: color,
                            barWidth: 3,
                            dotData: const FlDotData(show: false),
                            belowBarData: BarAreaData(
                              show: true,
                              // ignore: deprecated_member_use
                              color: color.withOpacity(0.2),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: _isDeviceOn ? Colors.red : Colors.green,
          padding: const EdgeInsets.symmetric(vertical: 15),
        ),
        onPressed: _isLoading ? null : () => _sendCommand(_isDeviceOn ? "OFF" : "ON"),
        child: Text(
          _isDeviceOn ? "Matikan Alat" : "Aktifkan Alat",
          style: const TextStyle(color: Colors.white, fontSize: 18),
        ),
      ),
    );
  }
}

class _SensorCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;
  final bool isDarkMode;

  const _SensorCard(this.icon, this.title, this.value, this.color, this.isDarkMode);

  @override
  Widget build(BuildContext context) {
    return Card(
      color: isDarkMode ? Colors.grey.shade800 : Colors.white,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 5),
          Text(
            title,
            style: TextStyle(
              color: isDarkMode ? Colors.grey.shade400 : Colors.grey,
              fontSize: 12,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: isDarkMode ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}