# Sistema Cadista

## Segurança operacional

### Autenticação

- Login com bloqueio temporário após tentativas repetidas.
- `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS` e `TRUSTED_HOSTS` devem vir de variáveis de ambiente.
- `APP_ENV=production` desativa `/docs`, `/redoc` e `/openapi.json`.

### Deploy seguro

- Termine TLS no reverse proxy, não na aplicação FastAPI.
- No proxy, envie `X-Forwarded-Proto`, `X-Forwarded-For` e `Host` corretos.
- Adicione HSTS no proxy, com algo como:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
```

- Restrinja `server_name` e `TRUSTED_HOSTS` aos domínios reais.
- Restrinja `CORS_ORIGINS` aos domínios reais do frontend.
- Mantenha o banco de dados fora da internet pública.

### Variáveis principais

- `DATABASE_URL`: string de conexão do banco.
- `SECRET_KEY`: chave longa e única por ambiente.
- `LOGIN_MAX_ATTEMPTS`: número máximo de falhas antes do bloqueio.
- `LOGIN_LOCKOUT_MINUTES`: tempo de bloqueio temporário.
- `LOGIN_RATE_LIMIT_ATTEMPTS`: número máximo de logins por janela por cliente.
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`: duração da janela do rate limit.
- `PASSWORD_MIN_LENGTH`: tamanho mínimo das senhas.
- `BCRYPT_ROUNDS`: custo do hash de senha.
