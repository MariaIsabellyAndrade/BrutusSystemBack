import express from 'express';
import BarbeiroController from '../controllers/BarbeiroController.js'
import upload from "../config/multer.js";
import ServicoController from '../controllers/ServicoController.js';
import ClienteController from '../controllers/ClienteController.js';
import AgendamentoController from '../controllers/AgendamentoController.js';
import RelatorioController from '../controllers/RelatorioController.js';
import EstoqueController from '../controllers/EstoqueController.js';
import Barbeiro from '../models/Barbeiro.js';
import BarbeiroSchema from '../models/BarbeiroSchema.js';
import ClienteSchema from '../models/ClienteSchema.js';
import Servico from '../models/Servico.js';
import Cliente from '../models/Cliente.js';
import {
  registrarCliente,
  registrarBarbeiro,
  login, 
  registrarAdmin,
  getMe
} from "../controllers/AuthRegistrer.js";

import {
  authMiddleware,
  isAdmin, 
  isBarbeiro,
  optionalAuthMiddleware
} from "../middlewares/authMiddleware.js";



const router = express.Router();

const autorizarEscopoBarbeiro = async (req, res, next) => {
  try {
    if (req.usuario?.tipo === "ADMIN") return next();
    if (req.usuario?.tipo !== "BARBEIRO") return res.status(403).json({ erro: "Acesso negado." });
    const perfil = await BarbeiroSchema.findOne({ Usuario: req.usuario.id }).select("_id").lean();
    if (!perfil || String(perfil._id) !== String(req.params.barbeiroId || req.params.id)) return res.status(403).json({ erro: "Você só pode consultar os seus próprios registros." });
    return next();
  } catch (error) { return next(error); }
};

const autorizarEscopoCliente = async (req, res, next) => {
  try {
    if (req.usuario?.tipo === "ADMIN") return next();
    if (req.usuario?.tipo !== "CLIENTE") return res.status(403).json({ erro: "Acesso negado." });
    const perfil = await ClienteSchema.findOne({ Usuario: req.usuario.id }).select("_id").lean();
    if (!perfil || String(perfil._id) !== String(req.params.clienteId)) return res.status(403).json({ erro: "Você só pode consultar os seus próprios registros." });
    return next();
  } catch (error) { return next(error); }
};

// Estoque: ADMIN gerencia; BARBEIRO consulta itens ativos e registra saídas.
router.get('/produtos', authMiddleware, (req, res, next) => ['ADMIN', 'BARBEIRO'].includes(req.usuario?.tipo) ? next() : res.status(403).json({ erro: 'Acesso negado.' }), EstoqueController.listarProdutos);
router.get('/produtos/:id', authMiddleware, (req, res, next) => ['ADMIN', 'BARBEIRO'].includes(req.usuario?.tipo) ? next() : res.status(403).json({ erro: 'Acesso negado.' }), EstoqueController.obterProduto);
router.post('/produtos', authMiddleware, isAdmin, EstoqueController.criarProduto);
router.put('/produtos/:id', authMiddleware, isAdmin, EstoqueController.atualizarProduto);
router.patch('/produtos/:id/inativar', authMiddleware, isAdmin, EstoqueController.inativarProduto);
router.get('/movimentacoes-estoque', authMiddleware, isAdmin, EstoqueController.listarMovimentacoes);
router.get('/movimentacoes-estoque/:id', authMiddleware, isAdmin, EstoqueController.obterMovimentacao);
router.post('/movimentacoes-estoque/entrada', authMiddleware, isAdmin, EstoqueController.entrada);
router.post('/movimentacoes-estoque/saida', authMiddleware, (req, res, next) => ['ADMIN', 'BARBEIRO'].includes(req.usuario?.tipo) ? next() : res.status(403).json({ erro: 'Acesso negado.' }), EstoqueController.saida);
router.post('/movimentacoes-estoque/ajuste', authMiddleware, isAdmin, EstoqueController.ajuste);
router.get('/estoque/resumo', authMiddleware, isAdmin, EstoqueController.resumo);

