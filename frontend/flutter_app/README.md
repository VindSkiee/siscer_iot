# Frontend - Plant IoT Mobile App

Aplikasi mobile Flutter untuk monitoring dan kontrol sistem IoT penyiraman tanaman berbasis sensor (DHT11, Soil Moisture, LDR).

## 📱 Fitur Aplikasi

- **Real-time Monitoring** — Menerima data sensor secara live via WebSocket
- **Kontrol ON/OFF** — Mengirim perintah ke perangkat IoT untuk mengaktifkan/menonaktifkan sistem
- **Grafik Real-time** — Visualisasi data sensor (temperature, humidity, soil moisture, light level) dalam bentuk line chart
- **Dark Mode Support** — Tema terang/gelap otomatis mengikuti sistem atau manual toggle
- **Prediksi ML** — Menampilkan hasil prediksi penyiraman dan jumlah air dari backend ML service

## 🛠️ Teknologi

- **Flutter** (SDK >= 3.0.0)
- **Dart**
- **Dependencies:**
  - `http` — HTTP request untuk kirim perintah ON/OFF
  - `web_socket_channel` — WebSocket client untuk streaming data real-time
  - `intl` — Format tanggal dan waktu
  - `fl_chart` — Library charting untuk visualisasi data

## 📋 Prasyarat

Sebelum menjalankan aplikasi, pastikan sudah install:

1. **Flutter SDK** (>= 3.0.0)
   - Download: https://flutter.dev/docs/get-started/install
   - Verifikasi instalasi: `flutter doctor`

2. **Editor/IDE** (pilih salah satu):
   - Visual Studio Code + Flutter extension
   - Android Studio + Flutter plugin
   - IntelliJ IDEA + Flutter plugin

3. **Emulator/Device:**
   - Android: Android Studio AVD atau device fisik dengan USB debugging enabled
   - iOS: Xcode simulator (macOS only) atau iPhone fisik
   - Windows/Linux/macOS: Bisa run sebagai desktop app

4. **Backend Running:**
   - Backend IoT server harus sudah running di `http://192.168.1.6:4000` (atau ubah konfigurasi, lihat bagian Konfigurasi)
   - WebSocket server harus available di `ws://192.168.1.6:4000`

## 🚀 Quick Start

### 1. Clone & Navigate

```powershell
cd c:\Code-project-learn\project_SisCer\frontend\flutter_app
```

### 2. Install Dependencies

```powershell
flutter pub get
```

Atau untuk upgrade ke versi terbaru:

```powershell
flutter pub upgrade
```

### 3. Cek Setup Flutter

```powershell
flutter doctor
```

Pastikan tidak ada error critical. Jika ada warning tentang Android licenses:

```powershell
flutter doctor --android-licenses
```

### 4. Konfigurasi Backend URL

Edit file `lib/screens/home_screen.dart`, bagian atas:

```dart
// --- KONFIGURASI ---
const String backendHost = "192.168.1.6:4000";  // Ubah sesuai IP backend Anda
const String httpUrl = "http://$backendHost";
const String wsUrl = "ws://$backendHost";
```

**Tips mencari IP backend (Windows):**

```powershell
ipconfig
```

Cari IPv4 Address di adapter yang aktif (misal: Wi-Fi atau Ethernet).

### 5. Run Aplikasi

**Untuk Android/iOS (Mobile):**

```powershell
flutter run
```

Atau pilih device spesifik:

```powershell
# List semua device yang tersedia
flutter devices

# Run di device tertentu
flutter run -d <device-id>
```

**Untuk Windows Desktop:**

```powershell
flutter run -d windows
```

**Untuk Web:**

```powershell
flutter run -d chrome
```

### 6. Build untuk Production

**Android APK:**

```powershell
flutter build apk --release
```

Output: `build\app\outputs\flutter-apk\app-release.apk`

**Android App Bundle (untuk Google Play):**

```powershell
flutter build appbundle --release
```

**iOS (macOS only):**

```powershell
flutter build ios --release
```

**Windows:**

```powershell
flutter build windows --release
```

Output: `build\windows\x64\runner\Release\`

## 📂 Struktur Project

```
flutter_app/
├── lib/
│   ├── main.dart              # Entry point aplikasi
│   └── screens/
│       └── home_screen.dart   # Layar utama (monitoring & kontrol)
├── pubspec.yaml               # Dependencies & metadata
├── analysis_options.yaml      # Lint rules
└── README.md                  # Dokumentasi ini
```

## 🎨 Cara Menggunakan Aplikasi

### 1. Halaman Utama (Home Screen)

**Header:**
- Title: "IoT Penyiraman"
- Dark mode toggle button (icon moon/sun)

**Status Device:**
- Chip indicator: OFF (abu-abu) atau ON (hijau)
- Button: "Aktifkan Penyiraman" / "Matikan Penyiraman"

**Data Sensor Real-time:**
- Temperature (°C)
- Humidity (%)
- Soil Moisture (raw value)
- Light Level (raw value)
- Timestamp terakhir data diterima

**Prediksi ML:**
- Should Water: 0 (tidak perlu) atau 1 (perlu penyiraman)
- Water Amount: jumlah air dalam mL

**Grafik Real-time:**
- 4 line charts untuk setiap sensor
- Maksimal 20 data points (auto scroll)
- Grafik di-reset saat device ON/OFF

### 2. Kontrol Device

**Mengaktifkan:**
1. Tekan button "Aktifkan Penyiraman"
2. Loading indicator muncul
3. Jika sukses: status berubah ON, WebSocket connect, data mulai streaming
4. Jika gagal: dialog error muncul

**Menonaktifkan:**
1. Tekan button "Matikan Penyiraman"
2. Loading indicator muncul
3. WebSocket disconnect, grafik di-reset
4. Status berubah OFF

### 3. Dark Mode

- Toggle icon di app bar (kanan atas)
- Mode gelap: background hitam, teks putih
- Mode terang: background putih abu-abu, teks hitam

## 🔧 Troubleshooting

### Error: "Gagal connect WebSocket"

**Penyebab:**
- Backend tidak running
- IP/Port salah
- Firewall memblokir koneksi

**Solusi:**
1. Pastikan backend running: `cd backend && npm run dev`
2. Cek IP backend dengan `ipconfig` (Windows) atau `ifconfig` (Linux/macOS)
3. Update `backendHost` di `home_screen.dart`
4. Pastikan device mobile dan backend di jaringan yang sama (jika test via Wi-Fi)
5. Matikan firewall sementara atau buat exception untuk port 4000

### Error: "HTTP request timeout"

**Solusi:**
- Sama seperti WebSocket error di atas
- Cek apakah endpoint `POST /command` tersedia di backend
- Test manual dengan curl: `curl -X POST http://192.168.1.6:4000/command -d "command=ON"`

