document.addEventListener('DOMContentLoaded', function() {
    
    let currentUser = null;
    let currentRoom = 'geral';
    let unsubscribeMessages = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const mainContent = document.getElementById('main-content');
    const userInfoSpan = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    if (typeof auth === 'undefined') {
        console.error('Firebase Auth não foi carregado corretamente!');
        mainContent.innerHTML = '<div style="color:red; text-align:center; padding:20px;">Erro: Firebase não configurado corretamente.</div>';
        return;
    }

    // Navegação
    document.querySelectorAll('nav a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);
        });
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            userInfoSpan.style.display = 'inline';
            userInfoSpan.textContent = `Olá, ${user.displayName || user.email.split('@')[0]}`;
            logoutBtn.style.display = 'inline';
            showPage('chat');
        } else {
            userInfoSpan.style.display = 'none';
            logoutBtn.style.display = 'none';
            showPage('login');
        }
    });

    function showPage(page) {
        if (page === 'chat' && !currentUser) {
            page = 'login';
        }

        if (unsubscribeMessages) {
            unsubscribeMessages();
            unsubscribeMessages = null;
        }

        switch (page) {
            case 'login':
                renderLogin();
                break;
            case 'chat':
                renderChat();
                break;
            case 'devs':
                renderDevs();
                break;
            case 'techs':
                renderTechs();
                break;
            default:
                renderLogin();
        }
    }

    function renderLogin() {
        mainContent.innerHTML = `
            <div class="login-container">
                <h2>Entrar no CampusChat</h2>
                <input type="text" id="username" placeholder="Nome de usuário" autocomplete="off">
                <input type="password" id="password" placeholder="Senha">
                <button id="loginBtn">Entrar</button>
                <p class="error" id="loginError"></p>
                <div style="margin-top:20px; font-size:12px; color:#8e8e8e; text-align:left;">
                    <p><strong>👤 Usuários para teste:</strong></p>
                    <p>• mimmarcelo / Teste123</p>
                    <p>• aluno1 / senha123</p>
                    <p>• aluno2 / senha123</p>
                    <p>• aluno3 / senha123</p>
                    <p>• aluno4 / senha123</p>
                </div>
            </div>
        `;
    
        document.getElementById('loginBtn').addEventListener('click', () => {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const errorEl = document.getElementById('loginError');
            
            if (!username || !password) {
                errorEl.textContent = 'Preencha usuário e senha.';
                return;
            }
            
            
            
            // Constrói o email completo
            const email = username;
            
            console.log('Tentando login:');
            console.log('Usuário digitado:', username);
            console.log('Email gerado:', email);
            console.log('Senha:', password);
            
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Login成功!', userCredential.user.email);
                    errorEl.textContent = '';
                })
                .catch(error => {
                    console.error('Erro no login:', error.code, error.message);
                    
                    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        errorEl.textContent = 'Usuário ou senha inválidos.';
                        
                        // Dica específica para o mimmarcelo
                        if (cleanUsername === 'mimmarcelo') {
                            errorEl.innerHTML = 'Usuário ou senha inválidos.<br>Lembre-se: senha do mimmarcelo é <strong>Teste123</strong> (com T maiúsculo)';
                        }
                    } else if (error.code === 'auth/invalid-email') {
                        errorEl.textContent = 'Email inválido. O usuário deve conter apenas letras e números.';
                    } else if (error.code === 'auth/too-many-requests') {
                        errorEl.textContent = 'Muitas tentativas. Tente mais tarde.';
                    } else if (error.code === 'auth/network-request-failed') {
                        errorEl.textContent = 'Erro de rede. Verifique sua conexão.';
                    } else {
                        errorEl.textContent = 'Erro: ' + error.message;
                    }
                });
        });
    }

    function renderChat() {
        mainContent.innerHTML = `
            <div class="chat-container">
                <div class="chat-sidebar">
                    <h3>Conversas</h3>
                    <ul id="roomList">
                        <li data-room="geral" class="active">💬 Geral</li>
                        <li data-room="offtopic">🗣️ Off-Topic</li>
                    </ul>
                </div>
                <div class="chat-main">
                    <div class="chat-messages" id="chatMessages">
                        <div style="text-align:center; padding:20px;">Carregando mensagens...</div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="messageInput" placeholder="Digite sua mensagem..." disabled>
                        <button id="sendBtn" disabled>Enviar</button>
                    </div>
                </div>
            </div>
        `;

        document.querySelectorAll('#roomList li').forEach(li => {
            li.addEventListener('click', () => {
                document.querySelector('#roomList li.active')?.classList.remove('active');
                li.classList.add('active');
                currentRoom = li.dataset.room;
                loadMessages(currentRoom);
            });
        });

        document.getElementById('sendBtn').addEventListener('click', sendMessage);
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        loadMessages(currentRoom);
    }

    function sendMessage() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const text = input.value.trim();
        
        if (!text || !currentUser) return;

        // Desabilita inputs enquanto envia
        input.disabled = true;
        sendBtn.disabled = true;

        db.collection('messages').add({
            room: currentRoom,
            text: text,
            userId: currentUser.uid,
            username: currentUser.displayName || currentUser.email.split('@')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            input.value = '';
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        })
        .catch(err => {
            console.error('Erro ao enviar:', err);
            input.disabled = false;
            sendBtn.disabled = false;
            
            if (err.code === 'permission-denied') {
                alert('Permissão negada. Verifique as regras do Firestore.');
            } else if (err.code === 'unavailable') {
                alert('Serviço indisponível. Tente novamente.');
            } else {
                alert('Erro ao enviar mensagem: ' + err.message);
            }
        });
    }

    function loadMessages(room) {
        if (unsubscribeMessages) unsubscribeMessages();

        const messagesDiv = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '<div style="text-align:center; padding:20px;">Carregando mensagens...</div>';

        // Desabilita inputs enquanto carrega
        if (messageInput) messageInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        unsubscribeMessages = db.collection('messages')
            .where('room', '==', room)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                messagesDiv.innerHTML = '';
                
                // Habilita inputs quando as mensagens carregam
                if (messageInput) messageInput.disabled = false;
                if (sendBtn) sendBtn.disabled = false;
                
                if (snapshot.empty) {
                    messagesDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#8e8e8e;">Nenhuma mensagem ainda. Seja o primeiro a enviar!</div>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const msgDiv = document.createElement('div');
                    msgDiv.classList.add('message');
                    
                    if (msg.userId === currentUser.uid) {
                        msgDiv.classList.add('own');
                    }
                    
                    let timeStr = '';
                    if (msg.timestamp) {
                        try {
                            const date = msg.timestamp.toDate();
                            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (e) {
                            timeStr = 'Agora';
                        }
                    }
                    
                    msgDiv.innerHTML = `
                        <div class="username">${msg.username || 'Usuário'}</div>
                        <div>${msg.text}</div>
                        <div class="time">${timeStr}</div>
                    `;
                    messagesDiv.appendChild(msgDiv);
                });
                
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, error => {
                console.error('Erro ao carregar mensagens:', error);
                
                if (error.code === 'failed-precondition' && error.message.includes('index')) {
                    messagesDiv.innerHTML = `
                        <div style="color:#f5a623; text-align:center; padding:20px;">
                            <strong>⚠️ Índice necessário</strong><br><br>
                            O Firestore precisa de um índice. Clique no link abaixo:<br><br>
                            <a href="${error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)}" target="_blank" style="color:#0095f6;">
                                Criar índice automático
                            </a>
                        </div>
                    `;
                } else {
                    messagesDiv.innerHTML = '<div style="color:#ed4956; text-align:center; padding:20px;">Erro ao carregar mensagens: ' + error.message + '</div>';
                }
            });
    }

    function renderDevs() {
        mainContent.innerHTML = `
            <div class="devs-container">
                <h2>👥 Desenvolvedores</h2>
                <div class="devs-list">
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=1" alt="Foto">
                        <h4>Seu Nome</h4>
                        <p>Front-end & Firebase</p>
                    </div>
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=2" alt="Foto">
                        <h4>João Silva</h4>
                        <p>Interface</p>
                    </div>
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=3" alt="Foto">
                        <h4>Maria Souza</h4>
                        <p>Documentação</p>
                    </div>
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=4" alt="Foto">
                        <h4>José Santos</h4>
                        <p>Testes</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTechs() {
        mainContent.innerHTML = `
            <div class="techs-container">
                <h2>⚙️ Tecnologias & Referências</h2>
                <ul class="techs-list">
                    <li><i class="fab fa-html5"></i> HTML5</li>
                    <li><i class="fab fa-css3-alt"></i> CSS3 (Flexbox, design responsivo)</li>
                    <li><i class="fab fa-js"></i> JavaScript (ES6+)</li>
                    <li><i class="fas fa-fire"></i> Firebase (Authentication & Firestore)</li>
                    <li><i class="fas fa-font-awesome"></i> Font Awesome (ícones)</li>
                    <li><i class="fas fa-palette"></i> Design inspirado no Instagram</li>
                </ul>
                <p style="margin-top:20px;">
                    📚 Referências: 
                    <a href="https://firebase.google.com/docs" target="_blank">Firebase Docs</a>, 
                    <a href="https://developer.mozilla.org/" target="_blank">MDN</a>
                </p>
            </div>
        `;
    }
});