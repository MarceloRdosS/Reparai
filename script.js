// ===== Dados =====
const EQUIPAMENTOS = ["Notebook", "Computador de mesa", "All-in-one", "Monitor"];

const SERVICOS = [
  { id: "diag",   nome: "Não sei o defeito (diagnóstico)", min: 60,  max: 60,  prazo: "1 a 2 dias úteis" },
  { id: "format", nome: "Formatação e reinstalação do sistema", min: 120, max: 180, prazo: "1 a 2 dias úteis" },
  { id: "virus",  nome: "Remoção de vírus e limpeza de software", min: 80,  max: 140, prazo: "1 dia útil" },
  { id: "limpa",  nome: "Limpeza interna e pasta térmica", min: 90,  max: 150, prazo: "1 a 2 dias úteis" },
  { id: "ssd",    nome: "Troca de SSD ou HD (com peça)", min: 250, max: 520, prazo: "2 a 3 dias úteis" },
  { id: "ram",    nome: "Upgrade de memória RAM (com peça)", min: 180, max: 420, prazo: "1 a 2 dias úteis" },
  { id: "tela",   nome: "Troca de tela de notebook (com peça)", min: 350, max: 900, prazo: "3 a 5 dias úteis" }
];

const FRETE = 38;           // coleta + devolução, valor único
const DEMO_MS = 45 * 1000;  // cada etapa avança a cada 45 s (modo demonstração)
const ETAPAS = [
  { t: "Pedido recebido",           d: "Estamos organizando a sua coleta." },
  { t: "Coleta a caminho",          d: "O entregador está indo até o seu endereço." },
  { t: "Equipamento coletado",      d: "Seu equipamento está a caminho da assistência." },
  { t: "Em diagnóstico e conserto", d: "A assistência está trabalhando no seu equipamento." },
  { t: "Devolução a caminho",       d: "Conserto concluído. Estamos levando até você." },
  { t: "Entregue",                  d: "Pedido finalizado." }
];

const brl = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const $ = id => document.getElementById(id);

// ===== Armazenamento (localStorage) =====
function lerPedidos() {
  try { return JSON.parse(localStorage.getItem("reparai_pedidos")) || []; }
  catch { return []; }
}
function salvarPedidos(lista) {
  try { localStorage.setItem("reparai_pedidos", JSON.stringify(lista)); } catch {}
}

// ===== Montagem inicial =====
function montarCampos() {
  $("equip").innerHTML = '<option value="">Escolha</option>' +
    EQUIPAMENTOS.map(e => `<option>${e}</option>`).join("");
  $("servico").innerHTML = '<option value="">Escolha</option>' +
    SERVICOS.map(s => `<option value="${s.id}">${s.nome}</option>`).join("");

  $("tabela").innerHTML = SERVICOS.map(s => {
    const valor = s.min === s.max ? brl(s.min) : `${brl(s.min)} a ${brl(s.max)}`;
    return `<tr><td>${s.nome}</td><td>${valor}</td><td>${s.prazo}</td></tr>`;
  }).join("");
  $("nota-frete").textContent =
    `Coleta e devolução: ${brl(FRETE)} (valor único). O diagnóstico de ${brl(60)} é abatido se você aprovar o conserto.`;

  // data mínima: amanhã
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const iso = d => d.toISOString().slice(0, 10);
  $("data").min = iso(amanha);
  $("data").value = iso(amanha);
}

// ===== Estimativa ao vivo =====
function atualizarEstimativa() {
  const s = SERVICOS.find(x => x.id === $("servico").value);
  const box = $("estimativa");
  if (!s) { box.innerHTML = "Escolha o serviço para ver a estimativa."; return; }
  const min = s.min + FRETE, max = s.max + FRETE;
  const faixa = min === max ? brl(min) : `${brl(min)} a ${brl(max)}`;
  box.innerHTML = `<span class="total">${faixa}</span>
    <span class="det">Serviço ${s.min === s.max ? brl(s.min) : brl(s.min) + " a " + brl(s.max)} + frete ${brl(FRETE)}. Prazo: ${s.prazo} após a coleta.</span>`;
}

// ===== Validação =====
function marcar(campo, msg) {
  $("e-" + campo).textContent = msg;
  $(campo).closest(".campo").classList.toggle("invalido", !!msg);
  return !msg;
}

