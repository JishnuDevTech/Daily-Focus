// app.js

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const navToday = document.getElementById('nav-today');
  const navAnalytics = document.getElementById('nav-analytics');
  const navSettings = document.getElementById('nav-settings');
  const todayView = document.getElementById('today-view');
  const analyticsView = document.getElementById('analytics-view');
  const settingsView = document.getElementById('settings-view');
  const saveSettingsBtn = document.getElementById('save-settings');
  const dailyGoalTextarea = document.getElementById('daily-goal');
  const saveGoalBtn = document.getElementById('save-goal');

  // Navigation events
  navToday.addEventListener('click', (e) => {
    e.preventDefault();
    showView(todayView);
    setActiveNav(navToday);
  });

  navAnalytics.addEventListener('click', (e) => {
    e.preventDefault();
    showView(analyticsView);
    setActiveNav(navAnalytics);
    updateAnalyticsCharts(); // Refresh charts
  });

  navSettings.addEventListener('click', (e) => {
    e.preventDefault();
    showView(settingsView);
    setActiveNav(navSettings);
  });

  function showView(viewToShow) {
    const views = [todayView, analyticsView, settingsView];
    views.forEach(view => view.classList.toggle('hidden', view !== viewToShow));
  }

  function setActiveNav(activeNav) {
    const navLinks = [navToday, navAnalytics, navSettings];
    navLinks.forEach(link => link.classList.toggle('active', link === activeNav));
  }

  // Save goal
  saveGoalBtn.addEventListener('click', () => {
    const goalText = dailyGoalTextarea.value.trim();
    const user = auth.currentUser;
    if (!goalText || !user) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    db.collection('users').doc(user.uid).collection('dailyData').doc(dateStr).set({
      goal: goalText,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
      showNotification('Goal saved!', 'success');
    }).catch(err => {
      console.error('Error saving goal:', 'error');
      showNotification('Failed to save goal', 'error');
    });
  });

  // Load Today View
  window.loadTodayData = function () {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    db.collection('users').doc(user.uid).collection('dailyData').doc(dateStr).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.goal) dailyGoalTextarea.value = data.goal;
        if (data.completedPomodoros !== undefined) {
          document.getElementById('completed-pomodoros').textContent = data.completedPomodoros;
        }
        loadTasks();
      } else {
        db.collection('users').doc(user.uid).collection('dailyData').doc(dateStr).set({
          date: dateStr,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          completedPomodoros: 0,
          focusTimeMinutes: 0,
          tasksCompleted: 0,
          tasksCreated: 0
        });
      }
    }).catch(err => console.error("Error loading today's data:", err));
  };

  // Save settings
  saveSettingsBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) return;

    const focusDuration = parseInt(document.getElementById('focus-duration').value);
    const shortBreak = parseInt(document.getElementById('short-break-duration').value);
    const longBreak = parseInt(document.getElementById('long-break-duration').value);
    const cycles = parseInt(document.getElementById('pomodoro-cycles').value);
    const sound = document.getElementById('sound-notifications').checked;
    const browser = document.getElementById('browser-notifications').checked;
    const name = document.getElementById('display-name').value.trim();

    if (!name) {
      showNotification('Enter display name', 'error');
      return;
    }

    db.collection('users').doc(user.uid).update({
      name,
      'settings.focusDuration': focusDuration,
      'settings.shortBreakDuration': shortBreak,
      'settings.longBreakDuration': longBreak,
      'settings.pomodoroCycles': cycles,
      'settings.soundNotifications': sound,
      'settings.browserNotifications': browser,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      document.getElementById('user-name').textContent = name;
      showNotification("Settings Saved Succesfully", 'success');
      updateTimerSettings();
    }).catch(err => {
      console.error("Settings error:", err);
      showNotification('Failed to save settings', 'error');
    });
  });

  // Notifications
  window.showNotification = function (message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };
  window.showNotification = function (message, type = 'success') {
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to DOM
    document.body.appendChild(notification);

    // Play sound
    playNotificationSound();

    // Show + remove
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };
  // Load Analytics
  window.loadAnalyticsData = function () {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const str = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      last7Days.push(str);
    }

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const promises = last7Days.map(dateStr => {
      return db.collection('users').doc(user.uid).collection('dailyData').doc(dateStr).get();
    });

    Promise.all(promises).then(snapshots => {
      const weekData = [];
      let weeklyFocus = 0;
      let todayFocus = 0;

      snapshots.forEach((snap, idx) => {
        const date = new Date(last7Days[idx]);
        const label = dayLabels[date.getDay()];

        if (snap.exists) {
          const d = snap.data();
          const focus = d.focusTimeMinutes || 0;
          const tasksCompleted = d.tasksCompleted || 0;
          const tasksCreated = d.tasksCreated || 0;

          weekData.push({
            date: label,
            focusTime: focus,
            tasksCompleted,
            tasksCreated
          });

          weeklyFocus += focus;
          if (idx === 6) todayFocus = focus;
        } else {
          weekData.push({
            date: label,
            focusTime: 0,
            tasksCompleted: 0,
            tasksCreated: 0
          });
        }
      });

      if (document.getElementById('focus-time-today')) {
        document.getElementById('focus-time-today').textContent = `${todayFocus} min`;
      }

      if (document.getElementById('focus-time-week')) {
        document.getElementById('focus-time-week').textContent = `${weeklyFocus} min`;
      }

      db.collection('users').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists) {
          const total = userDoc.data().totalFocusTime || 0;
          const el = document.getElementById('focus-time-all');
          if (el) el.textContent = `${total} min`;
        }
      });

      window.analyticsData = weekData;

      if (!analyticsView.classList.contains('hidden')) {
        if (typeof updateAnalyticsCharts === 'function') {
          updateAnalyticsCharts();
        }
      }
    }).catch(err => {
      console.error("Error loading analytics data:", err);
    });
  };

  // Load Tasks - Assume implemented elsewhere
  window.loadTasks = function () {
    console.log('Loading tasks... (implementation placeholder)');
  };

  // Update Timer Settings - Assume implemented
  window.updateTimerSettings = function () {
    console.log('Updating timer settings... (implementation placeholder)');
  };

  // Start with today view
  showView(todayView);
  setActiveNav(navToday);
  // Helper function for notifications
  function showNotification(message, type = 'info') {
    console.log(`Notification (${type}):`, message);

    // Check if notification container exists
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
      // Create container if it doesn't exist
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'notification-container';
      notificationContainer.style.position = 'fixed';
      notificationContainer.style.top = '20px';
      notificationContainer.style.right = '20px';
      notificationContainer.style.zIndex = '9999';
      document.body.appendChild(notificationContainer);
    }

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.padding = '10px 15px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.color = '#fff';
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' :
      type === 'error' ? '#F44336' :
        type === 'warning' ? '#FF9800' : '#2196F3';
    notification.textContent = message;

    // Add to container
    notificationContainer.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        notification.remove();

        // Remove container if empty
        if (notificationContainer.children.length === 0) {
          notificationContainer.remove();
        }
      }, 300);
    }, 3000);
  }
});

