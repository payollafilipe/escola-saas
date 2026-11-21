/**
 * API da Intranet JMA — versão com autorização server-side.
 *
 * CONFIGURAÇÃO OBRIGATÓRIA ANTES DA IMPLANTAÇÃO:
 * 1. Defina a propriedade de script AUTHORIZED_STAFF_EMAILS como a lista aprovada
 *    de contas da equipe, separadas por vírgula ou quebra de linha.
 * 2. Defina STAFF_ROSTER_SCOPES como JSON {"email@dominio":["série|turma"]}; use
 *    ["*"] somente para servidor explicitamente autorizado a ver todo o roster.
 * 3. Confirme ADMINS, o Client ID OAuth e o domínio com a instituição.
 * 4. Restrinja DB/AUDIT a responsáveis autorizados; nunca publique por link.
 * 5. Atualize o frontend para enviar o ID token em cada chamada e tratar {ok:false}.
 *
 * A lista de domínio não substitui a allowlist: contas de todo o domínio educacional
 * não recebem acesso automaticamente. Papéis e propriedade dos registros são validados aqui.
 */
const CONFIG = Object.freeze({
  GOOGLE_CLIENT_ID: "725828733561-f7rpqina1tvia60lbjtgqb09lmbk4ddp.apps.googleusercontent.com",
  ALLOWED_EMAIL_DOMAIN: "prof.educacao.sp.gov.br",
  STAFF_ALLOWLIST_PROPERTY: "AUTHORIZED_STAFF_EMAILS",
  ROSTER_SCOPES_PROPERTY: "STAFF_ROSTER_SCOPES",
  DATABASE_SHEET: "DB",
  MAX_REQUEST_CHARS: 100000,
  MAX_CELL_CHARS: 45000,
  MAX_RECORDS_PER_KEY: 5000,
  MAX_NOTIFICATIONS: 1000,
  MAX_TEXT_CHARS: 5000
});

// Administradores precisam ser mantidos por uma pessoa autorizada e nunca pelo cliente.
const ADMINS = Object.freeze([
  "direcao@prof.educacao.sp.gov.br",
  "payolla@prof.educacao.sp.gov.br"
]);

