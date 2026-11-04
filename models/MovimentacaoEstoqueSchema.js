import mongoose from "mongoose";

const MovimentacaoEstoqueSchema = new mongoose.Schema({
    produto: { type: mongoose.Schema.Types.ObjectId, ref: "ProdutoEstoque", required: true, index: true },
    tipo: { type: String, required: true, enum: ["ENTRADA", "SAIDA", "AJUSTE"], index: true },
    quantidade: { type: Number, required: true, min: 0, validate: Number.isInteger },
    estoqueAnterior: { type: Number, required: true, min: 0, validate: Number.isInteger },
    estoqueResultante: { type: Number, required: true, min: 0, validate: Number.isInteger },
    motivo: { type: String, required: true, trim: true, maxlength: 500 },
    responsavel: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    tipoResponsavel: { type: String, required: true, enum: ["ADMIN", "BARBEIRO"] },
}, { timestamps: true });

MovimentacaoEstoqueSchema.index({ createdAt: -1, tipo: 1 });
export default mongoose.model("MovimentacaoEstoque", MovimentacaoEstoqueSchema);

