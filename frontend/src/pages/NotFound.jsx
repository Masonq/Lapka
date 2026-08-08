import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="empty-state">
      <div className="empty-state-title">Такой страницы нет</div>
      Возможно, ссылка устарела или адрес набран неверно
      <div style={{ marginTop: 16 }}>
        <Link to="/" className="btn btn-primary">На главную</Link>
      </div>
    </div>
  );
}
