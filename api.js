const URL_DO_GAS = "https://script.google.com/macros/s/AKfycbx3Ae9UahlaOkky0jrolA4RS6o1uMmf_h7v1eEctZjghLHglAjrLZqzetYVI5-zGXdrpg/exec";

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch(e) {
        return null;
    }
}

function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        return null;
    }
}

function getAuthToken() {
    const user = getAuthUser();
    return user ? user.token : null;
}

function saveAuthUser(credentialPayload, tokenString) {
    const user = {
        name: credentialPayload.name,
        email: credentialPayload.email.toLowerCase(),
        picture: credentialPayload.picture,
        token: tokenString
    };
    localStorage.setItem('user', JSON.stringify(user));
    return user;
}

function logoutUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('jma_notifs_cache');
    localStorage.removeItem('jma_read_notifs');
}

async function bdSalvar(chave, valor) {
    const user = getAuthUser();
    if (!user || !user.email) {
        alert("Sessão expirada. Faça login novamente para salvar.");
        return false;
    }

    try {
        const resposta = await fetch(URL_DO_GAS, {
            method: "POST",
            body: JSON.stringify({ 
                acao: "salvar", 
                chave: chave, 
                valor: JSON.stringify(valor),
                email: user.email,
                token: user.token
            })
        });
        
        const resultado = await resposta.json();
        if (resultado.erro) {
            console.error("Erro no servidor:", resultado.erro);
            alert("Erro ao salvar: " + resultado.erro);
            return false; 
        }
        return true;
    } catch (erro) {
        console.error("Falha na requisição:", erro);
        alert("Falha de conexão com o servidor.");
        return false;
    }
}

async function bdLer(chave) {
    const user = getAuthUser();
    if (!user || !user.email) return null;

    try {
        const resposta = await fetch(URL_DO_GAS, {
            method: "POST",
            body: JSON.stringify({ 
                acao: "ler", 
                chave: chave,
                email: user.email,
                token: user.token
            })
        });
        
        const resultado = await resposta.json();
        if (resultado.erro) return null;
        return resultado;
    } catch (erro) {
        console.error("Falha de rede ao tentar ler dados:", erro);
        return null;
    }
}

async function obterDadosDashboard() {
    const user = getAuthUser();
    if (!user || !user.email) return null;

    try {
        const resposta = await fetch(URL_DO_GAS, {
            method: "POST",
            body: JSON.stringify({ 
                acao: "obter_dashboard", 
                email: user.email,
                token: user.token
            })
        });
        
        const resultado = await resposta.json();
        if (resultado.erro) {
            console.error("Erro na autorização:", resultado.erro);
            return null;
        }
        return resultado;
    } catch (erro) {
        console.error("Erro ao comunicar com o servidor:", erro);
        return null;
    }
}
