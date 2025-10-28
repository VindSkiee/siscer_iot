require("dotenv").config();
import { connect } from "mqtt";
import { InfluxDB, Point } from "@influxdata/influxdb-client";

const {
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC,
  INFLUX_URL,
  INFLUX_TOKEN,
  INFLUX_ORG,
  INFLUX_BUCKET,
} = process.env;

if (
  !MQTT_URL ||
  !MQTT_TOPIC ||
  !INFLUX_URL ||
  !INFLUX_TOKEN ||
  !INFLUX_ORG ||
  !INFLUX_BUCKET
) {
  console.error("Missing required environment variables. Check .env");
  process.exit(1);
}

/* ---------- InfluxDB client ---------- */
const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "ns"); // nanoseconds precision
writeApi.useDefaultTags({ app: "iot-mqtt-influx-backend" });

/* ---------- MQTT connect options ---------- */
const mqttOptions = {};
if (MQTT_USERNAME) mqttOptions.username = MQTT_USERNAME;
if (MQTT_PASSWORD) mqttOptions.password = MQTT_PASSWORD;

// connect mqtt
const client = connect(MQTT_URL, mqttOptions);

client.on("connect", () => {
  console.log("Connected to MQTT broker:", MQTT_URL);
  client.subscribe(MQTT_TOPIC, { qos: 1 }, (err, granted) => {
    if (err) {
      console.error("Subscribe error", err);
    } else {
      console.log("Subscribed to", MQTT_TOPIC, "granted:", granted);
    }
  });
});

client.on("reconnect", () => console.log("Reconnecting to MQTT..."));
client.on("close", () => console.log("MQTT connection closed"));
client.on("error", (err) => console.error("MQTT error", err));

/* ---------- Helper parse/validate ---------- */
function safeParseJson(payload) {
  try {
    return JSON.parse(payload);
  } catch (e) {
    console.warn("Failed to parse JSON payload:", e?.message ?? e);
    return null;
  }
}

/**
 * Expected payload examples:
 * {
 *   "device": "node-01",
 *   "timestamp": 1690000000000,  // optional ms unix epoch
 *   "dht11": { "temperature": 27.5, "humidity": 72 },
 *   "ldr": { "value": 450 },
 *   "soil": { "value": 512 }
 * }
 *
 * Or single-sensor payload:
 * { "device": "node-01", "ldr": { "value": 450 } }
 */
function processMessage(topic, payloadBuffer) {
  const payloadStr = payloadBuffer.toString();
  const data = safeParseJson(payloadStr);
  if (!data) {
    console.warn("Invalid JSON payload from topic", topic, "->", payloadStr);
    return;
  }

  const device = data.device || extractDeviceFromTopic(topic) || "unknown";
  const tsMs = typeof data.timestamp === "number" ? data.timestamp : Date.now();

  // helper to coerce a numeric field and write a point if valid
  const writeNumberField = (
    sensorType,
    fieldKey,
    rawValue,
    measurement = "sensor_data"
  ) => {
    const n = Number(rawValue);
    if (Number.isNaN(n)) return;
    const p = new Point(measurement)
      .tag("device", device)
      .tag("sensor_type", sensorType)
      .floatField(fieldKey, n)
      .timestamp(tsMs * 1e6);
    writeApi.writePoint(p);
  };

  // DHT11
  if (data.dht11 && typeof data.dht11 === "object") {
    writeNumberField("dht11", "temperature", data.dht11.temperature);
    writeNumberField("dht11", "humidity", data.dht11.humidity);
  }

  // LDR
  if (data.ldr && typeof data.ldr === "object") {
    writeNumberField("ldr", "value", data.ldr.value);
  }

  // Soil Moisture
  if (data.soil && typeof data.soil === "object") {
    writeNumberField("soil_moisture", "value", data.soil.value);
  }

  // flush control is handled periodically; you can call writeApi.flush() if needed
}

/* Helper: try extract device id from topic like sensors/<deviceId>/telemetry */
function extractDeviceFromTopic(topic) {
  // naive extraction: sensors/{device}/telemetry
  const parts = topic.split("/");
  if (parts.length >= 2) return parts[1];
  return null;
}

/* ---------- MQTT message handler ---------- */
client.on("message", (topic, message) => {
  try {
    processMessage(topic, message);
  } catch (err) {
    console.error("Error processing message:", err);
  }
});

/* ---------- Graceful shutdown ---------- */
async function shutdown() {
  console.log("Shutting down: flushing Influx writes and closing MQTT...");
  try {
    await writeApi.close(); // flush + close
    console.log("Influx writeApi closed.");
  } catch (e) {
    console.error("Error closing Influx writeApi:", e);
  }

  try {
    client.end(true, () => {
      console.log("MQTT client disconnected.");
      process.exit(0);
    });
  } catch (e) {
    console.error("Error closing MQTT client:", e);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* ---------- Periodic flush fallback (optional) ---------- */
// If you prefer periodic flush instead of relying on close:
setInterval(() => {
  writeApi.flush().catch((err) => {
    console.error("Influx flush error", err);
  });
}, 5000);
