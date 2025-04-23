// Define chart variables at the top level so they can be updated
let focusTimeChart = null;
let taskCompletionChart = null;

// Function to update charts - this is called from app.js
window.updateAnalyticsCharts = function () {
  if (!window.analyticsData || !window.analyticsData.length) {
    console.log('No analytics data available');
    return;
  }

  const data = window.analyticsData;

  const focusTimeCtx = document.getElementById('focus-time-chart')?.getContext('2d');
  const taskCompletionCtx = document.getElementById('task-completion-chart')?.getContext('2d');

  if (!focusTimeCtx || !taskCompletionCtx) {
    console.error('Chart contexts not found');
    return;
  }

  // Calculate overall task stats
  let totalTasksCreated = 0;
  let totalTasksCompleted = 0;

  data.forEach(day => {
    totalTasksCreated += day.tasksCreated || 0;
    totalTasksCompleted += day.tasksCompleted || 0;
  });

  const completionRate = totalTasksCreated > 0
    ? Math.round((totalTasksCompleted / totalTasksCreated) * 100)
    : 0;

  const completionRateElement = document.getElementById('completion-rate');
  if (completionRateElement) {
    completionRateElement.textContent = `${completionRate}%`;
  }

  // Weekly focus time
  const totalWeeklyFocusTime = data.reduce((sum, day) => sum + (day.focusTime || 0), 0);
  const weeklyFocusTimeElement = document.getElementById('focus-time-week');
  if (weeklyFocusTimeElement) {
    weeklyFocusTimeElement.textContent = `${totalWeeklyFocusTime} min`;
  }

  // Destroy previous charts to prevent overlap
  if (focusTimeChart) {
    focusTimeChart.destroy();
    focusTimeChart = null;
  }
  if (taskCompletionChart) {
    taskCompletionChart.destroy();
    taskCompletionChart = null;
  }

  // Focus Time Chart
  focusTimeChart = new Chart(focusTimeCtx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Focus Time (minutes)',
        data: data.map(d => d.focusTime || 0),
        backgroundColor: '#6366f1',
        borderColor: '#4f46e5',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 60,
          ticks: {
            stepSize: 5
          }
        }
      }
    }
  });

  // Task Completion Chart (number of tasks completed per day)
  const taskCounts = data.map(d => d.tasksCompleted || 0);
  const maxTasks = Math.max(...taskCounts, 10);

  taskCompletionChart = new Chart(taskCompletionCtx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Tasks Completed',
        data: taskCounts,
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: maxTasks,
          ticks: {
            stepSize: 1,
            callback: function (value) {
              return Number.isInteger(value) ? value : '';
            }
          }
        }
      }
    }
  });

  console.log('Analytics charts updated successfully');
};

// Setup charts on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
  const analyticsView = document.getElementById('analytics-view');

  if (!analyticsView) {
    console.error('analytics-view container not found');
    return;
  }

  // Focus Time Card
  if (!document.getElementById('focus-time-chart')) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '2rem';
    card.innerHTML = `
      <h3>Today's Focus Time</h3>
      <canvas id="focus-time-chart"></canvas>
    `;
    analyticsView.appendChild(card);
  }

  // Task Completion Card
  if (!document.getElementById('task-completion-chart')) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '2rem';
    card.innerHTML = `
      <h3>Tasks Completed Per Day</h3>
      <canvas id="task-completion-chart"></canvas>
    `;
    analyticsView.appendChild(card);
  }

  // Completion Rate Card
  if (!document.getElementById('completion-rate')) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>Overall Completion Rate</h3>
      <p id="completion-rate" style="font-size: 2rem; color: #10b981;">0%</p>
    `;
    analyticsView.appendChild(card);
  }

  // Weekly Focus Time Card
  if (!document.getElementById('focus-time-week')) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>Weekly Focus Time</h3>
      <p id="focus-time-week" style="font-size: 2rem; color: #6366f1;">0 min</p>
    `;
    analyticsView.appendChild(card);
  }

  // Load Chart.js if it's not already available
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function () {
      console.log('Chart.js loaded');
      if (window.analyticsData && window.analyticsData.length) {
        window.updateAnalyticsCharts();
      }
    };
    document.head.appendChild(script);
  } else {
    if (window.analyticsData && window.analyticsData.length) {
      window.updateAnalyticsCharts();
    }
  }
});
