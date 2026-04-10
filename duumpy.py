import pandas as pd

df1 = pd.read_csv("water.csv")
df2 = pd.read_csv("duplicated_water_data_removed.csv")

# Columns only in file1
unique_to_df1 = df1.columns.difference(df2.columns)

# Columns only in file2
unique_to_df2 = df2.columns.difference(df1.columns)

print("Unique columns in file1:", list(unique_to_df1))
print("Unique columns in file2:", list(unique_to_df2))
one 