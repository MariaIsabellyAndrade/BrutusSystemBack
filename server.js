import express from 'express'
import path from 'path'
import __dirname from './utils/pathUtils.js';
import dotenv from 'dotenv';
import cors from "cors";
import {
    staticMiddleware, 
    urlencodedMiddleware, jsonMiddleware,
    securityMiddleware, compressionMiddlewware,
    rateLimitMiddleware, morganMiddleware
} from './middlewares/middlewares.js';
import router from './routes/routes.js';
import Database from './config/db.js';
import upload from './config/multer.js';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';



//Carregar as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const port = process.env.PORT;

//Conecta ao banco de dados MongoDB
Database.connect();


//pasta com as imagens 
app.use('/uploads', express.static('uploads'));

app.use(cors());
app.use(methodOverride('_method'));
//Motor de template
app.set('views', path.join(__dirname, 'views')); //Definindo a pasta do template EJS
app.set('view engine', 'ejs'); //Definindo o motor de template EJS
app.use(cookieParser());
//Registrando Middlewares
app.use(staticMiddleware);
app.use(urlencodedMiddleware);
app.use(jsonMiddleware);
app.use(securityMiddleware);
app.use(compressionMiddlewware);
//app.use(rateLimitMiddleware);
app.use(morganMiddleware);


//Registrando rotas (endpoints)
app.use(router);

app.listen(port, () => {
    console.log(`Servidor ativo rodando na porta ${port}`)
});
