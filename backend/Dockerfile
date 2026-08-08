FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Непривилегированный пользователь — если когда-нибудь найдётся RCE (например через
# обработку изображений в Pillow, где такое уже случалось), у процесса не будет root
# внутри контейнера. Создаём папку загрузок заранее с нужным владельцем: при первом
# монтировании пустого named volume поверх неё Docker унаследует эти права
RUN groupadd -r lapabg && useradd -r -g lapabg lapabg \
    && mkdir -p /app/uploads \
    && chown -R lapabg:lapabg /app

USER lapabg

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
