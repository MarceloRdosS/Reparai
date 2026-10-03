const $ = id => document.getElementById(id);

// ===== Custom Toast Notifications =====
function showToast(msg, type="error") {
  const container = $("toast-container");
  if(!container) return;
  const toast = document.createElement("div");
  const bg = type === "error" ? "#E6192B" : "#111";
  toast.style.cssText = `background: ${bg}; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(20px); opacity: 0; transition: all 0.3s;`;
  toast.textContent = msg;
  container.appendChild(toast);
  
  setTimeout(() => { toast.style.transform = "translateY(0)"; toast.style.opacity = "1"; }, 10);
  setTimeout(() => { 
    toast.style.transform = "translateY(20px)"; toast.style.opacity = "0"; 
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== Auth State Management =====
let currentUser = JSON.parse(localStorage.getItem('reparai_user')) || null;
let userOrders = JSON.parse(localStorage.getItem('reparai_orders')) || [];

function updateAuthState() {
  const headerActions = $("header-actions");
  const authBlock = $("auth-block");
  const formArea = $("form");

  if (currentUser) {
    // Logged In
    if(headerActions) {
      headerActions.innerHTML = `
        <span style="font-weight: 600; color: var(--text-dark); margin-right: 15px;">Olá, ${currentUser.nome.split(' ')[0]}</span>
        <a href="conta.html" class="btn-outline" style="margin-right:10px;">Minha Conta</a>
        <a href="#" onclick="logout()" class="btn-outline" style="margin-right:10px; color:var(--primary); border-color:var(--primary);">Sair</a>
        <a href="index.html#pedir" class="btn-primary-sm">Pedir Agora</a>
      `;
    }
    // Auto fill form (if it exists)
    if($("nome")) $("nome").value = currentUser.nome;
    if(authBlock) authBlock.hidden = true;
    if(formArea) {
      formArea.hidden = false;
      if(window.coletaMap) setTimeout(() => window.coletaMap.invalidateSize(), 200);
    }
    
  } else {
    // Logged Out
    if(headerActions) {
      headerActions.innerHTML = `
        <a href="#" id="btn-header-login" class="btn-login">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Entrar
        </a>
        <a href="index.html#pedir" class="btn-primary-sm">Pedir Agora</a>
      `;
      $("btn-header-login").addEventListener("click", (e) => {
        e.preventDefault();
        openModal('login');
      });
    }

    if(authBlock) authBlock.hidden = false;
    if(formArea) formArea.hidden = true;
  }
}

async function login(email, senha) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, senha})
    });
    
    const data = await res.json();
    if(res.ok) {
      currentUser = { email: data.email, nome: data.nome };
      localStorage.setItem('reparai_user', JSON.stringify(currentUser));
      updateAuthState();
      if($("login-modal")) $("login-modal").hidden = true;
      if(window.location.href.includes("conta.html")) {
          window.location.reload();
      }
    } else {
      showToast(data.error || "Erro ao fazer login");
    }
  } catch(e) {
    showToast("Erro ao conectar no servidor. Ele está ligado?");
  }
}

async function register(nome, email, senha) {
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({nome, email, senha})
    });
    
    const data = await res.json();
    if(res.ok) {
      // Auto-login
      currentUser = { email, nome };
      localStorage.setItem('reparai_user', JSON.stringify(currentUser));
      updateAuthState();
      if($("login-modal")) $("login-modal").hidden = true;
      showToast("Conta criada com sucesso!", "success");
    } else {
      showToast(data.error || "Erro ao criar conta");
    }
  } catch(e) {
    showToast("Erro ao conectar no servidor. Ele está ligado?");
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('reparai_user');
  updateAuthState();
  window.location.href = "index.html"; // Força volta pra home
}

// ===== Modal Logic =====
function openModal(view) {
  if(!$("login-modal")) return;
  $("login-modal").hidden = false;
  $("view-login").hidden = true;
  $("view-registro").hidden = true;
  $("view-esqueci").hidden = true;
  
  if(view === 'login') $("view-login").hidden = false;
  else if(view === 'registro') $("view-registro").hidden = false;
  else if(view === 'esqueci') $("view-esqueci").hidden = false;
}

