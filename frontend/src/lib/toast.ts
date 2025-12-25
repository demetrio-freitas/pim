import toast from 'react-hot-toast';
import { ApiError } from '@/types';
import { getLocalizedErrorMessage } from './api';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (error: ApiError | string) => {
  const message = typeof error === 'string'
    ? error
    : error.message || getLocalizedErrorMessage(error.errorCode);

  toast.error(message);
};

export const showWarning = (message: string) => {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#fef3c7',
      color: '#92400e',
    },
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#dbeafe',
      color: '#1e40af',
    },
  });
};

// Show error with details (for validation errors)
export const showValidationError = (error: ApiError) => {
  if (error.details && Object.keys(error.details).length > 0) {
    const detailMessages = Object.entries(error.details)
      .filter(([, value]) => value)
      .map(([field, message]) => `${field}: ${message}`)
      .join('\n');

    toast.error(`${error.message}\n${detailMessages}`, {
      duration: 6000,
    });
  } else {
    showError(error);
  }
};

// Show loading toast
export const showLoading = (message: string) => {
  return toast.loading(message);
};

// Dismiss a specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Promise-based toast (for async operations)
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string | ((error: ApiError) => string);
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err: ApiError) =>
      typeof messages.error === 'function'
        ? messages.error(err)
        : err.message || messages.error,
  });
};