const INITIAL_LINKS = Object.freeze({"altairt@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/15qbES1LRkT-PKmbjL6vG_CXgSrbcLFMg","tutoria":"https://docs.google.com/spreadsheets/d/1i1dCnk0e2Jfqr2Ex1UvroZtEwQLBczIVsB3Z7nDgBT4","agenda":"https://docs.google.com/spreadsheets/d/1-v6sP1CPsujdLmntOVoWFhLiEXnsufR4"},"adrianacebolli@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1nX8NSX3lRUPuG7lunhSLBCQkwnQqqNvS","tutoria":"https://docs.google.com/spreadsheets/d/1vLSK3-i-8M2BiVtKuK7fjrnbJ7eE4B3oUCLHXNPIFC0","agenda":"https://docs.google.com/spreadsheets/d/1NmdHlBLjX9AcL61ScmamX0pu8x3BoqR5"},"argenton@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1D9WJJ9PxF7WXmnjgEKtdu2pBiu6y12Fj","tutoria":"https://docs.google.com/spreadsheets/d/1k-VKaY_Lp1DwNESwzE1Zfdfbiut1y_kuKLUMpeBuGzU","agenda":"https://docs.google.com/spreadsheets/d/1AafBbofpuf6twG-IlBzYYztGTSabWx6_"},"cerniato@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1FD0Ov788l5D6oRcdWsx-hn2_zzW2nBIH","tutoria":"https://docs.google.com/spreadsheets/d/1aqx4NqON4nafBUcpSO9lEnKzB0GjW4FwGCLqMn-ymyU","agenda":"https://docs.google.com/spreadsheets/d/1jd7qUEd-bmth0jPc_hcPdicm4JMRAHjt"},"mariamolina@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1hOcbUOrgjSNu1TBSuHTFigWTk0y7Z37E","tutoria":"https://docs.google.com/spreadsheets/d/10bOnyIF7EvMKxke5iFRxT90GTbB5fRrMBU3npt8wfdc","agenda":"https://docs.google.com/spreadsheets/d/1H8FJFwLyC_PiM6dFEK1dtiQcvnd0oGUp"},"jeanbraga@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1hRvaqViQ_7s0QenG0yLbXPi0XIQw4QnC","tutoria":"https://docs.google.com/spreadsheets/d/10SdqBO7BteRJ_HuzyGGvsNSPrFOkJq-060DdUPyV7Mk","agenda":"https://docs.google.com/spreadsheets/d/1hZbAS4lSxXg38IbsC874VcdnSxvPTdGW"},"bgsousa@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1L2nbOvtJs7IsplJW5VZLlLt5bgzTANlF","tutoria":"https://docs.google.com/spreadsheets/d/1gOoW2bXPvWo2pI1OSVRpZuVqUBT9Fx68FK83De-eFhc","agenda":"https://docs.google.com/spreadsheets/d/1UBKfzBJT73PWvYk6EbqQ5KxvSzwQixsV"},"amancio@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1zvM2EH-IA6WcLnbEeWu1GzPZNClOOIG3","tutoria":"https://docs.google.com/spreadsheets/d/14xI06KNETvwmvaW290ONGRs3EJhYlvWnlG3H2eqkmPQ","agenda":"https://docs.google.com/spreadsheets/d/1KBM3jjRDr4oh_NGtBGKpU1e7FSp0z31E"},"catianatita@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1vVJANdbwSbhLezeEGT9cFszZdCSDDeU3","tutoria":"https://docs.google.com/spreadsheets/d/196A6BxNF65DITdJcUeoOtW7QJOKGejNwIROn21ks374","agenda":"https://docs.google.com/spreadsheets/d/14TXmVZfKt0bAxb-iRZeDW_uAx8owbDr8"},"clarissasouza@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1qA-JY2QHNnecEZtYuHwsqAVs67xFSkBz","tutoria":"https://docs.google.com/spreadsheets/d/1H8VH-k8bANBwQfec_JHILY0LoZO0W6OHvxofwqSXoTA","agenda":"https://docs.google.com/spreadsheets/d/1W3NRaHML3oDImTnTTFX0Qou9BlnUgXcy"},"julianokruger@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/18ISpLG9td3r3Ofgzh6kcbnYFHF7eB1rE","tutoria":"https://docs.google.com/spreadsheets/d/1T9ZzZkJ5D9GfoX0Vxs9ItKbrlHLEAmTfs5c0y-5FIz8","agenda":"https://docs.google.com/spreadsheets/d/1Wc69b9rUYe87TACD3OApYybcZUD-S3x_"},"bosqueti@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1zAoNtiMNpqNiH8Dj7u2j8Ml6Tbwh4bMw","tutoria":"https://docs.google.com/spreadsheets/d/1Og5q9a1szun4_v_6cPICl9hrPzIM6R_LBxvZcuinGAo","agenda":"https://docs.google.com/spreadsheets/d/1fqO-LYMMmiU3evvIsNEFy5jDMqFLAGHe"},"suzanaferreira@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1E9m4exacAx6MiHjX-IsUXeNITMUT30s1","tutoria":"https://docs.google.com/spreadsheets/d/174paYg1LuTYuQoTY43Igdj4Cj9JHWRnhvOhyBOrDR1s","agenda":"https://docs.google.com/spreadsheets/d/1H1yo0Dv41IXMOto8Z19v7-nN6KA9n8nO"},"emersongajardoni@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1kh01Bx0k-utjyG71bK6BmiKxo70nezNf","tutoria":"https://docs.google.com/spreadsheets/d/1oscopoLMK79sm-n1asH-dOudW_Po5tZusvwJ4AFMQoo","agenda":"https://docs.google.com/spreadsheets/d/1CCqQzzZSgS1IlqDbZg1yL60Y1g3PNDUk"},"jqueiroz@prof.educacao.sp.gov.br":{"pasta":"https://drive.google.com/drive/folders/1P-1E7ey7dlNrZlUAdKKtCTbIcBAhpgWt","tutoria":"https://docs.google.com/spreadsheets/d/1M4azNbU4Kxav6QPLQEhJmpAnutNGyPmcnJazcr_-qNg","agenda":"https://docs.google.com/spreadsheets/d/1g11caetJxzh2k_ANwKM7iXUvMXEvg2CN"},"payolla@prof.educacao.sp.gov.br":{"pasta":"","tutoria":"","agenda":""}});