if($("btn-open-login")) $("btn-open-login").addEventListener("click", () => openModal('login'));
if($("close-login")) $("close-login").addEventListener("click", () => $("login-modal").hidden = true);
if($("link-criar")) $("link-criar").addEventListener("click", (e) => { e.preventDefault(); openModal('registro'); });
if($("link-esqueci")) $("link-esqueci").addEventListener("click", (e) => { e.preventDefault(); openModal('esqueci'); });
if($("link-voltar-login")) $("link-voltar-login").addEventListener("click", (e) => { e.preventDefault(); openModal('login'); });
if($("link-voltar-login2")) $("link-voltar-login2").addEventListener("click", (e) => { e.preventDefault(); openModal('login'); });

if($("form-login")) {
  $("form-login").addEventListener("submit", e => {
    e.preventDefault();
    login($("email").value, $("senha").value);
  });
}
if($("form-registro")) {
  $("form-registro").addEventListener("submit", e => {
    e.preventDefault();
    register($("reg-nome").value, $("reg-email").value, $("reg-senha").value);
  });
}
if($("form-esqueci")) {
  $("form-esqueci").addEventListener("submit", e => {
    e.preventDefault();
    showToast("Link de recuperação enviado para " + $("esq-email").value, "success");
    openModal('login');
  });
}


