import mongoose from "mongoose";

const BarbeiroSchema = new mongoose.Schema(
    {
        nome: { type: String, required: true },
        sobrenome: { type: String, required: true },
        email: { type: String, required: true },
        senha: { type: String, required: true },
        foto: { type: String},
        dataNascimento: { type: Date, required: true },
        dataAdmissao: { type: Date, required: true },
        cnpj: { type: String, required: true, unique: true },
        endereco: { type: String, required: true},
        ativo:{type: Boolean, default: true},
        telefone: { type: String,required:true}
    },
    { 
        timestamps: true,
    }
);

const BarbeiroModel = mongoose.model('Barbeiro',BarbeiroSchema);
export default BarbeiroModel;