const DATA_KEYS = Object.freeze([
  "jma_links",
  "jma_notifs",
  "jma_recsMat",
  "jma_cfgMat",
  "jma_recs",
  "jma_cfg"
]);

function doPost(e) {
  let lock = null;
  let lockAcquired = false;
  try {
    const rawBody = e && e.postData && e.postData.contents;
    if (typeof rawBody !== "string" || rawBody.length === 0 || rawBody.length > CONFIG.MAX_REQUEST_CHARS) {
      return jsonError_("invalid_request", "Requisição inválida ou acima do limite.");
    }

    let request;
    try {
      request = JSON.parse(rawBody);
    } catch (_) {
      return jsonError_("invalid_json", "Formato de requisição inválido.");
    }

    const identity = validarTokenGoogle_(request.token);
    if (!identity) return jsonError_("unauthenticated", "Sessão inválida. Entre novamente com sua conta institucional.");
    if (!isAuthorized_(identity.email)) return jsonError_("forbidden", "Esta conta não está autorizada para este sistema.");

    const isAdmin = isAdmin_(identity.email);
    const action = String(request.acao || "");

    if (action === "sessao") {
      return jsonOk_({
        email: identity.email,
        name: identity.name,
        role: isAdmin ? "admin" : "staff"
      });
    }

    const key = String(request.chave || "");
    if (DATA_KEYS.indexOf(key) === -1) return jsonError_("invalid_key", "Chave de dados não permitida.");

    if (action === "ler") {
      const value = readStoredValue_(key);
      const scoped = scopeRead_(key, value, identity.email, isAdmin);
      auditEvent_(identity.email, isAdmin ? "admin_read" : "staff_read", key);
      return jsonOk_(scoped);
    }

    if (action !== "salvar") return jsonError_("invalid_action", "Ação não permitida.");

    const submitted = parseSubmittedValue_(request.valor);
    enforceWritePermission_(key, isAdmin);

    // Serializa apenas gravações. A autenticação e a leitura não prendem o lock global.
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    lockAcquired = true;

    const current = readStoredValue_(key);
    const updated = buildAuthorizedWrite_(key, current, submitted, identity, isAdmin);
    writeStoredValue_(key, updated);
    SpreadsheetApp.flush();
    auditEvent_(identity.email, isAdmin ? "admin_write" : "staff_write", key);
    return jsonOk_({ saved: true });
  } catch (err) {
    // Não devolve mensagens internas, conteúdo de planilha, tokens ou rastros ao navegador.
    return jsonError_("request_failed", "Não foi possível concluir a operação. Verifique a sessão e tente novamente.");
  } finally {
    if (lockAcquired && lock) lock.releaseLock();
  }
}

function doGet() {
  // Não expõe dados, nomes de planilhas ou estado de autenticação.
  return jsonOk_({ service: "Intranet API" });
}

