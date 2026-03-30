import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    // Header-дан токенді алу
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Авторизация токені жоқ' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Токен деректерін request-ке қосу
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Токен жарамсыз немесе мерзімі өтті' });
  }
};

export default authMiddleware;