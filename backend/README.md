# Backend - IoT MQTT to InfluxDB & API Server

Backend service Node.js yang berfungsi sebagai:
- **MQTT Subscriber** — Menerima data sensor dari perangkat IoT
- **InfluxDB Writer** — Menyimpan data sensor ke database time-series
- **ML Service Client** — Memanggil ML service untuk prediksi penyiraman
- **REST API Server** — Menyediakan endpoint untuk kontrol device (ON/OFF)
- **WebSocket Server** — Streaming data real-time ke frontend Flutter

## 🎯 Fitur

- ✅ Subscribe ke topik MQTT untuk menerima data sensor (DHT11, LDR, Soil Moisture)
- ✅ Parsing dan validasi payload JSON
- ✅ Menulis data ke InfluxDB dengan tag `device` dan `sensor_type`
- ✅ Integrasi dengan ML service untuk prediksi klasifikasi & regresi
- ✅ HTTP API untuk kontrol device (POST /command)
- ✅ WebSocket broadcast untuk real-time data streaming ke UI
- ✅ Graceful shutdown (flush InfluxDB, close MQTT)
- ✅ Periodic flush setiap 5 detik
- ✅ Environment-based configuration
- ✅ Test publisher untuk dummy data

## 🛠️ Teknologi

- **Node.js** (>= 16)
- **ES Modules** (type: "module")
- **Dependencies:**
  - `mqtt` — MQTT client
  - `@influxdata/influxdb-client` — InfluxDB 2.x client
  - `express` — HTTP server
  - `ws` — WebSocket server
  - `axios` — HTTP client untuk ML service
  - `cors` — Cross-Origin Resource Sharing
  - `dotenv` — Environment variables
  - `nodemon` — Auto-restart saat development

## 📋 Prasyarat

1. **Node.js** (>= 16.x)
   - Download: https://nodejs.org/

2. **MQTT Broker** (Mosquitto recommended)
   - Download: https://mosquitto.org/download/
   - Run: 
     ```powershell
     "C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\mosquitto.conf" -v
     ```

3. **InfluxDB 2.x**
   - Download: https://www.influxdata.com/downloads/
   - Buat organization, bucket, dan token dengan write permission
   - Default UI: http://localhost:8086

4. **ML Service** (Optional, untuk prediksi)
   - Python Flask service di `ml_service/` harus running di http://localhost:5000
   - Lihat README di folder `ml_service/` untuk setup

## 🚀 Quick Start

### 1. Navigate ke Backend

```powershell
cd c:\Code-project-learn\project_SisCer\backend
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Konfigurasi Environment Variables

Copy file `.env.example` menjadi `.env`:

```powershell
Copy-Item .env.example .env
```

Edit file `.env` dengan konfigurasi Anda:

```dotenv
# MQTT Broker
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=sensors/+/telemetry
MQTT_COMMAND_TOPIC=iot/alatku/command

# InfluxDB 2.x
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-influxdb-token-here
INFLUX_ORG=your-org-name
INFLUX_BUCKET=your-bucket-name

# HTTP Server
HTTP_PORT=4000
```

### 4. Cara Mendapatkan InfluxDB Token

1. Buka InfluxDB UI: http://localhost:8086
2. Login dengan kredensial Anda
3. Klik **Load Data** → **Tokens**
4. Klik **Generate Token** → **All Access Token** (atau custom dengan write permission ke bucket)
5. Copy token dan paste ke `.env` sebagai `INFLUX_TOKEN`

### 5. Run Backend

**Mode Development (auto-restart):**

```powershell
npm run dev
```

**Mode Production:**

```powershell
npm start
```

Output yang diharapkan:

```
✅ Connected to InfluxDB successfully!
✅ Connected to MQTT broker: mqtt://localhost:1883
Subscribed to sensors/+/telemetry granted: [...]
🚀 Server berjalan di http://0.0.0.0:4000
```

### 6. Test dengan Publisher Dummy

Di terminal terpisah, jalankan test publisher untuk mengirim data dummy:

```powershell
cd c:\Code-project-learn\project_SisCer\backend
node test-publisher.js
```

Atau dengan custom interval (contoh: setiap 3 detik):

```powershell
node test-publisher.js 3
```

## 📂 Struktur Project

```
backend/
├── src/
│   ├── index.js              # Main server (MQTT, InfluxDB, Express, WS)
│   └── ml_service_client.js  # Client untuk ML service API
├── test-publisher.js          # MQTT publisher dummy data
├── .env                       # Environment variables (JANGAN commit!)
├── .env.example               # Template env vars
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies & scripts
└── README.md                  # Dokumentasi ini
```

## 🔌 API Endpoints

### HTTP Endpoints

#### POST /command
Mengirim perintah ON/OFF ke perangkat IoT via MQTT.

**Request:**
```json
{
  "command": "ON"
}
```

atau

```json
{
  "command": "OFF"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "command": "ON"
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Command harus ON atau OFF"
}
```

**cURL Example:**
```powershell
curl -X POST http://localhost:4000/command -H "Content-Type: application/json" -d '{"command":"ON"}'
```

### WebSocket Endpoint

#### WS /

Connect untuk menerima streaming data sensor real-time.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:4000');
```

