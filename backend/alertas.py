import httpx


async def enviar_telegram(token_bot: str, chat_id: str, mensaje: str) -> None:
    url = f"https://api.telegram.org/bot{token_bot}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(url, json={
            "chat_id": chat_id,
            "text": mensaje,
            "parse_mode": "HTML",
        })


async def enviar_fcm(server_key: str, token_dispositivo: str, titulo: str, cuerpo: str) -> None:
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            "https://fcm.googleapis.com/fcm/send",
            headers={
                "Authorization": f"key={server_key}",
                "Content-Type": "application/json",
            },
            json={
                "to": token_dispositivo,
                "notification": {"title": titulo, "body": cuerpo},
            },
        )
