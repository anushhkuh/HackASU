// Hook to optionally use backend API
// Returns { useBackend: boolean, apiClient: object }
// Set REACT_APP_USE_BACKEND=true to enable backend integration

import { useState, useEffect } from 'react';
import apiClient from './apiClient';

const USE_BACKEND = process.env.REACT_APP_USE_BACKEND === 'true';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export function useBackendIntegration() {
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(false);

  useEffect(() => {
    // Check if backend is available
    if (USE_BACKEND && API_BASE_URL) {
      setCheckingBackend(true);
      // Try to ping the backend
      fetch(`${API_BASE_URL}/api/health`)
        .then(() => {
          setBackendAvailable(true);
        })
        .catch(() => {
          // Backend not available, will use local state
          setBackendAvailable(false);
        })
        .finally(() => {
          setCheckingBackend(false);
        });
    }
  }, []);

  return {
    useBackend: USE_BACKEND && backendAvailable,
    apiClient: apiClient,
    checkingBackend,
  };
}

export default useBackendIntegration;