function validarTokenGoogle_(idToken) {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 10000) return null;
  try {
    const url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken);
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: false });
    if (response.getResponseCode() !== 200) return null;

    const payload = JSON.parse(response.getContentText());
    const issuerValid = payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com";
    const audienceValid = payload.aud === CONFIG.GOOGLE_CLIENT_ID;
    const authorizedPartyValid = !payload.azp || payload.azp === CONFIG.GOOGLE_CLIENT_ID;
    const expiration = Number(payload.exp);
    const notExpired = Number.isFinite(expiration) && expiration > Math.floor(Date.now() / 1000);
    const verifiedEmail = payload.email_verified === true || payload.email_verified === "true";
    const email = normalizeEmail_(payload.email);
    const correctDomain = email.endsWith("@" + CONFIG.ALLOWED_EMAIL_DOMAIN);

    if (!issuerValid || !audienceValid || !authorizedPartyValid || !notExpired || !verifiedEmail || !correctDomain) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;

    return { email: email, name: safeName_(payload.name), sub: payload.sub };
  } catch (_) {
    return null;
  }
}

function isAuthorized_(email) {
  const normalized = normalizeEmail_(email);
  return isAdmin_(normalized) || getAuthorizedStaff_().indexOf(normalized) !== -1;
}

function isAdmin_(email) {
  return ADMINS.indexOf(normalizeEmail_(email)) !== -1;
}

function getAuthorizedStaff_() {
  const raw = PropertiesService.getScriptProperties().getProperty(CONFIG.STAFF_ALLOWLIST_PROPERTY) || "";
  return raw.split(/[\n,;]+/).map(normalizeEmail_).filter(Boolean);
}

function enforceWritePermission_(key, isAdmin) {
  const adminOnly = ["jma_links", "jma_notifs", "jma_cfg", "jma_cfgMat"];
  if (adminOnly.indexOf(key) !== -1 && !isAdmin) throw new Error("forbidden");
  if (["jma_recs", "jma_recsMat"].indexOf(key) === -1 && adminOnly.indexOf(key) === -1) {
    throw new Error("invalid_key");
  }
}

function scopeRead_(key, value, email, isAdmin) {
  if (isAdmin) return value;
  if (key === "jma_links") {
    const links = isPlainObject_(value) ? value : {};
    return links[email] ? { [email]: links[email] } : {};
  }
  if (key === "jma_notifs") {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && (item.para === "todos" || normalizeEmail_(item.para) === email));
  }
  if (key === "jma_recs") {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && normalizeEmail_(item.authorEmail) === email);
  }
  if (key === "jma_recsMat") {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && normalizeEmail_(item.email) === email);
  }
  if (key === "jma_cfg") {
    const cfg = isPlainObject_(value) ? value : {};
    return {
      escola: boundedString_(cfg.escola, 200),
      vice: boundedString_(cfg.vice, 200),
      profs: boundedString_(cfg.profs, 10000),
      tipos: boundedString_(cfg.tipos, 10000),
      roster: scopeRoster_(cfg.roster, email)
    };
  }
  return value;
}

function scopeRoster_(rawRoster, email) {
  const roster = boundedString_(rawRoster, 30000);
  const rawScopes = PropertiesService.getScriptProperties().getProperty(CONFIG.ROSTER_SCOPES_PROPERTY) || "";
  let scopes;
  try { scopes = JSON.parse(rawScopes); } catch (_) { return ""; }
  if (!isPlainObject_(scopes) || !Array.isArray(scopes[email])) return "";
  const allowed = new Set(scopes[email].filter(item => typeof item === "string").map(item => item.trim()));
  if (allowed.has("*")) return roster;
  return roster.split(/\r?\n/).filter(line => {
    const columns = line.split("|");
    if (columns.length < 3) return false;
    return allowed.has(columns[0].trim() + "|" + columns[1].trim());
  }).join("\n");
}

function buildAuthorizedWrite_(key, current, submitted, identity, isAdmin) {
  if (key === "jma_recs") return writeOccurrences_(current, submitted, identity, isAdmin);
  if (key === "jma_recsMat") return writeMaterialRequests_(current, submitted, identity, isAdmin);
  if (!isAdmin) throw new Error("forbidden");

  if (key === "jma_links") return validateLinks_(submitted);
  if (key === "jma_notifs") return validateNotifications_(submitted);
  if (key === "jma_cfg") return validateOccurrenceConfig_(submitted);
  if (key === "jma_cfgMat") return validateMaterialConfig_(submitted);
  throw new Error("invalid_key");
}

