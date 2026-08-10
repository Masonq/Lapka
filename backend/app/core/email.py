"""Отправка email через обычный SMTP — работает с любым провайдером
(Gmail, Яндекс, Mail.ru с паролем приложения, Resend и т.д.), без жёсткой
привязки к конкретному стороннему API SDK.

Настройка через переменные окружения:
  SMTP_HOST, SMTP_PORT (по умолчанию 587), SMTP_USER, SMTP_PASSWORD,
  SMTP_FROM (по умолчанию — то же, что SMTP_USER)

SMTP_PORT может быть списком через запятую (например "2587,2465") — тогда
при отправке пробуются по очереди, первый успешный останавливает попытки.
Полезно, если неизвестно заранее, какой порт откроет хостер (частая
практика VPS-провайдеров — блокировать часть исходящих SMTP-портов против
спама, но не все сразу).

Для Resend: SMTP_HOST=smtp.resend.com, SMTP_USER=resend (буквально это
слово, не email), SMTP_PASSWORD=<API-ключ Resend, начинается с re_>.
SMTP_PORT=587 (STARTTLS) или 465 (сразу SSL) — стандартные порты, но многие
хостеры блокируют исходящий SMTP на них против спама. Если так — Resend
даёт альтернативные порты 2587 (STARTTLS) и 2465 (SSL), которые реже
попадают под блокировку. SMTP_FROM обязательно должен быть адресом на
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
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

logger = logging.getLogger("email")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORTS = [int(p.strip()) for p in os.getenv("SMTP_PORT", "587").split(",") if p.strip()]
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Lapki")


def generate_code() -> str:
    """6-значный числовой код — достаточно для одноразового подтверждения
    с ограничением попыток (см. attempts в EmailVerificationCode), не нужен
    более длинный/криптостойкий токен, как для, например, сброса пароля по ссылке."""
    return f"{random.randint(0, 999999):06d}"


def _send_via_port(port: int, msg: MIMEMultipart, to: str) -> None:
    """Один порт, одна попытка — поднято отдельно, чтобы send_email мог
    перебирать несколько портов, не дублируя ветвление SSL/STARTTLS."""
    # Порт 465/2465 (implicit SSL/SMTPS) — соединение сразу зашифровано, starttls() там
    # не нужен и не сработает. Порт 587/2587 (STARTTLS) — соединение начинается открытым
    # текстом, потом апгрейдится. 2465/2587 — альтернативные порты Resend именно на
    # случай, когда хостер блокирует стандартные 465/587/25 (частая практика VPS)
    if port in (465, 2465):
        with smtplib.SMTP_SSL(SMTP_HOST, port, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
    else:
        with smtplib.SMTP(SMTP_HOST, port, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())


def send_email(to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    if not SMTP_HOST:
        logger.warning("SMTP не настроен — письмо НЕ отправлено по-настоящему. To: %s, Subject: %s, Body: %s", to, subject, text_body)
        return

    # multipart/alternative с текстовой И HTML-версией — письма без HTML-альтернативы
    # и без человеческого имени отправителя (голый email в From) статистически чаще
    # попадают в спам, это реальный фактор для автоматических классификаторов, не
    # просто теоретическая рекомендация
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM))
    msg["To"] = to
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    if html_body:
        msg.attach(MIMEText(html_body, "html", "utf-8"))

    errors = []
    for port in SMTP_PORTS:
        try:
            _send_via_port(port, msg, to)
            return  # успех — дальше пробовать не нужно
        except Exception as exc:
            errors.append(f"порт {port}: {exc}")

    # Письмо отправляется в фоновой задаче (после того как пользователь уже получил
    # ответ) — необработанное исключение здесь легко потерять незамеченным. Явно
    # логируем с полным списком неудачных портов, чтобы в docker compose logs было
    # видно, если письмо реально не дошло ни по одному из настроенных портов
    logger.error(
        "Не удалось отправить письмо ни по одному порту. To: %s, Subject: %s, Ошибки: %s",
        to, subject, "; ".join(errors),
    )


def send_verification_code(to: str, code: str, purpose: str) -> None:
    if purpose == "register":
        subject = "Код подтверждения регистрации — Lapki"
        intro = "Спасибо, что регистрируешься в Lapki! Твой код подтверждения:"
        footer = "Если это был не ты — просто игнорируй это письмо."
    else:
        subject = "Код подтверждения смены пароля — Lapki"
        intro = "Ты запросил(а) смену пароля в Lapki. Твой код подтверждения:"
        footer = "Если ты не запрашивал(а) смену пароля — срочно проверь безопасность аккаунта."

    text_body = f"{intro}\n\n{code}\n\nОн действителен 10 минут. {footer}"
    html_body = f"""\
<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 15px; color: #1A1A1A;">{intro}</p>
  <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #B85A21;
              background: #FBEBE1; border-radius: 16px; padding: 16px 24px; text-align: center; margin: 20px 0;">
    {code}
  </div>
  <p style="font-size: 13px; color: #707074;">Код действителен 10 минут.</p>
  <p style="font-size: 13px; color: #707074;">{footer}</p>
  <p style="font-size: 12px; color: #9C9CA0; margin-top: 32px;">Lapki — соцсеть для питомцев Белграда</p>
</div>"""
    send_email(to, subject, text_body, html_body)
