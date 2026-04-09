import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class Database{

    static async connect(){
        try {
            //Usando variável do ambiente .env
            const uri = process.env.MONGODB_URI;
            await mongoose.connect(uri);
            console.log('MongoDB conectado com sucesso!-----');
        } catch (error) {
            console.error('Erro ao conectar o MongoDB: ', error.message);
            process.exit(1); //Finaliza a aplicação
        }
    }

    static async disconnect(){
        try {
            await mongoose.disconnect();
            console.log('MongoDB desconectado com sucesso!');
        } catch (error) {
            console.error('Erro ao desconectar o MongoDB:', error.message);
        }
    }

}

export default Database;
