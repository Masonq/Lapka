#!/usr/bin/env bash
set -e

# Бэкап PostgreSQL + загруженных файлов. Хранится вне /opt/lapabg специально —
# git pull/деплой никогда не затронет и не удалит эту директорию.
#
# ВАЖНО: это только локальные бэкапы на том же диске, что и сама база. Если
# откажет весь сервер (не только приложение — диск, VPS целиком), эти бэкапы
# пропадут вместе с оригиналом. Для полной защиты нужна ещё копия за пределами
# этого сервера (rsync на другую машину, S3-совместимое хранилище и т.п.) —
# это осознанно не настроено сейчас, отдельный шаг на будущее.

BACKUP_DIR="/opt/lapabg-backups"
KEEP_DAYS=14
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$BACKUP_DIR"
cd /opt/lapabg

echo "→ Бэкап базы данных"
docker compose exec -T db pg_dump -U lapabg lapabg | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

echo "→ Бэкап загруженных файлов"
docker compose exec -T backend tar czf - -C /app/uploads . > "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" 2>/dev/null || true

echo "→ Удаляю бэкапы старше ${KEEP_DAYS} дней"
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime "+${KEEP_DAYS}" -delete

echo "Готово: $BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
ls -lh "$BACKUP_DIR" | tail -5
