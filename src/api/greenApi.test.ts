import { beforeEach, expect, test, vi } from 'vitest';
import { deleteNotification, getChatIdByPhone } from './greenApi';

const credentials = { idInstance: 'test-instance', apiTokenInstance: 'test-token' };
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

test.each(['70000000000', '375000000000'])(
  'accepts the supported international format %s',
  async (phoneNumber) => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ exist: true, chatId: 'test-chat' })),
    );
    await expect(getChatIdByPhone({ ...credentials, phoneNumber })).resolves.toBe('test-chat');
    const body = fetchMock.mock.calls[0][1]?.body;
    expect(JSON.parse(String(body))).toEqual({ phoneNumber: Number(phoneNumber) });
  },
);

test.each([
  '',
  'abc',
  '+70000000000',
  '7 000 000 0000',
  '7000000000',
  '3750000000000',
  '12020000000',
])('rejects invalid phone %s before making a request', async (phoneNumber) => {
  await expect(getChatIdByPhone({ ...credentials, phoneNumber })).rejects.toThrow(
    'Введите международный номер',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test('does not treat an HTTP 200 deletion failure as an acknowledgement', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ result: false, reason: 'Deletion failed' })),
  );
  await expect(deleteNotification({ ...credentials, receiptId: 1 })).rejects.toThrow(
    'Deletion failed',
  );
});
