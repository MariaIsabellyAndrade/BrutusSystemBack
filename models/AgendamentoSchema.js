import mongoose from "mongoose";

const AgendamentoSchema = new mongoose.Schema(
    {

        Usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true,
        },
        Cliente: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cliente",
            required: true,
        },
        Barbeiro: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Barbeiro",
            required: true,
        },
        Servicos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Servico",
                required: true,
            }
        ],
        data: { type: Date, required: true },
        hora: { type: String, required: true },
        status: {
            type: String,
            enum: ["Agendado", "Concluido","Cancelado"],
            required: true,
        }            
    },
    { 
        timestamps: true,
    }
);

const AgendamentoModel = mongoose.model('Agendamento',AgendamentoSchema);
export default AgendamentoModel; 