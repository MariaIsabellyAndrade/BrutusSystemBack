import mongoose from "mongoose";

const PagamentoSchema = new mongoose.Schema(
    {

        Agendamento: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agendamento",
            required: true,
        },
        status: { type: String, required: true, default: "pending" },
        qrCode: { type: String, required: true },
        valor: { type: Number},
        paymentId: { type: String, required: true,unique: true },
        dataPagamento: { type: Date }
    },
    { 
        timestamps: true,
    }
);

const PagamentoModel = mongoose.model('Pagamento',PagamentoSchema);
export default PagamentoModel;