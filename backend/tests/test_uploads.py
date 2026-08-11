import io

import piexif
import pytest
from PIL import Image


def _jpeg_with_gps(width=3000, height=2000):
    img = Image.new("RGB", (width, height), (200, 150, 100))
    buf = io.BytesIO()
    exif_dict = {
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: "N",
            piexif.GPSIFD.GPSLatitude: ((44, 1), (48, 1), (0, 1)),
        }
    }
    img.save(buf, "JPEG", exif=piexif.dump(exif_dict))
    return buf.getvalue()


def test_upload_requires_auth(client):
    r = client.post("/api/uploads", files={"file": ("photo.jpg", _jpeg_with_gps(), "image/jpeg")})
    assert r.status_code == 401


def test_upload_strips_gps_exif_and_resizes(client, register_user, tmp_path):
    headers = register_user()
    r = client.post(
        "/api/uploads", files={"file": ("photo.jpg", _jpeg_with_gps(3000, 2000), "image/jpeg")}, headers=headers
    )
    assert r.status_code == 200
    url = r.json()["url"]
    assert url.startswith("/uploads/")

    r = client.get(url)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"

    saved = Image.open(io.BytesIO(r.content))
    assert max(saved.size) <= 1600  # ужато
    assert not dict(saved.getexif())  # метаданные срезаны


def test_upload_rejects_fake_image(client, register_user):
    headers = register_user()
    fake_bytes = b"this is definitely not a real image file"
    r = client.post("/api/uploads", files={"file": ("fake.jpg", fake_bytes, "image/jpeg")}, headers=headers)
    assert r.status_code == 400


def test_upload_rejects_disallowed_content_type(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/uploads", files={"file": ("doc.pdf", b"%PDF-1.4 fake", "application/pdf")}, headers=headers
    )
    assert r.status_code == 400


def test_upload_rejects_empty_file(client, register_user):
    headers = register_user()
    r = client.post("/api/uploads", files={"file": ("empty.jpg", b"", "image/jpeg")}, headers=headers)
    assert r.status_code == 400


def test_uploaded_photo_attaches_to_post(client, register_user):
    headers = register_user()
    upload = client.post(
        "/api/uploads", files={"file": ("bela.jpg", _jpeg_with_gps(800, 600), "image/jpeg")}, headers=headers
    ).json()

    post = client.post(
        "/api/posts",
        json={"type": "lost", "title": "Бела пропала", "body": "текст", "photo_url": upload["url"]},
        headers=headers,
    ).json()

    assert post["photo_url"] == upload["url"]


def test_wrong_file_type_error_translated_to_serbian(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/uploads",
        files={"file": ("test.txt", b"not an image", "text/plain")},
        headers={**headers, "X-Lang": "sr"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Možeš učitati samo JPEG, PNG ili WebP"


def _small_jpeg():
    img = Image.new("RGB", (10, 10), (100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return buf.getvalue()


def test_upload_rate_limit(client, register_user):
    headers = register_user()
    statuses = []
    for _ in range(31):
        r = client.post(
            "/api/uploads", files={"file": ("photo.jpg", _small_jpeg(), "image/jpeg")}, headers=headers
        )
        statuses.append(r.status_code)
    # 30 загрузок проходят, 31-я блокируется лимитом (30 за 10 минут на пользователя)
    assert statuses[:30] == [200] * 30
    assert statuses[30] == 429
