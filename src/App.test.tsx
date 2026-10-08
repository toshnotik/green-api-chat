import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import * as api from './api/greenApi';

vi.mock('./api/greenApi', () => ({
  getChatIdByPhone: vi.fn(),
  sendMessage: vi.fn(),
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn(),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const incoming = (chatId = 'chat-a', text = 'Входящее сообщение') => ({
  receiptId: 1,
  body: {
    typeWebhook: 'incomingMessageReceived' as const,
    timestamp: 1700000000,
    idMessage: 'incoming-1',
    senderData: { chatId },
    messageData: {
      typeMessage: 'textMessage' as const,
      textMessageData: { textMessage: text },
    },
  },
});

const fillConnection = () => {
  fireEvent.change(screen.getByLabelText('idInstance'), { target: { value: 'test-instance' } });
  fireEvent.change(screen.getByLabelText('apiTokenInstance'), { target: { value: 'test-token' } });
  fireEvent.change(screen.getByLabelText('Номер телефона'), { target: { value: '70000000000' } });
};

const openChat = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  await screen.findByRole('heading', { name: '70000000000' });
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.getChatIdByPhone).mockResolvedValue('chat-a');
  vi.mocked(api.sendMessage).mockResolvedValue({ idMessage: 'outgoing-1' });
  vi.mocked(api.deleteNotification).mockResolvedValue(undefined);
  vi.mocked(api.receiveNotification).mockImplementation(
    () => deferred<api.ReceiveNotificationResponse | null>().promise,
  );
});

test('opens a chat and starts receiving only after CheckAccount succeeds', async () => {
  render(<App />);
  expect(api.receiveNotification).not.toHaveBeenCalled();
  fillConnection();
  await openChat();
  expect(api.getChatIdByPhone).toHaveBeenCalledWith({
    idInstance: 'test-instance',
    apiTokenInstance: 'test-token',
    phoneNumber: '70000000000',
  });
  await waitFor(() => expect(api.receiveNotification).toHaveBeenCalledTimes(1));
  expect(screen.getByPlaceholderText('Напишите сообщение...')).toHaveProperty('disabled', false);
});

