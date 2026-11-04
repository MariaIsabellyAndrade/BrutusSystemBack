import mongoose from "mongoose";

const ProdutoEstoqueSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    nomeNormalizado: { type: String, required: true, unique: true, trim: true, lowercase: true },
    descricao: { type: String, trim: true, default: "", maxlength: 1000 },
    categoria: { type: String, required: true, trim: true, maxlength: 80 },
    fornecedor: { type: String, required: true, trim: true, maxlength: 120 },
    precoCusto: { type: Number, required: true, min: 0 },
    precoRevenda: { type: Number, required: true, min: 0, default: 0 },
    quantidade: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    estoqueMinimo: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    tipoProduto: { type: String, required: true, enum: ["USO_INTERNO", "REVENDA"] },
    ativo: { type: Boolean, default: true, index: true },
}, { timestamps: true });

ProdutoEstoqueSchema.index({ categoria: 1, tipoProduto: 1, ativo: 1 });
export default mongoose.model("ProdutoEstoque", ProdutoEstoqueSchema);



