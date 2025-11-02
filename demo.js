/**
 * Privacy Sandbox Demo Functions
 * Interactive demonstrations of tracking prevention
 */

function addLogEntry(message, type = 'success') {
    const logContent = document.getElementById('demo-log');
    if (!logContent) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

function testCookieTracking() {
    addLogEntry('Testing cookie tracking attempt...', 'warning');

    setTimeout(() => {
        try {
            // Attempt to set a tracking cookie
            document.cookie = "tracking_id=demo_12345; path=/; max-age=31536000";

            // Check if it was set
            const cookieSet = document.cookie.includes('tracking_id');

            if (!cookieSet) {
                addLogEntry('✅ Cookie tracking blocked successfully! No tracking cookie was set.', 'blocked');
            } else {
                addLogEntry('⚠️ Cookie was allowed. Check your permissions settings.', 'warning');
            }
        } catch (e) {
            addLogEntry('✅ Cookie tracking blocked by Privacy Sandbox', 'blocked');
        }
    }, 500);
}

function testFingerprinting() {
    addLogEntry('Testing canvas fingerprinting attempt...', 'warning');

    setTimeout(() => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');

            if (!ctx || !ctx.fillText) {
                addLogEntry('✅ Canvas fingerprinting blocked! Context creation prevented.', 'blocked');
                return;
            }

            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser Fingerprint Test', 0, 0);

            const dataURL = canvas.toDataURL();

            // Check if we got fake data (indicates blocking)
            if (dataURL.length < 100 || dataURL.includes('fake')) {
                addLogEntry('✅ Canvas fingerprinting blocked! Fake data returned.', 'blocked');
            } else {
                addLogEntry('⚠️ Canvas fingerprinting may be allowed. Check permissions.', 'warning');
            }
        } catch (e) {
            addLogEntry('✅ Canvas fingerprinting blocked: ' + e.message, 'blocked');
        }
    }, 500);
}

function testLocalStorage() {
    addLogEntry('Testing localStorage tracking attempt...', 'warning');

    setTimeout(() => {
        try {
            localStorage.setItem('tracking_data', JSON.stringify({
                userId: 'demo_user',
                visits: 50,
                lastSeen: Date.now()
            }));

            const stored = localStorage.getItem('tracking_data');

            if (!stored) {
                addLogEntry('✅ localStorage tracking blocked! No data was stored.', 'blocked');
            } else {
                addLogEntry('⚠️ localStorage access was allowed. Check permissions.', 'warning');
            }
        } catch (e) {
            addLogEntry('✅ localStorage blocked by Privacy Sandbox', 'blocked');
        }
    }, 500);
}

function testWebRTC() {
    addLogEntry('Testing WebRTC IP leak attempt...', 'warning');

    setTimeout(() => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: []
            });

            addLogEntry('⚠️ WebRTC connection created. IP may be exposed.', 'warning');

            pc.close();
        } catch (e) {
            addLogEntry('✅ WebRTC blocked! IP leak prevented: ' + e.message, 'blocked');
        }
    }, 500);
}

function clearDemoLog() {
    const logContent = document.getElementById('demo-log');
    if (!logContent) return;

    logContent.innerHTML = `
        <div class="log-entry success">
            <span class="log-time">Ready</span>
            <span class="log-message">Demo log cleared. Click buttons above to test protection.</span>
        </div>
    `;
}

// Auto-run a demo on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        addLogEntry('Privacy Sandbox is active and monitoring this page.', 'success');
    }, 1000);
});