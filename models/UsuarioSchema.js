import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  senha: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    enum: ["CLIENTE", "BARBEIRO"],
    required: true,
  },
  ativo: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const UsuarioModel=  mongoose.model("Usuario", UsuarioSchema);
export default UsuarioModel;