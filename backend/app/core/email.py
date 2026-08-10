"""Отправка email через обычный SMTP — работает с любым провайдером
(Gmail, Яндекс, Mail.ru с паролем приложения, Resend и т.д.), без жёсткой
привязки к конкретному стороннему API SDK.

Настройка через переменные окружения:
  SMTP_HOST, SMTP_PORT (по умолчанию 587), SMTP_USER, SMTP_PASSWORD,
  SMTP_FROM (по умолчанию — то же, что SMTP_USER)

Для Resend: SMTP_HOST=smtp.resend.com, SMTP_USER=resend (буквально это
слово, не email), SMTP_PASSWORD=<API-ключ Resend, начинается с re_>,
SMTP_PORT=587 (STARTTLS) или 465 (сразу SSL, оба варианта поддерживаются
ниже — см. send_email). SMTP_FROM обязательно должен быть адресом на
домене, подтверждённом в Resend, иначе они отклонят отправку.

Если SMTP_HOST не задан (например, в тестах или локальной разработке без
настроенной почты) — письмо не отправляется по-настоящему, а просто
пишется в лог. Это осознанное решение: тесты не должны падать или виснуть
из-за отсутствия реальной почтовой настройки, а разработчик всё равно
видит код в консоли для ручной проверки."""
import logging
import os
import random
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger("email")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)


def generate_code() -> str:
    """6-значный числовой код — достаточно для одноразового подтверждения
    с ограничением попыток (см. attempts в EmailVerificationCode), не нужен
    более длинный/криптостойкий токен, как для, например, сброса пароля по ссылке."""
    return f"{random.randint(0, 999999):06d}"


def send_email(to: str, subject: str, body: str) -> None:
    if not SMTP_HOST:
        logger.warning("SMTP не настроен — письмо НЕ отправлено по-настоящему. To: %s, Subject: %s, Body: %s", to, subject, body)
        return

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to

    # Порт 465 (например, Resend по умолчанию) — соединение сразу зашифровано (implicit
    # SSL/SMTPS), starttls() там не нужен и не сработает. Порт 587 (Gmail/Яндекс/Resend
    # тоже поддерживает) — соединение начинается открытым текстом, потом апгрейдится
    # через STARTTLS. Оба варианта — легитимный стандарт, выбираем по порту автоматически.
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())


def send_verification_code(to: str, code: str, purpose: str) -> None:
    if purpose == "register":
        subject = "Код подтверждения регистрации — Lapki"
        body = f"Твой код подтверждения: {code}\n\nОн действителен 10 минут. Если это был не ты — просто игнорируй это письмо."
    else:
        subject = "Код подтверждения смены пароля — Lapki"
        body = f"Твой код для смены пароля: {code}\n\nОн действителен 10 минут. Если ты не запрашивал(а) смену пароля — срочно проверь безопасность аккаунта."
    send_email(to, subject, body)
