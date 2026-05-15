import express from 'express';
import __dirname from '../utils/pathUtils.js';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import jwt from "jsonwebtoken";


//Middlewares
const staticMiddleware = express.static(path.join(__dirname, 'assets'));

const urlencodedMiddleware = express.urlencoded({ extended: true});
const jsonMiddleware = express.json();

const securityMiddleware = helmet();

const compressionMiddlewware = compression();

const rateLimitMiddleware = rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 minutos
    max: 100,                  // Limita cada IP a 50 requisições por janela
    message: 'Muitas requisições, tente novamente em 10 minutos.'
});

const logFile = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags:'a'});
const morganMiddleware = morgan('combined', { stream: logFile});

const authMiddleware2 = (req, res, next) => {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                erro: "Token não informado"
            });
        }

        // Bearer TOKEN
        const token =
            authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // dados do usuário logado
        req.usuarioId = decoded.id;

        req.tipo = decoded.tipo;

        next();

    } catch (error) {

        return res.status(401).json({
            erro: "Token inválido"
        });
    }
};

export {
    staticMiddleware,
    urlencodedMiddleware,
    jsonMiddleware,
    securityMiddleware,
    compressionMiddlewware,
    rateLimitMiddleware,
    morganMiddleware, 
    authMiddleware2
};

//permisao do cadastro de usuarios como barbeiros 
export const isAdmin = (req, res, next) => {
  if (req.usuario?.tipo !== "ADMIN") {
    return res.status(403).json({ erro: "Acesso negado" });
  }
  next();
};