// ===== Utilidades Extras =====
async function getAddressFromCoords(lat, lng) {
  try {
    $("endereco").value = "Buscando endereço...";
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    if(data && data.address) {
      const a = data.address;
      let parts = [];
      if(a.road) parts.push(a.road);
      if(a.suburb) parts.push(a.suburb);
      if(a.postcode) parts.push(a.postcode);
      if(parts.length > 0) return parts.join(', ');
    }
  } catch(e) {}
  return `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ===== Formulário Principal (Passo a Passo) =====

// Init Leaflet Map if container exists
let marker;
window.coletaMap = null;
if($("mapa-coleta") && typeof L !== 'undefined') {
  window.coletaMap = L.map('mapa-coleta').setView([-22.903936, -43.567086], 13);
  
  // Utiliza as texturas de mapa do Google Maps (lyrs=m é o mapa padrão)
  L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains:['mt0','mt1','mt2','mt3']
  }).addTo(window.coletaMap);
  
  marker = L.marker([-22.903936, -43.567086], {draggable: true}).addTo(window.coletaMap);
  
  // Atualiza endereço base nas coordenadas via Reverse Geocoding
  marker.on('dragend', async function(e) {
    const lat = marker.getLatLng().lat;
    const lng = marker.getLatLng().lng;
    const address = await getAddressFromCoords(lat, lng);
    $("endereco").value = address;
    showToast("Endereço atualizado!", "success");
  });

  window.coletaMap.on('click', async function(e) {
    marker.setLatLng(e.latlng);
    const address = await getAddressFromCoords(e.latlng.lat, e.latlng.lng);
    $("endereco").value = address;
    showToast("Endereço atualizado!", "success");
  });
}

if($("btn-next")) {
  $("btn-next").addEventListener("click", () => {
    const p = {
      nome: $("nome").value,
      zap: $("zap").value,
      endereco: $("endereco").value,
      equip: document.querySelector('input[name="equip"]:checked')?.value
    };

    if(!p.nome) { showToast("Preencha seu Nome."); $("nome").focus(); return; }
    if(!p.zap) { showToast("Preencha seu WhatsApp."); $("zap").focus(); return; }
    if(!p.endereco || p.endereco === "Buscando endereço...") { showToast("Marque o endereço no mapa ou digite."); $("endereco").focus(); return; }
    
    if(!p.equip) {
      showToast("Selecione o aparelho.");
      $("e-equip").textContent = "Selecione o aparelho";
      return;
    }
    $("e-equip").textContent = "";

    $("step-1").hidden = true;
    $("step-2").hidden = false;
    $("pedir").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if($("btn-back")) {
  $("btn-back").addEventListener("click", () => {
    $("step-2").hidden = true;
    $("step-1").hidden = false;
  });
}

let selectedFiles = [];

function updateFilePreviews() {
  const container = $("image-previews");
  if(!container) return;
  container.innerHTML = "";
  if(selectedFiles.length === 0) {
    $("file-name-display").textContent = "Arraste fotos aqui ou clique para selecionar";
    return;
  }
  
  $("file-name-display").textContent = `${selectedFiles.length} foto(s) selecionada(s)`;
  if($("e-foto")) $("e-foto").textContent = "";

  selectedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement("div");
      wrapper.className = "image-preview-wrapper";
      
      const img = document.createElement("img");
      img.src = e.target.result;
      
      const btn = document.createElement("button");
      btn.className = "remove-btn";
      btn.type = "button";
      btn.innerHTML = "×";
      btn.onclick = (ev) => {
        ev.preventDefault();
        selectedFiles.splice(index, 1);
        updateFilePreviews();
      };
      
      wrapper.appendChild(img);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

const dropZone = $("drop-zone");
if(dropZone && $("foto-equipamento")) {
  $("foto-equipamento").addEventListener("change", (e) => {
    Array.from(e.target.files).forEach(f => selectedFiles.push(f));
    updateFilePreviews();
    $("foto-equipamento").value = ""; 
  });
  
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });
  
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if(e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(f => {
        if(f.type.startsWith("image/")) selectedFiles.push(f);
      });
      updateFilePreviews();
    }
  });
}

if($("form")) {
  $("form").addEventListener("submit", async e => {
    e.preventDefault();
    
    if(selectedFiles.length === 0) {
      $("e-foto").textContent = "A foto é obrigatória para a sua segurança.";
      return;
    }

    const btn = $("form").querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Salvando informações...";

    // Gerar protocolo temporário caso o servidor falhe
    let proto = "RP-" + Math.floor(Math.random() * 9000 + 1000);
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    const pedidoObj = {
      nome: $("nome").value,
      zap: $("zap").value,
      endereco: $("endereco").value,
      obs: $("obs").value,
      equip: document.querySelector('input[name="equip"]:checked')?.value,
      email: currentUser ? currentUser.email : '',
      data: dataHoje
    };

    // Enviar dados em texto para o Backend Python (SQLite)
    try {
      const resText = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoObj)
      });
      if(resText.ok) {
        const dataText = await resText.json();
        proto = dataText.proto; // Usa o protocolo gerado pelo backend
      }
    } catch (err) {
      console.error("Servidor Python offline. Gerando protocolo local.");
    }

    pedidoObj.proto = proto;

    // Enviar as imagens para o backend Python como Base64
    try {
      const uploadPromises = [];
      
      for(let i = 0; i < selectedFiles.length; i++) {
        uploadPromises.push(new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFiles[i]);
          reader.onload = async () => {
            const base64Img = reader.result;
            // Add index to proto to prevent name collision in Python script
            await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proto: `${proto}_${i}`, imagem: base64Img })
            });
            resolve();
          };
        }));
      }
      
      await Promise.all(uploadPromises);
    } catch (err) {
      console.error("Erro ao salvar imagem localmente:", err);
    }

    // WhatsApp logic
    const numero = "5521972404109";
    const mensagem = `Olá, Reparaí! Gostaria de solicitar uma análise e coleta.
    
*Protocolo:* ${proto}
*Equipamento:* ${pedidoObj.equip}
*O que está acontecendo:* ${pedidoObj.obs}
*Endereço de Coleta:* ${pedidoObj.endereco}
*Nome:* ${pedidoObj.nome}
*WhatsApp Contato:* ${pedidoObj.zap}

Já enviei a foto de segurança pelo aplicativo web.`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    
    // Abre o WhatsApp
    window.open(url, '_blank');

    // Mostra a tela de sucesso e instruções
    $("form").hidden = true;
    $("confirmado").hidden = false;
    $("instrucoes-envio").hidden = false;
    $("pedir").scrollIntoView({ behavior: "smooth" });
    
    btn.disabled = false;
    btn.textContent = "Confirmar Pedido Seguro";
  });
}

if($("outro")) {
  $("outro").addEventListener("click", () => {
    $("form").reset();
    if(currentUser) $("nome").value = currentUser.nome;
    $("form").hidden = false;
    $("step-1").hidden = false;
    $("step-2").hidden = true;
    $("file-name-display").textContent = "Arraste fotos aqui ou clique para selecionar";
    selectedFiles = [];
    if($("image-previews")) $("image-previews").innerHTML = "";
    $("confirmado").hidden = true;
    $("instrucoes-envio").hidden = true;
    document.querySelectorAll('input[name="equip"]').forEach(r => r.checked = false);
    $("pedir").scrollIntoView({ behavior: "smooth" });
  });
}

// ===== Utilidades =====
// Máscara ZAP
if($("zap")) {
  $("zap").addEventListener("input", e => {
    let v = e.target.value.replace(/\D/g, "");
    if(v.length > 11) v = v.slice(0, 11);
    if(v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    if(v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`;
    e.target.value = v;
  });
}

// Inicialização
updateAuthState();
