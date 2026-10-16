import mongoose from "mongoose";

const BarbeiroSchema = new mongoose.Schema(
    {

        Usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true,
        },
        nome: { type: String, required: true },
        sobrenome: { type: String, required: true },
        foto: { type: String},
        dataNascimento: { type: Date, required: true },
        dataAdmissao: { type: Date, required: true },
        cnpj: { type: String, required: true, unique: true },
        endereco: { type: String, required: true},
        ativo:{type: Boolean, default: true},
        telefone: { type: String,required:true},

        /*
         * Horários bloqueados pelo admin.
         * Cada entrada representa um dia com seus slots bloqueados.
         * Ex: [{ data: "2026-10-20", slots: ["09:00","09:30","10:00"] }]
         */
        horariosBloqueados: [
            {
                data:  { type: String, required: true }, // "YYYY-MM-DD"
                slots: [{ type: String }]                // ["HH:MM", ...]
            }
        ]
    },
    { 
        timestamps: true,
    }
);

const BarbeiroModel = mongoose.model('Barbeiro',BarbeiroSchema);
export default BarbeiroModel;