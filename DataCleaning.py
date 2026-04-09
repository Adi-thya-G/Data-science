import pandas as pd
import numpy as np

# 1. Load dataset
df = pd.read_csv("water.csv")

# -------------------------------
# 2. Remove duplicate columns
# -------------------------------
df = df.loc[:, ~df.columns.duplicated()]

# -------------------------------
# 3. Drop unnecessary columns
# -------------------------------
drop_cols = [
    "Date", "Postal outcode", "County", "Latitude", "Longitude",
    "Wash-Dishes-By-Hand",
    
    # Leakage columns (REMOVE ALL)
    "Bathroom-Water-Use-Litres-Yearly",
    "Kitchen-Water-Use-Litres-Yearly",
    "Outdoor-Water-Use-Litres-Yearly",
    "Household-Water-Use-Money-£-Yearly",
    "Household-Energy-Use-Money-£-Yearly",
    "Person-Water-Use-Litres-Yearly",
    "Person-Water-Use-Litres-Per-Day",
    "Household-Water-Saving-Litres-Yearly",
    "Household-Water-Saving-Money-£-Yearly",
    "Household-Energy-Saving-kWh-Yearly",
    "Household-Energy-Saving-Cost-£-Yearly"
]

df = df.drop(columns=[col for col in drop_cols if col in df.columns], errors='ignore')

# -------------------------------
# 4. Handle missing values
# -------------------------------
df.replace("NULL", np.nan, inplace=True)

# Fill numeric columns
num_cols = df.select_dtypes(include=['float64', 'int64']).columns
df[num_cols] = df[num_cols].fillna(df[num_cols].median())

# Fill categorical columns
cat_cols = df.select_dtypes(include=['object']).columns
df[cat_cols] = df[cat_cols].fillna("unknown")

# -------------------------------
# 5. Convert yes/no to 1/0
# -------------------------------
binary_map = {"yes": 1, "no": 0}

for col in df.columns:
    if df[col].dtype == "object":
        if set(df[col].dropna().unique()).issubset(set(["yes", "no"])):
            df[col] = df[col].map(binary_map)

# -------------------------------
# 6. Convert numeric columns properly
# -------------------------------
df = df.apply(pd.to_numeric, errors='ignore')

# -------------------------------
# 7. Remove corrupted rows
# -------------------------------
# Example: invalid latitude range
if "Latitude" in df.columns:
    df = df[(df["Latitude"] >= -90) & (df["Latitude"] <= 90)]

# Remove extreme outliers (optional)
for col in num_cols:
    df = df[df[col] < df[col].quantile(0.99)]

# -------------------------------
# 8. Encode categorical features
# -------------------------------
df = pd.get_dummies(df, drop_first=True)

# -------------------------------
# 9. Save cleaned dataset
# -------------------------------
df.to_csv("cleaned_data.csv", index=False)

print("✅ Data cleaning completed. Saved as cleaned_data.csv")