**Message Format (dari server):**
```json
{
  "timestamp": "2025-11-15T10:30:45.123Z",
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

## 📡 MQTT Topics

### Subscribe Topics

**MQTT_TOPIC** (default: `sensors/+/telemetry`)
- Topik untuk menerima data sensor dari perangkat IoT
- Format: `sensors/<device-id>/telemetry`
- Wildcard `+` untuk support multiple devices

### Publish Topics

**MQTT_COMMAND_TOPIC** (default: `iot/alatku/command`)
- Topik untuk mengirim perintah ke perangkat IoT
- Payload: `"ON"` atau `"OFF"`
- Dipublish saat frontend POST ke `/command`

## 📥 Payload Format

### Incoming MQTT Payload (dari IoT device)

```json
{
  "device": "node-01",
  "timestamp": 1700000000000,
  "dht11": {
    "temperature": 27.5,
    "humidity": 72.3
  },
  "ldr": {
    "value": 450
  },
  "soil": {
    "value": 512
  }
}
```

**Field descriptions:**
- `device` (optional) — Device ID, default extract dari topic
- `timestamp` (optional) — Unix timestamp ms, default `Date.now()`
- `dht11.temperature` — Suhu dalam Celsius
- `dht11.humidity` — Kelembaban udara dalam persen
- `ldr.value` — Light sensor reading (0-1023)
- `soil.value` — Soil moisture sensor reading (0-1023)

### InfluxDB Data Points

Backend menulis data ke InfluxDB dengan format:

**Measurement:** `sensor_data`

**Tags:**
- `device` — Device ID
- `sensor_type` — "dht11", "ldr", atau "soil_moisture"

**Fields:**
- `temperature` — float (untuk DHT11)
- `humidity` — float (untuk DHT11)
- `value` — float (untuk LDR dan Soil)

**Timestamp:** nanosecond precision

## 🤖 ML Service Integration

Backend memanggil ML service untuk prediksi jika semua sensor data tersedia.

### Klasifikasi (Should Water?)

**Endpoint:** `POST http://localhost:5000/predict/water-class`

**Request:**
```json
{
  "temperature": 28.5,
  "soil_moisture": 512
}
```

**Response:**
```json
{
  "prediction": 1,
  "label": "Siram"
}
```

### Regresi (Water Amount)

**Endpoint:** `POST http://localhost:5000/predict/water-amount`

**Request:**
```json
{
  "temperature": 28.5,
  "soil_moisture": 512,
  "humidity": 65.3,
  "light_level": 450
}
```

**Response:**
```json
{
  "prediction": 250.5,
  "label": "250.5 ml"
}
```

**Note:** Jika ML service tidak running, backend akan tetap menyimpan data sensor ke InfluxDB, tetapi prediksi akan error (ditangani dengan try-catch).

## 🔧 Troubleshooting

### Error: "Missing required environment variables"

**Solusi:**
1. Pastikan file `.env` ada di folder `backend/`
2. Cek semua variabel wajib sudah diisi (tidak kosong)
3. Restart backend setelah edit `.env`

### Error: "Failed to connect to InfluxDB: insufficient permissions for write"

**Penyebab:** Token tidak punya write permission ke bucket.

**Solusi:**
1. Buka InfluxDB UI → Load Data → Tokens
2. Klik token Anda → **Edit**
3. Pastikan ada **Write** permission untuk bucket target
4. Atau buat token baru dengan **All Access**
5. Update `INFLUX_TOKEN` di `.env`
6. Restart backend

### Error: "MQTT connection refused"

**Penyebab:** Broker MQTT tidak running atau konfigurasi salah.

**Solusi:**
1. Pastikan Mosquitto running:
   ```powershell
   "C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\mosquitto.conf" -v
   ```
2. Test connection:
   ```powershell
   # Subscribe
   mosquitto_sub -h localhost -p 1883 -t "sensors/#"
   
   # Publish
   mosquitto_pub -h localhost -p 1883 -t "sensors/test/telemetry" -m '{"device":"test"}'
   ```
3. Cek firewall (allow port 1883)
4. Cek `MQTT_URL` di `.env` (harus `mqtt://localhost:1883`)

### Error: "Cannot find module 'dotenv'"

**Solusi:**
```powershell
npm install
```

### Error: "Address already in use (port 4000)"

**Penyebab:** Port 4000 sudah dipakai proses lain.

**Solusi:**
1. Ganti port di `.env`: `HTTP_PORT=4001`
2. Atau kill proses yang pakai port 4000:
   ```powershell
   # Cari process
   netstat -ano | findstr :4000
   
   # Kill process (ganti <PID>)
   taskkill /PID <PID> /F
   ```

### Error: "WebSocket connection failed" (dari Flutter)

