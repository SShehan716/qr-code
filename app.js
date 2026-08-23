/**
 * Direct QR Code Generator - Application Logic
 * 100% Client-side, direct encoding without intermediary servers
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        activeType: 'url',
        fgColor: '#0f172a',
        bgColor: '#ffffff',
        dotStyle: 'square',
        cornerStyle: 'square',
        eccLevel: 2, // H (High) by default for best scan reliability
        activeLogo: 'none',
        customLogoImg: null,
        currentPayload: 'https://google.com'
    };

    // DOM Elements
    const canvas = document.getElementById('qrCanvas');
    const payloadDisplay = document.getElementById('payloadDisplay');
    const payloadLength = document.getElementById('payloadLength');
    const matrixVersion = document.getElementById('matrixVersion');
    const contrastIndicator = document.getElementById('contrastIndicator');
    const toastContainer = document.getElementById('toastContainer');

    // Inputs
    const inputUrl = document.getElementById('inputUrl');
    const inputText = document.getElementById('inputText');
    const wifiSsid = document.getElementById('wifiSsid');
    const wifiAuth = document.getElementById('wifiAuth');
    const wifiPassword = document.getElementById('wifiPassword');
    const emailTo = document.getElementById('emailTo');
    const emailSubject = document.getElementById('emailSubject');
    const emailBody = document.getElementById('emailBody');
    const phoneType = document.getElementById('phoneType');
    const phoneNumber = document.getElementById('phoneNumber');
    const smsBody = document.getElementById('smsBody');
    const smsBodyGroup = document.getElementById('smsBodyGroup');

    // Customization elements
    const fgColorInput = document.getElementById('fgColor');
    const fgColorText = document.getElementById('fgColorText');
    const bgColorInput = document.getElementById('bgColor');
    const bgColorText = document.getElementById('bgColorText');
    const eccSelect = document.getElementById('eccLevel');
    const logoFileInput = document.getElementById('logoFileInput');

    // Action buttons
    const btnDownloadPng = document.getElementById('btnDownloadPng');
    const btnDownloadSvg = document.getElementById('btnDownloadSvg');
    const btnCopyClipboard = document.getElementById('btnCopyClipboard');
    const btnTestDirectUrl = document.getElementById('btnTestDirectUrl');

    // Preset SVG Icons for center logo
    const presetIcons = {
        link: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
        globe: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
        wifi: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`,
        star: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        lock: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    };

    const loadedPresetImages = {};

    // Preload preset SVG images
    function preloadPresets() {
        Object.entries(presetIcons).forEach(([key, svgStr]) => {
            const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                loadedPresetImages[key] = img;
            };
            img.src = url;
        });
    }
    preloadPresets();

    /**
     * Compute current direct payload from active tab inputs
     */
    function computePayload() {
        let payload = '';
        switch (state.activeType) {
            case 'url': {
                let url = (inputUrl.value || '').trim();
                if (!url) {
                    url = 'https://example.com';
                }
                // Auto prepend https if user typed a bare domain like example.com
                if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
                    url = 'https://' + url;
                }
                payload = url;
                break;
            }
            case 'text': {
                payload = inputText.value || 'Hello World';
                break;
            }
            case 'wifi': {
                const ssid = wifiSsid.value || 'MyNetwork';
                const auth = wifiAuth.value || 'WPA';
                const pass = wifiPassword.value || '';
                // Standard Wi-Fi QR schema: WIFI:T:WPA;S:MySSID;P:MyPassword;;
                payload = `WIFI:T:${auth};S:${ssid};P:${pass};;`;
                break;
            }
            case 'email': {
                const to = emailTo.value || '';
                const subject = emailSubject.value ? `?subject=${encodeURIComponent(emailSubject.value)}` : '';
                const body = emailBody.value ? `${subject ? '&' : '?'}body=${encodeURIComponent(emailBody.value)}` : '';
                payload = `mailto:${to}${subject}${body}`;
                break;
            }
            case 'phone': {
                const type = phoneType.value;
                const num = (phoneNumber.value || '').replace(/\s+/g, '');
                if (type === 'tel') {
                    payload = `tel:${num}`;
                } else if (type === 'smsto') {
                    const msg = smsBody.value ? `:${smsBody.value}` : '';
                    payload = `smsto:${num}${msg}`;
                } else if (type === 'wa') {
                    const cleanNum = num.replace(/[^0-9]/g, '');
                    const msg = smsBody.value ? `?text=${encodeURIComponent(smsBody.value)}` : '';
                    payload = `https://wa.me/${cleanNum}${msg}`;
                }
                break;
            }
            default:
                payload = inputUrl.value || 'https://google.com';
        }
        state.currentPayload = payload;
        return payload;
    }

    /**
     * Contrast ratio evaluator for scan reliability
     */
    function updateContrastScore(hex1, hex2) {
        function getLuminance(hex) {
            let rgb = parseInt(hex.slice(1), 16);
            let r = (rgb >> 16) & 255;
            let g = (rgb >> 8) & 255;
            let b = rgb & 255;
            const a = [r, g, b].map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }

        try {
            const l1 = getLuminance(hex1);
            const l2 = getLuminance(hex2);
            const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

            if (ratio >= 3.5) {
                contrastIndicator.textContent = 'Good Contrast';
                contrastIndicator.className = 'contrast-badge contrast-good';
            } else {
                contrastIndicator.textContent = 'Low Contrast (May scan poorly)';
                contrastIndicator.className = 'contrast-badge contrast-poor';
            }
        } catch (e) {
            contrastIndicator.textContent = 'Contrast OK';
        }
    }

    /**
     * Render the QR code onto the canvas
     */
    function renderQRCode() {
        const payload = computePayload();

        // Update inspector text
        payloadDisplay.textContent = payload;
        payloadLength.textContent = `Length: ${payload.length} chars`;

        // Determine center logo image
        let logoImageToDraw = null;
        if (state.activeLogo === 'custom' && state.customLogoImg) {
            logoImageToDraw = state.customLogoImg;
        } else if (state.activeLogo !== 'none' && loadedPresetImages[state.activeLogo]) {
            logoImageToDraw = loadedPresetImages[state.activeLogo];
        }

        try {
            const qr = new QRCode({
                width: 320,
                height: 320,
                colorDark: state.fgColor,
                colorLight: state.bgColor,
                correctLevel: parseInt(state.eccLevel, 10),
                dotStyle: state.dotStyle,
                cornerStyle: state.cornerStyle,
                logoImage: logoImageToDraw,
                logoScale: 0.24,
                logoBackground: true
            });

            qr.drawCanvas(canvas, payload);
            matrixVersion.textContent = `Matrix: Auto-fitted`;
        } catch (err) {
            console.error("QR Rendering error:", err);
            matrixVersion.textContent = `Error: Payload too long`;
        }

        updateContrastScore(state.fgColor, state.bgColor);
    }

    // Tab switching
    const tabs = document.querySelectorAll('.type-tab');
    const panels = {
        url: document.getElementById('panel-url'),
        text: document.getElementById('panel-text'),
        wifi: document.getElementById('panel-wifi'),
        email: document.getElementById('panel-email'),
        phone: document.getElementById('panel-phone')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const type = tab.dataset.type;
            state.activeType = type;

            Object.keys(panels).forEach(k => {
                if (panels[k]) panels[k].style.display = (k === type) ? 'block' : 'none';
            });

            renderQRCode();
        });
    });

    // Input listeners for real-time live generation
    const liveInputs = [
        inputUrl, inputText, wifiSsid, wifiAuth, wifiPassword,
        emailTo, emailSubject, emailBody, phoneType, phoneNumber, smsBody
    ];

    liveInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', renderQRCode);
        input.addEventListener('change', renderQRCode);
    });

    if (phoneType) {
        phoneType.addEventListener('change', () => {
            if (smsBodyGroup) {
                smsBodyGroup.style.display = (phoneType.value === 'smsto' || phoneType.value === 'wa') ? 'block' : 'none';
            }
            renderQRCode();
        });
    }

    // Color Pickers & Hex Text Sync
    function syncFgColor(color) {
        state.fgColor = color;
        fgColorInput.value = color;
        fgColorText.value = color.toUpperCase();
        renderQRCode();
    }

    function syncBgColor(color) {
        state.bgColor = color;
        bgColorInput.value = color;
        bgColorText.value = color.toUpperCase();
        renderQRCode();
    }

    fgColorInput.addEventListener('input', (e) => syncFgColor(e.target.value));
    bgColorInput.addEventListener('input', (e) => syncBgColor(e.target.value));

    fgColorText.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val)) syncFgColor(val);
    });

    bgColorText.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val)) syncBgColor(val);
    });

    // Swatches
    document.querySelectorAll('#fgSwatches .swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => syncFgColor(btn.dataset.color));
    });

    document.querySelectorAll('#bgSwatches .swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => syncBgColor(btn.dataset.color));
    });

    // Dot Style & Corner Style segment buttons
    document.querySelectorAll('#dotStyleGroup .segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#dotStyleGroup .segment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.dotStyle = btn.dataset.style;
            renderQRCode();
        });
    });

    document.querySelectorAll('#cornerStyleGroup .segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#cornerStyleGroup .segment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.cornerStyle = btn.dataset.style;
            renderQRCode();
        });
    });

    // ECC Level selector
    eccSelect.addEventListener('change', (e) => {
        state.eccLevel = parseInt(e.target.value, 10);
        renderQRCode();
    });

    // Logo preset selection
    const logoBtns = document.querySelectorAll('.logo-btn');
    logoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            logoBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeLogo = btn.dataset.logo;
            renderQRCode();
        });
    });

    // Custom Logo File Upload
    logoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state.customLogoImg = img;
                state.activeLogo = 'custom';
                logoBtns.forEach(b => b.classList.remove('active'));
                renderQRCode();
                showToast("Custom logo applied successfully!", "success");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Toast Notification helper
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // High resolution PNG download
    btnDownloadPng.addEventListener('click', () => {
        const exportSize = 1024;
        const offscreenCanvas = document.createElement('canvas');
        
        let logoImageToDraw = null;
        if (state.activeLogo === 'custom' && state.customLogoImg) {
            logoImageToDraw = state.customLogoImg;
        } else if (state.activeLogo !== 'none' && loadedPresetImages[state.activeLogo]) {
            logoImageToDraw = loadedPresetImages[state.activeLogo];
        }

        const qr = new QRCode({
            width: exportSize,
            height: exportSize,
            colorDark: state.fgColor,
            colorLight: state.bgColor,
            correctLevel: parseInt(state.eccLevel, 10),
            dotStyle: state.dotStyle,
            cornerStyle: state.cornerStyle,
            logoImage: logoImageToDraw,
            logoScale: 0.24,
            logoBackground: true
        });

        qr.drawCanvas(offscreenCanvas, state.currentPayload);

        const link = document.createElement('a');
        link.download = `qrcode_direct_${Date.now()}.png`;
        link.href = offscreenCanvas.toDataURL('image/png');
        link.click();
        showToast("High-resolution PNG downloaded!", "success");
    });

    // SVG Vector Download
    btnDownloadSvg.addEventListener('click', () => {
        const qr = new QRCode({
            width: 512,
            height: 512,
            colorDark: state.fgColor,
            colorLight: state.bgColor,
            correctLevel: parseInt(state.eccLevel, 10)
        });

        const svgContent = qr.generateSVG(state.currentPayload);
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.download = `qrcode_direct_${Date.now()}.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
        showToast("Vector SVG downloaded!", "success");
    });

    // Copy PNG Image to Clipboard
    btnCopyClipboard.addEventListener('click', async () => {
        try {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    showToast("Failed to copy image", "info");
                    return;
                }
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast("QR code image copied to clipboard!", "success");
            });
        } catch (err) {
            console.error("Clipboard write error:", err);
            showToast("Clipboard copy not permitted by browser", "info");
        }
    });

    // Direct link tester (proves it opens directly without middleman)
    btnTestDirectUrl.addEventListener('click', () => {
        const payload = state.currentPayload;
        if (/^https?:\/\//i.test(payload)) {
            window.open(payload, '_blank', 'noopener,noreferrer');
            showToast("Opening direct URL in new tab...", "info");
        } else if (payload.startsWith('mailto:') || payload.startsWith('tel:') || payload.startsWith('smsto:')) {
            window.location.href = payload;
            showToast("Triggering direct protocol handler...", "info");
        } else {
            showToast("Payload is formatted data (WIFI / plain text)", "info");
        }
    });

    // Initial render
    renderQRCode();
});
