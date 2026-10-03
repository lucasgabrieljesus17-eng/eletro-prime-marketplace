# Eletro Prime

Loja virtual de eletrônicos com:
- Home premium em azul-marinho + dourado
- Carrossel automático de banners
- Catálogo, busca, filtros e carrinho
- Checkout preparado para Pix, crédito e débito
- Painel `/admin` para produtos, estoque, banners e pedidos
- Upload de fotos e vídeos
- SQLite para desenvolvimento/MVP

## Rodar localmente

1. Instale Node.js 20+.
2. Copie `.env.example` para `.env`.
3. Defina `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
4. Execute:
   `npm install`
5. Execute:
   `npm start`
6. Abra:
   `http://localhost:3000`
7. Painel:
   `http://localhost:3000/admin`

## Pagamentos

O checkout já separa Pix, crédito e débito na interface e deixa o servidor preparado para integração com um gateway brasileiro.

Para cobrança real, configure as credenciais do gateway no `.env` e implemente/ative o adapter do provedor escolhido. Nunca coloque access tokens ou chaves secretas no JavaScript do navegador e nunca armazene CVV ou número completo de cartão.

CNPJ da loja: 52.280.342/0001-06

## Produção

Antes de publicar em produção:
- usar HTTPS;
- trocar o armazenamento SQLite por PostgreSQL ou outro banco gerenciado se houver grande volume;
- usar armazenamento de mídia (S3/R2/etc.);
- configurar gateway de pagamento;
- configurar e-mail/WhatsApp;
- revisar LGPD, termos, privacidade, troca/devolução e políticas do gateway;
- trocar SESSION_SECRET e senha de administrador.