function writeOccurrences_(current, submitted, identity, isAdmin) {
  if (!Array.isArray(submitted) || submitted.length > CONFIG.MAX_RECORDS_PER_KEY) throw new Error("invalid_data");
  const existing = Array.isArray(current) ? current : [];
  if (isAdmin) return submitted.map(item => sanitizeOccurrence_(item, null, false));

  const existingById = indexById_(existing);
  const additions = [];
  const seen = Object.create(null);
  submitted.forEach(item => {
    const id = validRecordId_(item && item.id);
    if (seen[id]) throw new Error("duplicate_id");
    seen[id] = true;
    const old = existingById[id];
    if (old) {
      if (normalizeEmail_(old.authorEmail) !== identity.email) throw new Error("forbidden_record");
      // Professores não podem modificar ou apagar registros existentes nem o parecer da direção.
      return;
    }
    if (Object.prototype.hasOwnProperty.call(existingById, id)) throw new Error("duplicate_id");
    additions.push(sanitizeOccurrence_(item, identity, true));
  });
  return existing.concat(additions);
}

function writeMaterialRequests_(current, submitted, identity, isAdmin) {
  if (!Array.isArray(submitted) || submitted.length > CONFIG.MAX_RECORDS_PER_KEY) throw new Error("invalid_data");
  const existing = Array.isArray(current) ? current : [];
  if (isAdmin) return submitted.map(item => sanitizeMaterialRequest_(item, null, false));

  const existingById = indexById_(existing);
  const incomingById = Object.create(null);
  const additions = [];
  submitted.forEach(item => {
    const id = validRecordId_(item && item.id);
    if (incomingById[id]) throw new Error("duplicate_id");
    incomingById[id] = true;
    const old = existingById[id];
    if (old) {
      if (normalizeEmail_(old.email) !== identity.email) throw new Error("forbidden_record");
      // Campos/status existentes são controlados pelo servidor e pela direção; ignorar alterações do cliente.
      return;
    }
    if (Object.prototype.hasOwnProperty.call(existingById, id)) throw new Error("duplicate_id");
    additions.push(sanitizeMaterialRequest_(item, identity, true));
  });

  const retained = existing.filter(item => {
    if (!item || normalizeEmail_(item.email) !== identity.email) return true;
    const id = validRecordId_(item.id);
    // A única exclusão permitida a um professor é cancelar pedido próprio ainda não processado.
    return Boolean(incomingById[id]) || item.status !== "Nova";
  });
  return retained.concat(additions);
}

function sanitizeOccurrence_(item, identity, forceOwner) {
  if (!isPlainObject_(item)) throw new Error("invalid_record");
  const gravities = ["Leve", "Média", "Grave"];
  const statuses = ["Nova", "Atendida"];
  const id = validRecordId_(item.id);
  const authorEmail = forceOwner ? identity.email : normalizeEmail_(item.authorEmail);
  if (!forceOwner && !isAuthorized_(authorEmail)) throw new Error("invalid_owner");
  const studentNames = Array.isArray(item.alunos) ? item.alunos.slice(0, 20).map(value => boundedString_(value, 200)) : [];
  const dir = isPlainObject_(item.dir) ? item.dir : {};
  const measures = Array.isArray(dir.meds) ? dir.meds.slice(0, 20).map(value => boundedString_(value, 200)) : [];
  return {
    id: id,
    num: boundedString_(item.num, 40),
    data: boundedString_(item.data, 40),
    prof: forceOwner ? identity.name : boundedString_(item.prof, 200),
    authorEmail: authorEmail,
    serie: boundedString_(item.serie, 100),
    turma: boundedString_(item.turma, 100),
    alunos: studentNames,
    tipo: boundedString_(item.tipo, 200),
    grav: gravities.indexOf(item.grav) !== -1 ? item.grav : "Leve",
    desc: boundedString_(item.desc, CONFIG.MAX_TEXT_CHARS),
    status: forceOwner ? "Nova" : (statuses.indexOf(item.status) !== -1 ? item.status : "Nova"),
    dir: forceOwner ? { meds: [], obs: "", dt: "" } : {
      meds: measures,
      obs: boundedString_(dir.obs, 2000),
      dt: boundedString_(dir.dt, 40)
    }
  };
}

