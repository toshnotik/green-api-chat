# GREEN-API MAX Chat

[![CI](https://github.com/toshnotik/green-api-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/toshnotik/green-api-chat/actions/workflows/ci.yml)

Демонстрационное тестовое React-приложение для отправки и получения текстовых сообщений
в MAX через GREEN-API. Не является официальным клиентом MAX.

## Demo

[Live demo](https://toshnotik.github.io/green-api-chat/)

![Интерфейс GREEN-API MAX Chat](docs/screenshot.png)

## Возможности

- подключение по `idInstance` и `apiTokenInstance`;
- открытие чата;
- отправка текстовых сообщений;
- получение входящих сообщений через HTTP API;
- отображение отправленных и полученных сообщений текущей сессии.

## Стек

- React
- TypeScript
- Vite
- SCSS Modules
- native Fetch API

## Запуск

```bash
npm install
npm run dev
```

Для работы нужны GREEN-API MAX instance, `idInstance` и `apiTokenInstance`.
Credentials вводятся непосредственно в интерфейсе приложения.

## Настройка GREEN-API

Для получения входящих сообщений через HTTP API в настройках instance:

- `incomingWebhook` должен быть включен;
- `webhookUrl` должен быть пустым.

После изменения настроек GREEN-API может потребоваться небольшое время до их применения.

## Как пользоваться

1. Введите `idInstance` и `apiTokenInstance`.
2. Введите номер MAX.
3. Нажмите `Открыть чат`.
4. Отправляйте и получайте текстовые сообщения.

## Используемые методы GREEN-API

- [CheckAccount](https://green-api.com/v3/docs/api/service/CheckAccount/)
- [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/)
- [ReceiveNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/)
- [DeleteNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/)

## Ограничения

- поддерживаются только текстовые сообщения;
- история сообщений не загружается из MAX и хранится только в React state;
- после перезагрузки страницы история очищается;
- приложение показывает сообщения только текущего открытого чата;
- уведомления других чатов не отображаются.
