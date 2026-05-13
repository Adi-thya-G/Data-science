import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# -------------------------------
# 1. Load cleaned dataset
# -------------------------------
df = pd.read_csv("cleaned_data.csv")

print("Shape:", df.shape)
print(df.head())

# -------------------------------
# 2. Basic EDA
# -------------------------------
print("\nSummary Statistics:\n", df.describe())

# Correlation heatmap (top features only for clarity)
corr = df.corr()

top_corr = corr["Household-Water-Use-Litres-Yearly"].abs().sort_values(ascending=False).head(15)
top_features = top_corr.index

plt.figure()
corr.loc[top_features, top_features].plot(kind='bar')
plt.title("Top Correlated Features")
plt.xticks(rotation=90)
plt.show()

# -------------------------------
# 3. Feature Selection
# -------------------------------
target = "Household-Water-Use-Litres-Yearly"

X = df.drop(columns=[target])
y = df[target]

# -------------------------------
# 4. Train-Test Split
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("\nTrain size:", X_train.shape)
print("Test size:", X_test.shape)

# -------------------------------
# 5. Feature Scaling
# -------------------------------
scaler = StandardScaler()

X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# -------------------------------
# 6. Model Training
# -------------------------------
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

# -------------------------------
# 7. Prediction
# -------------------------------
y_pred = model.predict(X_test)

# -------------------------------
# 8. Evaluation
# -------------------------------
mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)

print("\nModel Performance:")
print("MAE :", mae)
print("RMSE:", rmse)
print("R2  :", r2)

# -------------------------------
# 9. Cross Validation
# -------------------------------
scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')

print("\nCross Validation R2 Scores:", scores)
print("Average R2:", scores.mean())

# -------------------------------
# 10. Feature Importance
# -------------------------------
importances = model.feature_importances_
feature_names = X.columns

feat_imp = pd.Series(importances, index=feature_names)
feat_imp = feat_imp.sort_values(ascending=False).head(15)

plt.figure()
feat_imp.plot(kind='barh')
plt.title("Top Important Features")
plt.show()

# -------------------------------
# 11. Save Model & Scaler
# -------------------------------
joblib.dump(model, "water_model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("\n✅ Model and scaler saved successfully!")