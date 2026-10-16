import Barbeiro from "../models/Barbeiro.js";
import Usuario from "../models/Usuario.js";
import bcrypt from "bcrypt";

class BarbeiroService {
    async criarBarbeiro(dados, nomeFoto) {
        const {
            nome,
            sobrenome,
            dataNascimento,
            dataAdmissao,
            email,
            senha,
            cnpj,
            endereco,
            ativo,
            telefone
        } = dados;

        // 1. Validações de Regra de Negócio
        const barbeiroExistente = await Barbeiro.findByCnpj(cnpj);
        if (barbeiroExistente) {
            throw { status: 400, message: "Barbeiro já cadastrado." };
        }

        if (!nomeFoto) {
            throw { status: 400, message: "Foto é obrigatória." };
        }

        let usuarioCriado = null;

        try {
            // 2. Criação do Usuário de acesso
            const senhaHash = await bcrypt.hash(senha, 10);
            
            usuarioCriado = await Usuario.create({
                email,
                senha: senhaHash,
                tipo: "BARBEIRO"
            });

            // 3. Criação do perfil do Barbeiro vinculado ao Usuário
            const novoBarbeiro = new Barbeiro(
                nome,
                sobrenome,
                dataNascimento,
                dataAdmissao,
                email,
                senha, // Mantendo o padrão do seu construtor original
                cnpj,
                endereco,
                ativo === "true" || ativo === true,
                telefone,
                nomeFoto,
                usuarioCriado._id
            );

            await novoBarbeiro.save();
            return { message: "Barbeiro criado com sucesso" };

        } catch (error) {
            // 🔥 Rollback: Se o usuário foi criado, mas o barbeiro falhou, desfaz a operação
            if (usuarioCriado) {
                await Usuario.delete(usuarioCriado._id);
            }
            throw error;
        }
    }

    async buscarTodos() {
        return await Barbeiro.findAll();
    }

    async atualizarBarbeiro(id, dados, nomeFoto) {
        const dadosAtualizacao = { ...dados };

        // Se veio uma foto nova, adiciona aos dados de atualização
        if (nomeFoto) {
            dadosAtualizacao.foto = nomeFoto;
        }

        // Se a senha veio vazia, remove para não sobreescrever com valor em branco
        if (!dadosAtualizacao.senha) {
            delete dadosAtualizacao.senha;
        }

        await Barbeiro.update(id, dadosAtualizacao);
        return await Barbeiro.findById(id);
    }

    async deletarBarbeiro(id) {
        // Soft delete: Apenas desativa o barbeiro no sistema
        return await Barbeiro.update(id, { ativo: false });
    }

    /*
     * Salva os slots bloqueados de um dia específico para um barbeiro.
     * Se já existe uma entrada para aquela data, substitui.
     * Se slots for vazio, remove a entrada do dia.
     */
    async salvarHorariosBloqueados(id, data, slots) {
        const barbeiro = await Barbeiro.findById(id);

        if (!barbeiro) {
            throw { status: 404, message: "Barbeiro não encontrado" };
        }

        // Remove entrada existente para essa data
        barbeiro.horariosBloqueados = (barbeiro.horariosBloqueados || []).filter(
            (h) => h.data !== data
        );

        // Se há slots a bloquear, adiciona nova entrada
        if (Array.isArray(slots) && slots.length > 0) {
            barbeiro.horariosBloqueados.push({ data, slots });
        }

        await barbeiro.save();

        return {
            mensagem: "Horários bloqueados salvos com sucesso",
            data,
            slots: slots || [],
            horariosBloqueados: barbeiro.horariosBloqueados
        };
    }

    /*
     * Retorna os slots bloqueados de um barbeiro para uma data.
     */
    async buscarHorariosBloqueados(id, data) {
        const barbeiro = await Barbeiro.findById(id);

        if (!barbeiro) {
            throw { status: 404, message: "Barbeiro não encontrado" };
        }

        const entrada = (barbeiro.horariosBloqueados || []).find(
            (h) => h.data === data
        );

        return {
            barbeiroId: id,
            data,
            slots: entrada ? entrada.slots : []
        };
    }
}

export default new BarbeiroService();