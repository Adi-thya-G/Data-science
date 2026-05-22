from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# ── CORS: allow React dev server + production domain ──────────
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    os.environ.get("FRONTEND_URL", ""),
])

# ── Load model and scaler once at startup ─────────────────────
try:
    model  = joblib.load("water_model.pkl")
    scaler = joblib.load("scaler.pkl")
    print("✅ Model and scaler loaded")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = scaler = None

# ── Read feature columns from cleaned dataset ─────────────────
try:
    df = pd.read_csv("cleaned_data.csv")
    TARGET       = "Household-Water-Use-Litres-Yearly"
    FEATURE_COLS = df.drop(columns=[TARGET]).columns.tolist()
    FEATURE_MEANS = df.drop(columns=[TARGET]).mean().to_dict()
    print(f"✅ Dataset loaded — {len(FEATURE_COLS)} features")
except Exception as e:
    print(f"❌ Error loading dataset: {e}")
    FEATURE_COLS  = []
    FEATURE_MEANS = {}

# ── MongoDB (optional — works without it too) ─────────────────
mongo_uri = os.environ.get("MONGO_URI")
predictions_col = None
if mongo_uri:
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        client.server_info()
        db = client["aiml_water"]
        predictions_col = db["predictions"]
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB not connected (optional): {e}")


# ── Helper: build recommendation ──────────────────────────────
def get_recommendation(litres):
    if litres > 250000:
        return {
            "level": "critical",
            "icon": "⚠️",
            "title": "Very High Usage",
            "text": "Significantly reduce shower time, washing machine frequency, and outdoor water use. Consider water-saving appliances.",
            "saving": f"Could save up to {int((litres - 150000)):,} litres/year with changes."
        }
    elif litres > 150000:
        return {
            "level": "warning",
            "icon": "👍",
            "title": "Moderate Usage",
            "text": "You're above average. Small habit changes like shorter showers and full washing loads can reduce consumption.",
            "saving": f"Could save up to {int((litres - 100000)):,} litres/year with optimisations."
        }
    elif litres > 80000:
        return {
            "level": "good",
            "icon": "✅",
            "title": "Good Usage",
            "text": "You're managing water efficiently. A few minor tweaks could push you into the excellent range.",
            "saving": f"Could save up to {int((litres - 60000)):,} litres/year with minor changes."
        }
    else:
        return {
            "level": "excellent",
            "icon": "🌱",
            "title": "Excellent Usage",
            "text": "Outstanding! Your household has very low water consumption. You're well below average.",
            "saving": "You're already in the top efficiency bracket."
        }


# ────────────────────────────────────────────────────────────────
# ROUTES
# ────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status":   "running",
        "model":    "RandomForestRegressor" if model else "not loaded",
        "features": len(FEATURE_COLS),
        "mongo":    predictions_col is not None,
    })


@app.route("/predict", methods=["POST"])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model not loaded on server", "status": "failed"}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body sent", "status": "failed"}), 400

        # Start from mean values so unset features don't default to 0
        input_dict = FEATURE_MEANS.copy()

        # Override with whatever the user sent
        for key, value in data.items():
            if key in input_dict:
                input_dict[key] = float(value)

        # Build DataFrame in exact column order
        input_df    = pd.DataFrame([input_dict])[FEATURE_COLS]
        input_scaled = scaler.transform(input_df)
        pred_value   = int(model.predict(input_scaled)[0])

        recommendation = get_recommendation(pred_value)

        # Compare to average
        avg_litres    = 120000
        pct_vs_avg    = round(((pred_value - avg_litres) / avg_litres) * 100, 1)

        result = {
            "predicted_litres_yearly": pred_value,
            "predicted_litres_daily":  round(pred_value / 365, 1),
            "predicted_litres_monthly": round(pred_value / 12),
            "pct_vs_average":          pct_vs_avg,
            "recommendation":          recommendation,
            "status":                  "success",
            "timestamp":               datetime.utcnow().isoformat(),
        }

        # Store in MongoDB if connected
        if predictions_col is not None:
            predictions_col.insert_one({
                "input":  data,
                "output": result,
                "ts":     datetime.utcnow(),
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"}), 500


@app.route("/history", methods=["GET"])
def history():
    if predictions_col is None:
        return jsonify({"error": "MongoDB not connected", "history": []}), 200

    try:
        docs = list(predictions_col.find(
            {}, {"_id": 0}
        ).sort("ts", -1).limit(20))
        return jsonify({"history": docs, "status": "success"})
    except Exception as e:
        return jsonify({"error": str(e), "history": []}), 500


@app.route("/stats", methods=["GET"])
def stats():
    """Return aggregate stats from all predictions stored in MongoDB."""
    if predictions_col is None:
        return jsonify({"error": "MongoDB not connected"}), 200
    try:
        pipeline = [
            {"$group": {
                "_id":   None,
                "count": {"$sum": 1},
                "avg":   {"$avg": "$output.predicted_litres_yearly"},
                "min":   {"$min": "$output.predicted_litres_yearly"},
                "max":   {"$max": "$output.predicted_litres_yearly"},
            }}
        ]
        agg = list(predictions_col.aggregate(pipeline))
        if agg:
            r = agg[0]
            return jsonify({
                "total_predictions": r["count"],
                "avg_litres":  round(r["avg"]),
                "min_litres":  r["min"],
                "max_litres":  r["max"],
                "status": "success",
            })
        return jsonify({"total_predictions": 0, "status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
