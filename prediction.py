import pandas as pd
import joblib

# -------------------------------
# 1. Load model and scaler
# -------------------------------
model = joblib.load("water_model.pkl")
scaler = joblib.load("scaler.pkl")

# Load dataset to get feature columns
df = pd.read_csv("cleaned_data.csv")

target = "Household-Water-Use-Litres-Yearly"
feature_columns = df.drop(columns=[target]).columns

# -------------------------------
# 2. Take user input
# -------------------------------
print("Enter household details:\n")

user_input = {}

user_input["Number-Of-People"] = int(input("Number of people: "))
user_input["Number-Of-Showers"] = int(input("Number of showers: "))
user_input["Number-Of-Toilets"] = int(input("Number of toilets: "))
user_input["Showers-Per-Week"] = int(input("Showers per week: "))
user_input["Shower-Duration-Minutes"] = int(input("Shower duration (minutes): "))
user_input["Washing-Machine-Per-Week"] = int(input("Washing machine usage per week: "))
user_input["Dishwasher-Per-Week"] = int(input("Dishwasher usage per week: "))
user_input["Boil-Water-Per-Week"] = int(input("Boiling water per week: "))
user_input["Bath-Frequency-Per-Week"] = int(input("Bath frequency per week: "))

# -------------------------------
# 3. Create full input (NO WARNING)
# -------------------------------
# Start with mean values (better than 0)
input_df = pd.DataFrame([df.drop(columns=[target]).mean()])

# Override with user input
for key, value in user_input.items():
    if key in input_df.columns:
        input_df.at[0, key] = value

# Ensure correct column order
input_df = input_df[feature_columns]

# -------------------------------
# 4. Scale input
# -------------------------------
input_scaled = scaler.transform(input_df)

# -------------------------------
# 5. Predict
# -------------------------------
prediction = model.predict(input_scaled)
pred_value = int(prediction[0])

# -------------------------------
# 6. Output result
# -------------------------------
print("\n💧 Estimated yearly water usage:", pred_value, "litres")

# -------------------------------
# 7. Smart recommendation
# -------------------------------
if pred_value > 250000:
    print("⚠️ Very high usage! Reduce shower time, washing frequency, and outdoor usage.")
elif pred_value > 150000:
    print("👍 Moderate usage. Small optimizations can save more water.")
elif pred_value > 80000:
    print("✅ Good usage. You're managing water efficiently.")
else:
    print("🌱 Excellent! Very low water usage.")
