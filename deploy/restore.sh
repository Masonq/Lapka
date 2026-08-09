#!/usr/bin/env bash
set -e

# Восстановление из бэкапа. РАЗРУШИТЕЛЬНО — полностью перезаписывает текущую базу
# и загруженные файлы. Использование:
#   bash deploy/restore.sh /opt/lapabg-backups/db_2026-08-09_16-00-00.sql.gz
#
# Если путь не передан — берёт последний бэкап автоматически.

BACKUP_DIR="/opt/lapabg-backups"
DB_BACKUP="${1:-$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1)}"

if [ -z "$DB_BACKUP" ] || [ ! -f "$DB_BACKUP" ]; then
    echo "Бэкап не найден: $DB_BACKUP"
    echo "Доступные бэкапы:"
    ls -lh "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null || echo "  (нет ни одного)"
    exit 1
fi

UPLOADS_BACKUP="${DB_BACKUP/db_/uploads_}"
UPLOADS_BACKUP="${UPLOADS_BACKUP/.sql.gz/.tar.gz}"

echo "Восстанавливаю из: $DB_BACKUP"
echo "Это ПОЛНОСТЬЮ ЗАМЕНИТ текущую базу данных. Отменить нельзя."
read -p "Точно продолжить? Напиши 'да' для подтверждения: " CONFIRM
if [ "$CONFIRM" != "да" ]; then
    echo "Отменено"
    exit 1
fi

cd /opt/lapabg

echo "→ Восстанавливаю базу данных"
gunzip -c "$DB_BACKUP" | docker compose exec -T db psql -U lapabg -d lapabg

if [ -f "$UPLOADS_BACKUP" ]; then
    echo "→ Восстанавливаю загруженные файлы"
    docker compose exec -T backend sh -c "rm -rf /app/uploads/* && tar xzf - -C /app/uploads" < "$UPLOADS_BACKUP"
else
    echo "→ Бэкап файлов не найден ($UPLOADS_BACKUP) — пропускаю, восстановлена только база"
fi

echo "Готово"
