"""Тесты app/core/email.py — в основном ветвление SMTP_SSL (порт 465, implicit SSL,
как у Resend по умолчанию) vs SMTP+STARTTLS (порт 587, как у Gmail/Яндекс, и тоже
поддерживается Resend). Реальных писем никуда не уходит — smtplib подменяется моками.

Патчим атрибуты УЖЕ импортированного модуля через monkeypatch.setattr, а не
importlib.reload — reload меняет состояние модуля напрямую в его __dict__, которое
расшарено с уже связанными объектами функций (from x import y копирует ссылку на
функцию, но не на её __globals__ — модуль остаётся тем же объектом). Значит reload
в одном тесте мог бы незаметно повлиять на другие тесты той же pytest-сессии,
использующие send_verification_code через auth.py. monkeypatch.setattr сам
откатывает изменения после теста — безопаснее."""
from unittest.mock import MagicMock, patch

import app.core.email as email_module


def test_port_465_uses_implicit_ssl(monkeypatch):
    monkeypatch.setattr(email_module, "SMTP_HOST", "smtp.resend.com")
    monkeypatch.setattr(email_module, "SMTP_PORT", 465)
    monkeypatch.setattr(email_module, "SMTP_USER", "resend")
    monkeypatch.setattr(email_module, "SMTP_PASSWORD", "re_fake_key_for_test")
    monkeypatch.setattr(email_module, "SMTP_FROM", "noreply@example.com")

    mock_ssl = MagicMock()
    mock_ssl.__enter__ = MagicMock(return_value=mock_ssl)
    mock_ssl.__exit__ = MagicMock(return_value=False)

    with patch.object(email_module.smtplib, "SMTP_SSL", return_value=mock_ssl) as ssl_cls, \
         patch.object(email_module.smtplib, "SMTP") as plain_cls:
        email_module.send_email("to@example.com", "Тема", "Текст")

        ssl_cls.assert_called_once_with("smtp.resend.com", 465)
        plain_cls.assert_not_called()
        mock_ssl.login.assert_called_once_with("resend", "re_fake_key_for_test")


def test_port_587_uses_starttls(monkeypatch):
    monkeypatch.setattr(email_module, "SMTP_HOST", "smtp.resend.com")
    monkeypatch.setattr(email_module, "SMTP_PORT", 587)
    monkeypatch.setattr(email_module, "SMTP_USER", "resend")
    monkeypatch.setattr(email_module, "SMTP_PASSWORD", "re_fake_key_for_test")
    monkeypatch.setattr(email_module, "SMTP_FROM", "noreply@example.com")

    mock_plain = MagicMock()
    mock_plain.__enter__ = MagicMock(return_value=mock_plain)
    mock_plain.__exit__ = MagicMock(return_value=False)

    with patch.object(email_module.smtplib, "SMTP", return_value=mock_plain) as plain_cls, \
         patch.object(email_module.smtplib, "SMTP_SSL") as ssl_cls:
        email_module.send_email("to@example.com", "Тема", "Текст")

        plain_cls.assert_called_once_with("smtp.resend.com", 587)
        mock_plain.starttls.assert_called_once()
        ssl_cls.assert_not_called()


def test_no_smtp_host_skips_sending_silently(monkeypatch):
    monkeypatch.setattr(email_module, "SMTP_HOST", None)

    with patch.object(email_module.smtplib, "SMTP") as plain_cls, \
         patch.object(email_module.smtplib, "SMTP_SSL") as ssl_cls:
        email_module.send_email("to@example.com", "Тема", "Текст")
        plain_cls.assert_not_called()
        ssl_cls.assert_not_called()


def test_generate_code_is_six_digits():
    for _ in range(20):
        code = email_module.generate_code()
        assert len(code) == 6
        assert code.isdigit()
