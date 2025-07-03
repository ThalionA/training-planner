import { getSessions, getWellness, getTrainingConfig } from './store.js';
import { Chart } from 'chart.js/auto';

const charts = {};
const CHART_DAYS = 30;
const MOVING_AVG_DAYS = 7;

const chartColors = { 
    Climbing: { border: 'rgba(59, 130, 246, 1)', bg: 'rgba(59, 130, 246, 0.1)' },
    Weights: { border: 'rgba(239, 68, 68, 1)', bg: 'rgba(239, 68, 68, 0.1)' },
    Running: { border: 'rgba(34, 197, 94, 1)', bg: 'rgba(34, 197, 94, 0.1)' },
    Other: { border: 'rgba(168, 85, 247, 1)', bg: 'rgba(168, 85, 247, 0.1)' }
};

function destroyAllCharts() {
    Object.values(charts).forEach(chart => chart.destroy());
}

function createLineChart(canvasId, label, labels, data, color) {
    if (charts[canvasId]) charts[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { 
            labels, 
            datasets: [{ 
                label, 
                data, 
                borderColor: color, 
                backgroundColor: color.replace('1)', '0.1)'), 
                fill: true, 
                tension: 0.3, 
                pointRadius: 2, 
                borderWidth: 2, 
                spanGaps: true 
            }] 
        },
        options: { 
            responsive: true, 
            plugins: { legend: { display: false } }, 
            scales: { 
                y: { beginAtZero: false, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, 
                x: { ticks: { color: '#9ca3af' }, grid: { display: false } } 
            } 
        }
    });
}

function renderMovingAverageChart() {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    const labels = [];
    const dateStringToDayIndex = new Map();
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toLocaleDateString('sv-SE');
        labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        dateStringToDayIndex.set(dateString, CHART_DAYS - 1 - i);
    }

    const dailyVolumes = {};
    const categories = Object.keys(getTrainingConfig());
    categories.forEach(cat => { dailyVolumes[cat] = Array(CHART_DAYS).fill(0); });

    getSessions().forEach(session => {
        if (dateStringToDayIndex.has(session.date)) {
            const dayIndex = dateStringToDayIndex.get(session.date);
            if (dailyVolumes[session.category] && session.details?.duration) {
                dailyVolumes[session.category][dayIndex] += session.details.duration;
            }
        }
    });

    const movingAverages = {};
    categories.forEach(cat => {
        movingAverages[cat] = [];
        for (let i = 0; i < CHART_DAYS; i++) {
            const start = Math.max(0, i - (MOVING_AVG_DAYS - 1));
            const end = i + 1;
            const windowSlice = dailyVolumes[cat].slice(start, end);
            const avg = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
            movingAverages[cat].push(avg);
        }
    });

    const datasets = categories.map(category => ({
        label: category,
        data: movingAverages[category],
        borderColor: chartColors[category].border,
        backgroundColor: chartColors[category].bg,
        fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2
    }));

    if (charts['volumeChart']) charts['volumeChart'].destroy();
    charts['volumeChart'] = new Chart(ctx, {
        type: 'line', 
        data: { labels, datasets },
        options: { 
            responsive: true, 
            plugins: { 
                legend: { position: 'top', labels: { color: '#d1d5db' } }, 
                tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(0)} min (avg)` } } 
            },
            scales: { 
                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, 
                y: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, title: { display: true, text: '7-Day Avg. Volume (minutes)', color: '#d1d5db' } } 
            }
        }
    });
}

function renderWellnessCharts() {
    const dateMap = new Map();
    const labels = [];
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toLocaleDateString('sv-SE');
        labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        dateMap.set(dateString, { index: CHART_DAYS - 1 - i, sleep: null, weight: null, calories: null });
    }

    getWellness().forEach(w => {
        if (dateMap.has(w.date)) {
            const entry = dateMap.get(w.date);
            entry.sleep = w.sleep;
            entry.weight = w.weight;
            entry.calories = w.calories;
        }
    });
    
    const sortedEntries = [...dateMap.values()].sort((a,b) => a.index - b.index);
    const sleepData = sortedEntries.map(e => e.sleep);
    const weightData = sortedEntries.map(e => e.weight);
    const calorieData = sortedEntries.map(e => e.calories);

    createLineChart('sleepChart', 'Sleep (hours)', labels, sleepData, 'rgba(110, 231, 183, 1)');
    createLineChart('weightChart', 'Weight (kg)', labels, weightData, 'rgba(129, 140, 248, 1)');
    createLineChart('calorieChart', 'Calories (kcal)', labels, calorieData, 'rgba(251, 146, 60, 1)');
}

export function renderDashboardCharts() {
    destroyAllCharts();
    renderMovingAverageChart();
    renderWellnessCharts();
}
