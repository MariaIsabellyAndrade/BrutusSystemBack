import mongoose from "mongoose";

const AgendaServSchema = new mongoose.Schema(
    {

        Servico: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Servico",
            required: true,
        },
        Agendamento: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agendamento",
            required: true,
        },
        valorCobrado: { type: Number, required: true, default:0  },           
    },
    { 
        timestamps: true,
    }
);

const AgendaServModel = mongoose.model('AgendaServ',AgendaServSchema);
export default AgendaServModel; 