**Solusi:**
1. Pastikan backend running di port yang benar
2. Update `backendHost` di Flutter app (`home_screen.dart`)
3. Cek IP address:
   ```powershell
   ipconfig
   ```
4. Ganti `localhost` dengan IP aktual jika Flutter di device/emulator lain
5. Pastikan Flutter dan backend di jaringan yang sama (Wi-Fi)
6. Matikan firewall atau buat exception untuk port 4000

### ML Service tidak tersedia

**Gejala:** Log backend: `Error calling ML service: ...`

**Solusi:**
1. Backend tetap akan jalan dan simpan data sensor
2. Prediksi akan null/error
3. Untuk fix: Setup dan run ML service di `ml_service/`
4. Atau komen kode ML di `index.js` jika tidak dibutuhkan

### Data tidak masuk ke InfluxDB

**Solusi:**
1. Cek log backend untuk error saat write
2. Test manual write ke InfluxDB:
   ```powershell
   curl -i -XPOST "http://localhost:8086/api/v2/write?org=your-org&bucket=your-bucket" -H "Authorization: Token your-token" --data-raw "test,device=manual value=123"
   ```
3. Cek query di InfluxDB UI (Data Explorer)
4. Pastikan bucket name exact match (case-sensitive)

## 🧪 Testing

### 1. Test dengan Publisher Dummy

```powershell
node test-publisher.js
```

Akan publish data random setiap 5 detik. Output:

```
✅ Published at 10:30:45 AM:
   Temperature: 28.4°C
   Humidity: 65.2%
   LDR: 543
   Soil: 612
```

### 2. Test API Endpoint

**Test POST /command:**

```powershell
# Kirim ON
curl -X POST http://localhost:4000/command -H "Content-Type: application/json" -d '{"command":"ON"}'

# Kirim OFF
curl -X POST http://localhost:4000/command -H "Content-Type: application/json" -d '{"command":"OFF"}'
```

### 3. Test WebSocket

Buat file test HTML atau gunakan tool seperti:
- Postman (WebSocket tab)
- wscat: `npm install -g wscat`

```powershell
wscat -c ws://localhost:4000
```

### 4. Test MQTT Manual

**Subscribe:**
```powershell
mosquitto_sub -h localhost -p 1883 -t "sensors/#" -v
mosquitto_sub -h localhost -p 1883 -t "iot/alatku/command" -v
```

**Publish:**
```powershell
mosquitto_pub -h localhost -p 1883 -t "sensors/test/telemetry" -m '{"device":"test","dht11":{"temperature":25.5,"humidity":60},"ldr":{"value":400},"soil":{"value":500}}'
```

## 📊 Monitoring & Logging

Backend menggunakan `console.log` untuk logging. Untuk production, consider:

- Winston/Pino untuk structured logging
- PM2 untuk process management dan auto-restart
- Grafana untuk visualisasi data InfluxDB
- Health check endpoint untuk monitoring

## 🚀 Production Deployment

### 1. Install PM2

```powershell
npm install -g pm2
```

### 2. Start dengan PM2

```powershell
pm2 start src/index.js --name "iot-backend" --node-args="--experimental-modules"
```

### 3. Auto-restart on boot

```powershell
pm2 startup
pm2 save
```

### 4. Monitor

```powershell
pm2 logs iot-backend
pm2 monit
```

### 5. Environment Production

Buat file `.env.production`:

```dotenv
MQTT_URL=mqtt://production-broker:1883
INFLUX_URL=http://production-influx:8086
HTTP_PORT=4000
NODE_ENV=production
```

Run:
```powershell
pm2 start src/index.js --name "iot-backend" --env production
```

## 📝 Development Notes

### Hot Reload dengan Nodemon

Script `npm run dev` menggunakan nodemon yang akan auto-restart saat file `.js` berubah.

Config tambahan di `package.json`:
```json
{
  "nodemonConfig": {
    "watch": ["src"],
    "ext": "js,json",
    "ignore": ["test/*", "docs/*"]
  }
}
```

### ES Modules

Project ini menggunakan ES Modules (`type: "module"` di `package.json`).

Gunakan:
- `import` bukan `require`
- `export` bukan `module.exports`
- File extension `.js` wajib di import

### Debugging

**VS Code launch.json:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Launch Backend",
  "program": "${workspaceFolder}/backend/src/index.js",
  "envFile": "${workspaceFolder}/backend/.env"
}
```

## 🤝 Kontribusi

1. Fork repository
2. Buat branch: `git checkout -b feature/nama-fitur`
3. Commit: `git commit -m "Add: deskripsi"`
4. Push: `git push origin feature/nama-fitur`
5. Buat Pull Request

## 📄 Lisensi

ISC License (lihat `package.json`)

## 📞 Support

- GitHub Issues: https://github.com/VindSkiee/siscer_iot/issues
- Dokumentasi root project: `../README.md`
- ML Service docs: `../ml_service/README.md`
- Frontend docs: `../frontend/flutter_app/README.md`

---

**Happy Coding!** 🚀
