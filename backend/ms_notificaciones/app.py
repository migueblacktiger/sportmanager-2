import base64
import hmac
import os
import pickle
from email.message import EmailMessage

from flask import Flask, jsonify, request
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

app = Flask(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
CREDENTIALS_DIR = os.path.join(os.path.dirname(__file__), "credentials")
CLIENT_SECRET_FILE = os.path.join(CREDENTIALS_DIR, "credentials.json")
TOKEN_FILE = os.path.join(CREDENTIALS_DIR, "token.pickle")
_gmail_service = None


def get_gmail_service():
    global _gmail_service
    if _gmail_service is not None:
        return _gmail_service

    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CLIENT_SECRET_FILE):
                raise FileNotFoundError(
                    f"Gmail OAuth credentials not found: {CLIENT_SECRET_FILE}"
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRET_FILE, SCOPES
            )
            creds = flow.run_local_server(port=0)

        os.makedirs(CREDENTIALS_DIR, exist_ok=True)
        with open(TOKEN_FILE, "wb") as token:
            pickle.dump(creds, token)

    _gmail_service = build("gmail", "v1", credentials=creds)
    return _gmail_service


@app.post("/send-email")
def send_email():
    expected_token = os.environ.get("MAIL_SERVICE_TOKEN", "").strip()
    if expected_token:
        supplied_token = request.headers.get("Authorization", "")
        if not hmac.compare_digest(supplied_token, f"Bearer {expected_token}"):
            return jsonify(error="No autorizado."), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="El cuerpo debe ser un objeto JSON válido."), 400

    recipient = payload.get("to")
    subject = payload.get("subject", "Correo enviado desde API")
    text = payload.get("text")
    html = payload.get("html")
    if (
        not isinstance(recipient, str)
        or not recipient.strip()
        or "\r" in recipient
        or "\n" in recipient
    ):
        return jsonify(error="El campo 'to' es obligatorio."), 400
    if not isinstance(text, str) or not text.strip():
        return jsonify(error="El campo 'text' es obligatorio."), 400
    if not isinstance(subject, str) or not subject.strip() or "\r" in subject or "\n" in subject:
        return jsonify(error="El campo 'subject' no es válido."), 400
    if html is not None and not isinstance(html, str):
        return jsonify(error="El campo 'html' debe ser texto."), 400

    message = EmailMessage()
    message["To"] = recipient.strip()
    message["Subject"] = subject.strip()
    message.set_content(text, charset="utf-8")
    if isinstance(html, str) and html.strip():
        message.add_alternative(html, subtype="html", charset="utf-8")
    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii")

    try:
        result = (
            get_gmail_service()
            .users()
            .messages()
            .send(userId="me", body={"raw": encoded_message})
            .execute()
        )
    except FileNotFoundError:
        app.logger.exception("Gmail OAuth credentials are not configured")
        return jsonify(error="El servicio de correo no está configurado."), 503
    except HttpError:
        app.logger.exception("Gmail API could not send the email")
        return jsonify(error="Gmail API no pudo enviar el correo."), 502

    return jsonify(message="Correo enviado.", id=result["id"]), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
