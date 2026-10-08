type GreenApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
};

type GreenApiMethod = 'checkAccount' | 'sendMessage' | 'receiveNotification' | 'deleteNotification';

type CheckAccountRequest = GreenApiCredentials & {
  phoneNumber: string;
};

type CheckAccountResponse = {
  exist: boolean;
  chatId: string;
  fromCache?: boolean;
};

type CheckAccountErrorResponse = {
  status: false;
  reason: string;
};

type GreenApiErrorResponse = {
  status?: boolean | string;
  reason?: string;
  message?: string;
  description?: string;
  error?: string;
};

export type SendMessageRequest = GreenApiCredentials & {
  chatId: string;
  message: string;
};

export type SendMessageResponse = {
  idMessage: string;
};

export type IncomingTextMessageNotification = {
  typeWebhook: 'incomingMessageReceived';
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
  };
  messageData: {
    typeMessage: 'textMessage';
    textMessageData: {
      textMessage: string;
    };
  };
};

export type IncomingNotificationBody =
  | IncomingTextMessageNotification
  | {
      typeWebhook: string;
      timestamp?: number;
      idMessage?: string;
      senderData?: {
        chatId?: string;
      };
      messageData?: {
        typeMessage?: string;
        textMessageData?: {
          textMessage?: string;
        };
      };
    };

export type ReceiveNotificationResponse = {
  receiptId: number;
  body: IncomingNotificationBody;
};

export type DeleteNotificationResponse = {
  result: boolean;
  reason: string;
};

const API_URL = 'https://api.green-api.com';

const buildGreenApiUrl = (
  idInstance: string,
  method: GreenApiMethod,
  apiTokenInstance: string,
  path = '',
) => `${API_URL}/waInstance${idInstance}/${method}/${apiTokenInstance}${path}`;

const getErrorMessage = (data: unknown, fallback: string) => {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const errorData = data as GreenApiErrorResponse;
  return (
    errorData.reason || errorData.message || errorData.description || errorData.error || fallback
  );
};

const requestGreenApi = async <TResponse>(
  url: string,
  options: RequestInit = {},
): Promise<TResponse> => {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
  } catch {
    throw new Error('Не удалось выполнить запрос к GREEN-API. Проверьте подключение к сети.');
  }

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `GREEN-API вернул ошибку ${response.status}.`));
  }

  return data as TResponse;
};

export const getChatIdByPhone = async ({
  idInstance,
  apiTokenInstance,
  phoneNumber,
}: CheckAccountRequest) => {
  const normalizedPhone = phoneNumber.trim();

  if (!/^(?:7\d{10}|375\d{9})$/.test(normalizedPhone)) {
    throw new Error(
      'Введите международный номер: 11 цифр с кодом 7 или 12 цифр с кодом 375, без + и пробелов.',
    );
  }

  const response = await requestGreenApi<CheckAccountResponse | CheckAccountErrorResponse>(
    buildGreenApiUrl(idInstance, 'checkAccount', apiTokenInstance),
    {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: Number(normalizedPhone),
      }),
    },
  );

  if ('status' in response) {
    throw new Error(response.reason);
  }

  if (!response.exist || !response.chatId) {
    throw new Error('На этот номер не найден аккаунт MAX.');
  }

  return response.chatId;
};

export const sendMessage = ({
  idInstance,
  apiTokenInstance,
  chatId,
  message,
}: SendMessageRequest) =>
  requestGreenApi<SendMessageResponse>(
    buildGreenApiUrl(idInstance, 'sendMessage', apiTokenInstance),
    {
      method: 'POST',
      body: JSON.stringify({
        chatId,
        message,
      }),
    },
  );

export const receiveNotification = ({ idInstance, apiTokenInstance }: GreenApiCredentials) =>
  requestGreenApi<ReceiveNotificationResponse | null>(
    `${buildGreenApiUrl(idInstance, 'receiveNotification', apiTokenInstance)}?receiveTimeout=5`,
    {
      method: 'GET',
    },
  );

export const deleteNotification = async ({
  idInstance,
  apiTokenInstance,
  receiptId,
}: GreenApiCredentials & {
  receiptId: number;
}) => {
  const response = await requestGreenApi<DeleteNotificationResponse>(
    buildGreenApiUrl(idInstance, 'deleteNotification', apiTokenInstance, `/${receiptId}`),
    {
      method: 'DELETE',
    },
  );

  if (!response.result) {
    throw new Error(response.reason || 'Не удалось удалить уведомление из очереди.');
  }
};
