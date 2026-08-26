import AuthService from "../services/authRegistrerService.js";
import Usuario from "../models/Usuario.js";

export const registrarCliente = async (req, res) => {
    try {
        const foto = req.file ? req.file.filename : null;
        const resultado = await AuthService.registrarCliente({ ...req.body, foto });
        return res.status(201).json(resultado);
    } catch (err) {
        return res.status(err.status || 500).json({ erro: err.message });
    }
};

export const registrarBarbeiro = async (req, res) => {
    try {
        const resultado = await AuthService.registrarBarbeiro(req.body);
        return res.status(201).json(resultado);
    } catch (err) {
        return res.status(err.status || 500).json({ erro: err.message });
    }
};

export const registrarAdmin = async (req, res) => {
    try {
        const admin = await AuthService.registrarUsuario(req.body, "ADMIN");
        return res.status(201).json(admin);
    } catch (err) {
        return res.status(err.status || 500).json({ erro: err.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const id = req.usuario.id;
        const usuario = await Usuario.getByIdPublic(id);

        if (!usuario) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }
        return res.json(usuario);
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        return res.status(500).json({ message: "Erro interno ao buscar usuário" });
    }
};

export const login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const dadosLogin = await AuthService.login(email, senha);
        return res.json(dadosLogin);
    } catch (err) {
        return res.status(err.status || 500).json({ erro: err.message });
    }
};