import base64
import os
import unittest
from email import message_from_bytes, policy
from unittest.mock import MagicMock, patch

import app


class SendEmailTests(unittest.TestCase):
    def test_send_email_with_ms_negocio_contract(self):
        service = MagicMock()
        service.users.return_value.messages.return_value.send.return_value.execute.return_value = {
            "id": "test-message-id"
        }

        with patch.dict(os.environ, {"MAIL_SERVICE_TOKEN": "shared-test-token"}):
            with patch.object(app, "get_gmail_service", return_value=service):
                response = app.app.test_client().post(
                    "/send-email",
                    headers={"Authorization": "Bearer shared-test-token"},
                    json={
                        "to": "destinatario@example.com",
                        "subject": "Nuevo partido: Alfa vs Beta",
                        "text": "El partido fue programado.",
                        "html": "<p>El partido fue programado.</p>",
                    },
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"message": "Correo enviado.", "id": "test-message-id"},
        )

        send_call = service.users.return_value.messages.return_value.send
        self.assertEqual(send_call.call_args.kwargs["userId"], "me")
        raw_message = send_call.call_args.kwargs["body"]["raw"]
        parsed_message = message_from_bytes(
            base64.urlsafe_b64decode(raw_message), policy=policy.default
        )
        self.assertEqual(parsed_message["to"], "destinatario@example.com")
        self.assertEqual(parsed_message["subject"], "Nuevo partido: Alfa vs Beta")
        self.assertEqual(
            parsed_message.get_body(preferencelist=("plain",)).get_content().strip(),
            "El partido fue programado.",
        )
        self.assertEqual(
            parsed_message.get_body(preferencelist=("html",)).get_content().strip(),
            "<p>El partido fue programado.</p>",
        )

    def test_send_email_keeps_plain_text_compatibility(self):
        service = MagicMock()
        service.users.return_value.messages.return_value.send.return_value.execute.return_value = {
            "id": "legacy-message-id"
        }

        with patch.dict(os.environ, {"MAIL_SERVICE_TOKEN": ""}):
            with patch.object(app, "get_gmail_service", return_value=service):
                response = app.app.test_client().post(
                    "/send-email",
                    json={"to": "destinatario@example.com", "text": "Hola desde Postman"},
                )

        self.assertEqual(response.status_code, 200)
        raw_message = (
            service.users.return_value.messages.return_value.send.call_args.kwargs["body"]["raw"]
        )
        parsed_message = message_from_bytes(
            base64.urlsafe_b64decode(raw_message), policy=policy.default
        )
        self.assertEqual(parsed_message["subject"], "Correo enviado desde API")
        self.assertEqual(parsed_message.get_content().strip(), "Hola desde Postman")

    def test_rejects_missing_or_invalid_service_token(self):
        with patch.dict(os.environ, {"MAIL_SERVICE_TOKEN": "shared-test-token"}):
            response = app.app.test_client().post(
                "/send-email",
                json={"to": "destinatario@example.com", "text": "Hola"},
            )
            invalid_response = app.app.test_client().post(
                "/send-email",
                headers={"Authorization": "Bearer incorrect"},
                json={"to": "destinatario@example.com", "text": "Hola"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(invalid_response.status_code, 401)

    def test_rejects_invalid_subject_without_calling_gmail(self):
        with patch.dict(os.environ, {"MAIL_SERVICE_TOKEN": ""}):
            with patch.object(app, "get_gmail_service") as get_service:
                response = app.app.test_client().post(
                    "/send-email",
                    json={
                        "to": "destinatario@example.com",
                        "subject": "Asunto\nBcc: other@example.com",
                        "text": "Hola",
                    },
                )

        self.assertEqual(response.status_code, 400)
        get_service.assert_not_called()

    def test_send_email_requires_to_and_text(self):
        with patch.dict(os.environ, {"MAIL_SERVICE_TOKEN": ""}):
            response = app.app.test_client().post(
                "/send-email",
                json={"to": "destinatario@example.com"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(), {"error": "El campo 'text' es obligatorio."}
        )
