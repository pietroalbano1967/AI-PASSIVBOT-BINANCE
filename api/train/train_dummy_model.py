import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# ============================
# 1. CREA UN DATASET FITTIZIO
# ============================
np.random.seed(42)
n = 500
X = np.random.randn(n, 7)  # 7 colonne fittizie come FEATURE_COLUMNS
y = np.random.randint(0, 2, n)  # target binario: 0=SELL, 1=BUY

# ============================
# 2. ADDDESTRA IL MODELLO
# ============================
clf = RandomForestClassifier(n_estimators=50, random_state=42)
clf.fit(X, y)

# ============================
# 3. SALVA SOLO IL MODELLO
# ============================
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # risale a api/
MODEL_PATH = os.path.join(BASE_DIR, "model_pro_balanced.pkl")

joblib.dump(clf, MODEL_PATH)

print(f"✅ Dummy model salvato come '{MODEL_PATH}'")
