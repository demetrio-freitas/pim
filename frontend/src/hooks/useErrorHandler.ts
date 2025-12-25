'use client';

import { useState, useCallback } from 'react';
import { ApiError } from '@/types';
import { getLocalizedErrorMessage } from '@/lib/api';

interface ErrorState {
  message: string;
  errorCode: string;
  details?: Record<string, string | null>;
  traceId?: string;
}

interface UseErrorHandlerReturn {
  error: ErrorState | null;
  setError: (error: ApiError | string | null) => void;
  clearError: () => void;
  handleApiError: (error: unknown) => void;
  getFieldError: (fieldName: string) => string | null;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<ErrorState | null>(null);

  const setError = useCallback((err: ApiError | string | null) => {
    if (err === null) {
      setErrorState(null);
      return;
    }

    if (typeof err === 'string') {
      setErrorState({
        message: err,
        errorCode: 'UNKNOWN_ERROR',
      });
      return;
    }

    setErrorState({
      message: err.message || getLocalizedErrorMessage(err.errorCode),
      errorCode: err.errorCode,
      details: err.details,
      traceId: err.traceId,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleApiError = useCallback((err: unknown) => {
    if (err && typeof err === 'object' && 'errorCode' in err) {
      setError(err as ApiError);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('Ocorreu um erro inesperado');
    }
  }, [setError]);

  const getFieldError = useCallback((fieldName: string): string | null => {
    if (!error?.details) return null;
    return error.details[fieldName] || null;
  }, [error]);

  return {
    error,
    setError,
    clearError,
    handleApiError,
    getFieldError,
  };
}

// Hook for global toast notifications
export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>>([]);

  const addToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    duration = 5000
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => {
    addToast('success', message);
  }, [addToast]);

  const showError = useCallback((error: ApiError | string) => {
    const message = typeof error === 'string'
      ? error
      : error.message || getLocalizedErrorMessage(error.errorCode);
    addToast('error', message);
  }, [addToast]);

  const showWarning = useCallback((message: string) => {
    addToast('warning', message);
  }, [addToast]);

  const showInfo = useCallback((message: string) => {
    addToast('info', message);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
