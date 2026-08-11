import io
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.security import get_current_user
from app.core.i18n import get_lang, t
from app.core.rate_limit import upload_limiter
from app.models.models import User

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 МБ до обработки
MAX_DIMENSION = 1600  # длинная сторона после ужатия

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("")
async def upload_image(
    file: UploadFile = File(...), user: User = Depends(get_current_user), lang: str = Depends(get_lang)
):
    upload_limiter.check(user.id)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=t("only_jpeg_png_webp", lang))

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail=t("empty_file", lang))
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail=t("file_too_large", lang))

    # Не доверяем заявленному Content-Type — открываем через Pillow, чтобы убедиться,
    # что это действительно изображение, а не что-то замаскированное под него
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail=t("file_corrupted_not_image", lang))

    # Фото с телефона часто несут EXIF с GPS-координатами места съёмки — это может
    # выдать домашний адрес человека. Применяем поворот из EXIF (чтобы фото не легло
    # на бок) и пересохраняем уже без метаданных
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    if max(image.size) > MAX_DIMENSION:
        image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.jpg"
    path = os.path.join(UPLOAD_DIR, filename)
    image.save(path, "JPEG", quality=85, optimize=True)

    return {"url": f"/uploads/{filename}"}
