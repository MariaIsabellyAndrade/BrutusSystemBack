import Cliente from "../models/Cliente.js";
import Usuario from "../models/Usuario.js";
import bcrypt from "bcrypt";

class ClienteService {
    async criarCliente(dados, nomeFoto) {
        const {
            nome, sobrenome, telefone, cpf, rg, endereco, ativo, dataNascimento, email, senha
        } = dados;

        // 1. Regras de negócio
        const clienteExistente = await Cliente.findByCPF(cpf);
        if (clienteExistente) throw { status: 400, message: 'Cliente já cadastrado.' };
        if (!nomeFoto) throw { status: 400, message: 'Foto é obrigatória.' };

        let usuarioCriado = null;

        try {
            // 2. Criação do Usuário
            const senhaHash = await bcrypt.hash(senha, 10);
            usuarioCriado = await Usuario.create({
                email,
                senha: senhaHash,
                tipo: "CLIENTE",
                ativo: true
            });

            // 3. Criação do Cliente
            const novoCliente = new Cliente(
                nome, sobrenome, telefone, cpf, rg, endereco,
                (ativo === "true" || ativo === true),
                nomeFoto, dataNascimento, usuarioCriado._id
            );

            await novoCliente.save();
            return { message: 'Cliente cadastrado com sucesso' };

        } catch (error) {
            // Rollback
            if (usuarioCriado) await Usuario.findByIdAndDelete(usuarioCriado._id);
            if (error.code === 11000) throw { status: 400, message: "CPF já cadastrado" };
            throw error;
        }
    }

    async buscarTodos() {
        return await Cliente.findAll();
    }

    async atualizarCliente(id, dados, nomeFoto) {
        const dadosAtualizacao = { ...dados };
        if (nomeFoto) dadosAtualizacao.foto = nomeFoto;
        
        await Cliente.update(id, dadosAtualizacao);
        return await Cliente.findById(id);
    }

    async deletarCliente(id) {
        return await Cliente.update(id, { ativo: false });
    }
}

export default new ClienteService();