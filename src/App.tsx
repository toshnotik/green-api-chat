import { FormEvent, useState } from 'react';
import { getChatIdByPhone, sendMessage } from './api/greenApi';
import styles from './App.module.scss';

type Message = {
  id: string;
  text: string;
  time: string;
  direction: 'outgoing';
};

const formatMessageTime = () =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

function App() {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [phone, setPhone] = useState('');
  const [activeChat, setActiveChat] = useState('');
  const [activeChatId, setActiveChatId] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const chatTitle = activeChat || 'Получатель не выбран';

  const handlePhoneChange = (value: string) => {
    setPhone(value);

    if (activeChat) {
      setActiveChat('');
      setActiveChatId('');
      setMessages([]);
    }
  };

  const openChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedIdInstance = idInstance.trim();
    const trimmedApiTokenInstance = apiTokenInstance.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedIdInstance || !trimmedApiTokenInstance) {
      setError('Введите idInstance и apiTokenInstance.');
      return;
    }

    if (!trimmedPhone) {
      setError('Введите номер телефона получателя.');
      return;
    }

    setIsOpeningChat(true);
    setError('');

    try {
      const chatId = await getChatIdByPhone({
        idInstance: trimmedIdInstance,
        apiTokenInstance: trimmedApiTokenInstance,
        phoneNumber: trimmedPhone,
      });

      setActiveChat(trimmedPhone);
      setActiveChatId(chatId);
      setMessages([]);
    } catch (requestError) {
      setActiveChat('');
      setActiveChatId('');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось открыть чат с получателем.',
      );
    } finally {
      setIsOpeningChat(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedIdInstance = idInstance.trim();
    const trimmedApiTokenInstance = apiTokenInstance.trim();
    const text = draft.trim();

    if (!text) {
      return;
    }

    if (!trimmedIdInstance || !trimmedApiTokenInstance) {
      setError('Введите idInstance и apiTokenInstance.');
      return;
    }

    if (!activeChatId) {
      setError('Сначала откройте чат с получателем.');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await sendMessage({
        idInstance: trimmedIdInstance,
        apiTokenInstance: trimmedApiTokenInstance,
        chatId: activeChatId,
        message: text,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: response.idMessage,
          text,
          time: formatMessageTime(),
          direction: 'outgoing',
        },
      ]);
      setDraft('');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Не удалось отправить сообщение.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="GREEN-API MAX chat">
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.logo} aria-hidden="true" />
            <div>
              <p className={styles.eyebrow}>GREEN-API</p>
              <h1>MAX Chat</h1>
            </div>
          </div>

          <form className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Подключение</h2>
              <span>Этап 2</span>
            </div>

            <label className={styles.field}>
              <span>idInstance</span>
              <input
                type="text"
                value={idInstance}
                onChange={(event) => setIdInstance(event.target.value)}
                placeholder="1101000000"
                autoComplete="off"
              />
            </label>

            <label className={styles.field}>
              <span>apiTokenInstance</span>
              <input
                type="password"
                value={apiTokenInstance}
                onChange={(event) => setApiTokenInstance(event.target.value)}
                placeholder="Введите токен"
                autoComplete="off"
              />
            </label>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          <form className={styles.panel} onSubmit={openChat}>
            <div className={styles.panelHeader}>
              <h2>Получатель</h2>
            </div>

            <label className={styles.field}>
              <span>Номер телефона</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                placeholder="79990000000"
                autoComplete="off"
              />
            </label>

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isOpeningChat || !phone.trim()}
            >
              {isOpeningChat ? 'Открываем...' : 'Открыть чат'}
            </button>
          </form>
        </aside>

        <section className={styles.chat}>
          <header className={styles.chatHeader}>
            <div className={styles.avatar} aria-hidden="true">
              {chatTitle.slice(0, 1)}
            </div>
            <div>
              <h2>{chatTitle}</h2>
              <p>
                {activeChatId
                  ? `chatId: ${activeChatId}`
                  : 'Укажите получателя слева и откройте чат'}
              </p>
            </div>
          </header>

          <div className={styles.messages} aria-label="Сообщения">
            {messages.length === 0 ? (
              <p className={styles.emptyState}>
                Здесь появятся отправленные сообщения. Получение входящих будет добавлено отдельно.
              </p>
            ) : (
              messages.map((message) => (
                <article
                  className={`${styles.message} ${styles[message.direction]}`}
                  key={message.id}
                >
                  <p>{message.text}</p>
                  <time>{message.time}</time>
                </article>
              ))
            )}
          </div>

          <form className={styles.composer} onSubmit={handleSendMessage}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Напишите сообщение..."
            />
            <button type="submit" disabled={!draft.trim() || isSending}>
              {isSending ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default App;
