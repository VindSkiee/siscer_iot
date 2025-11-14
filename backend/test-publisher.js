/**
 * MQTT Test Publisher - Mengirim data sensor dummy random
 * Digunakan untuk testing backend subscriber (index.js).
 * 
 * Cara menjalankan:
 *   node test-publisher.js
 * Atau dengan custom interval (detik):
 *   node test-publisher.js 3
 */

import dotenv from "dotenv";
dotenv.config();
import { connect } from "mqtt";

const { MQTT_URL, MQTT_USERNAME, MQTT_PUBLISH_TOPIC } = process.env;

if (!MQTT_URL || !MQTT_PUBLISH_TOPIC) {
  console.error("❌ Missing MQTT_URL or MQTT_PUBLISH_TOPIC in .env");
  process.exit(1);
}

// Interval publish (detik), default 5 detik, minimal 1 detik
let publishIntervalSec = Number.parseInt(process.argv[2]) || 5;
if (publishIntervalSec < 1) publishIntervalSec = 1;

/* ---------- MQTT connect options ---------- */
const mqttOptions = {};
if (MQTT_USERNAME) mqttOptions.username = MQTT_USERNAME;
// Anonymous broker -> tidak perlu password

const client = connect(MQTT_URL, mqttOptions);

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker:", MQTT_URL);
  console.log(`📡 Publishing to topic: ${MQTT_PUBLISH_TOPIC}`);
  console.log(`⏱️  Interval: ${publishIntervalSec} seconds\n`);

  // Publish pertama
  setImmediate(publishData);

  // Publish interval selanjutnya
  setInterval(publishData, publishIntervalSec * 1000);
});

client.on("error", (err) => {
  console.error("❌ MQTT error:", err);
  process.exit(1);
});

client.on("close", () => {
  console.log("MQTT connection closed");
});

/* ---------- Helper: Generate random sensor data ---------- */
function generateSensorData() {
  return {
    device: "node-test",
    timestamp: Date.now(),
    dht11: {
      temperature: Number.parseFloat((20 + Math.random() * 15).toFixed(1)), // 20-35°C
      humidity: Number.parseFloat((40 + Math.random() * 40).toFixed(1)),    // 40-80%
    },
    ldr: {
      value: Math.round(200 + Math.random() * 600), // 200-800
    },
    soil: {
      value: Math.round(300 + Math.random() * 500), // 300-800
    },
  };
}

/* ---------- Publish dummy data ---------- */
function publishData() {
  try {
    const data = generateSensorData();
    const payload = JSON.stringify(data);

    client.publish(MQTT_PUBLISH_TOPIC, payload, { qos: 1 }, (err) => {
      if (err) console.error("❌ Publish error:", err);
      else {
        console.log(`✅ Published at ${new Date().toLocaleTimeString()}:`);
        console.log(`   Temperature: ${data.dht11.temperature}°C`);
        console.log(`   Humidity: ${data.dht11.humidity}%`);
        console.log(`   LDR: ${data.ldr.value}`);
        console.log(`   Soil: ${data.soil.value}\n`);
      }
    });
  } catch (err) {
    console.error("❌ Error generating/publishing data:", err);
  }
}

/* ---------- Graceful shutdown ---------- */
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping publisher...");
  client.end(true, () => {
    console.log("MQTT client disconnected.");
    process.exit(0);
  });
});