function sanitizeMaterialRequest_(item, identity, forceOwner) {
  if (!isPlainObject_(item)) throw new Error("invalid_record");
  const statuses = ["Nova", "Separada", "Entregue"];
  const id = validRecordId_(item.id);
  const email = forceOwner ? identity.email : normalizeEmail_(item.email);
  if (!forceOwner && !isAuthorized_(email)) throw new Error("invalid_owner");
  const items = Array.isArray(item.itens) ? item.itens.slice(0, 100).map(entry => {
    const value = isPlainObject_(entry) ? entry : {};
    const quantity = Number(value.qtd);
    return {
      nome: boundedString_(value.nome, 200),
      qtd: Number.isFinite(quantity) ? Math.max(0, Math.min(100000, Math.trunc(quantity))) : 0,
      cor: boundedString_(value.cor, 200),
      especial: value.especial === true
    };
  }) : [];
  return {
    id: id,
    data: boundedString_(item.data, 40),
    prof: forceOwner ? identity.name : boundedString_(item.prof, 200),
    email: email,
    itens: items,
    obs: boundedString_(item.obs, 2000),
    status: forceOwner ? "Nova" : (statuses.indexOf(item.status) !== -1 ? item.status : "Nova")
  };
}

function validateLinks_(value) {
  if (!isPlainObject_(value)) throw new Error("invalid_data");
  const allowlist = getAuthorizedStaff_().concat(ADMINS);
  const clean = {};
  Object.keys(value).slice(0, 500).forEach(email => {
    const normalized = normalizeEmail_(email);
    if (allowlist.indexOf(normalized) === -1) return;
    const entry = isPlainObject_(value[email]) ? value[email] : {};
    clean[normalized] = {
      pasta: validateGoogleLink_(entry.pasta),
      tutoria: validateGoogleLink_(entry.tutoria),
      agenda: validateGoogleLink_(entry.agenda)
    };
  });
  return clean;
}

