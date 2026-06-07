// Phone controller client
class PhoneController {
  constructor() {
    this.sessionId = null;
    this.ws = null;
    this.gamepadIndex = null;
    this.connected = false;
    this.isDesktopMode = false;

    // Input state
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
      shift: false,
      ctrl: false,
    };

    this.mouseX = 0;
    this.mouseY = 0;
    this.isLeftClickDown = false;
    this.isRightClickDown = false;

    this.init();
  }

  async init() {
    // Parse URL for session
    const params = new URLSearchParams(window.location.search);
    this.sessionId = params.get('session');

    if (!this.sessionId) {
      this.showPairingScreen();
      return;
    }

    await this.connectToSession();
    this.setupControls();
    this.startGamepadListener();
  }

  showPairingScreen() {
    const html = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; gap: 20px; background: #1a1a1a; color: white;">
        <h1>Minecraft Pocket Remote</h1>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="sessionInput" placeholder="Session ID" style="padding: 10px; border-radius: 8px; border: none; width: 150px;">
          <input type="text" id="codeInput" placeholder="Pair Code" style="padding: 10px; border-radius: 8px; border: none; width: 150px;">
          <button id="connectBtn" onclick="controller.joinSession()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer;">Join</button>
        </div>
      </div>
    `;
    document.body.innerHTML = html;
  }

  async joinSession() {
    const sessionInput = document.getElementById('sessionInput');
    const codeInput = document.getElementById('codeInput');
    const sessionId = sessionInput.value;
    const pairCode = codeInput.value;

    if (!sessionId || !pairCode) {
      alert('Please enter session ID and pair code');
      return;
    }

    try {
      const response = await fetch('/api/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pairCode, role: 'phone' }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Redirect with session in URL
      window.location.href = `?session=${sessionId}`;
    } catch (err) {
      alert(`Failed to join: ${err.message}`);\n    }\n  }\n\n  async connectToSession() {\n    try {\n      const response = await fetch(`/api/sessions/${this.sessionId}`);\n      if (!response.ok) throw new Error('Session not found');\n      \n      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';\n      const wsUrl = `${protocol}//${window.location.host}?session=${this.sessionId}&role=phone`;\n      \n      this.ws = new WebSocket(wsUrl);\n      \n      this.ws.onopen = () => {\n        console.log('Connected to session');\n        this.connected = true;\n        this.showPhoneUI();\n      };\n      \n      this.ws.onmessage = (event) => {\n        const message = JSON.parse(event.data);\n        this.handleMessage(message);\n      };\n      \n      this.ws.onerror = (err) => {\n        console.error('WebSocket error:', err);\n        this.connected = false;\n      };\n      \n      this.ws.onclose = () => {\n        console.log('Disconnected from session');\n        this.connected = false;\n      };\n    } catch (err) {\n      console.error('Connection error:', err);\n      setTimeout(() => this.connectToSession(), 2000);\n    }\n  }\n\n  showPhoneUI() {\n    const html = `\n      <div style=\"display: flex; flex-direction: column; height: 100vh; background: #000; font-family: system-ui; color: white; position: relative;\">\n        <!-- Game screen -->\n        <div id=\"gameContainer\" style=\"flex: 1; background: #111; position: relative; overflow: hidden;\">\n          <video id=\"gameVideo\" style=\"width: 100%; height: 100%; object-fit: contain; background: #000;\"></video>\n          <div id=\"statusBar\" style=\"position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 10px; font-size: 12px;\">\n            <span id=\"connectionStatus\">Connecting...</span>\n            <span id=\"latency\" style=\"float: right;\">Ping: --ms</span>\n          </div>\n        </div>\n\n        <!-- Controller UI -->\n        <div id=\"controller\" style=\"background: #1a1a1a; padding: 20px; border-top: 1px solid #333;\">\n          <div style=\"display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;\">\n            <!-- Left Stick (movement) -->\n            <div style=\"display: flex; flex-direction: column; align-items: center;\">\n              <canvas id=\"leftStick\" width=\"100\" height=\"100\" style=\"background: #222; border-radius: 50%; cursor: pointer;\"></canvas>\n              <span style=\"margin-top: 5px; font-size: 12px;\">Move</span>\n            </div>\n\n            <!-- Center buttons -->\n            <div style=\"display: flex; flex-direction: column; justify-content: space-around; align-items: center;\">\n              <button id=\"escBtn\" style=\"width: 60px; height: 40px; background: #444; border: none; border-radius: 4px; color: white; cursor: pointer; margin-bottom: 10px;\">Esc</button>\n              <button id=\"tabBtn\" style=\"width: 60px; height: 40px; background: #444; border: none; border-radius: 4px; color: white; cursor: pointer; margin-bottom: 10px;\">Tab</button>\n              <button id=\"modeBtn\" style=\"width: 60px; height: 40px; background: #FF6B35; border: none; border-radius: 4px; color: white; cursor: pointer;\">Mode</button>\n            </div>\n\n            <!-- Right Stick (look) -->\n            <div style=\"display: flex; flex-direction: column; align-items: center;\">\n              <canvas id=\"rightStick\" width=\"100\" height=\"100\" style=\"background: #222; border-radius: 50%; cursor: pointer;\"></canvas>\n              <span style=\"margin-top: 5px; font-size: 12px;\">Look</span>\n            </div>\n          </div>\n\n          <!-- Action buttons row -->\n          <div style=\"display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 15px;\">\n            <button id=\"jumpBtn\" class=\"action-btn\" style=\"background: #4CAF50;\">Jump</button>\n            <button id=\"sneakBtn\" class=\"action-btn\" style=\"background: #4CAF50;\">Sneak</button>\n            <button id=\"sprintBtn\" class=\"action-btn\" style=\"background: #4CAF50;\">Sprint</button>\n            <button id=\"breakBtn\" class=\"action-btn\" style=\"background: #E74C3C;\">Break</button>\n            <button id=\"placeBtn\" class=\"action-btn\" style=\"background: #3498DB;\">Place</button>\n            <button id=\"invBtn\" class=\"action-btn\" style=\"background: #9B59B6;\">Inv</button>\n          </div>\n        </div>\n      </div>\n\n      <style>\n        body { margin: 0; padding: 0; -webkit-user-select: none; user-select: none; }\n        .action-btn {\n          padding: 12px;\n          border: none;\n          border-radius: 6px;\n          color: white;\n          font-weight: bold;\n          cursor: pointer;\n          touch-action: manipulation;\n          transition: opacity 0.1s;\n        }\n        .action-btn:active {\n          opacity: 0.7;\n        }\n        #leftStick, #rightStick {\n          touch-action: none;\n        }\n      </style>\n    `;\n    document.body.innerHTML = html;\n    this.setupControlUI();\n  }\n\n  setupControlUI() {\n    this.setupJoystick('leftStick', (x, y) => this.handleLeftStick(x, y));\n    this.setupJoystick('rightStick', (x, y) => this.handleRightStick(x, y));\n\n    // Action buttons\n    document.getElementById('jumpBtn').addEventListener('touchstart', () => this.sendKey('space', true));\n    document.getElementById('jumpBtn').addEventListener('touchend', () => this.sendKey('space', false));\n\n    document.getElementById('sneakBtn').addEventListener('touchstart', () => this.sendKey('shift', true));\n    document.getElementById('sneakBtn').addEventListener('touchend', () => this.sendKey('shift', false));\n\n    document.getElementById('sprintBtn').addEventListener('touchstart', () => this.sendKey('ctrl', true));\n    document.getElementById('sprintBtn').addEventListener('touchend', () => this.sendKey('ctrl', false));\n\n    document.getElementById('breakBtn').addEventListener('touchstart', () => this.sendClick('left', true));\n    document.getElementById('breakBtn').addEventListener('touchend', () => this.sendClick('left', false));\n\n    document.getElementById('placeBtn').addEventListener('touchstart', () => this.sendClick('right', true));\n    document.getElementById('placeBtn').addEventListener('touchend', () => this.sendClick('right', false));\n\n    document.getElementById('invBtn').addEventListener('touchstart', () => this.sendKey('e', true));\n    document.getElementById('invBtn').addEventListener('touchend', () => this.sendKey('e', false));\n\n    document.getElementById('escBtn').addEventListener('click', () => this.sendKey('escape', true));\n    document.getElementById('tabBtn').addEventListener('click', () => this.sendKey('tab', true));\n    document.getElementById('modeBtn').addEventListener('click', () => this.toggleMode());\n  }\n\n  setupJoystick(canvasId, callback) {\n    const canvas = document.getElementById(canvasId);\n    const ctx = canvas.getContext('2d');\n    let isPressed = false;\n    let centerX = canvas.width / 2;\n    let centerY = canvas.height / 2;\n\n    const draw = () => {\n      ctx.fillStyle = '#222';\n      ctx.fillRect(0, 0, canvas.width, canvas.height);\n      ctx.beginPath();\n      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);\n      ctx.strokeStyle = '#444';\n      ctx.lineWidth = 2;\n      ctx.stroke();\n    };\n\n    const handleMove = (clientX, clientY) => {\n      if (!isPressed) return;\n      const rect = canvas.getBoundingClientRect();\n      const x = clientX - rect.left;\n      const y = clientY - rect.top;\n      const dx = x - centerX;\n      const dy = y - centerY;\n      const distance = Math.sqrt(dx * dx + dy * dy);\n      const maxDistance = 40;\n      const ratio = Math.min(distance / maxDistance, 1);\n      callback(dx / maxDistance, dy / maxDistance);\n      draw();\n    };\n\n    canvas.addEventListener('touchstart', (e) => {\n      isPressed = true;\n      handleMove(e.touches[0].clientX, e.touches[0].clientY);\n    });\n\n    canvas.addEventListener('touchmove', (e) => {\n      e.preventDefault();\n      handleMove(e.touches[0].clientX, e.touches[0].clientY);\n    });\n\n    canvas.addEventListener('touchend', () => {\n      isPressed = false;\n      callback(0, 0);\n      draw();\n    });\n\n    draw();\n  }\n\n  handleLeftStick(x, y) {\n    // Convert to WASD\n    this.sendKey('w', y < -0.1);\n    this.sendKey('s', y > 0.1);\n    this.sendKey('a', x < -0.1);\n    this.sendKey('d', x > 0.1);\n  }\n\n  handleRightStick(x, y) {\n    // Convert to mouse movement\n    const sensitivity = 5;\n    this.mouseX += x * sensitivity;\n    this.mouseY += y * sensitivity;\n    this.sendMouse(this.mouseX, this.mouseY);\n  }\n\n  sendKey(key, isDown) {\n    if (this.connected && this.ws) {\n      this.ws.send(JSON.stringify({\n        type: 'input',\n        data: { action: 'key', key, isDown },\n      }));\n    }\n  }\n\n  sendClick(button, isDown) {\n    if (this.connected && this.ws) {\n      this.ws.send(JSON.stringify({\n        type: 'input',\n        data: { action: 'click', button, isDown },\n      }));\n    }\n  }\n\n  sendMouse(x, y) {\n    if (this.connected && this.ws) {\n      this.ws.send(JSON.stringify({\n        type: 'input',\n        data: { action: 'mouse', x, y },\n      }));\n    }\n  }\n\n  startGamepadListener() {\n    setInterval(() => {\n      const gamepads = navigator.getGamepads();\n      for (let i = 0; i < gamepads.length; i++) {\n        if (gamepads[i]) {\n          this.handleGamepad(gamepads[i]);\n        }\n      }\n    }, 50);\n  }\n\n  handleGamepad(gamepad) {\n    const deadzone = 0.15;\n\n    // Left stick - movement\n    if (Math.abs(gamepad.axes[0]) > deadzone || Math.abs(gamepad.axes[1]) > deadzone) {\n      this.handleLeftStick(gamepad.axes[0], gamepad.axes[1]);\n    }\n\n    // Right stick - look\n    if (Math.abs(gamepad.axes[2]) > deadzone || Math.abs(gamepad.axes[3]) > deadzone) {\n      this.handleRightStick(gamepad.axes[2], gamepad.axes[3]);\n    }\n\n    // Buttons\n    if (gamepad.buttons[0]?.pressed) this.sendKey('space', true); // A - Jump\n    if (gamepad.buttons[1]?.pressed) this.sendKey('shift', true); // B - Sneak\n    if (gamepad.buttons[4]?.pressed) this.sendClick('left', true); // LB - Attack\n    if (gamepad.buttons[5]?.pressed) this.sendClick('right', true); // RB - Place\n  }\n\n  toggleMode() {\n    this.isDesktopMode = !this.isDesktopMode;\n    const btn = document.getElementById('modeBtn');\n    if (this.isDesktopMode) {\n      btn.textContent = 'Game';\n      btn.style.background = '#4CAF50';\n    } else {\n      btn.textContent = 'Mode';\n      btn.style.background = '#FF6B35';\n    }\n  }\n\n  handleMessage(message) {\n    const { type, data } = message;\n    if (type === 'peer-connected') {\n      document.getElementById('connectionStatus').textContent = 'Connected';\n    }\n  }\n\n  setupControls() {\n    // Keyboard fallback for testing\n    window.addEventListener('keydown', (e) => {\n      if (e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd') {\n        this.sendKey(e.key, true);\n      }\n    });\n\n    window.addEventListener('keyup', (e) => {\n      if (e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd') {\n        this.sendKey(e.key, false);\n      }\n    });\n  }\n}\n\nconst controller = new PhoneController();\n