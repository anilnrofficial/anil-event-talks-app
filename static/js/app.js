// Application State
let updatesState = [];
let activeFilters = {
    search: '',
    types: new Set(),
    sort: 'newest'
};
let selectedUpdateId = null;

// DOM Elements
const feedGrid = document.getElementById('feedGrid');
const loadingOverlay = document.getElementById('loadingOverlay');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const tagsFilterContainer = document.getElementById('tagsFilterContainer');
const sortRadios = document.getElementsByName('sortOrder');
const cacheStatus = document.getElementById('cacheStatus');
const feedTitle = document.getElementById('feedTitle');
const filtersSummary = document.getElementById('filtersSummary');

// Stat Elements
const statTotal = document.getElementById('statTotal');
const statFiltered = document.getElementById('statFiltered');

// Drawer Elements
const tweetDrawer = document.getElementById('tweetDrawer');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const drawerBadge = document.getElementById('drawerBadge');
const drawerDate = document.getElementById('drawerDate');
const drawerLink = document.getElementById('drawerLink');
const drawerContentText = document.getElementById('drawerContentText');
const tweetTextArea = document.getElementById('tweetTextArea');
const charCount = document.getElementById('charCount');
const charCounterContainer = document.getElementById('charCounter');
const btnCopyTweet = document.getElementById('btnCopyTweet');
const btnSendTweet = document.getElementById('btnSendTweet');
const toastMessage = document.getElementById('toastMessage');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Helper: Strip HTML tags from a string
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || "";
}

// Helper: Format Type Name for CSS classes
function getBadgeClass(type) {
    const formatted = type.toLowerCase().trim();
    if (formatted.includes('feature')) return 'badge-feature';
    if (formatted.includes('issue')) return 'badge-issue';
    if (formatted.includes('deprecation')) return 'badge-deprecation';
    if (formatted.includes('announcement')) return 'badge-announcement';
    if (formatted.includes('notice')) return 'badge-notice';
    return 'badge-update';
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchUpdates(false);
    setupEventListeners();
});

// Setup All Interactive Event Listeners
function setupEventListeners() {
    // Refresh action
    refreshBtn.addEventListener('click', () => fetchUpdates(true));

    // Search input filtering
    searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value.toLowerCase().trim();
        renderDashboard();
    });

    // Sort order changes
    sortRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            activeFilters.sort = e.target.value;
            renderDashboard();
        });
    });

    // Close Tweet Drawer
    closeDrawerBtn.addEventListener('click', closeDrawer);

    // Character counter for Tweet Textarea
    tweetTextArea.addEventListener('input', updateCharCounter);

    // Copy tweet action
    btnCopyTweet.addEventListener('click', copyTweetToClipboard);

    // Send tweet (Twitter Web Intent)
    btnSendTweet.addEventListener('click', sendTweetToX);

    // Clear filters button in empty state
    clearFiltersBtn.addEventListener('click', resetFilters);
}

// Fetch Updates from flask API
async function fetchUpdates(forceRefresh = false) {
    try {
        setLoadingState(true);
        const endpoint = forceRefresh ? '/api/refresh' : '/api/updates';
        const method = forceRefresh ? 'POST' : 'GET';
        
        const response = await fetch(endpoint, { method });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        updatesState = data.updates || [];
        updateCacheIndicator(data.cached);
        
        // Populate sidebar categories dynamically
        renderSidebarCategories();
        
        // Initial dashboard render
        renderDashboard();
        
    } catch (err) {
        console.error('Error fetching updates:', err);
        alert(`Failed to load release notes: ${err.message}`);
    } finally {
        setLoadingState(false);
    }
}

// Toggle loading states
function setLoadingState(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.add('active');
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    } else {
        loadingOverlay.classList.remove('active');
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
}

// Update cache status badge
function updateCacheIndicator(isCached) {
    if (isCached) {
        cacheStatus.className = 'cache-status cached';
        cacheStatus.querySelector('.status-text').textContent = 'Local Cache';
    } else {
        cacheStatus.className = 'cache-status live';
        cacheStatus.querySelector('.status-text').textContent = 'Live Feed';
    }
}

