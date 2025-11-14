markdown
# ML Service - Smart Irrigation & Plant Care

Service ini menangani Machine Learning untuk project IoT Smart Irrigation dan Plant Monitoring.  
Menggunakan FastAPI sebagai REST API dan mendukung model:

1. Klasifikasi Penyiraman (biner: Siram / Jangan Siram)  
2. Regresi Jumlah Air (ml) untuk kondisi tanaman  



## 🔹 Struktur Folder



ml_service/
│
├─ models/             # Menyimpan model terlatih (pickle / joblib)
│
├─ main.py             # FastAPI app
├─ requirements.txt    # Library Python yang dibutuhkan
├─ README.md
└─ utils.py            # (Opsional) helper functions untuk load model, scaling, dll





## 🔹 Persiapan Environment

1. Aktifkan virtual environment (direkomendasikan):

powershell
C:\Code-project-learn\project_SisCer\.venv\Scripts\Activate.ps1


2. Install dependencies:

bash
pip install -r requirements.txt


> Pastikan semua library seperti FastAPI, uvicorn, scikit-learn, joblib, numpy, pydantic terinstall.



## 🔹 Menjalankan Service

bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 5000


 API dapat diakses di `http://127.0.0.1:5000`
 Dokumentasi otomatis tersedia di `http://127.0.0.1:5000/docs`



## 🔹 Contoh Endpoint

### 1. Prediksi Klasifikasi Penyiraman

 POST `/predict/water-class`
 Body JSON:

json
{
    "temperature": 25,
    "soil_moisture": 350
}


 Response:

json
{
    "prediction": 1,
    "label": "Siram"
}




### 2. Prediksi Jumlah Air (Regresi)

 POST `/predict/water-amount`
 Body JSON:

json
{
    "temperature": 25,
    "soil_moisture": 350,
    "humidity": 70,
    "light_level": 400
}


 Response:

json
{
    "predicted_ml": 239
}




## 🔹 Integrasi dengan Node.js / Backend

 Node.js bisa melakukan HTTP POST request ke FastAPI endpoints di atas.
 Contoh: request dari backend untuk sensor ESP32 real-time.



## 🔹 Catatan

 Gunakan virtual environment untuk mengisolasi paket.
 Model disimpan di folder `models/` dan bisa di-update kapan saja.
 Untuk prediksi baru, selalu lakukan scaling menggunakan scaler yang sama dengan saat training.



Author: M Arvind Alaric
Project: Smart Irrigation IoT - Backend ML Service


