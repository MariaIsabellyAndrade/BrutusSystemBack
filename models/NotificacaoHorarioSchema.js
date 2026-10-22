import mongoose from "mongoose";

const NotificacaoHorarioSchema = new mongoose.Schema({
    barbeiroId: { type: mongoose.Schema.Types.ObjectId, ref: "Barbeiro", required: true },
    barbeiroNome: { type: String, required: true },
    data: { type: String, required: true },
    mensagem: { type: String, required: true },
    alteracoes: [{
        horario: { type: String, required: true },
        acao: { type: String, enum: ["bloqueado", "liberado", "motivo_alterado", "regra_alterada"], required: true },
        motivo: { type: String, default: "" }
    }],
    lida: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("NotificacaoHorario", NotificacaoHorarioSchema);
