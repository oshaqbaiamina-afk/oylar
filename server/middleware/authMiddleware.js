import jwt from 'jsonwebtoken';

/**
 * JWT токенді тексеруге арналған middleware
 * @param {object} req - Request объектісі
 * @param {object} res - Response объектісі
 * @param {function} next - Келесі функция
 */
const authMiddleware = (req, res, next) => {
  try {
    // Header-дан токенді алу (Authorization: Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Авторизация токені жоқ немесе қате формат'
      });
    }

    const token = authHeader.split(' ')[1];

    // Токенді тексеру
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Токен деректерін request-ке қосу (мысалы: { id, email })
    req.user = decoded;
    next();

  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Токен жарамсыз немесе мерзімі өтті'
    });
  }
};

export default authMiddleware;