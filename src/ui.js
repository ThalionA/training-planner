import { getSessions, getWellness, getTrainingConfig, getSessionById, saveSession, saveWellness } from './store.js';
import { renderCalendar } from './components/Calendar.js';
import { renderDashboardCharts } from './charts.js';

// --- ELEMENT SELECTORS ---
// We declare the variable here, but we will define it inside initializeUI
let DOMElements = {};

// --- VIEW MANAGEMENT ---
export function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

export function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
}

export function switchView(viewId, context = null) {
    DOMElements.views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    DOMElements.navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));

    const viewTitles = { 'log-view': 'Log/Edit', 'calendar-view': 'Calendar', 'history-view': 'History', 'dashboard-view': 'Dashboard' };
    DOMElements.headerTitle.textContent = viewTitles[viewId];

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
    // Check if the form element exists before proceeding
    if (!DOMElements.form) return;

    if (context?.sessionId) {
        DOMElements.headerTitle.textContent = 'Edit Session';
        populateFormForEdit(context.sessionId);
    } else {
        DOMElements.headerTitle.textContent = 'Log Session';
        resetForm();
        if(context?.date && DOMElements.dateInput) DOMElements.dateInput.value = context.date;
    }
}

function renderHistoryList() {
    const list = DOMElements.historyView;
    if (!list) return;
    list.innerHTML = '';
    const allSessions = getSessions();
    if (allSessions.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-500">No sessions logged yet.</p>`;
        return;
    }
    
    const sortedSessions = [...allSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedSessions.forEach(session => {
        const isFuture = new Date(session.date) >= new Date().setHours(0,0,0,0) && session.date !== new Date().toLocaleDateString('sv-SE');
        const div = document.createElement('div');
        div.className = 'bg-gray-800 p-4 rounded-lg shadow-lg flex justify-between items-center';
        div.dataset.sessionId = session.id;
        div.innerHTML = `
            <div>
                <p class="font-bold"></p>
                <p class="text-sm text-gray-400"></p>
            </div>
            <button data-action="edit-session" class="p-2 rounded-md bg-gray-700 hover:bg-gray-600">Edit</button>
        `;
        div.querySelector('.font-bold').innerHTML = `${session.category}: ${session.subcategory} ${isFuture ? '<span class="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full ml-2">PLANNED</span>' : ''}`;
        div.querySelector('.text-gray-400').textContent = new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        list.appendChild(div);
    });
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

// --- FORM & MODAL LOGIC ---
export function initializeUI() {
    // Now we populate the DOMElements object, safely after the DOM has loaded.
    DOMElements = {
        headerTitle: document.getElementById('header-title'),
        navButtons: document.querySelectorAll('.nav-item'),
        views: document.querySelectorAll('.view'),
        form: document.getElementById('training-form'),
        sessionIdInput: document.getElementById('session-id'),
        dateInput: document.getElementById('date'),
        categorySelect: document.getElementById('category'),
        subcategorySelect: document.getElementById('subcategory'),
        dynamicFieldsContainer: document.getElementById('dynamic-fields-container'),
        wellnessForm: document.getElementById('wellness-form'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        wellnessModal: document.getElementById('wellness-modal'),
        dayDetailModal: document.getElementById('day-detail-modal'),
        logView: document.getElementById('log-view'),
        calendarView: document.getElementById('calendar-view'),
        historyView: document.getElementById('history-view'),
        dashboardView: document.getElementById('dashboard-view'),
    };
    
    // Fallback for form to prevent errors if it's not found
    if (!DOMElements.form) {
        DOMElements.form = {
            reset: () => {}, // mock reset function
            querySelector: () => ({ value: '' }), // mock querySelector
        };
    }

    populateCategoryDropdown();
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
    const category = DOMElements.categorySelect?.value;
    const subcategory = DOMElements.subcategorySelect?.value;
    const container = DOMElements.dynamicFieldsContainer;
    if (!container || !category || !subcategory) {
        if(container) container.innerHTML = '';
        return;
    };
    container.innerHTML = '';

    const fieldType = getTrainingConfig()[category][subcategory].type;
    let finalHtml = '';

    if (category === 'Climbing') {
        finalHtml += `<div><label class="text-sm text-gray-300">Venue</label><select name="venue" class="mt-1 w-full bg-gray-700 p-2 rounded"><option value="Indoors" ${data?.venue === 'Indoors' ? 'selected' : ''}>Indoors</option><option value="Outdoors" ${data?.venue === 'Outdoors' ? 'selected' : ''}>Outdoors</option></select></div>`;
        const wu = data?.warmup || {};
        finalHtml += `
            <details class="bg-gray-800/50 rounded-md">
                <summary class="p-2 cursor-pointer font-semibold text-sm text-gray-300">Warmup Details</summary>
                <div class="p-3 border-t border-gray-700 space-y-3">
                    <div>
                        <p class="text-sm font-medium">Pullups</p>
                        <div class="grid grid-cols-3 gap-2 mt-1">
                            <input type="number" name="warmupPullupsSets" placeholder="Sets" class="bg-gray-700 p-2 rounded" value="${wu.pullups?.sets || ''}">
                            <input type="number" name="warmupPullupsReps" placeholder="Reps" class="bg-gray-700 p-2 rounded" value="${wu.pullups?.reps || ''}">
                            <input type="number" name="warmupPullupsWeight" placeholder="Weight (kg)" class="bg-gray-700 p-2 rounded" value="${wu.pullups?.weight || ''}">
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-medium">Fingerboard</p>
                        <div class="grid grid-cols-3 gap-2 mt-1">
                            <input type="number" name="warmupFingerboardSets" placeholder="Sets" class="bg-gray-700 p-2 rounded" value="${wu.fingerboard?.sets || ''}">
                            <input type="number" name="warmupFingerboardReps" placeholder="Reps" class="bg-gray-700 p-2 rounded" value="${wu.fingerboard?.reps || ''}">
                            <input type="number" name="warmupFingerboardWeight" placeholder="Weight (kg)" class="bg-gray-700 p-2 rounded" value="${wu.fingerboard?.weight || ''}">
                        </div>
                    </div>
                </div>
            </details>
        `;
    }

    if (fieldType !== 'running') {
        finalHtml += `<div><label class="text-sm text-gray-300">Duration (min)</label><input type="number" name="duration" class="mt-1 w-full bg-gray-700 p-2 rounded" value="${data?.duration || ''}"></div>`;
    }

    switch (fieldType) {
        case 'running':
            finalHtml += `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm text-gray-300">Distance (km)</label><input type="number" step="0.1" name="distance" class="mt-1 w-full bg-gray-700 p-2 rounded" value="${data?.distance || ''}"></div>
                    <div><label class="text-sm text-gray-300">Duration (min)</label><input type="number" name="duration" class="mt-1 w-full bg-gray-700 p-2 rounded" value="${data?.duration || ''}"></div>
                    <div><label class="text-sm text-gray-300">Avg Pace (min/km)</label><input type="text" name="pace" class="mt-1 w-full bg-gray-700 p-2 rounded" value="${data?.pace || ''}"></div>
                    <div><label class="text-sm text-gray-300">Avg HR</label><input type="number" name="avgHR" class="mt-1 w-full bg-gray-700 p-2 rounded" value="${data?.avgHR || ''}"></div>
                    <div><label class="text-sm text-gray-300">Elevation (m)</label><input type="number" name="elevationGain" class="mt-1 w-full bg-gray-700 p-2 rounded" value="${data?.elevationGain || ''}"></div>
                </div>`;
            break;
        case 'weights':
            finalHtml += `<div id="exercises-list" class="space-y-3"></div>
                        <button type="button" data-action="add-exercise" class="text-sm text-blue-400 hover:text-blue-300">+ Add Exercise</button>`;
            container.innerHTML = finalHtml;
            const list = document.getElementById('exercises-list');
            if(list) (data?.exercises || [{}]).forEach(ex => list.appendChild(createExerciseRow(ex)));
            return;
        case 'bouldering':
            finalHtml += `<label class="text-sm text-gray-300">Problems per Grade</label><div id="bouldering-grades" class="space-y-2"></div>
                        <button type="button" data-action="add-boulder-grade" class="text-sm text-blue-400 hover:text-blue-300">+ Add Grade</button>`;
            container.innerHTML = finalHtml;
            const gradeList = document.getElementById('bouldering-grades');
            if(gradeList) {
                const grades = data?.grades || {};
                if (Object.keys(grades).length > 0) {
                    Object.entries(grades).forEach(([grade, count]) => gradeList.appendChild(createBoulderGradeRow(grade, count)));
                } else {
                    gradeList.appendChild(createBoulderGradeRow());
                }
            }
            return;
        case 'sport':
             finalHtml += `<div><label class="text-sm text-gray-300">Climbing Type</label><select name="type" class="mt-1 w-full bg-gray-700 p-2 rounded"><option value="Lead" ${data?.type === 'Lead' ? 'selected' : ''}>Lead</option><option value="Top Rope" ${data?.type === 'Top Rope' ? 'selected' : ''}>Top Rope</option></select></div>
                        <div id="routes-list" class="space-y-3"></div>
                        <button type="button" data-action="add-route" class="text-sm text-blue-400 hover:text-blue-300">+ Add Route</button>`;
            container.innerHTML = finalHtml;
            const routeList = document.getElementById('routes-list');
            if(routeList) (data?.routes || [{}]).forEach(r => routeList.appendChild(createRouteRow(r)));
            return;
    }
    container.innerHTML = finalHtml;
}

function createExerciseRow(data = {}) {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-12 gap-2 items-center';
    div.innerHTML = `
        <input type="text" name="exerciseName" placeholder="Exercise" class="col-span-4 bg-gray-700 p-2 rounded" value="">
        <input type="text" name="sets" placeholder="Sets" class="col-span-2 bg-gray-700 p-2 rounded" value="">
        <input type="text" name="reps" placeholder="Reps" class="col-span-2 bg-gray-700 p-2 rounded" value="">
        <input type="text" name="weight" placeholder="Weight" class="col-span-3 bg-gray-700 p-2 rounded" value="">
        <button type="button" data-action="remove-row" class="col-span-1 text-red-500 hover:text-red-400" aria-label="Remove exercise">&times;</button>
    `;
    div.querySelector('[name="exerciseName"]').value = data.name || '';
    div.querySelector('[name="sets"]').value = data.sets || '';
    div.querySelector('[name="reps"]').value = data.reps || '';
    div.querySelector('[name="weight"]').value = data.weight || '';
    return div;
}

function createBoulderGradeRow(grade = '', count = '') {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-12 gap-2 items-center';
    div.innerHTML = `
        <input type="text" name="boulderGrade" placeholder="e.g., V5" class="col-span-5 bg-gray-700 p-2 rounded" value="">
        <input type="number" name="boulderCount" placeholder="Count" class="col-span-6 bg-gray-700 p-2 rounded" value="">
        <button type="button" data-action="remove-row" class="col-span-1 text-red-500 hover:text-red-400" aria-label="Remove grade">&times;</button>
    `;
    div.querySelector('[name="boulderGrade"]').value = grade;
    div.querySelector('[name="boulderCount"]').value = count;
    return div;
}

function createRouteRow(data = {}) {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-12 gap-2 items-center';
    div.innerHTML = `
        <input type="text" name="routeGrade" placeholder="Grade" class="col-span-5 bg-gray-700 p-2 rounded" value="">
        <select name="routeOutcome" class="col-span-6 bg-gray-700 p-2 rounded">
            <option value="Onsight">Onsight</option>
            <option value="Flash">Flash</option>
            <option value="Redpoint">Redpoint</option>
            <option value="Attempt">Attempt</option>
        </select>
        <button type="button" data-action="remove-row" class="col-span-1 text-red-500 hover:text-red-400" aria-label="Remove route">&times;</button>
    `;
    div.querySelector('[name="routeGrade"]').value = data.grade || '';
    div.querySelector('[name="routeOutcome"]').value = data.outcome || 'Attempt';
    return div;
}

function populateFormForEdit(sessionId) {
    const session = getSessionById(sessionId);
    if (!session || !DOMElements.form) return;
    resetForm();
    DOMElements.sessionIdInput.value = session.id;
    DOMElements.dateInput.value = session.date;
    DOMElements.categorySelect.value = session.category;
    updateSubcategoryDropdown();
    
    DOMElements.subcategorySelect.value = session.subcategory;
    renderDynamicFields(session.details);
    const detailsInput = DOMElements.form.querySelector('#details');
    const ratingInput = DOMElements.form.querySelector('#sessionRating');
    if (detailsInput) detailsInput.value = session.generalNotes || '';
    if (ratingInput) ratingInput.value = session.sessionRating || '';
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

export { DOMElements, openModal, closeModal };