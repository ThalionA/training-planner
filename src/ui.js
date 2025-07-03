import { getSessions, getWellness, getTrainingConfig, getSessionById, saveSession, saveWellness } from './store.js';
import { renderCalendar, navigateCalendar, setCalendarView } from './components/Calendar.js';
import { renderDashboardCharts } from './charts.js';

// --- ELEMENT SELECTORS ---
let DOMElements = {};

// --- VIEW MANAGEMENT ---
export function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

export function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    // Load the default view when the app is shown
    switchView('log-view');
}

export function switchView(viewId, context = null) {
    if (!DOMElements.views || !DOMElements.navButtons) return;

    DOMElements.views.forEach(v => v.classList.remove('active'));
    const newView = document.getElementById(viewId);
    if (newView) newView.classList.add('active');
    
    DOMElements.navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));

    const viewTitles = { 'log-view': 'Log Session', 'calendar-view': 'Calendar', 'history-view': 'History', 'dashboard-view': 'Dashboard' };
    if (DOMElements.headerTitle) DOMElements.headerTitle.textContent = viewTitles[viewId];

    if (viewId === 'log-view') {
        renderLogView(context);
    } else if (viewId === 'calendar-view') {
        renderCalendar();
    } else if (viewId === 'history-view') {
        renderHistoryList();
    } else if (viewId === 'dashboard-view') {
        renderDashboard();
    }
}

// --- RENDER FUNCTIONS ---
function renderLogView(context) {
    const logView = DOMElements.logView;
    if (!logView) return;

    // We need to inject the form HTML into the log-view div
    logView.innerHTML = `
        <form id="training-form" class="space-y-4">
            <input type="hidden" id="session-id">
            <div>
                <label for="date" class="block text-sm font-medium text-gray-300">Date</label>
                <input type="date" id="date" required class="mt-1 w-full bg-gray-700 p-2 rounded-md border border-gray-600">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="category" class="block text-sm font-medium text-gray-300">Category</label>
                    <select id="category" required class="mt-1 w-full bg-gray-700 p-2 rounded-md border border-gray-600"></select>
                </div>
                <div>
                    <label for="subcategory" class="block text-sm font-medium text-gray-300">Sub-category</label>
                    <select id="subcategory" required class="mt-1 w-full bg-gray-700 p-2 rounded-md border border-gray-600"></select>
                </div>
            </div>
            <div id="dynamic-fields-container" class="space-y-4"></div>
            <div>
                <label for="sessionRating" class="block text-sm font-medium text-gray-300">Session Rating (1-10)</label>
                <input type="number" id="sessionRating" min="1" max="10" class="mt-1 w-full bg-gray-700 p-2 rounded-md border border-gray-600">
            </div>
            <div>
                <label for="details" class="block text-sm font-medium text-gray-300">General Notes</label>
                <textarea id="details" rows="3" class="mt-1 w-full bg-gray-700 p-2 rounded-md border border-gray-600"></textarea>
            </div>
            <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">Save Session</button>
        </form>
    `;
    // Re-initialize DOMElements that are inside the form
    initializeFormDOMElements();
    
    if (context?.sessionId) {
        if (DOMElements.headerTitle) DOMElements.headerTitle.textContent = 'Edit Session';
        populateFormForEdit(context.sessionId);
    } else {
        if (DOMElements.headerTitle) DOMElements.headerTitle.textContent = 'Log Session';
        resetForm();
        if(context?.date && DOMElements.dateInput) DOMElements.dateInput.value = context.date;
    }
}

function renderCalendarView() {
    const calendarView = DOMElements.calendarView;
    if (!calendarView) return;
    calendarView.innerHTML = `
        <div class="bg-gray-800 p-3 rounded-lg">
            <div class="flex items-center justify-between mb-4">
                <button data-action="prev-month" class="p-2 rounded-md hover:bg-gray-700">&lt;</button>
                <h2 id="calendar-title" class="text-lg font-semibold"></h2>
                <button data-action="next-month" class="p-2 rounded-md hover:bg-gray-700">&gt;</button>
            </div>
            <div id="calendar-container"></div>
        </div>
    `;
    renderCalendar();
}

