import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    //  não tem token
    if (!authHeader) {
      return res.status(401).json({ erro: "Token não fornecido" });
    }

    // formato: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ erro: "Token inválido" });
    }
    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
    );

    // 🔥 salva dados do usuário na requisição
    req.usuario = decoded;

    next();

  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
};

export const isBarbeiro = (req, res, next) => {
  if (req.usuario.tipo !== "BARBEIRO") {
    return res.status(403).json({ erro: "Acesso apenas para barbeiros" });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (req.usuario.tipo !== "ADMIN") {
    return res.status(403).json({ erro: "Acesso negado" });
  }
  next();
};

