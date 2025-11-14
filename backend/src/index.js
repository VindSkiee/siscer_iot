import dotenv from "dotenv";
dotenv.config();
import { connect } from "mqtt";
import { InfluxDB } from "@influxdata/influxdb-client";
import { getWaterClass, getWaterAmount } from "./ml_service_client.js";

// --- BARU: Impor untuk Server ---
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

// --- Variabel Lingkungan (Sama seperti sebelumnya) ---
const {
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC,
  MQTT_COMMAND_TOPIC = "iot/alatku/command", // <-- BARU: Topik untuk perintah
  INFLUX_URL,
  INFLUX_TOKEN,
  INFLUX_ORG,
  INFLUX_BUCKET,
  HTTP_PORT = 4000, // <-- BARU: Port untuk server API
} = process.env;

// ... (Pengecekan env Anda tetap di sini) ...

/* ---------- InfluxDB client (Sama) ---------- */
const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "ns");
writeApi.useDefaultTags({ app: "iot-mqtt-influx-backend" });

// ... (Kode InfluxDB Test Anda tetap di sini) ...

/* ---------- MQTT client (Sama) ---------- */
const mqttOptions = {};
if (MQTT_USERNAME) mqttOptions.username = MQTT_USERNAME;
if (MQTT_PASSWORD) mqttOptions.password = MQTT_PASSWORD;

const client = connect(MQTT_URL, mqttOptions);

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker:", MQTT_URL);
  client.subscribe(MQTT_TOPIC, { qos: 1 }, (err, granted) => {
    if (err) console.error("Subscribe error", err);
    else console.log("Subscribed to", MQTT_TOPIC, "granted:", granted);
  });
});

// ... (Event MQTT lainnya tetap di sini) ...

/* ---------- BARU: HTTP & WebSocket Server Setup ---------- */

const app = express();
app.use(cors()); // Izinkan koneksi dari Flutter
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Fungsi broadcast untuk mengirim data ke SEMUA UI Flutter yang terhubung
wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
};

wss.on("connection", (ws) => {
  console.log("🔌 UI Flutter terhubung via WebSocket");
  ws.on("close", () => {
    console.log("🔌 UI Flutter terputus");
  });
});

/* ---------- BARU: API Endpoint untuk Kontrol ON/OFF ---------- */

// Flutter akan memanggil endpoint ini
app.post("/command", (req, res) => {
  const { command } = req.body; // "ON" atau "OFF"
  if (command === "ON" || command === "OFF") {
    try {
      // Kirim perintah ke alat melalui MQTT
      client.publish(MQTT_COMMAND_TOPIC, command, { qos: 1 }, (err) => {
        if (err) {
          console.error("Gagal publish perintah ke MQTT:", err);
          return res.status(500).json({ status: "error", message: "Gagal kirim perintah" });
        }
        console.log(`🚀 Perintah "${command}" dikirim ke ${MQTT_COMMAND_TOPIC}`);
        res.json({ status: "ok", command_sent: command });
      });
    } catch (e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  } else {
    res.status(400).json({ status: "error", message: "Perintah tidak valid" });
  }
});

/* ---------- Helper (Sama) ---------- */
function safeParseJson(payload) {
  try {
    return JSON.parse(payload);
  } catch (e) {
    console.warn("Failed to parse JSON payload:", e?.message ?? e);
    return null;
  }
}
function extractDeviceFromTopic(topic) {
  const parts = topic.split("/");
  if (parts.length >= 2) return parts[1];
  return "unknown";
}

/* ---------- Pemrosesan Pesan MQTT (DIMODIFIKASI) ---------- */
client.on("message", async (topic, message) => {
  try {
    const data = safeParseJson(message.toString());
    if (!data) return;

    const device = data.device || extractDeviceFromTopic(topic);
    const tsMs = data.timestamp ?? Date.now();
    
    // ... (Kode InfluxDB Anda untuk menyimpan sensor mentah tetap di sini) ...
    // (writeNumberField(...))

    // ----- ML Prediction (Sama) -----
    const temp = data.dht11?.temperature;
    const soil = data.soil?.value;
    const hum = data.dht11?.humidity;
    const ldr = data.ldr?.value;

    if (temp != null && soil != null && hum != null && ldr != null) {
      const classResult = await getWaterClass(temp, soil);
      const amountResult = await getWaterAmount(temp, soil, hum, ldr);

      const logData = {
        device,
        timestamp: new Date(tsMs).toISOString(),
        sensors: {
          temperature: temp,
          humidity: hum,
          soil_moisture: soil,
          light_level: ldr,
        },
        prediction: {
          water_class: classResult,
          water_amount: amountResult,
        },
      };

      console.log("📊 Sensor + Prediksi:", JSON.stringify(logData, null, 2));
      
      // ... (Kode InfluxDB Anda untuk menyimpan prediksi tetap di sini) ...
      // (predPoint ...)

      // --- BARU: Kirim data ke UI Flutter ---
      wss.broadcast(logData);
    }
  } catch (err) {
    console.error("Error processing MQTT message:", err);
  }
});


/* ---------- Graceful shutdown (Sama) ---------- */
// ... (Kode shutdown Anda tetap di sini) ...

/* ---------- BARU: Jalankan Server ---------- */
server.listen(HTTP_PORT, () => {
  console.log(`✅ Server API & WebSocket berjalan di http://localhost:${HTTP_PORT}`);
});