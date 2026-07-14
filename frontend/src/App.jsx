import React, { useState, useEffect } from 'react';

const EMOTION_MAP = {
  anger: { label: 'Marah', emoji: '😡', color: 'var(--color-anger)', shadow: 'rgba(239, 68, 68, 0.4)' },
  happy: { label: 'Senang', emoji: '😊', color: 'var(--color-happy)', shadow: 'rgba(245, 158, 11, 0.4)' },
  sadness: { label: 'Sedih', emoji: '😢', color: 'var(--color-sadness)', shadow: 'rgba(59, 130, 246, 0.4)' },
  fear: { label: 'Takut', emoji: '😨', color: 'var(--color-fear)', shadow: 'rgba(168, 85, 247, 0.4)' },
  love: { label: 'Cinta', emoji: '❤️', color: 'var(--color-love)', shadow: 'rgba(236, 72, 153, 0.4)' }
};

const BACKEND_URL = "/api";

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('nlp_emotion_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('nlp_emotion_history', JSON.stringify(newHistory));
  };

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Gagal terhubung dengan server backend.');
      }

      const data = await response.json();
      setResult(data);

      // Add to search history log
      const newHistoryItem = {
        id: Date.now(),
        text: inputText,
        label: data.label,
        confidence: data.confidence,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        data: data
      };
      
      // Keep max 10 items in history list
      const updatedHistory = [newHistoryItem, ...history.slice(0, 9)];
      saveHistory(updatedHistory);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menghubungi API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistory = (item) => {
    setInputText(item.text);
    setResult(item.data);
    setError('');
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setError('');
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  return (
    <div className="app-container">
      {/* Header Section */}
      <header className="app-header animate-slide">
        <div className="header-logo">🧠</div>
        <h1>Sistem Klasifikasi Emosi Berbasis Teks</h1>
        {/* <p className="subtitle">Menggunakan Transformer (IndoBERT) & Deep Learning</p> */}
      </header>

      {/* Grid Layout Container */}
      <div className="app-grid">
        
        {/* Left Column: Form & History Log */}
        <div className="grid-left animate-slide" style={{ animationDelay: '0.1s' }}>
          
          {/* Text Input Panel */}
          <div className="glass-panel input-panel">
            <h2>
              <span>📝</span> Analisis Teks Baru
            </h2>
            <form onSubmit={handlePredict}>
              <textarea
                placeholder="Masukkan kalimat atau teks"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={280}
                disabled={isLoading}
                id="input-text-area"
              />
              <div className="textarea-footer">
                <span className="char-count">{inputText.length}/280 Karakter</span>
                {inputText.trim() && (
                  <button type="button" className="btn-clear" onClick={handleClear} disabled={isLoading}>
                    Reset
                  </button>
                )}
              </div>

              <button 
                type="submit" 
                className={`btn-submit ${isLoading ? 'btn-loading' : ''}`}
                disabled={isLoading || !inputText.trim()}
                id="btn-analyze"
              >
                {isLoading ? (
                  <span className="spinner-container">
                    <span className="spinner"></span> Menganalisis...
                  </span>
                ) : (
                  'Klasifikasikan Emosi'
                )}
              </button>
            </form>
            {error && <div className="error-alert">{error}</div>}
          </div>

          {/* History Panel */}
          <div className="glass-panel history-panel">
            <div className="history-header">
              <h2>
                <span>⏳</span> Riwayat Deteksi
              </h2>
              {history.length > 0 && (
                <button type="button" className="btn-clear-history" onClick={handleClearHistory}>
                  Hapus Semua
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="empty-state">Belum ada riwayat deteksi.</p>
            ) : (
              <div className="history-list">
                {history.map((item) => {
                  const emotion = EMOTION_MAP[item.label];
                  return (
                    <div 
                      key={item.id} 
                      className="history-item"
                      onClick={() => handleSelectHistory(item)}
                    >
                      <div className="history-item-body">
                        <p className="history-text">{item.text}</p>
                        <span className="history-time">{item.timestamp}</span>
                      </div>
                      <div className="history-item-badge" style={{ backgroundColor: `rgba(${emotion.color.replace('var(--', 'var(--rgb-')}, 0.15)`, borderColor: emotion.color, color: emotion.color }}>
                        <span>{emotion.emoji}</span> {emotion.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prediction Results Card */}
        <div className="grid-right animate-slide" style={{ animationDelay: '0.2s' }}>
          
          {/* Predict View Card */}
          <div className="glass-panel result-panel">
            {!result ? (
              <div className="result-placeholder">
                <div className="placeholder-pulse">🔮</div>
                <h3>Siap Menganalisis</h3>
                <p>Masukkan kalimat di samping dan klik tombol analisis untuk memetakan emosi dominan serta probabilitas kelas emosi.</p>
              </div>
            ) : (
              <div className="result-active animate-scale">
                
                {/* Main Dominant Emotion Box */}
                <div 
                  className="dominant-emotion-card"
                  style={{ 
                    borderColor: EMOTION_MAP[result.label].color,
                    boxShadow: `0 8px 32px 0 rgba(0,0,0,0.37), 0 0 20px 0 ${EMOTION_MAP[result.label].shadow}`
                  }}
                >
                  <div className="dominant-emoji">{EMOTION_MAP[result.label].emoji}</div>
                  <div className="dominant-info">
                    <span className="dominant-title-lbl">Emosi Dominan</span>
                    <h3 className="dominant-class-name" style={{ color: EMOTION_MAP[result.label].color }}>
                      {EMOTION_MAP[result.label].label.toUpperCase()}
                    </h3>
                    <span className="dominant-confidence">
                      Akurasi Keyakinan: {(result.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Text Preprocessing Preview Box */}
                <div className="preprocess-card">
                  <h4>💡 Hasil Pembersihan Teks</h4>
                  <div className="preprocess-compare">
                    <div className="preprocess-column">
                      <span className="column-label">Teks Asli</span>
                      <p className="column-text">"{inputText}"</p>
                    </div>
                    <div className="preprocess-column">
                      <span className="column-label">Hasil Normalisasi</span>
                      <p className="column-text cleaned-glow">"{result.cleaned_text}"</p>
                    </div>
                  </div>
                </div>

                {/* Probability Distribution bars */}
                <div className="breakdown-card">
                  <h4>📊 Distribusi Probabilitas Emosi</h4>
                  <div className="breakdown-list">
                    {Object.entries(result.probabilities).map(([key, val]) => {
                      const emotion = EMOTION_MAP[key];
                      const percentage = (val * 100).toFixed(2);
                      const isDominant = result.label === key;
                      
                      return (
                        <div key={key} className={`breakdown-row ${isDominant ? 'breakdown-row-dominant' : ''}`}>
                          <div className="row-header">
                            <span className="row-label">
                              <span className="row-emoji">{emotion.emoji}</span> {emotion.label}
                            </span>
                            <span className="row-value" style={{ color: isDominant ? emotion.color : 'var(--text-secondary)' }}>
                              {percentage}% {isDominant && '(Dominan)'}
                            </span>
                          </div>
                          <div className="bar-container">
                            <div 
                              className="bar-fill"
                              style={{ 
                                width: `${percentage}%`, 
                                background: isDominant ? `linear-gradient(90deg, ${emotion.color} 0%, rgba(255,255,255,0.8) 100%)` : emotion.color,
                                boxShadow: isDominant ? `0 0 8px 0 ${emotion.shadow}` : 'none'
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