function validar() {
  const zap = $("zap").value.replace(/\D/g, "");
  const hoje = new Date().toISOString().slice(0, 10);
  return [
    marcar("nome", $("nome").value.trim().length < 3 ? "Informe seu nome completo." : ""),
    marcar("zap", zap.length < 10 || zap.length > 11 ? "Informe um WhatsApp com DDD." : ""),
    marcar("equip", !$("equip").value ? "Escolha o equipamento." : ""),
    marcar("servico", !$("servico").value ? "Escolha o serviço." : ""),
    marcar("endereco", $("endereco").value.trim().length < 8 ? "Informe rua, número e bairro." : ""),
    marcar("data", !$("data").value || $("data").value <= hoje ? "Escolha uma data a partir de amanhã." : "")
  ].every(Boolean);
}

// ===== Pedido =====
function novoProtocolo(lista) {
  let p;
  do { p = "RP-" + (1000 + Math.floor(Math.random() * 9000)); }
  while (lista.some(x => x.proto === p));
  return p;
}

$("form").addEventListener("submit", e => {
  e.preventDefault();
  if (!validar()) return;
  const lista = lerPedidos();
  const s = SERVICOS.find(x => x.id === $("servico").value);
  const pedido = {
    proto: novoProtocolo(lista),
    nome: $("nome").value.trim(),
    zap: $("zap").value.trim(),
    equip: $("equip").value,
    servico: s.nome,
    endereco: $("endereco").value.trim(),
    data: $("data").value,
    turno: $("turno").value,
    obs: $("obs").value.trim(),
    criado: Date.now()
  };
  lista.unshift(pedido);
  salvarPedidos(lista);
  $("proto").textContent = pedido.proto;
  $("form").hidden = true;
  $("confirmado").hidden = false;
  renderRecentes();
});

$("outro").addEventListener("click", () => {
  $("form").reset();
  montarCampos();
  atualizarEstimativa();
  $("form").hidden = false;
  $("confirmado").hidden = true;
});

$("ver").addEventListener("click", () => {
  mostrarStatus($("proto").textContent);
  $("acompanhar").scrollIntoView();
});

// ===== Acompanhamento =====
let timer = null;

function etapaAtual(p) {
  return Math.min(Math.floor((Date.now() - p.criado) / DEMO_MS), ETAPAS.length - 1);
}

function dataBR(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function mostrarStatus(cod) {
  const proto = cod.trim().toUpperCase();
  const p = lerPedidos().find(x => x.proto === proto);
  clearInterval(timer);
  if (!p) {
    $("status").hidden = true;
    $("e-busca").textContent = "Não encontramos esse protocolo neste aparelho. Confira o código e tente de novo.";
    return;
  }
  $("e-busca").textContent = "";
  $("cod").value = p.proto;
  desenharStatus(p);
  $("status").hidden = false;
  timer = setInterval(() => desenharStatus(p), 3000);
}

function desenharStatus(p) {
  const at = etapaAtual(p);
  $("resumo").innerHTML = `<strong>${p.proto} · ${p.equip}</strong>
    <p>${p.servico}</p>
    <p>Coleta em ${dataBR(p.data)}, ${p.turno.toLowerCase()} · ${p.endereco}</p>`;
  $("linha").innerHTML = ETAPAS.map((e, i) => {
    const c = i < at ? "feito" : i === at ? (i === ETAPAS.length - 1 ? "feito" : "atual") : "";
    return `<li class="${c}">${e.t}${i === at ? `<small>${e.d}</small>` : ""}</li>`;
  }).join("");
}

$("busca").addEventListener("submit", e => {
  e.preventDefault();
  if (!$("cod").value.trim()) { $("e-busca").textContent = "Digite o protocolo."; return; }
  mostrarStatus($("cod").value);
});

function renderRecentes() {
  const lista = lerPedidos().slice(0, 6);
  $("recentes").hidden = lista.length === 0;
  $("lista-recentes").innerHTML = lista
    .map(p => `<li><button type="button" data-p="${p.proto}">${p.proto} · ${p.equip}</button></li>`).join("");
}
$("lista-recentes").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (b) mostrarStatus(b.dataset.p);
});

// ===== Início =====
montarCampos();
atualizarEstimativa();
renderRecentes();
$("servico").addEventListener("change", atualizarEstimativa);
$("zap").addEventListener("input", e => {
  const d = e.target.value.replace(/\D/g, "").slice(0, 11);
  e.target.value = d.length > 6
    ? `(${d.slice(0,2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}-${d.slice(d.length > 10 ? 7 : 6)}`
    : d.length > 2 ? `(${d.slice(0,2)}) ${d.slice(2)}` : d;
});