function validateGoogleLink_(value) {
  const raw = boundedString_(value, 2048).trim();
  if (!raw) return "";
  const allowed = /^https:\/\/(?:drive\.google\.com|docs\.google\.com)(?::443)?(?:\/|[?#]|$)/i;
  if (!allowed.test(raw) || /[\\\s]/.test(raw)) throw new Error("invalid_link");
  return raw;
}

function validateNotifications_(value) {
  if (!Array.isArray(value) || value.length > CONFIG.MAX_NOTIFICATIONS) throw new Error("invalid_notifications");
  const recipients = getAuthorizedStaff_().concat(ADMINS);
  return value.map(item => {
    if (!isPlainObject_(item)) throw new Error("invalid_notification");
    const target = item.para === "todos" ? "todos" : normalizeEmail_(item.para);
    if (target !== "todos" && recipients.indexOf(target) === -1) throw new Error("invalid_recipient");
    return {
      id: validRecordId_(item.id),
      para: target,
      texto: boundedString_(item.texto, 1000),
      apagado: item.apagado === true,
      criadoEm: boundedString_(item.criadoEm, 40)
    };
  });
}

function validateOccurrenceConfig_(value) {
  if (!isPlainObject_(value)) throw new Error("invalid_config");
  return {
    escola: boundedString_(value.escola, 200),
    vice: boundedString_(value.vice, 200),
    admins: ADMINS.join("\n"),
    roster: boundedString_(value.roster, 30000),
    profs: boundedString_(value.profs, 10000),
    tipos: boundedString_(value.tipos, 10000)
  };
}

function validateMaterialConfig_(value) {
  if (!isPlainObject_(value)) throw new Error("invalid_config");
  return { materiais: boundedString_(value.materiais, 30000) };
}

function readStoredValue_(key) {
  const sheet = getDatabaseSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return defaultValue_(key);
  const rows = sheet.getRange(1, 1, lastRow, 2).getValues();
  const matches = [];
  rows.forEach((row, index) => { if (String(row[0]) === key) matches.push({ row: index + 1, value: row[1] }); });
  if (matches.length > 1) throw new Error("duplicate_storage_key");
  if (!matches.length || matches[0].value === "" || matches[0].value === null) return defaultValue_(key);
  try {
    return typeof matches[0].value === "string" ? JSON.parse(matches[0].value) : matches[0].value;
  } catch (_) {
    throw new Error("invalid_stored_data");
  }
}

function writeStoredValue_(key, value) {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string" || serialized.length > CONFIG.MAX_CELL_CHARS) throw new Error("dataset_too_large");
  const sheet = getDatabaseSheet_();
  const lastRow = sheet.getLastRow();
  const rows = lastRow ? sheet.getRange(1, 1, lastRow, 2).getValues() : [];
  const matches = [];
  rows.forEach((row, index) => { if (String(row[0]) === key) matches.push(index + 1); });
  if (matches.length > 1) throw new Error("duplicate_storage_key");
  if (matches.length === 1) {
    sheet.getRange(matches[0], 2).setValue(serialized);
  } else {
    sheet.appendRow([key, serialized]);
  }
}

function defaultValue_(key) {
  if (key === "jma_recs" || key === "jma_recsMat" || key === "jma_notifs") return [];
  if (key === "jma_links") return JSON.parse(JSON.stringify(INITIAL_LINKS));
  if (key === "jma_cfg") return { escola: "", vice: "", admins: ADMINS.join("\n"), roster: "", profs: "", tipos: "" };
  if (key === "jma_cfgMat") return { materiais: "" };
  return null;
}

function parseSubmittedValue_(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > CONFIG.MAX_CELL_CHARS) throw new Error("invalid_data");
  try {
    return JSON.parse(value);
  } catch (_) {
    throw new Error("invalid_json");
  }
}

function getDatabaseSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("database_unavailable");
  let sheet = spreadsheet.getSheetByName(CONFIG.DATABASE_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.DATABASE_SHEET);
  return sheet;
}

function auditEvent_(email, action, key) {
  // Guarda apenas metadados mínimos; nunca armazena token, texto de ocorrência ou nomes de alunos.
  // A aba AUDIT deve permanecer acessível somente a administradores autorizados.
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("AUDIT");
    if (!sheet) sheet = spreadsheet.insertSheet("AUDIT");
    if (sheet.getLastRow() === 0) sheet.appendRow(["timestamp_utc", "email", "role_action", "data_key"]);
    sheet.appendRow([new Date().toISOString(), email, action, key]);
  } catch (_) {
    // Não devolve detalhes internos nem conteúdo sensível ao cliente se a trilha estiver indisponível.
  }
}

function indexById_(records) {
  const result = Object.create(null);
  records.forEach(record => {
    if (!record || typeof record !== "object") return;
    const id = validRecordId_(record.id);
    if (Object.prototype.hasOwnProperty.call(result, id)) throw new Error("duplicate_id");
    result[id] = record;
  });
  return result;
}

function validRecordId_(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 0) throw new Error("invalid_id");
  return String(id);
}

function normalizeEmail_(value) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+$/.test(email) ? email : "";
}

function safeName_(value) {
  if (typeof value !== "string") return "Equipe escolar";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200) || "Equipe escolar";
}

function boundedString_(value, maxChars) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, maxChars);
}

function isPlainObject_(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonOk_(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data })).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(code, message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { code: code, message: message } })).setMimeType(ContentService.MimeType.JSON);
}
