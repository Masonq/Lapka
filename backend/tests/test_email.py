"""Тесты app/core/email.py — ветвление SMTP_SSL (порты 465/2465, implicit SSL) vs
SMTP+STARTTLS (порты 587/2587), и перебор нескольких портов из SMTP_PORTS с
остановкой на первом успешном. 2465/2587 — альтернативные порты Resend именно
на случай блокировки стандартных хостером. Реальных писем никуда не уходит —
smtplib подменяется моками.

Патчим атрибуты УЖЕ импортированного модуля через monkeypatch.setattr, а не
importlib.reload — reload меняет состояние модуля напрямую в его __dict__, которое
расшарено с уже связанными объектами функций (from x import y копирует ссылку на
функцию, но не на её __globals__ — модуль остаётся тем же объектом). Значит reload
в одном тесте мог бы незаметно повлиять на другие тесты той же pytest-сессии,
использующие send_verification_code через auth.py. monkeypatch.setattr сам
откатывает изменения после теста — безопаснее."""
from unittest.mock import MagicMock, patch

import pytest

import app.core.email as email_module


def _set_common(monkeypatch, ports):
    monkeypatch.setattr(email_module, "SMTP_HOST", "smtp.resend.com")
    monkeypatch.setattr(email_module, "SMTP_PORTS", ports)
    monkeypatch.setattr(email_module, "SMTP_USER", "resend")
    monkeypatch.setattr(email_module, "SMTP_PASSWORD", "re_fake_key_for_test")
    monkeypatch.setattr(email_module, "SMTP_FROM", "noreply@example.com")


@pytest.mark.parametrize("port", [465, 2465])
def test_ssl_ports_use_implicit_ssl(monkeypatch, port):
    _set_common(monkeypatch, [port])

    mock_ssl = MagicMock()
    mock_ssl.__enter__ = MagicMock(return_value=mock_ssl)
    mock_ssl.__exit__ = MagicMock(return_value=False)

    with patch.object(email_module.smtplib, "SMTP_SSL", return_value=mock_ssl) as ssl_cls, \
         patch.object(email_module.smtplib, "SMTP") as plain_cls:
        email_module.send_email("to@example.com", "Тема", "Текст")

        ssl_cls.assert_called_once_with("smtp.resend.com", port, timeout=10)
        plain_cls.assert_not_called()
        mock_ssl.login.assert_called_once_with("resend", "re_fake_key_for_test")


@pytest.mark.parametrize("port", [587, 2587])
def test_starttls_ports_use_starttls(monkeypatch, port):
    _set_common(monkeypatch, [port])

    mock_plain = MagicMock()
    mock_plain.__enter__ = MagicMock(return_value=mock_plain)
    mock_plain.__exit__ = MagicMock(return_value=False)

    with patch.object(email_module.smtplib, "SMTP", return_value=mock_plain) as plain_cls, \
         patch.object(email_module.smtplib, "SMTP_SSL") as ssl_cls:
        email_module.send_email("to@example.com", "Тема", "Текст")

        plain_cls.assert_called_once_with("smtp.resend.com", port, timeout=10)
        mock_plain.starttls.assert_called_once()
        ssl_cls.assert_not_called()


def test_falls_back_to_second_port_when_first_fails(monkeypatch):
    """Именно то, что просил пользователь — 'можно сохранить оба порта' —
    первый порт (2587) недоступен, код должен сам попробовать второй (2465),
    не считать письмо неотправленным, пока не исчерпаны все варианты."""
    _set_common(monkeypatch, [2587, 2465])

    mock_ssl = MagicMock()
    mock_ssl.__enter__ = MagicMock(return_value=mock_ssl)
    mock_ssl.__exit__ = MagicMock(return_value=False)

    with patch.object(email_module.smtplib, "SMTP", side_effect=TimeoutError("порт 2587 не отвечает")) as plain_cls, \
         patch.object(email_module.smtplib, "SMTP_SSL", return_value=mock_ssl) as ssl_cls:
        email_module.send_email("to@example.com", "Тема", "Текст")

        plain_cls.assert_called_once_with("smtp.resend.com", 2587, timeout=10)  # первая попытка — неудачная
        ssl_cls.assert_called_once_with("smtp.resend.com", 2465, timeout=10)    # вторая — успешная
        mock_ssl.login.assert_called_once()
        mock_ssl.sendmail.assert_called_once()


def test_all_ports_failing_logs_error_does_not_raise(monkeypatch):
    _set_common(monkeypatch, [2587, 2465])

    with patch.object(email_module.smtplib, "SMTP", side_effect=TimeoutError("недоступен")), \
         patch.object(email_module.smtplib, "SMTP_SSL", side_effect=TimeoutError("тоже недоступен")):
        email_module.send_email("to@example.com", "Тема", "Текст")  # не должно бросить исключение


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
