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
        heading = "Регистрация"
        intro = "Ещё один шаг — введи код ниже, и аккаунт готов:"
        intro_plain = "Ещё один шаг — введи код ниже, и аккаунт готов:"
        footer = "Если это был не ты — просто игнорируй это письмо, аккаунт не будет создан."
    elif purpose == "password_reset":
        subject = "Код восстановления пароля — Lapki"
        heading = "Восстановление пароля"
        intro = "Ты запросил(а) восстановление пароля.<br/>Вот код для подтверждения:"
        intro_plain = "Ты запросил(а) восстановление пароля. Вот код для подтверждения:"
        footer = "Если это был не ты — просто игнорируй это письмо, пароль останется прежним."
    else:
        subject = "Код подтверждения смены пароля — Lapki"
        heading = "Смена пароля"
        intro = "Получен запрос на смену пароля.<br/>Вот код для подтверждения:"
        intro_plain = "Получен запрос на смену пароля. Вот код для подтверждения:"
        footer = "Если ты не запрашивал(а) смену пароля — срочно проверь безопасность аккаунта."

    text_body = f"{intro_plain}\n\n{code}\n\nКод действителен 10 минут. {footer}"

    html_body = f"""\
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background: linear-gradient(180deg, #FBEBE1 0%, #FAFAFA 220px); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="500" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <img src="https://lapki.info/logo.png" width="88" height="92" alt="Lapki" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius: 28px; overflow:hidden; box-shadow: 0 10px 40px rgba(184,90,33,0.12); border: 1px solid #F3E2D8;">
                <tr>
                  <td align="center" style="padding: 36px 36px 4px;">
                    <p style="margin:0; font-size: 20px; font-weight: 800; color:#1A1A1A;">{heading}</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 8px 36px 0;">
                    <p style="margin:0; font-size: 15px; color:#6E6E73; line-height: 1.6;">
                      {intro}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 28px 36px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FBEBE1, #F6D9C4); border-radius: 20px;">
                      <tr>
                        <td style="padding: 20px 40px;">
                          <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color:#B85A21; font-family: monospace;">{code}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 36px 8px;">
                    <p style="margin:0; font-size: 13px; color:#9C9CA0;">⏱ Действителен 10 минут</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px 36px 32px;">
                    <div style="height:1px; background:#F0EAE5;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 36px 36px;">
                    <p style="margin:0; font-size: 12px; color:#9C9CA0; line-height: 1.6;">
                      {footer}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin:0; font-size: 12px; color:#9C9CA0;">Lapki — соцсеть для питомцев Белграда</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    send_email(to, subject, text_body, html_body)