### Error: "Flutter SDK not found"

**Solusi:**
```powershell
# Cek PATH environment variable
flutter --version

# Jika tidak ditemukan, tambahkan Flutter ke PATH
# Contoh: C:\flutter\bin
```

### Error: "Gradle build failed" (Android)

**Solusi:**
1. Update Gradle wrapper:
   ```powershell
   cd android
   .\gradlew wrapper --gradle-version=8.0
   ```

2. Bersihkan build cache:
   ```powershell
   flutter clean
   flutter pub get
   flutter run
   ```

### Grafik tidak update/smooth

**Solusi:**
- WebSocket mungkin tidak stabil
- Cek koneksi jaringan (latency)
- Refresh dengan matikan/aktifkan device lagi

### Hot reload tidak bekerja

**Solusi:**
- Tekan `r` di terminal untuk hot reload
- Tekan `R` (capital) untuk hot restart
- Atau hentikan (`Ctrl+C`) dan run ulang: `flutter run`

## 📡 API Endpoints Backend

Aplikasi ini berkomunikasi dengan backend melalui:

### HTTP Endpoints

**POST /command**
- Body: `{ "command": "ON" }` atau `{ "command": "OFF" }`
- Response: `{ "status": "success", "command": "ON" }`

### WebSocket Endpoint

**WS /**
- Connect: `ws://192.168.1.6:4000`
- Message format (dari server):
  ```json
  {
    "timestamp": "2025-11-14T10:30:45.123Z",
    "sensors": {
      "temperature": 28.5,
      "humidity": 65.3,
      "soil_moisture": 512,
      "light_level": 450
    },
    "prediction": {
      "should_water": 1,
      "water_amount_ml": 250.5
    }
  }
  ```

## 🧪 Testing

### Manual Testing

1. Jalankan backend dan publisher dummy:
   ```powershell
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Test publisher
   cd backend
   node test-publisher.js
   ```

2. Jalankan Flutter app:
   ```powershell
   cd frontend\flutter_app
   flutter run
   ```

3. Tekan "Aktifkan Penyiraman" dan amati:
   - Data sensor update setiap beberapa detik
   - Grafik bergerak
   - Prediksi ML muncul

### Unit Testing (Future Enhancement)

Untuk menambahkan unit test:

```powershell
flutter test
```

## 🎯 Fitur Mendatang (TODO)

- [ ] Settings screen untuk konfigurasi backend URL via UI
- [ ] History screen untuk melihat data historis dari InfluxDB
- [ ] Push notification untuk alert (soil terlalu kering, dll)
- [ ] Export data ke CSV/Excel
- [ ] Multi-device support (monitor beberapa node sekaligus)
- [ ] Localization (multi-bahasa)
- [ ] Authentication/login

## 📝 Catatan Pengembangan

### Menambahkan Screen Baru

1. Buat file baru di `lib/screens/`, misal `settings_screen.dart`
2. Import di `main.dart`
3. Tambahkan route navigation:
   ```dart
   Navigator.push(
     context,
     MaterialPageRoute(builder: (context) => const SettingsScreen()),
   );
   ```

### Menambahkan Dependency Baru

1. Edit `pubspec.yaml`:
   ```yaml
   dependencies:
     nama_package: ^version
   ```

2. Install:
   ```powershell
   flutter pub get
   ```

3. Import di file Dart:
   ```dart
   import 'package:nama_package/nama_package.dart';
   ```

### Update Flutter SDK

```powershell
flutter upgrade
```

Setelah upgrade, jalankan:

```powershell
flutter pub upgrade --major-versions
flutter clean
flutter pub get
```

## 🤝 Kontribusi

Jika Anda ingin berkontribusi:

1. Fork repository
2. Buat branch baru: `git checkout -b feature/nama-fitur`
3. Commit perubahan: `git commit -m "Add: deskripsi fitur"`
4. Push ke branch: `git push origin feature/nama-fitur`
5. Buat Pull Request

## 📄 Lisensi

Proyek ini belum memiliki lisensi. Tambahkan field `license` di `pubspec.yaml` bila perlu.

## 📞 Kontak / Support

Jika mengalami masalah atau ada pertanyaan:
- Buka issue di GitHub repository: https://github.com/VindSkiee/siscer_iot
- Atau hubungi maintainer project

---

**Happy Coding!** 🚀