function renderHistoryList() {
    const list = DOMElements.historyView;
    if (!list) return;
    list.innerHTML = '';
    const allSessions = getSessions();
    if (allSessions.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-500 py-8">No sessions logged yet.</p>`;
        return;
    }
    
    const sortedSessions = [...allSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const sessionsHtml = sortedSessions.map(session => {
        const isFuture = new Date(session.date) >= new Date().setHours(0,0,0,0) && session.date !== new Date().toLocaleDateString('sv-SE');
        const dateString = new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return `
            <div class="bg-gray-800 p-4 rounded-lg shadow-md mb-3">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-bold">${session.category}: ${session.subcategory} ${isFuture ? '<span class="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full ml-2">PLANNED</span>' : ''}</p>
                        <p class="text-sm text-gray-400">${dateString}</p>
                    </div>
                    <button data-action="edit-session" data-session-id="${session.id}" class="p-2 rounded-md bg-gray-700 hover:bg-gray-600">Edit</button>
                </div>
            </div>
        `;
    }).join('');
    list.innerHTML = sessionsHtml;
}

function renderDashboard() {
    const container = DOMElements.dashboardView;
    if (!container) return;
    container.innerHTML = ''; 
    const chartCard = createCard('Training Volume (7-Day Moving Average)', `<canvas id="volumeChart"></canvas>`);
    const sleepCard = createCard('Sleep (Last 30 Days)', `<canvas id="sleepChart"></canvas>`);
    const weightCard = createCard('Weight (Last 30 Days)', `<canvas id="weightChart"></canvas>`);
    const calorieCard = createCard('Calories (Last 30 Days)', `<canvas id="calorieChart"></canvas>`);
    container.append(chartCard, sleepCard, weightCard, calorieCard);
    renderDashboardCharts();
}

function initializeFormDOMElements() {
    DOMElements.form = document.getElementById('training-form');
    DOMElements.sessionIdInput = document.getElementById('session-id');
    DOMElements.dateInput = document.getElementById('date');
    DOMElements.categorySelect = document.getElementById('category');
    DOMElements.subcategorySelect = document.getElementById('subcategory');
    DOMElements.dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    DOMElements.sessionRatingInput = document.getElementById('sessionRating');
    DOMElements.detailsInput = document.getElementById('details');
    
    if(DOMElements.categorySelect) {
        populateCategoryDropdown();
        DOMElements.categorySelect.addEventListener('change', updateSubcategoryDropdown);
    }
    if(DOMElements.subcategorySelect) {
        DOMElements.subcategorySelect.addEventListener('change', () => renderDynamicFields(null));
    }
    if(DOMElements.form){
        DOMElements.form.addEventListener('submit', handleFormSubmit);
    }
}


// --- FORM & MODAL LOGIC ---
export function initializeUI() {
    DOMElements = {
        headerTitle: document.getElementById('header-title'),
        navButtons: document.querySelectorAll('.nav-item'),
        views: document.querySelectorAll('.view'),
        appContainer: document.getElementById('app-container'),
        logView: document.getElementById('log-view'),
        calendarView: document.getElementById('calendar-view'),
        historyView: document.getElementById('history-view'),
        dashboardView: document.getElementById('dashboard-view'),
    };
    
    // --- EVENT LISTENERS ---
    // Listen for clicks on navigation buttons
    DOMElements.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.dataset.view);
        });
    });

    // Use event delegation for dynamically added elements
    if (DOMElements.appContainer) {
        DOMElements.appContainer.addEventListener('click', e => {
            const action = e.target.dataset.action;
            if (action === 'edit-session') {
                const sessionId = e.target.dataset.sessionId;
                switchView('log-view', { sessionId });
            }
            if(action === 'prev-month') navigateCalendar(-1);
            if(action === 'next-month') navigateCalendar(1);
            // Add more actions here as needed
        });
    }

    // Listen for data changes to re-render relevant views
    document.addEventListener('datachanged', () => {
        const activeView = document.querySelector('.view.active');
        if (!activeView) return;

        if (activeView.id === 'history-view') {
            renderHistoryList();
        } else if (active.id === 'dashboard-view') {
            renderDashboard();
        } else if (active.id === 'calendar-view') {
            renderCalendar();
        }
    });

    // Initial render of the log view
    renderLogView(); 
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = DOMElements.sessionIdInput.value || Date.now().toString();
    const sessionData = {
        id: id,
        date: DOMElements.dateInput.value,
        category: DOMElements.categorySelect.value,
        subcategory: DOMElements.subcategorySelect.value,
        sessionRating: DOMElements.sessionRatingInput.value,
        generalNotes: DOMElements.detailsInput.value,
        details: {} // Populate this based on dynamic fields
    };

    // Example for collecting dynamic data, needs to be expanded
    const durationInput = DOMElements.dynamicFieldsContainer.querySelector('[name="duration"]');
    if (durationInput) {
        sessionData.details.duration = parseInt(durationInput.value, 10);
    }
    
    await saveSession(sessionData);
    switchView('history-view'); // Switch to history after saving
}


function resetForm() {
    if (!DOMElements.form) return;
    DOMElements.form.reset();
    if(DOMElements.sessionIdInput) DOMElements.sessionIdInput.value = '';
    if(DOMElements.dateInput) DOMElements.dateInput.value = new Date().toLocaleDateString('sv-SE');
    updateSubcategoryDropdown();
    renderDynamicFields(null);
}

function populateCategoryDropdown() {
    const select = DOMElements.categorySelect;
    if (!select) return;
    select.innerHTML = '<option value="">Select Category</option>';
    Object.keys(getTrainingConfig()).forEach(cat => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function updateSubcategoryDropdown() {
    const category = DOMElements.categorySelect?.value;
    const select = DOMElements.subcategorySelect;
    if (!select) return;
    select.innerHTML = '<option value="">Select Sub-category</option>';
    if (category && getTrainingConfig()[category]) {
        Object.keys(getTrainingConfig()[category]).forEach(subcat => {
            select.innerHTML += `<option value="${subcat}">${subcat}</option>`;
        });
    }
    renderDynamicFields(null);
}

function renderDynamicFields(data) {
    const container = DOMElements.dynamicFieldsContainer;
    if(!container) return;
    // ... rest of the function ...
}

function populateFormForEdit(sessionId) {
    const session = getSessionById(sessionId);
    if (!session) return;
    resetForm();
    // ... rest of the function ...
}

function createCard(title, contentHTML) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-4 rounded-lg shadow-lg';
    card.innerHTML = `<div>${contentHTML}</div>`;
    const titleEl = document.createElement('h2');
    titleEl.className = 'text-lg font-bold text-gray-200 mb-4';
    titleEl.textContent = title;
    card.prepend(titleEl);
    return card;
}