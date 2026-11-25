/* Backstreet Wall - lokalni demo. Za pravu stranicu potrebni su backend i baza podataka. */
(() => {
  "use strict";

  const USERS_KEY = "backstreetWallUsers";
  const SESSION_KEY = "backstreetWallSession";
  const MESSAGES_KEY = "backstreetWallMessages";

  const readJSON = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const getUsers = () => readJSON(USERS_KEY, []);
  const getCurrentUser = () => {
    const username = localStorage.getItem(SESSION_KEY);
    return getUsers().find(user => user.username === username) || null;
  };
  const setMessage = (element, text, type = "") => {
    if (!element) return;
    element.textContent = text;
    element.className = `form-message ${type}`.trim();
  };
  const escapeText = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  // Shared header/session state
  const currentUser = getCurrentUser();
  const loginOpen = document.getElementById("login-open");
  const logoutButton = document.getElementById("logout-button");
  const profileLink = document.getElementById("profile-link");
  const registerHeaderLink = document.getElementById("register-header-link");
  if (currentUser) {
    if (loginOpen) loginOpen.hidden = true;
    if (logoutButton) logoutButton.hidden = false;
    if (profileLink) profileLink.hidden = false;
    if (registerHeaderLink) registerHeaderLink.hidden = true;
  }
  logoutButton?.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });

  // Login modal and basic arithmetic check
  const modal = document.getElementById("login-modal");
  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    createCaptcha();
    document.getElementById("login-name")?.focus();
  };
  const closeModal = () => {
    if (modal) modal.hidden = true;
    setMessage(document.getElementById("login-message"), "");
  };
  loginOpen?.addEventListener("click", openModal);
  document.getElementById("login-close")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  let captchaResult = 0;
  function createCaptcha() {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    captchaResult = a + b;
    const question = document.getElementById("captcha-question");
    if (question) question.textContent = `Provjera: koliko je ${a} + ${b}?`;
    const answer = document.getElementById("captcha-answer");
    if (answer) answer.value = "";
  }

  document.getElementById("login-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.elements.username.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const captcha = Number(form.elements.captcha.value);
    const message = document.getElementById("login-message");

    if (captcha !== captchaResult) {
      setMessage(message, "Odgovor na provjeru nije točan. Pokušaj ponovno.", "error");
      createCaptcha();
      return;
    }
    const user = getUsers().find(item => item.username === username && item.password === password);
    if (!user) {
      setMessage(message, "Korisničko ime ili lozinka nisu točni.", "error");
      createCaptcha();
      return;
    }
    localStorage.setItem(SESSION_KEY, user.username);
    window.location.reload();
  });

  // Registration
  document.getElementById("register-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.elements.username.value.trim().toLowerCase();
    const accountName = form.elements.accountName.value.trim();
    const password = form.elements.password.value;
    const confirm = form.elements.passwordConfirm.value;
    const message = document.getElementById("register-message");

    if (password !== confirm) {
      setMessage(message, "Lozinke se ne podudaraju.", "error");
      return;
    }
    if (getUsers().some(user => user.username === username)) {
      setMessage(message, "To korisničko ime već postoji. Odaberi drugo.", "error");
      return;
    }
    const users = getUsers();
    users.push({
      username,
      accountName,
      password,
      textStyle: "Arial, Helvetica, sans-serif",
      createdAt: new Date().toISOString()
    });
    writeJSON(USERS_KEY, users);
    localStorage.setItem(SESSION_KEY, username);
    window.location.href = "index.html";
  });

  // Homepage welcome and chat
  const welcomeUser = document.getElementById("welcome-user");
  const welcomeLink = document.getElementById("welcome-account-link");
  if (currentUser && welcomeUser) {
    welcomeUser.hidden = false;
    welcomeUser.textContent = `Prijavljen/a si kao ${currentUser.accountName}.`;
    if (welcomeLink) welcomeLink.hidden = true;
  }

  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-message");
  const sendButton = document.getElementById("send-message");
  const chatHint = document.getElementById("chat-hint");

  function renderMessages() {
    if (!chatMessages) return;
    const messages = readJSON(MESSAGES_KEY, []);
    if (!messages.length) {
      chatMessages.innerHTML = '<p class="empty-message">Još nema poruka. Započni razgovor!</p>';
      return;
    }
    chatMessages.innerHTML = messages.map(message => `
      <div class="message">
        <strong class="message-name">${escapeText(message.name)}</strong>
        <p>${escapeText(message.text)}</p>
        <small class="message-time">${escapeText(message.time)}</small>
      </div>
    `).join("");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  if (chatInput && currentUser) {
    chatInput.disabled = false;
    chatInput.placeholder = "Napiši poruku...";
    if (sendButton) sendButton.disabled = false;
    if (chatHint) chatHint.textContent = `Pišeš kao ${currentUser.accountName}.`;
  }
  if (chatMessages) renderMessages();

  chatForm?.addEventListener("submit", event => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      openModal();
      return;
    }
    const text = chatInput.value.trim();
    if (!text) return;
    const messages = readJSON(MESSAGES_KEY, []);
    messages.push({
      name: user.accountName,
      text,
      time: new Date().toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" })
    });
    writeJSON(MESSAGES_KEY, messages.slice(-100));
    chatInput.value = "";
    renderMessages();
  });

  // Local-only room creation demonstration
  document.getElementById("room-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const user = getCurrentUser();
    const message = document.getElementById("room-message");
    if (!user) {
      setMessage(message, "Za izradu sobe prvo se prijavi.", "error");
      openModal();
      return;
    }
    const name = event.currentTarget.elements["room-name"].value.trim();
    if (!name) return;
    const rooms = readJSON("backstreetWallRooms", []);
    rooms.push({ name, owner: user.username, createdAt: new Date().toISOString() });
    writeJSON("backstreetWallRooms", rooms);
    event.currentTarget.reset();
    setMessage(message, `Demo soba „${name}” je spremljena u ovom pregledniku.`, "success");
  });

  // Profile page
  if (document.body.dataset.page === "profile") {
    const user = getCurrentUser();
    if (!user) {
      window.location.replace("index.html");
    } else {
      const displayName = document.getElementById("profile-display-name");
      const username = document.getElementById("profile-username");
      const avatar = document.getElementById("profile-avatar");
      const nameInput = document.getElementById("profile-name");
      const styleInput = document.getElementById("text-style");
      if (displayName) displayName.textContent = user.accountName;
      if (username) username.textContent = `@${user.username}`;
      if (avatar) avatar.textContent = user.accountName.charAt(0).toUpperCase();
      if (nameInput) nameInput.value = user.accountName;
      if (styleInput) styleInput.value = user.textStyle || "Arial, Helvetica, sans-serif";

      document.getElementById("profile-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = event.currentTarget;
        const updated = getUsers().map(item => item.username === user.username
          ? { ...item, accountName: form.elements.accountName.value.trim(), textStyle: form.elements.textStyle.value }
          : item);
        writeJSON(USERS_KEY, updated);
        setMessage(document.getElementById("profile-message"), "Promjene su spremljene.", "success");
        window.setTimeout(() => window.location.reload(), 500);
      });
    }
  }
})();
