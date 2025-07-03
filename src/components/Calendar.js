import { getSessions } from '../store.js';

let currentCalendarDate = new Date();
let currentCalendarView = 'month';

const DOMElements = {
    calendarContainer: document.getElementById('calendar-container'),
    calendarTitle: document.getElementById('calendar-title'),
};

export function navigateCalendar(direction) {
    if (currentCalendarView === 'month') currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    else if (currentCalendarView === 'week') currentCalendarDate.setDate(currentCalendarDate.getDate() + (7 * direction));
    else if (currentCalendarView === 'day') currentCalendarDate.setDate(currentCalendarDate.getDate() + direction);
    renderCalendar();
}

export function setCalendarView(viewType) {
    currentCalendarView = viewType;
    document.querySelectorAll('.calendar-view-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-view-type="${viewType}"]`).classList.add('active');
    renderCalendar();
}

export function renderCalendar() {
    if (currentCalendarView === 'month') renderMonthView();
    else if (currentCalendarView === 'week') renderWeekView();
    else if (currentCalendarView === 'day') renderDayView();
}

function renderMonthView() {
    const container = DOMElements.calendarContainer;
    container.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    DOMElements.calendarTitle.textContent = `${currentCalendarDate.toLocaleString('default', { month: 'long' })} ${year}`;

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-7 gap-1 text-center';
    
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'font-bold text-gray-400 text-sm';
        dayEl.textContent = day;
        grid.appendChild(dayEl);
    });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.insertAdjacentHTML('beforeend', `<div class="calendar-day-month-view other-month"></div>`);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(year, month, day).toLocaleDateString('sv-SE');
        const daySessions = getSessions().filter(s => s.date === dateStr);
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
        
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day-month-view border border-gray-700 rounded-md p-1 flex flex-col cursor-pointer hover:bg-gray-700 ${isToday ? 'bg-blue-900/50' : ''}`;
        dayEl.dataset.action = 'open-day-detail';
        dayEl.dataset.date = dateStr;

        const dayNumEl = document.createElement('span');
        dayNumEl.className = 'text-xs self-start';
        dayNumEl.textContent = day;
        dayEl.appendChild(dayNumEl);

        const sessionsContainer = document.createElement('div');
        sessionsContainer.className = 'flex-grow mt-1 space-y-1 overflow-y-auto text-left';
        daySessions.forEach(session => {
            const colors = { Climbing: 'bg-blue-500', Weights: 'bg-red-500', Running: 'bg-green-500', Other: 'bg-gray-400' };
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'flex items-center text-xs';
            sessionDiv.innerHTML = `<span class="session-dot ${colors[session.category] || 'bg-gray-400'} mr-1"></span><span class="truncate"></span>`;
            sessionDiv.querySelector('span.truncate').textContent = session.subcategory;
            sessionsContainer.appendChild(sessionDiv);
        });
        dayEl.appendChild(sessionsContainer);
        grid.appendChild(dayEl);
    }
    container.appendChild(grid);
}

function renderWeekView() {
    const container = DOMElements.calendarContainer;
    container.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const day = currentCalendarDate.getDate();
    const dayOfWeek = currentCalendarDate.getDay();

    const startOfWeek = new Date(year, month, day - dayOfWeek);
    const endOfWeek = new Date(year, month, day - dayOfWeek + 6);
    
    DOMElements.calendarTitle.textContent = `${startOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${endOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})}`;
    
    const grid = document.createElement('div');
    grid.className = 'space-y-2';

    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const dateStr = d.toLocaleDateString('sv-SE');
        const daySessions = getSessions().filter(s => s.date === dateStr);
        const isToday = new Date().toDateString() === d.toDateString();

        const dayEl = document.createElement('div');
        dayEl.className = `p-2 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-700 ${isToday ? 'bg-blue-900/50' : ''}`;
        dayEl.dataset.action = 'open-day-detail';
        dayEl.dataset.date = dateStr;

        const titleEl = document.createElement('p');
        titleEl.className = 'font-semibold text-sm';
        titleEl.textContent = d.toLocaleDateString(undefined, {weekday: 'long', month: 'short', day: 'numeric'});
        dayEl.appendChild(titleEl);

        const sessionsContainer = document.createElement('div');
        sessionsContainer.className = 'mt-2 space-y-2';
        
        if (daySessions.length > 0) {
            daySessions.forEach(session => {
                const colors = { Climbing: 'bg-blue-500', Weights: 'bg-red-500', Running: 'bg-green-500', Other: 'bg-gray-400' };
                const sessionDiv = document.createElement('div');
                sessionDiv.className = 'flex items-center text-xs bg-gray-800 p-1 rounded';
                sessionDiv.innerHTML = `<span class="session-dot ${colors[session.category] || 'bg-gray-400'} mr-2"></span><span></span>`;
                sessionDiv.querySelector('span:last-child').textContent = session.subcategory;
                sessionsContainer.appendChild(sessionDiv);
            });
        } else {
            const noSessionEl = document.createElement('p');
            noSessionEl.className = 'text-xs text-gray-500';
            noSessionEl.textContent = 'No sessions';
            sessionsContainer.appendChild(noSessionEl);
        }
        dayEl.appendChild(sessionsContainer);
        grid.appendChild(dayEl);
    }
    container.appendChild(grid);
}

function renderDayView() {
    const container = DOMElements.calendarContainer;
    container.innerHTML = '';
    DOMElements.calendarTitle.textContent = currentCalendarDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dateStr = currentCalendarDate.toLocaleDateString('sv-SE');

    const daySessions = getSessions().filter(s => s.date === dateStr);
    const wellness = getWellness().find(w => w.date === dateStr);
    
    const dayContainer = document.createElement('div');
    dayContainer.className = 'space-y-4';

    if (wellness) {
        const wellnessEl = document.createElement('div');
        wellnessEl.className = 'bg-gray-800 p-3 rounded-lg';
        wellnessEl.innerHTML = `
            <h3 class="font-semibold mb-2">Wellness</h3>
            <div class="flex justify-around text-center text-sm">
                <div><p class="font-bold text-lg">${wellness.sleep || 'N/A'}</p><p class="text-xs text-gray-400">Sleep (h)</p></div>
                <div><p class="font-bold text-lg">${wellness.weight || 'N/A'}</p><p class="text-xs text-gray-400">Weight (kg)</p></div>
                <div><p class="font-bold text-lg">${wellness.calories || 'N/A'}</p><p class="text-xs text-gray-400">Calories</p></div>
            </div>`;
        dayContainer.appendChild(wellnessEl);
    }

    if (daySessions.length > 0) {
        daySessions.forEach(s => {
            const sessionEl = document.createElement('div');
            sessionEl.className = 'bg-gray-800 p-3 rounded-lg';
            sessionEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <h3 class="font-semibold"></h3>
                    <button data-action="edit-session" data-session-id="${s.id}" class="text-xs py-1 px-2 bg-blue-600 rounded">Edit</button>
                </div>
                <p class="text-sm text-gray-400 mt-1"></p>
            `;
            sessionEl.querySelector('h3').textContent = `${s.category}: ${s.subcategory}`;
            sessionEl.querySelector('.text-gray-400').textContent = `Rating: ${s.sessionRating || 'N/A'}/10`;
            if (s.generalNotes) {
                const notesP = document.createElement('p');
                notesP.className = 'text-sm mt-2 italic';
                notesP.textContent = `"${s.generalNotes}"`;
                sessionEl.appendChild(notesP);
            }
            dayContainer.appendChild(sessionEl);
        });
    } else {
        dayContainer.innerHTML += `<p class="text-center text-gray-500 py-8">No sessions logged for this day.</p>`;
    }
    
    const addButton = document.createElement('button');
    addButton.dataset.action = 'add-session-for-date';
    addButton.dataset.date = dateStr;
    addButton.className = 'w-full mt-4 py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700';
    addButton.textContent = 'Add Session for this Day';
    dayContainer.appendChild(addButton);
    container.appendChild(dayContainer);
}
