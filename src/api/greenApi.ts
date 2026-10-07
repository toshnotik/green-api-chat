type GreenApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
};

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

const API_URL = 'https://api.green-api.com';

const buildGreenApiUrl = (
  idInstance: string,
  method: 'checkAccount' | 'sendMessage',
  apiTokenInstance: string,
) => `${API_URL}/waInstance${idInstance}/${method}/${apiTokenInstance}`;

const getErrorMessage = (data: unknown, fallback: string) => {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const errorData = data as GreenApiErrorResponse;
  return errorData.reason || errorData.message || errorData.description || errorData.error || fallback;
};

const requestGreenApi = async <TResponse>(url: string, body: object): Promise<TResponse> => {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
  const normalizedPhone = phoneNumber.replace(/\D/g, '');

  if (!normalizedPhone) {
    throw new Error('Введите корректный номер телефона.');
  }

  const response = await requestGreenApi<CheckAccountResponse | CheckAccountErrorResponse>(
    buildGreenApiUrl(idInstance, 'checkAccount', apiTokenInstance),
    {
      phoneNumber: Number(normalizedPhone),
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
  requestGreenApi<SendMessageResponse>(buildGreenApiUrl(idInstance, 'sendMessage', apiTokenInstance), {
    chatId,
    message,
  });
