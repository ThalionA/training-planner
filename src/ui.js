import { getSessions, getWellness, getTrainingConfig, getSessionById, saveSession, saveWellness } from './store.js';
import { renderCalendar, navigateCalendar, setCalendarView } from './components/Calendar.js';
import { renderDashboardCharts } from './charts.js';

// This object will be populated once the DOM is loaded
let DOMElements = {};

// --- VIEW MANAGEMENT ---

export function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

export function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    switchView('log-view'); // Set the default view when the app loads
}

export function switchView(viewId, context = null) {
    if (!DOMElements.views) return;

    DOMElements.views.forEach(v => v.classList.remove('active'));
    const newView = document.getElementById(viewId);
    if (newView) newView.classList.add('active');

    DOMElements.navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));

    const viewTitles = { 'log-view': 'Log Session', 'calendar-view': 'Calendar', 'history-view': 'History', 'dashboard-view': 'Dashboard' };
    if (DOMElements.headerTitle) DOMElements.headerTitle.textContent = viewTitles[viewId] || 'Training Planner';

    // Render the specific content for the new view
    if (viewId === 'log-view') {
        renderLogView(context);
    } else if (viewId === 'calendar-view') {
        renderCalendarView();
    } else if (viewId === 'history-view') {
        renderHistoryList();
    } else if (viewId === 'dashboard-view') {
        renderDashboard();
    }
}

// --- RENDER FUNCTIONS FOR EACH VIEW ---

function renderLogView(context) {
    const logView = DOMElements.logView;
    if (!logView) return;

    // Inject the complete form HTML into the log-view div
    logView.innerHTML = `
        <div class="space-y-6">
            <button type="button" data-action="log-wellness" class="w-full flex justify-center items-center gap-2 py-3 px-4 border border-dashed border-teal-500 rounded-md shadow-sm text-sm font-medium text-teal-400 bg-teal-900/50 hover:bg-teal-900/80">
                Log Wellness
            </button>
            <hr class="border-gray-700">
            <h2 class="text-center text-lg font-semibold text-gray-300">Log a Training Session</h2>
            <form id="training-form" class="space-y-6">
                <input type="hidden" id="session-id" name="sessionId">
                <div>
                    <label for="date" class="block text-sm font-medium text-gray-300">Date</label>
                    <input type="date" id="date" name="date" required class="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-3 text-white">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="category" class="block text-sm font-medium text-gray-300">Category</label>
                        <select id="category" name="category" required class="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-3 text-white"></select>
                    </div>
                    <div>
                        <label for="subcategory" class="block text-sm font-medium text-gray-300">Sub-category</label>
                        <select id="subcategory" name="subcategory" required class="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-3 text-white"></select>
                    </div>
                </div>
                <div id="dynamic-fields-container" class="space-y-4 pt-4 border-t border-gray-700"></div>
                <div>
                    <label for="details" class="block text-sm font-medium text-gray-300">General Notes</label>
                    <textarea id="details" name="details" rows="2" class="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-3 text-white" placeholder="Any general thoughts on the session..."></textarea>
                </div>
                <div>
                    <label for="sessionRating" class="block text-sm font-medium text-gray-300">Session Rating (1-10)</label>
                    <input type="number" id="sessionRating" name="sessionRating" min="1" max="10" class="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-3 text-white" placeholder="How you felt">
                </div>
                <div>
                    <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        Save Session
                    </button>
                </div>
            </form>
        </div>`;

    // After injecting the form, we need to find its elements and attach listeners
    initializeFormDOMElements();

    // Handle editing context
    if (context?.sessionId) {
        if (DOMElements.headerTitle) DOMElements.headerTitle.textContent = 'Edit Session';
        populateFormForEdit(context.sessionId);
    } else {
        if (DOMElements.headerTitle) DOMElements.headerTitle.textContent = 'Log Session';
        resetForm();
        if (context?.date && DOMElements.dateInput) DOMElements.dateInput.value = context.date;
    }
}

