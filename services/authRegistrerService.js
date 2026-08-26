import Usuario from "../models/Usuario.js";
import Cliente from "../models/Cliente.js";
import Barbeiro from "../models/Barbeiro.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

class AuthService {
    async registrarUsuario(dados, tipo) {
        const { email, senha, ...rest } = dados;
        
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) throw { status: 400, message: "Email já cadastrado" };

        const senhaHash = await bcrypt.hash(senha, 10);
        const usuario = await Usuario.create({ email, senha: senhaHash, tipo });
        
        return usuario;
    }

    async registrarCliente(dados) {
        let usuario = null;
        try {
            usuario = await this.registrarUsuario(dados, "CLIENTE");
            const cliente = await Cliente.create({ ...dados, Usuario: usuario._id });
            return { usuario, cliente };
        } catch (error) {
            if (usuario) await Usuario.delete(usuario._id);
            throw error;
        }
    }

    async registrarBarbeiro(dados) {
        let usuario = null;
        try {
            usuario = await this.registrarUsuario(dados, "BARBEIRO");
            const barbeiro = await Barbeiro.create({ ...dados, Usuario: usuario._id });
            return { usuario, barbeiro };
        } catch (error) {
            if (usuario) await Usuario.delete(usuario._id);
            throw error;
        }
    }

async login(email, senha) {
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
        throw {
            status: 400,
            message: "Usuário não encontrado"
        };
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
        throw {
            status: 400,
            message: "Senha inválida"
        };
    }

    let entidadeId = null;

    if (usuario.tipo === "CLIENTE") {
        const cliente = await Cliente.findOne({
            Usuario: usuario._id
        });

        if (cliente) {
            entidadeId = cliente._id;
        }
    }

    if (usuario.tipo === "BARBEIRO") {
        const barbeiro = await Barbeiro.findOne({
            Usuario: usuario._id
        });

        if (barbeiro) {
            entidadeId = barbeiro._id;
        }
    }

    const token = jwt.sign(
        {
            id: usuario._id,
            tipo: usuario.tipo
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    return {
        token,
        tipo: usuario.tipo,
        email: usuario.email,
        entidadeId
    };
}
}

export default new AuthService(); 