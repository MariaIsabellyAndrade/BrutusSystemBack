import mongoose from "mongoose";

const ComissaoSchema = new mongoose.Schema({
    Barbeiro: { type: mongoose.Schema.Types.ObjectId, ref: "Barbeiro", required: true },
    Agendamento: { type: mongoose.Schema.Types.ObjectId, ref: "Agendamento", required: true },
    Servico: { type: mongoose.Schema.Types.ObjectId, ref: "Servico", required: true },
    valorBase: { type: Number, required: true, min: 0 },
    percentual: { type: Number, required: true, min: 0, max: 100 },
    valor: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["PENDENTE", "PAGO"], default: "PENDENTE", required: true },
    geradaEm: { type: Date, default: Date.now, required: true },
    pagaEm: { type: Date, default: null }
}, { timestamps: true });

ComissaoSchema.index({ Agendamento: 1, Servico: 1 }, { unique: true });

export default mongoose.model("Comissao", ComissaoSchema);
