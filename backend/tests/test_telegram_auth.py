def test_telegram_auth_without_bot_token_rejected(client):
    # В тестовом окружении TELEGRAM_BOT_TOKEN не задан — любая подпись должна отклоняться,
    # а не молча приниматься
    r = client.post(
        "/api/auth/telegram",
        json={
            "id": 123456789,
            "first_name": "Ана",
            "last_name": "Петрович",
            "auth_date": 1700000000,
            "hash": "fake-hash",
        },
    )
    assert r.status_code == 401