test('sends a message, adds it to history and clears the draft', async () => {
  render(<App />);
  fillConnection();
  await openChat();
  const input = screen.getByPlaceholderText('Напишите сообщение...');
  fireEvent.change(input, { target: { value: '  Привет!  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
  await screen.findByText('Привет!');
  expect(api.sendMessage).toHaveBeenCalledWith({
    idInstance: 'test-instance',
    apiTokenInstance: 'test-token',
    chatId: 'chat-a',
    message: 'Привет!',
  });
  expect(input).toHaveProperty('value', '');
  expect(screen.getByRole('button', { name: 'Отправить' })).toHaveProperty('disabled', true);
});

test('acknowledges other-chat events without displaying them and receives the active chat', async () => {
  vi.mocked(api.receiveNotification)
    .mockResolvedValueOnce(incoming('other-chat', 'Чужое сообщение'))
    .mockResolvedValueOnce({ receiptId: 2, body: { typeWebhook: 'outgoingMessageStatus' } })
    .mockResolvedValueOnce(incoming());
  render(<App />);
  fillConnection();
  await openChat();
  await screen.findByText('Входящее сообщение');
  expect(screen.queryByText('Чужое сообщение')).toBeNull();
  expect(api.deleteNotification).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('status').textContent).toBe('На связи');
});

test('shows an opening error and clears it after a successful operation', async () => {
  vi.mocked(api.getChatIdByPhone).mockRejectedValueOnce(new Error('Не удалось открыть чат.'));
  render(<App />);
  fillConnection();
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  await screen.findByText('Не удалось открыть чат.');
  expect(api.receiveNotification).not.toHaveBeenCalled();
  await openChat();
  expect(screen.queryByText('Не удалось открыть чат.')).toBeNull();
});

test('preserves the draft when sending fails', async () => {
  vi.mocked(api.sendMessage).mockRejectedValueOnce(new Error('Не удалось отправить сообщение.'));
  render(<App />);
  fillConnection();
  await openChat();
  fireEvent.change(screen.getByPlaceholderText('Напишите сообщение...'), {
    target: { value: 'Текст' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
  await screen.findByText('Не удалось отправить сообщение.');
  expect(screen.getByPlaceholderText('Напишите сообщение...')).toHaveProperty('value', 'Текст');
});

test('ignores a stale opening response after switching recipients', async () => {
  const oldRequest = deferred<string>();
  vi.mocked(api.getChatIdByPhone)
    .mockReturnValueOnce(oldRequest.promise)
    .mockResolvedValueOnce('chat-b');
  render(<App />);
  fillConnection();
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  fireEvent.change(screen.getByLabelText('Номер телефона'), { target: { value: '70000000001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  await screen.findByRole('heading', { name: '70000000001' });
  await act(async () => oldRequest.resolve('chat-a'));
  expect(screen.getByText('chatId: chat-b')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: '70000000000' })).toBeNull();
});

test.each(['idInstance', 'apiTokenInstance'])(
  'invalidates opening when %s changes',
  async (field) => {
    const request = deferred<string>();
    vi.mocked(api.getChatIdByPhone).mockReturnValueOnce(request.promise);
    render(<App />);
    fillConnection();
    fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
    fireEvent.change(screen.getByLabelText(field), { target: { value: 'changed-test-value' } });
    await act(async () => request.resolve('stale-chat'));
    expect(screen.getByRole('heading', { name: 'Получатель не выбран' })).toBeTruthy();
    expect(api.receiveNotification).not.toHaveBeenCalled();
  },
);

test('ignores an older response when the same opening form is submitted again', async () => {
  const oldRequest = deferred<string>();
  const newRequest = deferred<string>();
  vi.mocked(api.getChatIdByPhone)
    .mockReturnValueOnce(oldRequest.promise)
    .mockReturnValueOnce(newRequest.promise);
  render(<App />);
  fillConnection();
  const form = screen.getByLabelText('Номер телефона').closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await act(async () => oldRequest.resolve('stale-chat'));
  expect(screen.getByRole('button', { name: 'Открываем...' })).toHaveProperty('disabled', true);
  await act(async () => newRequest.resolve('current-chat'));
  expect(screen.getByText('chatId: current-chat')).toBeTruthy();
});

test('serializes polling across chat changes and ignores old errors', async () => {
  const oldReceive = deferred<api.ReceiveNotificationResponse | null>();
  vi.mocked(api.receiveNotification)
    .mockReturnValueOnce(oldReceive.promise)
    .mockResolvedValueOnce(null);
  render(<App />);
  fillConnection();
  await openChat();
  await waitFor(() => expect(api.receiveNotification).toHaveBeenCalledTimes(1));
  vi.mocked(api.getChatIdByPhone).mockResolvedValueOnce('chat-b');
  fireEvent.change(screen.getByLabelText('Номер телефона'), { target: { value: '70000000001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  await screen.findByRole('heading', { name: '70000000001' });
  expect(api.receiveNotification).toHaveBeenCalledTimes(1);
  await act(async () => oldReceive.reject(new Error('Old network failure')));
  expect(screen.getByRole('status').textContent).toBe('На связи');
  expect(api.receiveNotification).toHaveBeenCalledTimes(2);
});

test('restarts polling when the same chat is reopened', async () => {
  const oldReceive = deferred<api.ReceiveNotificationResponse | null>();
  vi.mocked(api.receiveNotification).mockReturnValueOnce(oldReceive.promise);
  render(<App />);
  fillConnection();
  await openChat();
  await waitFor(() => expect(api.receiveNotification).toHaveBeenCalledTimes(1));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' })));
  await act(async () => oldReceive.resolve(null));
  expect(api.receiveNotification).toHaveBeenCalledTimes(2);
});

test('does not display a message from an old deletion request in the new chat', async () => {
  const oldDelete = deferred<void>();
  vi.mocked(api.receiveNotification).mockResolvedValueOnce(incoming());
  vi.mocked(api.deleteNotification).mockReturnValueOnce(oldDelete.promise);
  render(<App />);
  fillConnection();
  await openChat();
  await waitFor(() => expect(api.deleteNotification).toHaveBeenCalledTimes(1));
  vi.mocked(api.getChatIdByPhone).mockResolvedValueOnce('chat-b');
  fireEvent.change(screen.getByLabelText('Номер телефона'), { target: { value: '70000000001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  await screen.findByRole('heading', { name: '70000000001' });
  await act(async () => oldDelete.resolve());
  expect(screen.queryByText('Входящее сообщение')).toBeNull();
  expect(screen.getByRole('status').textContent).toBe('Подключение...');
});

test('does not append a stale outgoing message or clear the new draft', async () => {
  const oldSend = deferred<api.SendMessageResponse>();
  vi.mocked(api.sendMessage).mockReturnValueOnce(oldSend.promise);
  render(<App />);
  fillConnection();
  await openChat();
  const input = screen.getByPlaceholderText('Напишите сообщение...');
  fireEvent.change(input, { target: { value: 'Старое сообщение' } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
  vi.mocked(api.getChatIdByPhone).mockResolvedValueOnce('chat-b');
  fireEvent.change(screen.getByLabelText('Номер телефона'), { target: { value: '70000000001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' }));
  await screen.findByRole('heading', { name: '70000000001' });
  fireEvent.change(input, { target: { value: 'Новый черновик' } });
  await act(async () => oldSend.resolve({ idMessage: 'old-send' }));
  expect(screen.queryByText('Старое сообщение')).toBeNull();
  expect(input).toHaveProperty('value', 'Новый черновик');
});

test('retries polling after two seconds and recovers its connection status', async () => {
  vi.useFakeTimers();
  vi.mocked(api.receiveNotification)
    .mockRejectedValueOnce(new Error('Network failure'))
    .mockResolvedValueOnce(null);
  render(<App />);
  fillConnection();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Открыть чат' })));
  expect(screen.getByRole('status').textContent).toBe('Сбой связи · повторяем');
  await act(async () => vi.advanceTimersByTimeAsync(1999));
  expect(api.receiveNotification).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(api.receiveNotification).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status').textContent).toBe('На связи');
});

test('stops processing notifications after unmount', async () => {
  const request = deferred<api.ReceiveNotificationResponse | null>();
  vi.mocked(api.receiveNotification).mockReturnValueOnce(request.promise);
  const view = render(<App />);
  fillConnection();
  await openChat();
  await waitFor(() => expect(api.receiveNotification).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => request.resolve(incoming()));
  expect(api.deleteNotification).not.toHaveBeenCalled();
  expect(api.receiveNotification).toHaveBeenCalledTimes(1);
});
