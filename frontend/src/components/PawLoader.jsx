export default function PawLoader({ size = 48, style }) {
  return (
    <div
      className="paw-loader"
      style={{ width: size, height: size, ...style }}
      role="status"
      aria-label="Загрузка"
    />
  );
}
