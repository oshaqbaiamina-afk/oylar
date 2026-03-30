const errorHandler = (err, req, res, next) => {
  console.error('🔴 Сервер қатесі:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Сервер қатесі. Кейінірек қайталаңыз.'
  });
};

export default errorHandler;