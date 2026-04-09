import mongoose from "mongoose";

const ClienteSchema = new mongoose.Schema(
    {
        nome: { type: String, required: true },
        sobrenome: { type: String, required: true },
        telefone: { type: String,required:true},
        cpf: { type: String, required: true, unique: true },
        rg: { type: String, required: true, unique: true },
        endereco: { type: String, required: true},
        email: { type: String, required: true },
        senha: { type: String, required: true },
        ativo:{type: Boolean, default: true},
        foto: { type: String},
        dataNascimento: { type: Date, required: true }        
    },
    { 
        timestamps: true,
    }
);

const ClienteModel = mongoose.model('Cliente',ClienteSchema);
export default ClienteModel;