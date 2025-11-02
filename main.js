/**
 * Privacy Sandbox Website - Main JavaScript
 */

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Copy to clipboard functionality
function copyToClipboard(button) {
    const codeBlock = button.previousElementSibling;
    const code = codeBlock.textContent;

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = '#10b981';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('Failed to copy. Please copy manually.');
    });
}

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > lastScroll && currentScroll > 100) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Log Privacy Sandbox initialization
console.log('%c🛡️ Privacy Sandbox', 'font-size: 20px; font-weight: bold; color: #667eea;');
console.log('%cOpen Source Digital Rights Protection', 'font-size: 14px; color: #94a3b8;');
console.log('%cGitHub: https://github.com/yourusername/privacy-sandbox', 'color: #667eea;');

// Check if Privacy Sandbox is loaded
setTimeout(() => {
    if (window.PrivacySandbox) {
        console.log('%c✅ Privacy Sandbox loaded successfully', 'color: #10b981; font-weight: bold;');
        console.log('Access the API: PrivacySandbox.getStatus()');
    } else {
        console.warn('⚠️ Privacy Sandbox not detected. Make sure privacy_sandbox_complete.js is loaded.');
    }
}, 1000);