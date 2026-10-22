import mongoose from "mongoose";

const ServicoSchema = new mongoose.Schema(
    {
        nome: { type: String, required: true },
        descricao: { type: String, required: true },
        valor: { type: Number, required: true, default:0 },
        ativo:{type: Boolean, default: true},
        duracao: { type: String, required: true },
        comissaoPercentual: { type: Number, min: 0, max: 100, default: 0, select: false },
        foto: { type: String}
    },
    { 
        timestamps: true,
    }
);

const ServicoModel = mongoose.model('Servico',ServicoSchema);
export default ServicoModel;