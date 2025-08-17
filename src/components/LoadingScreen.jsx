import './LoadingScreen.css'

const LoadingScreen = () => {
  return (
    <div className="loading-container">
      {/* Floating background shapes */}
      <div className="floating-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>

      <div className="loading-content">
        <div className="loading-brand">
          <span className="loading-icon">🍫</span>
          <h1 className="loading-title">GlowChocolate</h1>
        </div>
        
        <div className="loading-spinner-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-inner">
              <span className="inner-icon">✨</span>
            </div>
          </div>
        </div>
        
        <div className="loading-text">
          <p className="loading-message">Yetki kontrolü yapılıyor...</p>
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