// Reset filters back to default
function resetFilters() {
    searchInput.value = '';
    activeFilters.search = '';
    activeFilters.types.clear();
    
    // Reset sort
    sortRadios.forEach(radio => {
        if (radio.value === 'newest') radio.checked = true;
    });
    activeFilters.sort = 'newest';

    // Re-render categories select indicators
    document.querySelectorAll('.filter-tag-row').forEach(row => {
        row.classList.remove('active');
    });

    renderDashboard();
}

// Dynamically generate the category filters sidebar list
function renderSidebarCategories() {
    // Count frequencies of types
    const typeCounts = {};
    updatesState.forEach(update => {
        const type = update.type || 'Update';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Sort types alphabetically
    const sortedTypes = Object.keys(typeCounts).sort();

    tagsFilterContainer.innerHTML = '';
    
    sortedTypes.forEach(type => {
        const count = typeCounts[type];
        const badgeClass = getBadgeClass(type);
        
        const filterRow = document.createElement('div');
        filterRow.className = `filter-tag-row ${activeFilters.types.has(type) ? 'active' : ''}`;
        filterRow.dataset.type = type;
        
        // Extract type color from css custom variables by checking style classes
        let dotColor = '#94a3b8';
        if (badgeClass === 'badge-feature') dotColor = '#10b981';
        else if (badgeClass === 'badge-issue') dotColor = '#ef4444';
        else if (badgeClass === 'badge-deprecation') dotColor = '#f59e0b';
        else if (badgeClass === 'badge-announcement') dotColor = '#3b82f6';
        else if (badgeClass === 'badge-notice') dotColor = '#06b6d4';
        
        filterRow.innerHTML = `
            <div class="tag-label-group">
                <span class="tag-dot" style="background-color: ${dotColor}"></span>
                <span>${type}</span>
            </div>
            <span class="tag-count">${count}</span>
        `;

        filterRow.addEventListener('click', () => {
            if (activeFilters.types.has(type)) {
                activeFilters.types.delete(type);
                filterRow.classList.remove('active');
            } else {
                activeFilters.types.add(type);
                filterRow.classList.add('active');
            }
            renderDashboard();
        });

        tagsFilterContainer.appendChild(filterRow);
    });
}

// Main Render Logic (filters and renders items grid)
function renderDashboard() {
    // 1. Filter the dataset
    let filtered = updatesState.filter(item => {
        // Search text match
        const textMatch = !activeFilters.search || 
            item.content.toLowerCase().includes(activeFilters.search) ||
            item.type.toLowerCase().includes(activeFilters.search) ||
            item.date.toLowerCase().includes(activeFilters.search);
            
        // Type filter match
        const typeMatch = activeFilters.types.size === 0 || activeFilters.types.has(item.type);
        
        return textMatch && typeMatch;
    });

    // 2. Sort the dataset
    filtered.sort((a, b) => {
        // The XML contains datetime fields, but dates are usually June 17, 2026 format.
        // Let's use the 'updated' ISO timestamp or fall back to standard parsed Date.
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        
        return activeFilters.sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // 3. Render Stats
    statTotal.textContent = updatesState.length;
    statFiltered.textContent = filtered.length;
    
    // 4. Update Header Summary
    if (activeFilters.types.size > 0 || activeFilters.search) {
        const filters = [];
        if (activeFilters.search) filters.push(`"${activeFilters.search}"`);
        if (activeFilters.types.size > 0) filters.push(`${activeFilters.types.size} types`);
        filtersSummary.textContent = `Showing results filtered by: ${filters.join(' and ')}`;
    } else {
        filtersSummary.textContent = '';
    }

    // 5. Populate Feed Grid
    feedGrid.innerHTML = '';
    
    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        feedGrid.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    feedGrid.style.display = 'grid';

    filtered.forEach(item => {
        const isSelected = item.id === selectedUpdateId;
        const badgeClass = getBadgeClass(item.type);
        
        const card = document.createElement('article');
        card.className = `feed-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = item.id;
        
        card.innerHTML = `
            <div class="feed-card-header">
                <div class="feed-card-meta">
                    <span class="badge ${badgeClass}">${item.type}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <div class="card-select-indicator">
                    <svg viewBox="0 0 24 24" width="12" height="12">
                        <polyline fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="20 6 9 17 4 12"/>
                    </svg>
                </div>
            </div>
            <div class="feed-card-body">
                ${item.content}
            </div>
            <div class="feed-card-footer">
                <button class="btn btn-twitter btn-card-tweet" data-action="tweet">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet This</span>
                </button>
            </div>
        `;

        // Handle Card Click (Select card and open Tweet Customizer)
        card.addEventListener('click', (e) => {
            // If click was on a link within the body, don't trigger card selection
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            
            // Check if tweet action button was clicked
            const tweetBtn = e.target.closest('[data-action="tweet"]');
            if (tweetBtn) {
                e.stopPropagation();
                selectUpdate(item.id, true); // Select and immediately focus input
                return;
            }

            // Normal card selection click
            if (isSelected) {
                deselectUpdate();
            } else {
                selectUpdate(item.id);
            }
        });

        feedGrid.appendChild(card);
    });
}

// Select a specific release note and populate drawer
function selectUpdate(id, focusCompose = false) {
    selectedUpdateId = id;
    
    // Highlight selected card
    document.querySelectorAll('.feed-card').forEach(card => {
        if (card.dataset.id === id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    const update = updatesState.find(item => item.id === id);
    if (!update) return;

    // Populate drawer elements
    drawerBadge.className = `badge ${getBadgeClass(update.type)}`;
    drawerBadge.textContent = update.type;
    drawerDate.textContent = update.date;
    drawerLink.href = update.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    
    const cleanText = stripHtml(update.content).trim();
    drawerContentText.textContent = cleanText;

    // Generate Default Tweet
    tweetTextArea.value = generateDefaultTweetText(update, cleanText);
    updateCharCounter();

    // Open drawer
    tweetDrawer.classList.add('open');

    if (focusCompose) {
        tweetTextArea.focus();
    }
}

// Deselect current selection
function deselectUpdate() {
    selectedUpdateId = null;
    document.querySelectorAll('.feed-card').forEach(card => {
        card.classList.remove('selected');
    });
    closeDrawer();
}

// Close Drawer
function closeDrawer() {
    tweetDrawer.classList.remove('open');
}

// Generate an optimal 280-char Tweet
function generateDefaultTweetText(update, rawBodyText) {
    // Header format
    const header = `📢 BQ Release (${update.date}) | ${update.type}:\n\n`;
    
    // Footer / links format (Twitter counts links as 23 characters, but we calculate based on raw string for display safety)
    const footer = `\n\nDetails: ${update.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes'} #BigQuery #GoogleCloud`;
    
    const maxBodyLen = 280 - header.length - footer.length;
    
    let cleanBody = rawBodyText
        .replace(/\s+/g, ' ') // Collapse multiple spaces/newlines
        .trim();
        
    if (cleanBody.length > maxBodyLen) {
        cleanBody = cleanBody.substring(0, maxBodyLen - 3) + '...';
    }
    
    return `${header}${cleanBody}${footer}`;
}

// Update text character counter
function updateCharCounter() {
    const text = tweetTextArea.value;
    const len = text.length;
    charCount.textContent = len;

    // Color feedback classes
    if (len > 280) {
        charCounterContainer.className = 'char-counter danger';
        btnSendTweet.disabled = true;
    } else if (len > 250) {
        charCounterContainer.className = 'char-counter warning';
        btnSendTweet.disabled = false;
    } else {
        charCounterContainer.className = 'char-counter';
        btnSendTweet.disabled = false;
    }
}

// Copy Tweet Text to Clipboard
async function copyTweetToClipboard() {
    const text = tweetTextArea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        
        // Fallback selection copy
        tweetTextArea.select();
        document.execCommand('copy');
        showToast('Copied to clipboard (fallback)!');
    }
}

// Display Toast notifications inside drawer
function showToast(message) {
    toastMessage.textContent = message;
    toastMessage.classList.add('show');
    
    setTimeout(() => {
        toastMessage.classList.remove('show');
    }, 2500);
}

// Open Twitter intent in a new window
function sendTweetToX() {
    const text = tweetTextArea.value;
    if (!text) return;
    
    if (text.length > 280) {
        alert("Your tweet exceeds the 280 character limit. Please shorten it before posting.");
        return;
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
}
