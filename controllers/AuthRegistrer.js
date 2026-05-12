import Usuario from "../models/Usuario.js";
import Cliente from "../models/Cliente.js";

import Barbeiro from "../models/Barbeiro.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
export const registrarCliente = async (req, res) => {
  let usuarioCriado = null; // Escopo externo para permitir o rollback no catch

  try {
    const { email, senha, ...dadosCliente } = req.body;

    // 1. Validação de campos obrigatórios antes de tocar no banco
    if (!email || !senha) {
      return res.status(400).json({ erro: "Email e senha são obrigatórios" });
    }

    // 2. Validação de email duplicado
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    // 3. Criação do Usuário (Atribuindo à variável externa)
    usuarioCriado = await Usuario.create({
      email,
      senha: senhaHash,
      tipo: "CLIENTE",
    });

    // 4. Criação do Cliente vinculado ao Usuário
    const cliente = await Cliente.create({
      ...dadosCliente,
      Usuario: usuarioCriado._id,
    });

    // Resposta de sucesso
    return res.status(201).json({ usuario: usuarioCriado, cliente });

  } catch (err) {
    console.error("Erro no registro de cliente:", err);

    //  ROLLBACK: Se o usuário foi criado, mas o perfil de cliente falhou
    if (usuarioCriado && usuarioCriado._id) {
      try {
        // Usamos findByIdAndDelete para garantir a remoção
        await Usuario.delete(usuarioCriado._id);
        console.log("Rollback: Usuário removido por falha nos dados do cliente.");
      } catch (deleteErr) {
        console.error("Erro crítico ao deletar usuário órfão:", deleteErr);
      }
    }

    return res.status(500).json({ erro: "Erro ao registrar cliente: " + err.message });
  }
};

export const registrarBarbeiro = async (req, res) => {
  let usuarioCriado = null; // Use um nome claro para evitar conflitos

  try {
    const { email, senha, ...dadosBarbeiro } = req.body;

    // Validação de email
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    // ATENÇÃO: Atribuindo à variável de fora, sem usar 'const' aqui
    usuarioCriado = await Usuario.create({
      email,
      senha: senhaHash,
      tipo: "BARBEIRO",
    });

    const barbeiro = await Barbeiro.create({
      ...dadosBarbeiro,
      Usuario: usuarioCriado._id,
    });

    res.status(201).json({ usuario: usuarioCriado, barbeiro });

  } catch (err) {
    console.error("Erro no registro:", err);

    // Se o usuário foi criado mas o barbeiro falhou, deletamos o usuário
    if (usuarioCriado && usuarioCriado._id) {
      await Usuario.delete(usuarioCriado._id);
    }

    res.status(500).json({ erro: "Erro ao registrar: " + err.message });
  }
};


export const registrarAdmin = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuarioExistente = await Usuario.findOne({ email });

    if (usuarioExistente) {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const admin = await Usuario.create({
      email,
      senha: senhaHash,
      tipo: "ADMIN",
    });

    res.status(201).json(admin);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(400).json({ erro: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(400).json({ erro: "Senha inválida" });
    }

    const token = jwt.sign(
      { id: usuario._id, tipo: usuario.tipo },
      "segredo",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      tipo: usuario.tipo,
      email: usuario.email,
    });

  } catch (err) {
     console.error("ERRO LOGIN:", err);
    res.status(500).json({ erro: "Erro no login" });
  }
};

export const getMe = async (req, res) => {
  try {
    const id = req.usuario.id; // 👈 CORRETO

    const usuario = await Usuario.getByIdPublic(id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.json(usuario);

  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return res.status(500).json({ message: "Erro interno ao buscar usuário" });
  }
}