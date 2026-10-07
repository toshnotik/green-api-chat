import { FormEvent, useState } from 'react';
import styles from './App.module.scss';

type Message = {
  id: number;
  text: string;
  time: string;
  direction: 'incoming' | 'outgoing';
};

const initialMessages: Message[] = [
  {
    id: 1,
    text: 'Привет! Это временное сообщение для проверки вида чата.',
    time: '17:22',
    direction: 'incoming',
  },
  {
    id: 2,
    text: 'На первом этапе API еще не подключаем, только собираем интерфейс.',
    time: '17:24',
    direction: 'outgoing',
  },
  {
    id: 3,
    text: 'Позже здесь появятся сообщения MAX через GREEN-API.',
    time: '17:25',
    direction: 'incoming',
  },
];

function App() {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [phone, setPhone] = useState('');
  const [activeChat, setActiveChat] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const chatTitle = activeChat || 'Получатель не выбран';

  const openChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveChat(phone.trim());
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        text,
        time: new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
        direction: 'outgoing',
      },
    ]);
    setDraft('');
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
              <span>Этап 1</span>
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

          <form className={styles.panel} onSubmit={openChat}>
            <div className={styles.panelHeader}>
              <h2>Получатель</h2>
            </div>

            <label className={styles.field}>
              <span>Номер телефона</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="79990000000"
                autoComplete="off"
              />
            </label>

            <button className={styles.primaryButton} type="submit">
              Открыть чат
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
              <p>{activeChat ? 'Готов к отправке сообщений' : 'Укажите получателя слева'}</p>
            </div>
          </header>

          <div className={styles.messages} aria-label="Сообщения">
            {messages.map((message) => (
              <article
                className={`${styles.message} ${styles[message.direction]}`}
                key={message.id}
              >
                <p>{message.text}</p>
                <time>{message.time}</time>
              </article>
            ))}
          </div>

          <form className={styles.composer} onSubmit={sendMessage}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Напишите сообщение..."
            />
            <button type="submit" disabled={!draft.trim()}>
              Отправить
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default App;
