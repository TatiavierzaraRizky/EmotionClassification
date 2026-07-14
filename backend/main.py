from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import json
import re
import os

app = FastAPI(title="Emotion Classification API using IndoBERT-86%")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
tokenizer = None
kamus_slang = {}
# ['anger', 'fear', 'happy', 'love', 'sadness']
label_map = {0: 'anger', 1: 'fear', 2: 'happy', 3: 'love', 4: 'sadness'}
inv_label_map = {v: k for k, v in label_map.items()}

def preprocess_tweet(text, kamus):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s.,!?]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    normalized_words = [kamus.get(w, w) for w in words]
    return ' '.join(normalized_words)

@app.on_event("startup")
def load_assets():
    global model, tokenizer, kamus_slang
    print("Initializing server assets...")
    
    # 1. Load Slang Dictionary
    dict_path = "kamus_slang.json"
    if os.path.exists(dict_path):
        with open(dict_path, 'r') as f:
            content = f.read().strip().rstrip(',')
        kamus_slang = json.loads("{" + content + "}")

    # 2. Load PyTorch Model 
    MODEL_NAME = "vierrzr/emotion-classification-model"
    
    print(f"Loading model from Hugging Face: {MODEL_NAME}")
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    model.eval()
    print("Model loaded successfully!")

class PredictRequest(BaseModel):
    text: str

@app.post("/predict")
def predict_emotion(request: PredictRequest):
    if not model or not tokenizer:
        raise HTTPException(status_code=503, detail="Model loading...")
    
    # Preprocess
    cleaned = preprocess_tweet(request.text, kamus_slang)
    
    # Tokenize 
    inputs = tokenizer(cleaned, return_tensors='pt', padding='max_length', truncation=True, max_length=256)
    
    # Predict (PyTorch)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1)[0].numpy()
        pred_class = int(np.argmax(probs))
    
    return {
        "label": label_map[pred_class],
        "confidence": float(probs[pred_class]),
        "cleaned_text": cleaned,
        "probabilities": {label_map[i]: float(probs[i]) for i in range(5)}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)