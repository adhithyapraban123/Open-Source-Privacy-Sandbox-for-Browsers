/**
 * Privacy Sandbox Dashboard
 * Real-time monitoring and statistics display
 */

class PrivacySandboxDashboard {
    constructor() {
        this.updateInterval = null;
        this.init();
    }

    init() {
        // Start real-time updates
        this.startRealTimeUpdates();

        // Update hero stats
        this.updateHeroStats();

        // Populate dashboard
        this.updateDashboard();
    }

    startRealTimeUpdates() {
        // Update every 2 seconds
        this.updateInterval = setInterval(() => {
            this.updateHeroStats();
            this.updateDashboard();
        }, 2000);
    }

    updateHeroStats() {
        if (!window.PrivacySandbox) return;

        try {
            const status = window.PrivacySandbox.getStatus();

            // Update hero counters
            const blockedCount = document.getElementById('blocked-count');
            const blockRate = document.getElementById('block-rate');

            if (blockedCount) {
                this.animateValue(blockedCount, parseInt(blockedCount.textContent) || 0, status.summary.blocked, 500);
            }

            if (blockRate) {
                blockRate.textContent = status.summary.blockRate || '0%';
            }
        } catch (e) {
            console.warn('Privacy Sandbox not fully initialized yet');
        }
    }

    updateDashboard() {
        if (!window.PrivacySandbox) return;

        try {
            const status = window.PrivacySandbox.getStatus();

            // Update dashboard stats
            const dashTotal = document.getElementById('dash-total');
            const dashBlocked = document.getElementById('dash-blocked');
            const dashAllowed = document.getElementById('dash-allowed');

            if (dashTotal) dashTotal.textContent = status.summary.totalRequests || 0;
            if (dashBlocked) dashBlocked.textContent = status.summary.blocked || 0;
            if (dashAllowed) dashAllowed.textContent = status.summary.allowed || 0;

            // Update recent activity
            this.updateRecentActivity();

            // Update top domains
            this.updateTopDomains(status.byDomain);
        } catch (e) {
            console.warn('Dashboard update error:', e);
        }
    }

    updateRecentActivity() {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;

        try {
            const logs = window.PrivacySandbox.getLogs();
            const recentLogs = logs.slice(-5).reverse();

            if (recentLogs.length === 0) {
                activityList.innerHTML = '<p class="empty-state">No activity yet.</p>';
                return;
            }

            activityList.innerHTML = recentLogs.map(log => `
                <div class="activity-item">
                    <span class="activity-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span class="activity-api">${log.api}</span>
                    <span class="activity-status ${log.status}">${log.status}</span>
                </div>
            `).join('');
        } catch (e) {
            activityList.innerHTML = '<p class="empty-state">Loading...</p>';
        }
    }

    updateTopDomains(byDomain) {
        const domainsList = document.getElementById('top-domains');
        if (!domainsList || !byDomain) return;

        const sortedDomains = Object.entries(byDomain)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sortedDomains.length === 0) {
            domainsList.innerHTML = '<p class="empty-state">No blocked domains yet.</p>';
            return;
        }

        domainsList.innerHTML = sortedDomains.map(([domain, count]) => `
            <div class="domain-item">
                <span class="domain-name">${domain}</span>
                <span class="domain-count">${count} blocked</span>
            </div>
        `).join('');
    }

    animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }
}

// Global dashboard functions
function exportLogs() {
    if (!window.PrivacySandboxDashboard) {
        alert('Privacy Sandbox not initialized');
        return;
    }

    try {
        const csv = window.PrivacySandboxDashboard.exportLogs('csv');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privacy-sandbox-logs-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert('Logs exported successfully!');
    } catch (e) {
        alert('Export failed: ' + e.message);
    }
}

function clearAllLogs() {
    if (!window.PrivacySandboxDashboard) {
        alert('Privacy Sandbox not initialized');
        return;
    }

    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
        try {
            window.PrivacySandboxDashboard.clearLogs();
            alert('All logs cleared successfully!');
            location.reload();
        } catch (e) {
            alert('Clear failed: ' + e.message);
        }
    }
}

function viewFullReport() {
    if (!window.PrivacySandbox) {
        alert('Privacy Sandbox not initialized');
        return;
    }

    try {
        const status = window.PrivacySandbox.getStatus();
        console.log('Full Privacy Sandbox Report:', status);
        alert('Full report logged to console. Press F12 to view.');
    } catch (e) {
        alert('Report generation failed: ' + e.message);
    }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboardInstance = new PrivacySandboxDashboard();
    });
} else {
    window.dashboardInstance = new PrivacySandboxDashboard();
}