router.post('/barbeiros', authMiddleware, isAdmin,upload.single('foto'), BarbeiroController.createBarbeiro);
router.put('/barbeiros/me/perfil', authMiddleware, isBarbeiro, BarbeiroController.atualizarMeuPerfil);
router.get('/barbeiros/me/inicio', authMiddleware, isBarbeiro, BarbeiroController.getInicioBarbeiro);
router.get('/barbeiros', optionalAuthMiddleware, BarbeiroController.getAllBarbeiro);
router.put('/barbeiros/:id', authMiddleware, isAdmin,upload.single('foto'), BarbeiroController.updateBarbeiro);
router.delete('/barbeiros/:id',authMiddleware, isAdmin,BarbeiroController.deleteBarbeiro);
router.put('/barbeiros/:id/horarios-bloqueados', authMiddleware, isBarbeiro, BarbeiroController.salvarHorariosBloqueados);
router.get('/barbeiros/:id/horarios-bloqueados', authMiddleware, autorizarEscopoBarbeiro, BarbeiroController.buscarHorariosBloqueados);
router.get('/barbeiros/:id/bloqueios-recorrentes', authMiddleware, isBarbeiro, BarbeiroController.listarBloqueiosRecorrentes);
router.put('/barbeiros/:id/bloqueios-recorrentes', authMiddleware, isBarbeiro, BarbeiroController.salvarBloqueiosRecorrentes);
router.get('/admin/horarios-bloqueados', authMiddleware, isAdmin, BarbeiroController.listarBloqueiosParaAdmin);
router.get('/admin/notificacoes/horarios', authMiddleware, isAdmin, BarbeiroController.listarNotificacoesHorarios);
router.patch('/admin/notificacoes/horarios/:id/lida', authMiddleware, isAdmin, BarbeiroController.marcarNotificacaoHorarioLida);
router.get("/barbeiro/:barbeiroId", authMiddleware, autorizarEscopoBarbeiro, AgendamentoController.listarAgendamentosPorBarbeiro);
router.get("/agendamentos/barbeiro/:barbeiroId/indicadores", authMiddleware, autorizarEscopoBarbeiro, AgendamentoController.buscarIndicadoresPorBarbeiro);
router.get("/agendamentos/barbeiro/:barbeiroId/faturamento", authMiddleware, autorizarEscopoBarbeiro, AgendamentoController.buscarFaturamentoPorBarbeiro);

router.get("/barbeiros/resumo", async (req, res) => {
  try {
    const total = await Barbeiro.countAll();
    const ativos = await Barbeiro.countAtivos();
    const inativos = await Barbeiro.countInativos();

    res.json({ total, ativos, inativos });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/servicos',upload.single('foto'), ServicoController.createServico);
router.get('/servicos', ServicoController.getAllServico);
router.put('/servicos/:id',upload.single('foto'), ServicoController.updateServico);
router.delete('/servicos/:id',ServicoController.deleteServico);

router.get("/servicos/resumo", async (req, res) => {
  try {
    const total = await Servico.countAll();
    const ativos = await Servico.countAtivos();
    const inativos = await Servico.countInativos();
    res.json({ total, ativos, inativos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/cliente/:clienteId", authMiddleware, autorizarEscopoCliente, AgendamentoController.listarAgendamentosPorCliente);
router.post('/clientes',upload.single('foto'), ClienteController.createCliente);
router.get('/clientes', ClienteController.getAllCliente);
router.put('/clientes/:id',upload.single('foto'), ClienteController.updateCliente);
router.delete('/clientes/:id',ClienteController.deleteCliente);
router.get("/clientes/resumo", async (req, res) => {
  try {
    const total = await Cliente.countAll();
    const ativos = await Cliente.countAtivos();
    const inativos = await Cliente.countInativos();

    res.json({ total, ativos, inativos });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================================
// RELATÓRIO FINANCEIRO
// Protegido — apenas ADMIN e BARBEIRO autenticados
// ============================================================
router.get(
    "/relatorio/financeiro",
    authMiddleware,
    RelatorioController.financeiro
);
router.get("/relatorio/gerencial", authMiddleware, RelatorioController.gerencial);
router.patch("/relatorio/comissoes/servicos/:servicoId", authMiddleware, isAdmin, RelatorioController.atualizarComissaoServico);
router.patch("/relatorio/comissoes/:comissaoId/paga", authMiddleware, isAdmin, RelatorioController.marcarComissaoPaga);

router.post("/login", login);
router.post("/registrar-cliente",upload.single('foto'), registrarCliente);
router.post("/registrar-admin",authMiddleware,isAdmin,  registrarAdmin);
router.get("/me",  authMiddleware, getMe );


router.post("/registrar-barbeiro", authMiddleware, isAdmin, registrarBarbeiro);

router.post(
    "/agendar",
    authMiddleware,
    AgendamentoController.cadastrar
);

router.delete(
    "/agendar-excluir/:id",
    authMiddleware,
    AgendamentoController.cancelarAgendamento
);
router.put(
    "/agendar-reagendar/:id",
    authMiddleware,
    AgendamentoController.reagendarAgendamento
);
router.patch("/agendamentos/:id/concluir", authMiddleware, AgendamentoController.concluirAgendamento);
router.post(
    "/webhook",
    AgendamentoController.webhook
);

router.get(
    "/horarios-disponiveis/:barbeiroId/:data",
    AgendamentoController.horariosDisponiveis
);

router.get(
    "/agendamentos",
    authMiddleware,
    isAdmin,
    AgendamentoController.listarAgendamentos
);

export default router;
