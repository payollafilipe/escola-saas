// auth-escola.js — Autenticação centralizada por e-mail/senha + validação de licença
(function () {
  const hoje = () => new Date().toLocaleDateString("sv");
  const fmt = d => d ? String(d).split("-").reverse().join("/") : "Sem vencimento";

  function montarLoginSenha() {
    const box = document.getElementById("telaLogin");
    if (!box || box.dataset.pronto) return;
    box.dataset.pronto = "1";
    let primeiro = false;

    box.innerHTML = `
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap">
        <button type="button" class="btn btn-primary" id="aeTabEntrar">Entrar</button>
        <button type="button" class="btn btn-ghost" id="aeTabPrimeiro">Primeiro acesso</button>
      </div>
      <h2 style="justify-content:center" id="aeTit">Acesso ao Sistema</h2>
      <p id="aeSub">Entre com o e-mail e a senha cadastrados para sua escola.</p>
      <form id="aeForm" style="display:grid;gap:12px;text-align:left;margin-top:14px">
        <label style="display:grid;gap:4px;font-size:.85rem;font-weight:600;color:var(--muted)">E-mail
          <input class="in" type="email" id="aeEmail" required placeholder="usuario@escola.com.br" style="font:inherit;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);width:100%">
        </label>
        <label style="display:grid;gap:4px;font-size:.85rem;font-weight:600;color:var(--muted)">Senha
          <input class="in" type="password" id="aeSenha" required minlength="6" placeholder="Mínimo 6 caracteres" style="font:inherit;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);width:100%">
        </label>
        <label id="aeBox2" hidden style="display:grid;gap:4px;font-size:.85rem;font-weight:600;color:var(--muted)">Confirmar senha
          <input class="in" type="password" id="aeSenha2" minlength="6" placeholder="Repita a senha" style="font:inherit;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);width:100%">
        </label>
        <button type="submit" class="btn btn-primary" id="aeBtn" style="justify-content:center">Entrar</button>
        <button type="button" class="btn btn-ghost" id="aeEsqueci" style="justify-content:center;font-size:.84rem">Esqueci minha senha</button>
        <p id="aeMsg" role="alert" style="margin:0;font-size:.86rem;color:var(--danger)"></p>
      </form>
      <span id="entrar" hidden></span><span id="btnEntrar" hidden></span>`;

    const $ = id => document.getElementById(id);
    const setModo = p => {
      primeiro = p;
      $("aeTabEntrar").className = "btn " + (p ? "btn-ghost" : "btn-primary");
      $("aeTabPrimeiro").className = "btn " + (p ? "btn-primary" : "btn-ghost");
      $("aeTit").textContent = p ? "Primeiro Acesso" : "Acesso ao Sistema";
      $("aeSub").textContent = p ? "Use o e-mail pré-cadastrado pela escola e crie sua senha." : "Entre com o e-mail e a senha cadastrados para sua escola.";
      $("aeBox2").hidden = !p;
      $("aeBtn").textContent = p ? "Criar senha e entrar" : "Entrar";
      $("aeMsg").textContent = "";
    };
    $("aeTabEntrar").onclick = () => setModo(false);
    $("aeTabPrimeiro").onclick = () => setModo(true);

    $("aeForm").onsubmit = async e => {
      e.preventDefault();
      const client = window.sb;
      if (!client) return;
      const email = $("aeEmail").value.trim().toLowerCase();
      const password = $("aeSenha").value;
      if (primeiro && password !== $("aeSenha2").value) {
        $("aeMsg").style.color = "var(--danger)";
        $("aeMsg").textContent = "As senhas não coincidem.";
        return;
      }
      $("aeBtn").disabled = true;
      $("aeMsg").style.color = "var(--muted)";
      $("aeMsg").textContent = "Verificando…";
      const res = primeiro
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
      $("aeBtn").disabled = false;
      if (res.error) {
        $("aeMsg").style.color = "var(--danger)";
        $("aeMsg").textContent = /Invalid login/i.test(res.error.message)
          ? "E-mail ou senha incorretos."
          : /already registered/i.test(res.error.message)
          ? "Este e-mail já possui senha cadastrada. Use a aba Entrar."
          : res.error.message;
        return;
      }
      location.reload();
    };

    $("aeEsqueci").onclick = async () => {
      const client = window.sb;
      if (!client) return;
      const email = $("aeEmail").value.trim().toLowerCase();
      if (!email) {
        $("aeMsg").style.color = "var(--danger)";
        $("aeMsg").textContent = "Digite seu e-mail acima primeiro.";
        return;
      }
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/gestao/" });
      $("aeMsg").style.color = error ? "var(--danger)" : "var(--ok, #137333)";
      $("aeMsg").textContent = error ? error.message : "Link de redefinição enviado para " + email;
    };
  }

  function aplicarIdentidadeEscola(esc) {
    const sigla = (esc.sigla || esc.nome.slice(0, 3)).toUpperCase();
    window.ESCOLA_ATUAL = esc;
    window.ESCOLA = esc.nome;
    document.title = document.title.replace(/JMA/g, sigla);

    document.querySelectorAll(".brand-mark").forEach(el => {
      if (el.textContent.trim() === "JMA") el.textContent = sigla;
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.includes("Escola Estadual JMA")) node.nodeValue = node.nodeValue.replace(/Escola Estadual JMA/g, esc.nome);
      if (node.nodeValue.includes("INTRANET JMA")) node.nodeValue = node.nodeValue.replace(/INTRANET JMA/g, "INTRANET " + sigla);
      if (node.nodeValue.includes("Intranet JMA")) node.nodeValue = node.nodeValue.replace(/Intranet JMA/g, "Intranet " + sigla);
      if (node.nodeValue.includes("Drive JMA")) node.nodeValue = node.nodeValue.replace(/Drive JMA/g, "Drive " + sigla);
    }
  }

  window.validarLicencaEscola = async function (client) {
    window.sb = client;
    montarLoginSenha();
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;

    const email = (session.user.email || "").toLowerCase();
    const { data: perfil } = await client.from("perfis").select("*").eq("email", email).maybeSingle();
    if (!perfil || !perfil.ativo) return perfil;

    if (perfil.super_admin && !location.pathname.startsWith("/gestao")) {
      location.href = "/gestao/";
      return null;
    }

    if (perfil.escola_id) {
      const { data: esc } = await client.from("escolas").select("*").eq("id", perfil.escola_id).maybeSingle();
      const vencida = esc && esc.licenca_validade && esc.licenca_validade < hoje();
      if (!esc || !esc.licenca_ativa || vencida) {
        document.body.innerHTML = `<main style="max-width:460px;margin:60px auto;padding:28px;background:var(--card,#fff);color:var(--ink,#0c1b33);border:1px solid var(--line,#d9e4f1);border-radius:20px;text-align:center;font-family:system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.08)">
          <h2 style="margin-top:0">Licença suspensa ou vencida</h2>
          <p>O acesso da instituição <b>${esc ? esc.nome : ""}</b> (${fmt(esc?.licenca_validade)}) não está ativo no momento.</p>
          <p style="font-size:.9rem;color:#566b85">Entre em contato com o suporte para renovar ou ativar a assinatura.</p>
          <button id="aeBtnSairBloq" style="margin-top:10px;padding:10px 22px;border-radius:999px;border:1px solid #bfd5ed;background:#0b5cab;color:#fff;font-weight:600;cursor:pointer">Sair da conta</button>
        </main>`;
        document.getElementById("aeBtnSairBloq").onclick = async () => {
          await client.auth.signOut();
          location.reload();
        };
        throw new Error("LICENCA_INATIVA");
      }
      aplicarIdentidadeEscola(esc);
    }
    return perfil;
  };

  montarLoginSenha();
  document.addEventListener("DOMContentLoaded", montarLoginSenha);
})();
