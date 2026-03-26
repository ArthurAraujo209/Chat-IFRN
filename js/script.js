document.addEventListener('DOMContentLoaded', function() {
    // ========== VARIÁVEIS GLOBAIS ==========
    let currentUser = null;
    let currentRoomId = null;
    let unsubscribeMessages = null;
    let allUsers = [];
    let allRooms = [];

    // Elementos DOM
    const mainContent = document.getElementById('main-content');
    const userInfoSpan = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    // Verifica Firebase
    if (typeof auth === 'undefined') {
        console.error('Firebase Auth não carregado!');
        mainContent.innerHTML = '<div style="color:red; text-align:center;">Erro: Firebase não configurado.</div>';
        return;
    }

    // ========== NAVEGAÇÃO ==========
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

    // ========== OBSERVADOR DE AUTENTICAÇÃO ==========
    auth.onAuthStateChanged(async user => {
        currentUser = user;
        if (user) {
            // Garante que o perfil exista no Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                const defaultName = user.email.split('@')[0];
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: defaultName,
                    photoURL: `https://ui-avatars.com/api/?background=0095f6&color=fff&size=100&name=${encodeURIComponent(defaultName)}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                // Atualiza displayName no Auth
                await user.updateProfile({ displayName: defaultName });
            }
            const userData = (await db.collection('users').doc(user.uid).get()).data();
            userInfoSpan.textContent = `Olá, ${userData.displayName || user.email.split('@')[0]}`;
            userInfoSpan.style.display = 'inline';
            logoutBtn.style.display = 'inline';
            showPage('chat');
        } else {
            userInfoSpan.style.display = 'none';
            logoutBtn.style.display = 'none';
            showPage('login');
        }
    });

    // ========== FUNÇÃO PARA TROCAR DE PÁGINA ==========
    function showPage(page) {
        if (page === 'chat' && !currentUser) page = 'login';
        if (unsubscribeMessages) unsubscribeMessages();

        switch (page) {
            case 'login': renderLogin(); break;
            case 'signup': renderSignup(); break;
            case 'chat': renderChat(); break;
            case 'profile': renderProfile(); break;
            case 'devs': renderDevs(); break;
            case 'techs': renderTechs(); break;
            default: renderLogin();
        }
    }

    // ========== PÁGINA DE LOGIN ==========
    function renderLogin() {
        mainContent.innerHTML = `
            <div class="login-container">
                <h2>Entrar no CampusChat</h2>
                <input type="email" id="email" placeholder="E-mail" autocomplete="off">
                <input type="password" id="password" placeholder="Senha">
                <button id="loginBtn">Entrar</button>
                <p class="error" id="loginError"></p>
                <p style="margin-top:15px;">Não tem conta? <a href="#" id="goToSignup" style="color:#0095f6;">Cadastre-se</a></p>
                <div style="margin-top:20px; font-size:12px; color:#8e8e8e;">
                    <p><strong>Usuários de teste:</strong></p>
                    <p>mimmarcelo@chat.local / Teste123</p>
                    <p>aluno1@chat.local / senha123</p>
                </div>
            </div>
        `;
        document.getElementById('loginBtn').addEventListener('click', () => {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const errorEl = document.getElementById('loginError');
            if (!email || !password) {
                errorEl.textContent = 'Preencha e-mail e senha.';
                return;
            }
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    errorEl.textContent = 'E-mail ou senha inválidos.';
                });
        });
        document.getElementById('goToSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('signup');
        });
    }
    
    function renderSignup() {
        mainContent.innerHTML = `
            <div class="login-container">
                <h2>Criar Conta</h2>
                <input type="email" id="email" placeholder="E-mail" autocomplete="off">
                <input type="text" id="displayName" placeholder="Nome de exibição" autocomplete="off">
                <input type="password" id="password" placeholder="Senha">
                <input type="password" id="confirmPassword" placeholder="Confirmar senha">
                <button id="signupBtn">Cadastrar</button>
                <p class="error" id="signupError"></p>
                <p style="margin-top:15px;">Já tem conta? <a href="#" id="goToLogin" style="color:#0095f6;">Faça login</a></p>
            </div>
        `;
        document.getElementById('signupBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value.trim();
            const displayName = document.getElementById('displayName').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const errorEl = document.getElementById('signupError');
            
            if (!email || !displayName || !password) {
                errorEl.textContent = 'Preencha todos os campos.';
                return;
            }
            if (password !== confirm) {
                errorEl.textContent = 'As senhas não coincidem.';
                return;
            }
            if (password.length < 6) {
                errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                return;
            }
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: displayName });
                await db.collection('users').doc(userCredential.user.uid).set({
                    uid: userCredential.user.uid,
                    email: email,
                    displayName: displayName,
                    photoURL: `https://ui-avatars.com/api/?background=0095f6&color=fff&size=100&name=${encodeURIComponent(displayName)}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    errorEl.textContent = 'E-mail já cadastrado.';
                } else {
                    errorEl.textContent = 'Erro ao cadastrar: ' + error.message;
                }
            }
        });
        document.getElementById('goToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('login');
        });
    }

    // ========== PÁGINA DO CHAT (com listas e busca) ==========
    async function renderChat() {
        await loadUsers();
        await loadRooms();

        mainContent.innerHTML = `
            <div class="chat-container" style="display:flex; height:70vh;">
                <div class="chat-sidebar" style="width:280px; border-right:1px solid #dbdbdb; overflow-y:auto;">
                    <div style="padding:15px; border-bottom:1px solid #dbdbdb;">
                        <button id="newRoomBtn" style="width:100%; background:#0095f6; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer;">+ Nova Sala</button>
                    </div>
                    <div style="padding:15px; border-bottom:1px solid #dbdbdb;">
                        <strong>Salas Públicas</strong>
                        <ul id="publicRoomsList" style="list-style:none; margin-top:10px;"></ul>
                    </div>
                    <div style="padding:15px; border-bottom:1px solid #dbdbdb;">
                        <strong>Conversas Privadas</strong>
                        <ul id="privateRoomsList" style="list-style:none; margin-top:10px;"></ul>
                    </div>
                    <div style="padding:15px;">
                        <strong>Usuários</strong>
                        <input type="text" id="searchUsers" placeholder="Buscar..." style="width:100%; padding:8px; margin:5px 0;">
                        <ul id="usersList" style="list-style:none; max-height:200px; overflow-y:auto;"></ul>
                    </div>
                </div>
                <div class="chat-main" style="flex:1; display:flex; flex-direction:column;">
                    <div id="chatHeader" style="padding:15px; border-bottom:1px solid #dbdbdb; background:white;">
                        <span id="currentRoomName">Selecione uma conversa</span>
                    </div>
                    <div class="chat-messages" id="chatMessages" style="flex:1; overflow-y:auto; padding:20px;"></div>
                    <div class="chat-input" style="display:flex; padding:15px; border-top:1px solid #dbdbdb;">
                        <input type="text" id="messageInput" placeholder="Digite sua mensagem..." disabled style="flex:1; padding:10px; border-radius:20px; border:1px solid #dbdbdb;">
                        <button id="sendBtn" disabled style="margin-left:10px; background:#0095f6; color:white; border:none; border-radius:20px; padding:0 20px;">Enviar</button>
                    </div>
                </div>
            </div>
        `;

        renderPublicRooms();
        renderPrivateRooms();
        renderUsersList();

        document.getElementById('newRoomBtn').addEventListener('click', () => {
            const roomName = prompt('Digite o nome da nova sala:');
            if (roomName && roomName.trim()) createPublicRoom(roomName.trim());
        });

        document.getElementById('searchUsers').addEventListener('input', (e) => {
            renderUsersList(e.target.value);
        });

        document.getElementById('sendBtn').addEventListener('click', sendMessage);
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // ========== FUNÇÕES AUXILIARES ==========
    async function loadUsers() {
        const snapshot = await db.collection('users').get();
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function loadRooms() {
        const snapshot = await db.collection('rooms').get();
        allRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    function renderPublicRooms() {
        const container = document.getElementById('publicRoomsList');
        if (!container) return;
        const publicRooms = allRooms.filter(r => r.type === 'public');
        container.innerHTML = publicRooms.map(room => `
            <li data-room-id="${room.id}" data-room-name="${room.name}" data-room-type="public" style="padding:8px; cursor:pointer; border-radius:8px; margin-bottom:4px;">
                💬 ${room.name}
            </li>
        `).join('');
        document.querySelectorAll('#publicRoomsList li').forEach(li => {
            li.addEventListener('click', () => {
                currentRoomId = li.dataset.roomId;
                document.getElementById('currentRoomName').innerText = li.dataset.roomName;
                loadMessages(currentRoomId);
                highlightSelectedRoom(li);
            });
        });
    }

    function renderPrivateRooms() {
        const container = document.getElementById('privateRoomsList');
        if (!container) return;
        const privateRooms = allRooms.filter(r => r.type === 'private' && r.participants && r.participants.includes(currentUser.uid));
        container.innerHTML = privateRooms.map(room => {
            const otherId = room.participants.find(uid => uid !== currentUser.uid);
            const otherUser = allUsers.find(u => u.id === otherId);
            const displayName = otherUser ? otherUser.displayName : 'Usuário';
            return `
                <li data-room-id="${room.id}" data-room-name="${displayName}" data-room-type="private" style="padding:8px; cursor:pointer; border-radius:8px; margin-bottom:4px;">
                    👤 ${displayName}
                </li>
            `;
        }).join('');
        document.querySelectorAll('#privateRoomsList li').forEach(li => {
            li.addEventListener('click', () => {
                currentRoomId = li.dataset.roomId;
                document.getElementById('currentRoomName').innerText = li.dataset.roomName;
                loadMessages(currentRoomId);
                highlightSelectedRoom(li);
            });
        });
    }

    function renderUsersList(search = '') {
        const container = document.getElementById('usersList');
        if (!container) return;
        const filtered = allUsers.filter(u => u.uid !== currentUser.uid && u.displayName.toLowerCase().includes(search.toLowerCase()));
        container.innerHTML = filtered.map(user => `
            <li data-user-id="${user.uid}" data-user-name="${user.displayName}" style="display:flex; align-items:center; gap:10px; padding:8px; cursor:pointer; border-radius:8px;">
                <img src="${user.photoURL || 'https://ui-avatars.com/api/?background=ccc'}" style="width:32px; height:32px; border-radius:50%;">
                <span>${user.displayName}</span>
            </li>
        `).join('');
        document.querySelectorAll('#usersList li').forEach(li => {
            li.addEventListener('click', () => {
                const otherUserId = li.dataset.userId;
                const otherUserName = li.dataset.userName;
                startPrivateChat(otherUserId, otherUserName);
            });
        });
    }

    async function startPrivateChat(otherUserId, otherUserName) {
        const roomId = [currentUser.uid, otherUserId].sort().join('_');
        const roomRef = db.collection('rooms').doc(roomId);
        const doc = await roomRef.get();
        if (!doc.exists) {
            await roomRef.set({
                id: roomId,
                name: `Private: ${currentUser.displayName} e ${otherUserName}`,
                type: 'private',
                participants: [currentUser.uid, otherUserId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await loadRooms();
        renderPrivateRooms();
        currentRoomId = roomId;
        document.getElementById('currentRoomName').innerText = otherUserName;
        loadMessages(currentRoomId);
    }

    async function createPublicRoom(roomName) {
        const roomRef = db.collection('rooms').doc();
        await roomRef.set({
            id: roomRef.id,
            name: roomName,
            type: 'public',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadRooms();
        renderPublicRooms();
    }

    function highlightSelectedRoom(selectedLi) {
        document.querySelectorAll('#publicRoomsList li, #privateRoomsList li').forEach(li => li.classList.remove('active'));
        selectedLi.classList.add('active');
    }

    function loadMessages(roomId) {
        if (unsubscribeMessages) unsubscribeMessages();

        const messagesDiv = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '<div style="text-align:center; padding:20px;">Carregando mensagens...</div>';
        if (messageInput) messageInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        unsubscribeMessages = db.collection('messages')
            .where('roomId', '==', roomId)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                messagesDiv.innerHTML = '';
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
                    if (msg.userId === currentUser.uid) msgDiv.classList.add('own');
                    let timeStr = '';
                    if (msg.timestamp) {
                        try {
                            const date = msg.timestamp.toDate();
                            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch(e) {}
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
                console.error(error);
                messagesDiv.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar mensagens.</div>';
            });
    }

    function sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !currentRoomId || !currentUser) return;

        const sendBtn = document.getElementById('sendBtn');
        input.disabled = true;
        sendBtn.disabled = true;

        db.collection('messages').add({
            roomId: currentRoomId,
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
            console.error(err);
            alert('Erro ao enviar mensagem.');
            input.disabled = false;
            sendBtn.disabled = false;
        });
    }

    // ========== PÁGINA DE PERFIL ==========
    async function renderProfile() {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        mainContent.innerHTML = `
            <div class="profile-container" style="max-width:500px; margin:20px auto; background:white; border:1px solid #dbdbdb; border-radius:8px; padding:20px;">
                <h2 style="margin-bottom:20px;">Editar Perfil</h2>
                <div style="text-align:center; margin-bottom:20px;">
                    <img id="profilePhoto" src="${userData.photoURL || 'https://ui-avatars.com/api/?background=0095f6&color=fff'}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid #0095f6;">
                </div>
                <label>Nome de exibição</label>
                <input type="text" id="displayName" value="${userData.displayName || ''}" style="width:100%; padding:8px; margin:8px 0; border:1px solid #dbdbdb; border-radius:6px;">
                <label>URL da foto (opcional)</label>
                <input type="text" id="photoURL" value="${userData.photoURL || ''}" placeholder="https://exemplo.com/foto.jpg" style="width:100%; padding:8px; margin:8px 0; border:1px solid #dbdbdb; border-radius:6px;">
                <button id="saveProfileBtn" style="width:100%; background:#0095f6; color:white; border:none; padding:10px; border-radius:6px; margin-top:10px;">Salvar Alterações</button>
                <p class="error" id="profileError" style="color:red; margin-top:10px;"></p>
            </div>
        `;
        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const newDisplayName = document.getElementById('displayName').value.trim();
            const newPhotoURL = document.getElementById('photoURL').value.trim();
            if (!newDisplayName) {
                document.getElementById('profileError').innerText = 'Nome de exibição não pode estar vazio.';
                return;
            }
            try {
                await currentUser.updateProfile({ displayName: newDisplayName, photoURL: newPhotoURL });
                await db.collection('users').doc(currentUser.uid).update({
                    displayName: newDisplayName,
                    photoURL: newPhotoURL || `https://ui-avatars.com/api/?background=0095f6&color=fff&size=100&name=${encodeURIComponent(newDisplayName)}`
                });
                userInfoSpan.textContent = `Olá, ${newDisplayName}`;
                alert('Perfil atualizado!');
            } catch (error) {
                document.getElementById('profileError').innerText = error.message;
            }
        });
    }

    // ========== PÁGINAS ESTÁTICAS (DEVS E TECHS) ==========
    function renderDevs() {
        mainContent.innerHTML = `
            <div class="devs-container">
                <h2>👥 Desenvolvedores</h2>
                <div class="devs-list">
                    <div class="dev-card"><img src="https://i.pravatar.cc/150?u=1"><h4>Seu Nome</h4><p>Front-end & Firebase</p></div>
                    <div class="dev-card"><img src="https://i.pravatar.cc/150?u=2"><h4>João Silva</h4><p>Interface</p></div>
                    <div class="dev-card"><img src="https://i.pravatar.cc/150?u=3"><h4>Maria Souza</h4><p>Documentação</p></div>
                    <div class="dev-card"><img src="https://i.pravatar.cc/150?u=4"><h4>José Santos</h4><p>Testes</p></div>
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
                    <li><i class="fab fa-css3-alt"></i> CSS3</li>
                    <li><i class="fab fa-js"></i> JavaScript (ES6+)</li>
                    <li><i class="fas fa-fire"></i> Firebase (Auth, Firestore)</li>
                    <li><i class="fas fa-font-awesome"></i> Font Awesome</li>
                </ul>
                <p>📚 Referências: <a href="https://firebase.google.com/docs" target="_blank">Firebase Docs</a>, <a href="https://developer.mozilla.org/" target="_blank">MDN</a></p>
            </div>
        `;
    }

    // Adiciona link "Perfil" no cabeçalho (se não existir)
    const nav = document.querySelector('nav');
    if (nav && !document.querySelector('a[data-page="profile"]')) {
        const profileLink = document.createElement('a');
        profileLink.href = '#';
        profileLink.textContent = 'Perfil';
        profileLink.setAttribute('data-page', 'profile');
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('profile');
        });
        nav.appendChild(profileLink);
    }
});