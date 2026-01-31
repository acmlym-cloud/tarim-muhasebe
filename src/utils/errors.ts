import { Alert } from 'react-native';
import type { ApiError } from '../types';

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'İnternet bağlantınızı kontrol edin',
  TIMEOUT_ERROR: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin',
  SERVER_ERROR: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin',
  NOT_FOUND: 'İstenen kaynak bulunamadı',
  VALIDATION_ERROR: 'Girilen bilgileri kontrol edin',
  UNKNOWN_ERROR: 'Beklenmeyen bir hata oluştu',
  OFFLINE: 'Çevrimdışısınız. İşlem bağlantı sağlandığında gerçekleştirilecek',
};

// ==================== ERROR HANDLING ====================

export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR,
        code: 'NETWORK_ERROR',
      };
    }
    if (error.message.includes('timeout')) {
      return {
        message: ERROR_MESSAGES.TIMEOUT_ERROR,
        code: 'TIMEOUT_ERROR',
      };
    }
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: (err.message as string) || (err.detail as string) || ERROR_MESSAGES.UNKNOWN_ERROR,
      code: (err.code as string) || 'UNKNOWN_ERROR',
      details: err,
    };
  }

  return {
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    code: 'UNKNOWN_ERROR',
  };
}

export function showErrorAlert(error: ApiError | string, title: string = 'Hata'): void {
  const message = typeof error === 'string' ? error : error.message;
  Alert.alert(title, message, [{ text: 'Tamam' }]);
}

export function showRetryAlert(
  error: ApiError | string,
  onRetry: () => void,
  title: string = 'Hata'
): void {
  const message = typeof error === 'string' ? error : error.message;
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: 'Tekrar Dene', onPress: onRetry },
  ]);
}

// ==================== GLOBAL ERROR HANDLER ====================

let globalErrorHandler: ((error: Error) => void) | null = null;

export function setGlobalErrorHandler(handler: (error: Error) => void): void {
  globalErrorHandler = handler;
}

export function handleGlobalError(error: Error): void {
  console.error('[GlobalError]', error);
  globalErrorHandler?.(error);
}

// ==================== LOGGING ====================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel: LogLevel = __DEV__ ? 'debug' : 'error';

export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]) {
    const prefix = `[${level.toUpperCase()}] ${new Date().toISOString()}`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }
}