function renderCalendarView() {
    const calendarView = DOMElements.calendarView;
    if (!calendarView) return;
    calendarView.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <button data-action="prev-period" class="p-2 rounded-md bg-gray-700 hover:bg-gray-600" aria-label="Previous Period">&lt;</button>
            <h2 id="calendar-title" class="text-xl font-semibold"></h2>
            <button data-action="next-period" class="p-2 rounded-md bg-gray-700 hover:bg-gray-600" aria-label="Next Period">&gt;</button>
        </div>
        <div class="flex justify-center mb-4 bg-gray-800 rounded-md p-1">
            <button data-action="set-calendar-view" data-view-type="month" class="calendar-view-btn flex-1 text-sm py-1 px-3 rounded-md active">Month</button>
            <button data-action="set-calendar-view" data-view-type="week" class="calendar-view-btn flex-1 text-sm py-1 px-3 rounded-md">Week</button>
            <button data-action="set-calendar-view" data-view-type="day" class="calendar-view-btn flex-1 text-sm py-1 px-3 rounded-md">Day</button>
        </div>
        <div id="calendar-container"></div>`;
    renderCalendar();
}

function renderHistoryList() {
    const historyView = DOMElements.historyView;
    if (!historyView) return;

    const allSessions = getSessions();
    if (allSessions.length === 0) {
        historyView.innerHTML = `<p class="text-center text-gray-500 py-8">No sessions logged yet.</p>`;
        return;
    }

    const sortedSessions = [...allSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const listHtml = sortedSessions.map(session => {
        const isFuture = new Date(session.date) >= new Date().setHours(0, 0, 0, 0) && session.date !== new Date().toLocaleDateString('sv-SE');
        const dateString = new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        return `
            <div class="bg-gray-800 p-4 rounded-lg shadow-lg flex justify-between items-center mb-3">
                <div>
                    <p class="font-bold">${session.category}: ${session.subcategory} ${isFuture ? '<span class="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full ml-2">PLANNED</span>' : ''}</p>
                    <p class="text-sm text-gray-400">${dateString}</p>
                </div>
                <button data-action="edit-session" data-session-id="${session.id}" class="p-2 rounded-md bg-gray-700 hover:bg-gray-600">Edit</button>
            </div>`;
    }).join('');

    historyView.innerHTML = `<div id="history-list" class="space-y-4">${listHtml}</div>`;
}

function renderDashboard() {
    const dashboardView = DOMElements.dashboardView;
    if (!dashboardView) return;
    dashboardView.innerHTML = `
        <div class="space-y-6" id="dashboard-content">
            ${createCardHTML('Training Volume (7-Day Moving Average)', `<canvas id="volumeChart"></canvas>`)}
            ${createCardHTML('Sleep (Last 30 Days)', `<canvas id="sleepChart"></canvas>`)}
            ${createCardHTML('Weight (Last 30 Days)', `<canvas id="weightChart"></canvas>`)}
            ${createCardHTML('Calories (Last 30 Days)', `<canvas id="calorieChart"></canvas>`)}
        </div>`;
    renderDashboardCharts();
}

// --- INITIALIZATION and EVENT HANDLING ---

export function initializeUI() {
    // Select all static elements from the DOM at startup
    DOMElements = {
        headerTitle: document.getElementById('header-title'),
        navButtons: document.querySelectorAll('.nav-item'),
        views: document.querySelectorAll('.view'),
        appContainer: document.getElementById('app-container'),
        logView: document.getElementById('log-view'),
        calendarView: document.getElementById('calendar-view'),
        historyView: document.getElementById('history-view'),
        dashboardView: document.getElementById('dashboard-view'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        wellnessModal: document.getElementById('wellness-modal'),
        dayDetailModal: document.getElementById('day-detail-modal'),
        wellnessForm: document.getElementById('wellness-form'),
    };

    // Attach all global event listeners
    DOMElements.navButtons.forEach(button => {
        button.addEventListener('click', () => switchView(button.dataset.view));
    });

    DOMElements.appContainer.addEventListener('click', handleGlobalClick);
    DOMElements.wellnessForm.addEventListener('submit', handleWellnessSubmit);

    document.addEventListener('datachanged', () => {
        const activeView = document.querySelector('.view.active');
        if (activeView) {
            switchView(activeView.id); // Re-render the current view to show new data
        }
    });
}

function handleGlobalClick(e) {
    const target = e.target;
    // Find the closest parent with a data-action attribute
    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    switch (action) {
        case 'logout':
            // This is handled by auth.js, so we don't need to do anything here.
            break;
        case 'log-wellness':
            openModal('wellness-modal');
            break;
        case 'close-modal':
            closeModal();
            break;
        case 'prev-period':
            navigateCalendar(-1);
            break;
        case 'next-period':
            navigateCalendar(1);
            break;
        case 'set-calendar-view':
            setCalendarView(actionTarget.dataset.viewType);
            break;
        case 'open-day-detail':
            const date = actionTarget.closest('[data-date]').dataset.date;
            openModal('day-detail-modal', { date });
            break;
        case 'add-session-for-date':
            const newDate = DOMElements.dayDetailModal.dataset.date;
            closeModal();
            switchView('log-view', { date: newDate });
            break;
        case 'edit-session':
            const sessionId = actionTarget.dataset.sessionId;
            closeModal();
            switchView('log-view', { sessionId });
            break;
        case 'add-exercise':
            DOMElements.form.querySelector('#exercises-list').appendChild(createExerciseRow());
            break;
        case 'add-boulder-grade':
            DOMElements.form.querySelector('#bouldering-grades').appendChild(createBoulderGradeRow());
            break;
        case 'add-route':
            DOMElements.form.querySelector('#routes-list').appendChild(createRouteRow());
            break;
        case 'remove-row':
            actionTarget.closest('div.grid').remove();
            break;
    }
}


// --- FORM HANDLING ---

function initializeFormDOMElements() {
    // Find elements within the newly rendered form
    DOMElements.form = document.getElementById('training-form');
    DOMElements.sessionIdInput = document.getElementById('session-id');
    DOMElements.dateInput = document.getElementById('date');
    DOMElements.categorySelect = document.getElementById('category');
    DOMElements.subcategorySelect = document.getElementById('subcategory');
    DOMElements.dynamicFieldsContainer = document.getElementById('dynamic-fields-container');

    // Attach listeners to form elements
    populateCategoryDropdown();
    DOMElements.categorySelect.addEventListener('change', updateSubcategoryDropdown);
    DOMElements.subcategorySelect.addEventListener('change', () => renderDynamicFields(null));
    DOMElements.form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(DOMElements.form);
    const id = formData.get('sessionId') || Date.now().toString();
    const session = {
        id: String(id),
        date: formData.get('date'),
        category: formData.get('category'),
        subcategory: formData.get('subcategory'),
        sessionRating: Number(formData.get('sessionRating')) || null,
        generalNotes: formData.get('details'),
        details: {}
    };

    // Collect data from dynamic fields
    session.details.duration = Number(formData.get('duration')) || null;

    if (session.category === 'Climbing') {
        session.details.venue = formData.get('venue');
        session.details.warmup = {
            pullups: { sets: formData.get('warmupPullupsSets'), reps: formData.get('warmupPullupsReps'), weight: formData.get('warmupPullupsWeight') },
            fingerboard: { sets: formData.get('warmupFingerboardSets'), reps: formData.get('warmupFingerboardReps'), weight: formData.get('warmupFingerboardWeight') }
        };
    }

    const fieldType = getTrainingConfig()[session.category]?.[session.subcategory]?.type;
    switch (fieldType) {
        case 'running':
            session.details.distance = Number(formData.get('distance'));
            session.details.pace = formData.get('pace');
            session.details.avgHR = Number(formData.get('avgHR'));
            session.details.elevationGain = Number(formData.get('elevationGain'));
            break;
        case 'weights':
            session.details.exercises = [];
            const exerciseNames = formData.getAll('exerciseName');
            const sets = formData.getAll('sets');
            const reps = formData.getAll('reps');
            const weights = formData.getAll('weight');
            for (let i = 0; i < exerciseNames.length; i++) {
                if (exerciseNames[i]) {
                    session.details.exercises.push({ name: exerciseNames[i], sets: sets[i], reps: reps[i], weight: weights[i] });
                }
            }
            break;
        case 'bouldering':
            session.details.grades = {};
            const boulderGrades = formData.getAll('boulderGrade');
            const boulderCounts = formData.getAll('boulderCount');
            for (let i = 0; i < boulderGrades.length; i++) {
                if (boulderGrades[i] && boulderCounts[i]) {
                    session.details.grades[boulderGrades[i]] = Number(boulderCounts[i]);
                }
            }
            break;
        case 'sport':
            session.details.type = formData.get('type');
            session.details.routes = [];
            const routeGrades = formData.getAll('routeGrade');
            const routeOutcomes = formData.getAll('routeOutcome');
            for (let i = 0; i < routeGrades.length; i++) {
                if (routeGrades[i]) {
                    session.details.routes.push({ grade: routeGrades[i], outcome: routeOutcomes[i] });
                }
            }
            break;
    }
    await saveSession(session);
    switchView('history-view');
}

function populateFormForEdit(sessionId) {
    const session = getSessionById(sessionId);
    if (!session) return;

    resetForm();

    DOMElements.sessionIdInput.value = session.id;
    DOMElements.dateInput.value = session.date;
    DOMElements.categorySelect.value = session.category;
    updateSubcategoryDropdown();

    setTimeout(() => {
        DOMElements.subcategorySelect.value = session.subcategory;
        renderDynamicFields(session.details);
        DOMElements.form.querySelector('#details').value = session.generalNotes || '';
        DOMElements.form.querySelector('#sessionRating').value = session.sessionRating || '';
    }, 50); // Timeout allows subcategory options to render first
}


// --- MODAL HANDLING ---

function openModal(modalId, context = {}) {
    DOMElements.modalBackdrop.classList.remove('hidden');
    const modal = DOMElements[modalId];
    if (!modal) return;

    if (modalId === 'wellness-modal') {
        const date = context.date || new Date().toLocaleDateString('sv-SE');
        const existing = getWellness().find(w => w.date === date) || {};
        DOMElements.wellnessForm.querySelector('#wellness-date').value = date;
        DOMElements.wellnessForm.querySelector('#wellness-sleep').value = existing.sleep || '';
        DOMElements.wellnessForm.querySelector('#wellness-weight').value = existing.weight || '';
        DOMElements.wellnessForm.querySelector('#wellness-calories').value = existing.calories || '';
    } else if (modalId === 'day-detail-modal') {
        modal.dataset.date = context.date;
        document.getElementById('day-detail-title').textContent = new Date(context.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        const contentEl = document.getElementById('day-detail-content');
        const daySessions = getSessions().filter(s => s.date === context.date);

        if (daySessions.length > 0) {
            contentEl.innerHTML = daySessions.map(s => `
                <div class="bg-gray-700 p-2 rounded flex justify-between items-center">
                    <span>${s.category}: ${s.subcategory}</span>
                    <button data-action="edit-session" data-session-id="${s.id}" class="text-xs py-1 px-2 bg-blue-600 rounded">Edit</button>
                </div>`).join('');
        } else {
            contentEl.innerHTML = `<p class="text-gray-500">No sessions logged for this day.</p>`;
        }
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    DOMElements.modalBackdrop.classList.add('hidden');
    DOMElements.wellnessModal.classList.add('hidden');
    DOMElements.dayDetailModal.classList.add('hidden');
}

async function handleWellnessSubmit(e) {
    e.preventDefault();
    const date = DOMElements.wellnessForm.querySelector('#wellness-date').value;
    const wellnessEntry = {
        date,
        sleep: Number(DOMElements.wellnessForm.querySelector('#wellness-sleep').value) || null,
        weight: Number(DOMElements.wellnessForm.querySelector('#wellness-weight').value) || null,
        calories: Number(DOMElements.wellnessForm.querySelector('#wellness-calories').value) || null,
    };
    await saveWellness(wellnessEntry);
    closeModal();
}


// --- UTILITY/HELPER FUNCTIONS ---

function resetForm() {
    if (!DOMElements.form) return;
    DOMElements.form.reset();
    if (DOMElements.sessionIdInput) DOMElements.sessionIdInput.value = '';
    if (DOMElements.dateInput) DOMElements.dateInput.value = new Date().toLocaleDateString('sv-SE');
    updateSubcategoryDropdown();
    renderDynamicFields(null);
}

function populateCategoryDropdown() {
    if (!DOMElements.categorySelect) return;
    DOMElements.categorySelect.innerHTML = '<option value="">Select Category</option>';
    Object.keys(getTrainingConfig()).forEach(cat => {
        DOMElements.categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function updateSubcategoryDropdown() {
    if (!DOMElements.categorySelect || !DOMElements.subcategorySelect) return;
    const category = DOMElements.categorySelect.value;
    DOMElements.subcategorySelect.innerHTML = '<option value="">Select Sub-category</option>';
    if (category && getTrainingConfig()[category]) {
        Object.keys(getTrainingConfig()[category]).forEach(subcat => {
            DOMElements.subcategorySelect.innerHTML += `<option value="${subcat}">${subcat}</option>`;
        });
    }
    renderDynamicFields(null);
}

function renderDynamicFields(data) {
    const container = DOMElements.dynamicFieldsContainer;
    if (!container) return;

    const category = DOMElements.categorySelect.value;
    const subcategory = DOMElements.subcategorySelect.value;
    container.innerHTML = '';
    if (!category || !subcategory) return;

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

function createCardHTML(title, contentHTML) {
    return `
        <div class="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 class="text-lg font-bold text-gray-200 mb-4">${title}</h2>
            <div>${contentHTML}</div>
        </div>`;
}