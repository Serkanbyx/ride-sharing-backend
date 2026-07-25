export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
