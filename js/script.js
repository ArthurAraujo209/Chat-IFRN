document.addEventListener('DOMContentLoaded', function () {

    // ========== ESTADO GLOBAL ==========
    let currentUser = null;
    let currentRoomId = null;
    let currentRoomName = '';
    let unsubscribeMessages = null;
    let allUsers = [];
    let allRooms = [];
    let pendingFile = null;
    let pendingGif = null;
    let sidebarOpen = false;

    const TENOR_KEY = 'AIzaSyC8A6O9HFI2gy0UHQyBJFI3lWaRzlBRmqc';
    const GIPHY_FALLBACK = [
        'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
        'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
        'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
        'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif',
        'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif',
        'https://media.giphy.com/media/3oEjHV0z9CsCHCqrqU/giphy.gif',
        'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
        'https://media.giphy.com/media/xT0xem7ZlZ6RONaC0g/giphy.gif',
        'https://media.giphy.com/media/3ohzAu2U1tOafteBa0/giphy.gif',
        'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
        'https://media.giphy.com/media/l4FGrYKtP0pBGpBAA/giphy.gif',
        'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif',
        'https://media.giphy.com/media/3orieLHn2C3KDCizW4/giphy.gif',
        'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Lg7rusRgqU/giphy.gif',
        'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif'
    ];

    const EMOJIS = ['😀','😂','🥰','😎','🤔','😅','🙌','👍','❤️','🔥','💯','🎉','🥳','😭','😤','🤣','💀','✨','🙏','😊','👀','🫶','💪','🤯','😍','🫠','🥺','😈','🤩','😴','🤮','🤑','🫡','🫢','😶','🤫','🥴','😇','🤤','🤧'];

    const mainContent = document.getElementById('main-content');
    const userInfoSpan = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    if (typeof auth === 'undefined') {
        mainContent.innerHTML = '<div style="color:red;text-align:center;padding:40px">Erro: Firebase não configurado.</div>';
        return;
    }

    // ========== HAMBURGUER ==========
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    hamburger?.addEventListener('click', () => mobileNav?.classList.toggle('open'));

    document.querySelectorAll('nav a[data-page], .mobile-nav-link[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            mobileNav?.classList.remove('open');
            showPage(link.dataset.page);
        });
    });

    logoutBtn?.addEventListener('click', () => auth.signOut());

    // ========== AUTH ==========
    auth.onAuthStateChanged(async user => {
        currentUser = user;
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                const defaultName = user.email.split('@')[0];
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: defaultName,
                    photoURL: `https://ui-avatars.com/api/?background=6c63ff&color=fff&size=100&name=${encodeURIComponent(defaultName)}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    online: true
                });
                await user.updateProfile({ displayName: defaultName });
            } else {
                await db.collection('users').doc(user.uid).update({ online: true });
            }
            const userData = (await db.collection('users').doc(user.uid).get()).data();
            userInfoSpan.textContent = userData.displayName || user.email.split('@')[0];
            userInfoSpan.style.display = 'inline';
            logoutBtn.style.display = 'inline';

            window.addEventListener('beforeunload', () => {
                db.collection('users').doc(user.uid).update({ online: false });
            });

            showPage('chat');
        } else {
            userInfoSpan.style.display = 'none';
            logoutBtn.style.display = 'none';
            showPage('login');
        }
    });

    // ========== PÁGINAS ==========
    function showPage(page) {
        if (page === 'chat' && !currentUser) page = 'login';
        if (page === 'profile' && !currentUser) page = 'login';
        if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

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

    // ========== LOGIN ==========
    function renderLogin() {
        mainContent.innerHTML = `
            <div class="login-container">
                <h2>Bem-vindo de volta</h2>
                <p class="login-subtitle">Entre pra continuar no CampusChat</p>
                <div class="input-group">
                    <i class="fas fa-envelope"></i>
                    <input type="email" id="email" placeholder="E-mail">
                </div>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="password" placeholder="Senha">
                </div>
                <button class="btn-primary" id="loginBtn">Entrar</button>
                <p class="error" id="loginError"></p>
                <div class="login-divider">Não tem conta? <a href="#" id="goToSignup">Cadastre-se</a></div>
                <div class="test-users">
                    <strong>Contas de teste:</strong><br>
                    mimmarcelo@chat.local / Teste123<br>
                    aluno1@chat.local / senha123
                </div>
            </div>
        `;
        document.getElementById('loginBtn').addEventListener('click', doLogin);
        document.getElementById('password').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
        document.getElementById('goToSignup')?.addEventListener('click', e => { e.preventDefault(); showPage('signup'); });

        function doLogin() {
            const email = document.getElementById('email').value.trim();
            const pw = document.getElementById('password').value;
            const err = document.getElementById('loginError');
            if (!email || !pw) { err.textContent = 'Preencha e-mail e senha.'; return; }
            auth.signInWithEmailAndPassword(email, pw).catch(() => { err.textContent = 'E-mail ou senha inválidos.'; });
        }
    }

    function renderSignup() {
        mainContent.innerHTML = `
            <div class="login-container">
                <h2>Criar Conta</h2>
                <p class="login-subtitle">Junte-se ao CampusChat</p>
                <div class="input-group"><i class="fas fa-envelope"></i><input type="email" id="email" placeholder="E-mail"></div>
                <div class="input-group"><i class="fas fa-user"></i><input type="text" id="displayName" placeholder="Nome de exibição"></div>
                <div class="input-group"><i class="fas fa-lock"></i><input type="password" id="password" placeholder="Senha (min. 6 chars)"></div>
                <div class="input-group"><i class="fas fa-lock"></i><input type="password" id="confirmPassword" placeholder="Confirmar senha"></div>
                <button class="btn-primary" id="signupBtn">Criar Conta</button>
                <p class="error" id="signupError"></p>
                <div class="login-divider">Já tem conta? <a href="#" id="goToLogin">Faça login</a></div>
            </div>
        `;
        document.getElementById('signupBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value.trim();
            const displayName = document.getElementById('displayName').value.trim();
            const pw = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const err = document.getElementById('signupError');
            if (!email || !displayName || !pw) { err.textContent = 'Preencha todos os campos.'; return; }
            if (pw !== confirm) { err.textContent = 'As senhas não coincidem.'; return; }
            if (pw.length < 6) { err.textContent = 'Senha muito curta.'; return; }
            try {
                const cred = await auth.createUserWithEmailAndPassword(email, pw);
                await cred.user.updateProfile({ displayName });
                await db.collection('users').doc(cred.user.uid).set({
                    uid: cred.user.uid, email, displayName,
                    photoURL: `https://ui-avatars.com/api/?background=6c63ff&color=fff&size=100&name=${encodeURIComponent(displayName)}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), online: true
                });
            } catch (error) {
                err.textContent = error.code === 'auth/email-already-in-use' ? 'E-mail já cadastrado.' : error.message;
            }
        });
        document.getElementById('goToLogin')?.addEventListener('click', e => { e.preventDefault(); showPage('login'); });
    }

    // ========== CHAT ==========
    async function renderChat() {
        await loadUsers();
        await loadRooms();

        mainContent.innerHTML = `
            <div class="chat-container" id="chatContainer">
                <div class="chat-sidebar" id="chatSidebar">
                    <div class="sidebar-header">
                        <span class="sidebar-title">Mensagens</span>
                        <button class="new-room-btn" id="newRoomBtn" title="Nova sala"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="sidebar-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchUsers" placeholder="Buscar usuários...">
                    </div>
                    <div class="sidebar-scroll">
                        <div class="sidebar-section">
                            <div class="sidebar-section-title">Salas Públicas</div>
                            <div id="publicRoomsList"></div>
                        </div>
                        <div class="sidebar-section">
                            <div class="sidebar-section-title">Conversas Privadas</div>
                            <div id="privateRoomsList"></div>
                        </div>
                        <div class="sidebar-section">
                            <div class="sidebar-section-title">Usuários</div>
                            <div id="usersList"></div>
                        </div>
                    </div>
                </div>
                <div class="chat-main" id="chatMainArea">
                    <div class="chat-header" id="chatHeader">
                        <button class="back-btn" id="backBtn" style="display:none"><i class="fas fa-arrow-left"></i></button>
                        <div class="chat-header-icon"><i class="fas fa-comment-dots"></i></div>
                        <div class="chat-header-info">
                            <div class="chat-header-name" id="currentRoomName">Selecione uma conversa</div>
                            <div class="chat-header-sub" id="currentRoomSub"></div>
                        </div>
                    </div>
                    <div class="chat-empty-state" id="chatEmptyState">
                        <i class="fas fa-comment-dots"></i>
                        <p>Selecione uma conversa ou inicie uma nova</p>
                    </div>
                    <div class="chat-messages" id="chatMessages" style="display:none"></div>
                    <div class="chat-input-area" id="chatInputArea" style="display:none">
                        <div class="upload-preview" id="uploadPreview">
                            <img class="upload-preview-thumb" id="uploadThumb" src="" alt="">
                            <span class="upload-preview-name" id="uploadName"></span>
                            <button class="upload-cancel" id="cancelUpload"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="chat-input-row">
                            <div class="chat-toolbar">
                                <button class="toolbar-btn" id="attachBtn" title="Enviar foto/vídeo"><i class="fas fa-image"></i></button>
                                <button class="toolbar-btn" id="gifBtn" title="Enviar GIF"><span style="font-size:0.7rem;font-weight:700;">GIF</span></button>
                                <button class="toolbar-btn" id="emojiBtn" title="Emojis"><i class="far fa-smile"></i></button>
                            </div>
                            <div class="chat-input-wrap">
                                <textarea id="messageInput" placeholder="Mensagem..." rows="1" disabled></textarea>
                            </div>
                            <button id="sendBtn" disabled><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            </div>
            <input type="file" id="fileInput" accept="image/*,video/*">
        `;

        renderPublicRooms();
        renderPrivateRooms();
        renderUsersList();
        setupInputHandlers();

        document.getElementById('newRoomBtn').addEventListener('click', () => {
            const name = prompt('Nome da nova sala:');
            if (name?.trim()) createPublicRoom(name.trim());
        });

        document.getElementById('searchUsers').addEventListener('input', e => renderUsersList(e.target.value));

        document.getElementById('backBtn')?.addEventListener('click', () => {
            document.getElementById('chatSidebar').classList.add('open');
            document.getElementById('backBtn').style.display = 'none';
        });

        // Responsividade: fechar sidebar ao selecionar conversa em mobile
        if (window.innerWidth <= 768) {
            document.getElementById('chatSidebar').classList.add('open');
        }
    }

    function setupInputHandlers() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const fileInput = document.getElementById('fileInput');
        const attachBtn = document.getElementById('attachBtn');
        const gifBtn = document.getElementById('gifBtn');
        const emojiBtn = document.getElementById('emojiBtn');
        const cancelUpload = document.getElementById('cancelUpload');

        if (!input) return;

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        input.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });

        sendBtn.addEventListener('click', sendMessage);

        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        cancelUpload.addEventListener('click', clearPendingFile);

        gifBtn.addEventListener('click', openGifModal);
        emojiBtn.addEventListener('click', toggleEmojiPicker);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        pendingFile = file;
        pendingGif = null;

        const preview = document.getElementById('uploadPreview');
        const thumb = document.getElementById('uploadThumb');
        const name = document.getElementById('uploadName');

        preview.classList.add('show');
        name.textContent = file.name;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = ev => { thumb.src = ev.target.result; thumb.style.display = 'block'; };
            reader.readAsDataURL(file);
        } else {
            thumb.style.display = 'none';
        }
    }

    function clearPendingFile() {
        pendingFile = null;
        pendingGif = null;
        document.getElementById('uploadPreview').classList.remove('show');
        document.getElementById('fileInput').value = '';
        document.getElementById('uploadThumb').style.display = 'none';
    }

    // ========== GIF MODAL ==========
    function openGifModal() {
        const modal = document.getElementById('gifModal');
        modal.style.display = 'flex';
        loadGifs('trending');

        let searchTimeout;
        document.getElementById('gifSearch').oninput = e => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadGifs(e.target.value || 'trending'), 400);
        };

        document.getElementById('closeGifModal').onclick = () => modal.style.display = 'none';
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    }

    function loadGifs(query) {
        const grid = document.getElementById('gifGrid');
        grid.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;grid-column:1/-1">Carregando GIFs...</div>';

        const gifs = GIPHY_FALLBACK.sort(() => Math.random() - 0.5).slice(0, 12);
        grid.innerHTML = gifs.map((url, i) => `
            <div class="gif-item" data-gif="${url}">
                <img src="${url}" alt="GIF ${i}" loading="lazy">
            </div>
        `).join('');

        grid.querySelectorAll('.gif-item').forEach(item => {
            item.addEventListener('click', () => {
                pendingGif = item.dataset.gif;
                pendingFile = null;
                clearPendingFile();
                document.getElementById('gifModal').style.display = 'none';

                const preview = document.getElementById('uploadPreview');
                const thumb = document.getElementById('uploadThumb');
                const name = document.getElementById('uploadName');
                preview.classList.add('show');
                thumb.src = pendingGif;
                thumb.style.display = 'block';
                name.textContent = 'GIF selecionado';
            });
        });
    }

    // ========== EMOJI PICKER ==========
    function toggleEmojiPicker() {
        const picker = document.getElementById('emojiModal');
        const isVisible = picker.style.display === 'block';

        if (isVisible) {
            picker.style.display = 'none';
            return;
        }

        const grid = document.getElementById('emojiGrid');
        grid.innerHTML = EMOJIS.map(e => `<button class="emoji-btn">${e}</button>`).join('');
        grid.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('messageInput');
                if (input) input.value += btn.textContent;
                picker.style.display = 'none';
                input?.focus();
            });
        });

        picker.style.display = 'block';

        const emojiBtn = document.getElementById('emojiBtn');
        if (emojiBtn) {
            const rect = emojiBtn.getBoundingClientRect();
            picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            picker.style.left = Math.max(8, rect.left - 120) + 'px';
            picker.style.transform = 'none';
        }

        setTimeout(() => {
            document.addEventListener('click', function handler(e) {
                if (!picker.contains(e.target) && e.target !== document.getElementById('emojiBtn')) {
                    picker.style.display = 'none';
                    document.removeEventListener('click', handler);
                }
            });
        }, 50);
    }

    // ========== MEDIA MODAL ==========
    function openMediaModal(src, isVideo) {
        const modal = document.getElementById('mediaModal');
        const img = document.getElementById('modalImage');
        const vid = document.getElementById('modalVideo');

        modal.style.display = 'flex';

        if (isVideo) {
            img.style.display = 'none';
            vid.src = src;
            vid.style.display = 'block';
        } else {
            vid.style.display = 'none';
            img.src = src;
            img.style.display = 'block';
        }

        document.getElementById('closeMediaModal').onclick = () => {
            modal.style.display = 'none';
            vid.pause();
        };
        modal.addEventListener('click', e => {
            if (e.target === modal) { modal.style.display = 'none'; vid.pause(); }
        });
    }

    // ========== LOAD USERS & ROOMS ==========
    async function loadUsers() {
        const snap = await db.collection('users').get();
        allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function loadRooms() {
        const snap = await db.collection('rooms').get();
        allRooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    function renderPublicRooms() {
        const container = document.getElementById('publicRoomsList');
        if (!container) return;
        const rooms = allRooms.filter(r => r.type === 'public');

        if (rooms.length === 0) {
            container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim);padding:4px 0">Nenhuma sala ainda</div>';
            return;
        }

        container.innerHTML = rooms.map(r => `
            <div class="room-item" data-room-id="${r.id}" data-room-name="${r.name}" data-room-type="public">
                <div class="room-icon">💬</div>
                <div class="item-info">
                    <div class="item-name">${r.name}</div>
                    <div class="item-sub">Sala pública</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.room-item').forEach(el => {
            el.addEventListener('click', () => selectRoom(el.dataset.roomId, el.dataset.roomName, 'public', null));
        });
    }

    function renderPrivateRooms() {
        const container = document.getElementById('privateRoomsList');
        if (!container) return;
        const rooms = allRooms.filter(r => r.type === 'private' && r.participants?.includes(currentUser.uid));

        if (rooms.length === 0) {
            container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim);padding:4px 0">Nenhuma conversa ainda</div>';
            return;
        }

        container.innerHTML = rooms.map(r => {
            const otherId = r.participants.find(uid => uid !== currentUser.uid);
            const other = allUsers.find(u => u.id === otherId || u.uid === otherId);
            const name = other?.displayName || 'Usuário';
            const photo = other?.photoURL || `https://ui-avatars.com/api/?background=6c63ff&color=fff&size=60&name=${encodeURIComponent(name)}`;
            const isOnline = other?.online || false;
            return `
                <div class="room-item" data-room-id="${r.id}" data-room-name="${name}" data-user-photo="${photo}" data-room-type="private">
                    <div class="avatar-wrapper">
                        <img class="user-avatar" src="${photo}" alt="${name}">
                        ${isOnline ? '<div class="online-dot"></div>' : ''}
                    </div>
                    <div class="item-info">
                        <div class="item-name">${name}</div>
                        <div class="item-sub">${isOnline ? '● Online' : 'Offline'}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.room-item').forEach(el => {
            el.addEventListener('click', () => selectRoom(el.dataset.roomId, el.dataset.roomName, 'private', el.dataset.userPhoto));
        });
    }

    function renderUsersList(search = '') {
        const container = document.getElementById('usersList');
        if (!container) return;
        const filtered = allUsers.filter(u =>
            u.uid !== currentUser.uid &&
            (u.displayName || '').toLowerCase().includes(search.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim);padding:4px 0">Nenhum usuário encontrado</div>';
            return;
        }

        container.innerHTML = filtered.map(u => {
            const photo = u.photoURL || `https://ui-avatars.com/api/?background=6c63ff&color=fff&size=60&name=${encodeURIComponent(u.displayName || 'U')}`;
            return `
                <div class="user-item" data-user-id="${u.uid}" data-user-name="${u.displayName}">
                    <div class="avatar-wrapper">
                        <img class="user-avatar" src="${photo}" alt="${u.displayName}">
                        ${u.online ? '<div class="online-dot"></div>' : ''}
                    </div>
                    <div class="item-info">
                        <div class="item-name">${u.displayName || 'Usuário'}</div>
                        <div class="item-sub">${u.online ? '● Online' : 'Offline'}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.user-item').forEach(el => {
            el.addEventListener('click', () => startPrivateChat(el.dataset.userId, el.dataset.userName));
        });
    }

    function selectRoom(roomId, roomName, type, photo) {
        currentRoomId = roomId;
        currentRoomName = roomName;

        document.querySelectorAll('.room-item, .user-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-room-id="${roomId}"]`)?.classList.add('active');

        document.getElementById('currentRoomName').textContent = roomName;
        document.getElementById('currentRoomSub').textContent = type === 'public' ? 'Sala pública' : 'Conversa privada';

        const header = document.getElementById('chatHeader');
        const existingAvatar = header.querySelector('.chat-header-avatar, .chat-header-icon');
        if (existingAvatar) existingAvatar.remove();

        const avatarEl = document.createElement(photo ? 'img' : 'div');
        avatarEl.className = photo ? 'chat-header-avatar' : 'chat-header-icon';
        if (photo) { avatarEl.src = photo; avatarEl.alt = roomName; }
        else avatarEl.innerHTML = '<i class="fas fa-users"></i>';
        header.insertBefore(avatarEl, header.querySelector('.chat-header-info'));

        document.getElementById('chatEmptyState').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('chatInputArea').style.display = 'block';

        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        if (input) { input.disabled = false; input.focus(); }
        if (sendBtn) sendBtn.disabled = false;

        loadMessages(roomId);

        if (window.innerWidth <= 768) {
            document.getElementById('chatSidebar')?.classList.remove('open');
            document.getElementById('backBtn').style.display = 'flex';
        }
    }

    async function startPrivateChat(otherUserId, otherUserName) {
        const roomId = [currentUser.uid, otherUserId].sort().join('_');
        const roomRef = db.collection('rooms').doc(roomId);
        const doc = await roomRef.get();
        if (!doc.exists) {
            await roomRef.set({
                id: roomId,
                name: `${currentUser.displayName} e ${otherUserName}`,
                type: 'private',
                participants: [currentUser.uid, otherUserId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await loadRooms();
        renderPrivateRooms();
        const other = allUsers.find(u => u.uid === otherUserId);
        selectRoom(roomId, otherUserName, 'private', other?.photoURL || null);
    }

    async function createPublicRoom(name) {
        const ref = db.collection('rooms').doc();
        await ref.set({
            id: ref.id, name, type: 'public',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadRooms();
        renderPublicRooms();
    }

    // ========== MENSAGENS ==========
    function loadMessages(roomId) {
        if (unsubscribeMessages) unsubscribeMessages();

        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return;
        messagesDiv.innerHTML = `<div class="loading-msgs"><div class="loading-spinner"></div>Carregando...</div>`;

        unsubscribeMessages = db.collection('messages')
            .where('roomId', '==', roomId)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                messagesDiv.innerHTML = '';
                if (snapshot.empty) {
                    messagesDiv.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:0.9rem">Nenhuma mensagem ainda 👋</div>`;
                    return;
                }

                let lastDate = null;
                snapshot.forEach(doc => {
                    const msg = doc.data();

                    let msgDate = null;
                    if (msg.timestamp) {
                        try { msgDate = msg.timestamp.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch (e) {}
                    }

                    if (msgDate && msgDate !== lastDate) {
                        const sep = document.createElement('div');
                        sep.className = 'date-separator';
                        sep.textContent = msgDate;
                        messagesDiv.appendChild(sep);
                        lastDate = msgDate;
                    }

                    messagesDiv.appendChild(buildMsgElement(msg));
                });
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, err => {
                console.error(err);
                messagesDiv.innerHTML = '<div style="color:red;text-align:center;padding:20px">Erro ao carregar mensagens.</div>';
            });
    }

    function buildMsgElement(msg) {
        const isOwn = msg.userId === currentUser.uid;
        const sender = allUsers.find(u => u.uid === msg.userId);
        const photo = sender?.photoURL || `https://ui-avatars.com/api/?background=6c63ff&color=fff&size=60&name=${encodeURIComponent(msg.username || 'U')}`;

        let timeStr = '';
        if (msg.timestamp) {
            try { timeStr = msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
        }

        const wrapper = document.createElement('div');
        wrapper.className = `msg-wrapper${isOwn ? ' own' : ''}`;

        let mediaHTML = '';
        if (msg.mediaURL) {
            if (msg.mediaType === 'video') {
                mediaHTML = `<video class="msg-media video" src="${msg.mediaURL}" controls></video>`;
            } else if (msg.mediaType === 'gif') {
                mediaHTML = `<img class="msg-gif" src="${msg.mediaURL}" alt="GIF">`;
            } else {
                mediaHTML = `<img class="msg-media" src="${msg.mediaURL}" alt="Imagem">`;
            }
        }

        wrapper.innerHTML = `
            ${!isOwn ? `<img class="msg-avatar" src="${photo}" alt="${msg.username}">` : ''}
            <div class="msg-bubble">
                ${!isOwn ? `<div class="msg-username">${msg.username || 'Usuário'}</div>` : ''}
                ${mediaHTML}
                ${msg.text ? `<div class="msg-text">${escapeHTML(msg.text)}</div>` : ''}
                <div class="msg-time">${timeStr}</div>
            </div>
        `;

        // Clique na mídia para abrir modal
        const mediaEl = wrapper.querySelector('.msg-media, .msg-gif');
        if (mediaEl) {
            mediaEl.addEventListener('click', () => openMediaModal(mediaEl.src || mediaEl.currentSrc, msg.mediaType === 'video'));
        }

        return wrapper;
    }

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    async function sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input?.value.trim();
        const sendBtn = document.getElementById('sendBtn');

        if (!currentRoomId || !currentUser) return;
        if (!text && !pendingFile && !pendingGif) return;

        if (input) input.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        try {
            let mediaURL = null;
            let mediaType = null;

            if (pendingGif) {
                mediaURL = pendingGif;
                mediaType = 'gif';
            } else if (pendingFile) {
                mediaURL = await uploadFileAsBase64(pendingFile);
                mediaType = pendingFile.type.startsWith('video/') ? 'video' : 'image';
            }

            const msgData = {
                roomId: currentRoomId,
                text: text || '',
                userId: currentUser.uid,
                username: currentUser.displayName || currentUser.email.split('@')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (mediaURL) {
                msgData.mediaURL = mediaURL;
                msgData.mediaType = mediaType;
            }

            await db.collection('messages').add(msgData);

            if (input) { input.value = ''; input.style.height = 'auto'; input.disabled = false; input.focus(); }
            if (sendBtn) sendBtn.disabled = false;
            clearPendingFile();
        } catch (err) {
            console.error(err);
            alert('Erro ao enviar.');
            if (input) input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    function uploadFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande (máx. 5MB)'));
                return;
            }
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ========== PERFIL ==========
    async function renderProfile() {
        if (!currentUser) { showPage('login'); return; }
        const snap = await db.collection('users').doc(currentUser.uid).get();
        const data = snap.data() || {};

        mainContent.innerHTML = `
            <div class="profile-container">
                <div class="profile-card">
                    <h2>Editar Perfil</h2>
                    <div class="profile-photo-wrap">
                        <img id="profilePhoto" src="${data.photoURL || 'https://ui-avatars.com/api/?background=6c63ff&color=fff&size=100'}" alt="Foto">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome de exibição</label>
                        <input class="form-input" type="text" id="displayName" value="${data.displayName || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL da foto</label>
                        <input class="form-input" type="text" id="photoURL" value="${data.photoURL || ''}" placeholder="https://...">
                    </div>
                    <button class="btn-primary" id="saveProfileBtn">Salvar Alterações</button>
                    <p class="error" id="profileError" style="color:var(--accent2);margin-top:10px;"></p>
                </div>
            </div>
        `;

        document.getElementById('photoURL').addEventListener('input', e => {
            if (e.target.value) document.getElementById('profilePhoto').src = e.target.value;
        });

        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const name = document.getElementById('displayName').value.trim();
            const photo = document.getElementById('photoURL').value.trim();
            const err = document.getElementById('profileError');
            if (!name) { err.textContent = 'Nome não pode ficar vazio.'; return; }
            try {
                await currentUser.updateProfile({ displayName: name, photoURL: photo });
                await db.collection('users').doc(currentUser.uid).update({
                    displayName: name,
                    photoURL: photo || `https://ui-avatars.com/api/?background=6c63ff&color=fff&size=100&name=${encodeURIComponent(name)}`
                });
                userInfoSpan.textContent = name;
                alert('Perfil atualizado!');
            } catch (e) { err.textContent = e.message; }
        });
    }

    // ========== DEVS ==========
    function renderDevs() {
        mainContent.innerHTML = `
            <div class="devs-container">
                <h2 class="page-title">Desenvolvedores</h2>
                <p class="page-subtitle">As mentes por trás do CampusChat</p>
                <div class="devs-grid">
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=arthur" alt="Arthur">
                        <h4>Arthur</h4>
                        <p>Front-end & Firebase</p>
                    </div>
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=victor" alt="Victor">
                        <h4>Victor</h4>
                        <p>Testes & QA</p>
                    </div>
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=joao" alt="João Henrique">
                        <h4>João Henrique</h4>
                        <p>Design & UX</p>
                    </div>
                    <div class="dev-card">
                        <img src="https://i.pravatar.cc/150?u=alguem" alt="Alguém">
                        <h4>Alguém</h4>
                        <p>Testes</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== TECHS ==========
    function renderTechs() {
        mainContent.innerHTML = `
            <div class="techs-container">
                <h2 class="page-title">Tecnologias</h2>
                <p class="page-subtitle">Stack usada no projeto</p>
                <div class="techs-grid">
                    <div class="tech-card"><div class="tech-icon"><i class="fab fa-html5"></i></div><div class="tech-name">HTML5</div><div class="tech-sub">Estrutura</div></div>
                    <div class="tech-card"><div class="tech-icon"><i class="fab fa-css3-alt"></i></div><div class="tech-name">CSS3</div><div class="tech-sub">Estilização</div></div>
                    <div class="tech-card"><div class="tech-icon"><i class="fab fa-js"></i></div><div class="tech-name">JavaScript</div><div class="tech-sub">ES6+</div></div>
                    <div class="tech-card"><div class="tech-icon"><i class="fas fa-fire"></i></div><div class="tech-name">Firebase</div><div class="tech-sub">Auth & Firestore</div></div>
                    <div class="tech-card"><div class="tech-icon"><i class="fas fa-database"></i></div><div class="tech-name">Firestore</div><div class="tech-sub">Banco de dados</div></div>
                    <div class="tech-card"><div class="tech-icon"><i class="fab fa-font-awesome"></i></div><div class="tech-name">Font Awesome</div><div class="tech-sub">Ícones</div></div>
                </div>
                <div class="refs-card">
                    <i class="fas fa-book" style="color:var(--accent)"></i>
                    Referências:
                    <a href="https://firebase.google.com/docs" target="_blank">Firebase Docs</a> •
                    <a href="https://developer.mozilla.org/" target="_blank">MDN Web Docs</a>
                </div>
            </div>
        `;
    }

    // Adiciona link de perfil na nav
    const nav = document.querySelector('nav');
    if (nav && !document.querySelector('a[data-page="profile"]')) {
        const a = document.createElement('a');
        a.href = '#'; a.className = 'nav-link';
        a.setAttribute('data-page', 'profile');
        a.innerHTML = '<i class="fas fa-user"></i><span>Perfil</span>';
        a.addEventListener('click', e => { e.preventDefault(); showPage('profile'); });
        nav.appendChild(a);
    }
});