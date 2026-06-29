export default function TypingPreview() {
  return (
    <div className="tools-preview-scale tools-preview-typing">
      <div className="tools-typing-page tools-preview-typing-page">
        <header className="tools-typing-header">
          <div className="tools-typing-rail">
            <div className="tools-typing-rail-group">
              <span className="tools-typing-rail-btn">@ punctuation</span>
              <span className="tools-typing-rail-btn"># numbers</span>
            </div>
            <span className="tools-typing-rail-sep" aria-hidden />
            <div className="tools-typing-rail-group">
              <span className="tools-typing-rail-btn is-active">time</span>
              <span className="tools-typing-rail-btn">words</span>
            </div>
            <span className="tools-typing-rail-sep" aria-hidden />
            <div className="tools-typing-rail-group">
              {['15', '30', '60'].map((n) => (
                <span key={n} className={`tools-typing-rail-chip${n === '30' ? ' is-active' : ''}`}>{n}</span>
              ))}
            </div>
          </div>
        </header>
        <div className="tools-typing-stage-wrap">
          <div className="tools-typing-stage">
            <p className="tools-typing-words">
              <span className="tools-typing-word">
                <span className="tools-typing-char tools-typing-char--correct">practice</span>
              </span>
              {' '}
              <span className="tools-typing-word">
                <span className="tools-typing-char tools-typing-char--correct">typing</span>
              </span>
              {' '}
              <span className="tools-typing-word">
                <span className="tools-typing-char tools-typing-char--cursor">s</span>
                <span className="tools-typing-char tools-typing-char--pending">peed</span>
              </span>
              {' '}
              <span className="tools-typing-word">
                <span className="tools-typing-char tools-typing-char--pending">and</span>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
