## SisCer (Simple Sensor Collector)

Repository ini berisi tiga bagian utama:

- `backend/` — service Node.js yang menjadi MQTT subscriber dan menulis data sensor ke InfluxDB dan API ke Frontend.
- `frontend/` — placeholder untuk aplikasi frontend (saat ini belum ada skrip start yang didefinisikan).
- `ml_service/` — placeholder untuk layanan ML (saat ini belum ada skrip start yang didefinisikan).

README ini memandu cara men-setup dan menjalankan service backend secara lokal, env var yang diperlukan, contoh payload MQTT, dan troubleshooting singkat.

## Ringkasan arsitektur

1. Perangkat IoT mengirimkan pesan JSON ke broker MQTT.
2. `backend/` subscribe ke topik MQTT, mem-parse payload JSON dan menulis data numerik ke InfluxDB.
3. `frontend/` (opsional) dapat membaca data dari InfluxDB atau exposed API untuk menampilkan dashboard.
4. `ml_service/` (opsional) dapat mengambil data historis dari InfluxDB untuk training atau inference.

## Prasyarat

- Node.js (>= 16 recommended)
- npm
- Broker MQTT (contoh: Mosquitto, Cloud MQTT broker)
- InfluxDB 2.x (akses URL, org, bucket, dan token)

Semua perintah berikut diasumsikan dijalankan di PowerShell (Windows).

## Backend — MQTT -> InfluxDB

Lokasi: `backend/`

1) Install dependencies

```powershell
cd backend
npm install
```

2) Environment variables

Backend membutuhkan variabel-variabel berikut (lihat `backend/index.js`):

- MQTT_URL (contoh: `mqtt://localhost:1883` atau `mqtts://broker.example.com:8883`)
- MQTT_USERNAME (opsional)
- MQTT_PASSWORD (opsional)
- MQTT_TOPIC (topik yang di-subscribe, contoh: `sensors/+/telemetry`)
- INFLUX_URL (contoh: `http://localhost:8086`)
- INFLUX_TOKEN (token akses InfluxDB 2.x)
- INFLUX_ORG (nama organization di InfluxDB)
- INFLUX_BUCKET (nama bucket tempat data disimpan)

Contoh file `.env` (letakkan di `backend/.env`):

```
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=sensors/+/telemetry

INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-influxdb-token
INFLUX_ORG=your-org
INFLUX_BUCKET=your-bucket
```

3) Menjalankan backend

Mode produksi:

```powershell
cd backend
npm run start
```

Mode development (auto-restart dengan nodemon):

```powershell
cd backend
npm run start:dev
```

4) Contoh payload MQTT yang diterima

Payload yang diharapkan adalah JSON, misal gabungan sensor atau single sensor:

Contoh multi-sensor:

```json
{
  "device": "node-01",
  "timestamp": 1690000000000,
  "dht11": { "temperature": 27.5, "humidity": 72 },
  "ldr": { "value": 450 },
  "soil": { "value": 512 }
}
```

Contoh single-sensor:

```json
{ "device": "node-01", "ldr": { "value": 450 } }
```

Backend akan menulis field numerik ke measurement `sensor_data` (default) dan menambahkan tag `device` serta `sensor_type`.

## Frontend dan ml_service

- `frontend/` saat ini berisi `package.json` minimal tanpa skrip start. Untuk mengisi/menjalankan frontend, tambahkan dependensi dan skrip start (mis. React, Vite, atau Next.js) sesuai yang diinginkan.
- `ml_service/` juga placeholder. Jika Anda ingin layanan ML, tambahkan dependensi (mis. Python service atau Node.js ML library) dan skrip sesuai kebutuhan.

Contoh cepat (jika Anda ingin menjalankan frontend sebagai app React):

```powershell
cd frontend
npx create-react-app .
npm start
```

(Langkah di atas akan menimpa `package.json` saat ini — lakukan hanya bila memang ingin mengganti frontend.)

## Verifikasi data di InfluxDB

- Pastikan backend tampil "Connected to MQTT broker" di log.
- Pastikan tidak ada error terkait Influx (cek token, org, bucket).
- Buka InfluxDB UI (biasanya `http://localhost:8086`) dan jalankan query di Data Explorer pada bucket terkait untuk melihat points yang masuk.

Query sederhana (Flux) untuk melihat recent points:

```
from(bucket: "your-bucket")
  |> range(start: -15m)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> limit(n:50)
```

## Troubleshooting singkat

- "Missing required environment variables": pastikan `.env` di `backend/` berisi semua variable wajib.
- "Failed to parse JSON payload": cek payload yang dikirim device — backend mengabaikan payload non-JSON.
- "Influx write errors": cek `INFLUX_TOKEN`, `INFLUX_ORG`, `INFLUX_BUCKET`, dan `INFLUX_URL`.
- MQTT tidak terkoneksi: cek `MQTT_URL` dan kredensial (username/password jika diperlukan). Cek pula firewall/port.

## Recommended next steps / pengembangan

- Tambahkan health-check endpoint kecil (express) di `backend/` untuk memudahkan monitoring.
- Tambahkan dokumentasi topik MQTT dan skema payload device agar integrasi lebih mudah.
- Implementasi frontend sederhana (dashboard) yang membaca data dari InfluxDB atau expose API read layer.
- Tambahkan unit tests ringan dan CI/CD pipeline.

## Kontak / Lisensi

Proyek ini belum memiliki informasi author atau lisensi dalam `package.json`. Tambahkan field `author` dan `license` bila perlu.

---

Jika Anda ingin, saya dapat:

- menambahkan contoh `.env.example` ke `backend/`,
- menambahkan health-check HTTP endpoint di `backend/`, atau
- scaffold frontend sederhana (React/Vite) dan menambahkan `npm start` script.

Beritahu opsi mana yang Anda mau saya kerjakan berikutnya.
