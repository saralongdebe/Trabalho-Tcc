# ConectaVida

Para rodar localmente:

```bash
npm start
```

A aplicação ficará disponível em http://127.0.0.1:3000

## Recuperação de senha

Para enviar o link por e-mail, preencha o `.env` com uma conta SMTP real. No Gmail, ative a verificação em duas etapas e use uma senha de app, não a senha normal da conta:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-do-google
EMAIL_FROM=ConectaVida <seu-email@gmail.com>
BASE_URL=http://localhost:3000
```

Depois de alterar o `.env`, reinicie o servidor e solicite a recuperação usando o mesmo e-mail cadastrado no sistema.
