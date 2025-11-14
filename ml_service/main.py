from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd  # <-- Tambahkan import pandas
import uvicorn

# --- 1. Memuat Model & Scaler ---
try:
    model_clf = joblib.load("model_class.pkl")
    scaler_clf = joblib.load("scaler_class.pkl")
    model_reg = joblib.load("model_reg.pkl")
    scaler_reg = joblib.load("scaler_reg.pkl")
    print("--- Semua model dan scaler berhasil dimuat! ---")
except FileNotFoundError:
    print("--- ERROR: File .pkl tidak ditemukan! ---")
    print("Pastikan file 'model_klasifikasi.pkl', 'scaler_klasifikasi.pkl',")
    print("'model_regresi.pkl', dan 'scaler_regresi.pkl' ada di folder yang sama.")
    exit()

app = FastAPI(title="ML Service IoT Penyiraman")

# --- 2. Mendefinisikan Input Data ---
class WaterClassInput(BaseModel):
    temperature: float
    soil_moisture: float

class WaterAmountInput(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float
    light_level: float

# --- 3. Endpoint Prediksi Klasifikasi (INI SUDAH BENAR, JANGAN DIUBAH) ---
@app.post("/predict/water-class")
def predict_water_class(data: WaterClassInput):
    
    # 1. Buat DataFrame dengan nama kolom yang SAMA PERSIS seperti saat latihan
    # Perhatikan 'soilmiosture' (salah ketik) agar cocok dengan scaler
    input_df = pd.DataFrame(
        [[data.temperature, data.soil_moisture]], 
        columns=['temperature', 'soilmiosture']  # <-- Nama kolom harus cocok
    )
    
    # 2. Scaling data
    input_scaled = scaler_clf.transform(input_df)
    
    # 3. Lakukan prediksi
    pred_raw = model_clf.predict(input_scaled)[0]
    
    # 4. Konversi hasil
    pred = int(pred_raw)
    label = "Siram" if pred == 1 else "Jangan Siram"
    
    print(f"Prediksi Kelas: {input_df.values} -> {label}")
    return {"prediction": pred, "label": label}

# --- 4. Endpoint Prediksi Regresi (DIPERBAIKI) ---
@app.post("/predict/water-amount")
def predict_water_amount(data: WaterAmountInput):
    
    # 1. Buat DataFrame dengan nama kolom yang SAMA PERSIS seperti saat latihan
    #    (Sesuai dengan log error Anda)
    
    # Kita harus memetakan nama sensor Anda (misal 'temperature') 
    # ke nama kolom yang diharapkan model (misal 'Room_Temperature_C')
    
    # Asumsi pemetaan (berdasarkan log error):
    # 'Room_Temperature_C'    <-- data.temperature
    # 'Humidity_%'            <-- data.humidity
    # 'Soil_Moisture_%'       <-- data.soil_moisture
    # 'Sunlight_Exposure_enc' <-- data.light_level (Ini adalah asumsi, semoga benar)
    
    # Buat dictionary untuk data
    input_data_dict = {
        'Room_Temperature_C': data.temperature,
        'Humidity_%': data.humidity,
        'Soil_Moisture_%': data.soil_moisture,
        'Sunlight_Exposure_enc': data.light_level
    }
    
    # Buat DataFrame dari dictionary. Ini akan menjaga nama kolom.
    input_df = pd.DataFrame([input_data_dict])
    
    # 2. Scaling data
    input_scaled = scaler_reg.transform(input_df)
    
    # 3. Lakukan prediksi
    amount_raw = model_reg.predict(input_scaled)[0]
    
    # 4. Konversi hasil
    amount = round(max(0, amount_raw))
    
    print(f"Prediksi Jumlah: {input_df.values} -> {amount} ml")
    return {"prediction": amount, "label": f"{amount}.0 ml"}

# --- 5. Jalankan Server ---
if __name__ == "__main__":
    # Ganti port=5000 jika Anda ingin server berjalan di port 5000
    # Log Anda menunjukkan port 5000, jadi saya ganti ke 5000
    uvicorn.run(app, host="0.0.0.0", port=5000)

