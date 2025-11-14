import axios from "axios";

export async function getWaterClass(temperature, soilMoisture) {
  const response = await axios.post("http://localhost:5000/predict/water-class", {
    temperature,
    soil_moisture: soilMoisture
  });
  return response.data; // { prediction: 0/1, label: "Jangan Siram"/"Siram" }
}

export async function getWaterAmount(temperature, soilMoisture, humidity, lightLevel) {
  const response = await axios.post("http://localhost:5000/predict/water-amount", {
    temperature,
    soil_moisture: soilMoisture,
    humidity,
    light_level: lightLevel
  });
  return response.data; // { prediction: float, label: "X ml" }
}
