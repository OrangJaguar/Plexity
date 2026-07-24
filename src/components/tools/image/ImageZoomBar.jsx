/**
 * @param {{ zoom: number, setZoom: (z: number | ((n: number) => number)) => void }} props
 */
export default function ImageZoomBar({ zoom, setZoom }) {
  const pct = Math.round(zoom * 100);
  return (
    <div className="tools-image-zoombar">
      <input
        type="range"
        min={10}
        max={400}
        step={1}
        value={pct}
        onChange={(e) => setZoom(Number(e.target.value) / 100)}
        aria-label="Zoom"
      />
      <span className="tools-image-zoombar-label">{pct}%</span>
    </div>
  );
}
