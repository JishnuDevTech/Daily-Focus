// tasks.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('new-task');
    const addTaskBtn = document.getElementById('add-task');
    const taskList = document.getElementById('task-list');

    // Firebase initialization - using a more reliable approach
    let db, auth;
    
    // Wait for Firebase to be fully initialized
    const checkFirebaseInitialized = () => {
        try {
            if (firebase.app && firebase.firestore && firebase.auth) {
                console.log("Firebase successfully initialized");
                db = firebase.firestore();
                auth = firebase.auth();
                
                // Once Firebase is ready, set up event listeners
                setupEventListeners();
                
                // Listen for auth state changes
                auth.onAuthStateChanged(user => {
                    if (user) {
                        console.log("User is logged in, loading tasks");
                        loadTasks();
                    } else {
                        console.log("User is logged out");
                        taskList.innerHTML = '<li class="empty-state">Please log in to view your tasks</li>';
                    }
                });
                
                return true;
            }
        } catch (error) {
            console.error("Firebase not yet initialized:", error);
            return false;
        }
        return false;
    };

    // Try to initialize immediately
    if (!checkFirebaseInitialized()) {
        // If not ready, try again after a delay
        console.log("Firebase not ready, waiting...");
        setTimeout(() => {
            if (!checkFirebaseInitialized()) {
                console.error("Firebase failed to initialize after delay");
                showNotification("Could not connect to the database. Please refresh the page.", "error");
            }
        }, 2000);
    }

    // Setup event listeners for task operations
    function setupEventListeners() {
        // Add task event
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });

        // Listen for navigation events
        const navToday = document.getElementById('nav-today');
        if (navToday) {
            navToday.addEventListener('click', () => {
                const todayView = document.getElementById('today-view');
                const analyticsView = document.getElementById('analytics-view');
                const settingsView = document.getElementById('settings-view');
                
                if (todayView) todayView.classList.remove('hidden');
                if (analyticsView) analyticsView.classList.add('hidden');
                if (settingsView) settingsView.classList.add('hidden');
                
                loadTasks();
            });
        }
    }

    // Add task function
    function addTask() {
        // Check if Firebase is initialized
        if (!db || !auth) {
            showNotification("Database connection not ready. Please refresh the page.", "error");
            return;
        }

        const taskText = taskInput.value.trim();
        if (!taskText) {
            showNotification("Please enter a task", "error");
            return;
        }
        
        const user = auth.currentUser;
        if (!user) {
            showNotification("Please login to add tasks", "error");
            return;
        }
        
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Show loading indicator
        addTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        addTaskBtn.disabled = true;
        
        try {
            // Create a new task document
            db.collection('users').doc(user.uid).collection('tasks').add({
                text: taskText,
                completed: false,
                date: dateStr,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log("Task added successfully");
                // Clear input
                taskInput.value = '';
                
                // Update tasks created count
                updateDailyData(user.uid, dateStr, { tasksCreated: 1 }, true);
                
                // Refresh task list
                loadTasks();
                
                // Show success notification
                showNotification("Task added successfully", "success");
            })
            .catch(err => {
                console.error("Error adding task:", err);
                showNotification('Error adding task: ' + err.message, 'error');
            })
            .finally(() => {
                // Reset button
                addTaskBtn.innerHTML = '<i class="fas fa-plus"></i>';
                addTaskBtn.disabled = false;
            });
        } catch (error) {
            console.error("Exception during add task:", error);
            addTaskBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addTaskBtn.disabled = false;
            showNotification("An error occurred while adding the task", "error");
        }
    }

    // Load tasks function with extensive logging and error handling
    window.loadTasks = function() {
        console.log("loadTasks called");
        
        // Check if Firebase is initialized
        if (!db || !auth) {
            console.error("Firebase not initialized in loadTasks");
            taskList.innerHTML = '<li class="error-state">Database connection not ready. Please refresh the page.</li>';
            return;
        }
        
        const user = auth.currentUser;
        if (!user) {
            console.log("No user logged in");
            taskList.innerHTML = '<li class="empty-state">Please log in to view your tasks</li>';
            return;
        }
        
        console.log("User authenticated:", user.uid);
        
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        console.log("Loading tasks for date:", dateStr);
        
        // Show loading indicator
        taskList.innerHTML = '<li class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading tasks...</li>';
        
        try {
            // Get today's tasks with simpler query to avoid potential issues
            console.log("Querying tasks collection");
            
            db.collection('users').doc(user.uid).collection('tasks')
                .where('date', '==', dateStr)
                .get()
                .then(snapshot => {
                    console.log("Task query succeeded, received", snapshot.size, "tasks");
                    
                    // Clear current task list
                    taskList.innerHTML = '';
                    
                    if (snapshot.empty) {
                        console.log("No tasks found for today");
                        // Show empty state
                        taskList.innerHTML = '<li class="empty-state">No tasks for today. Add a task to get started!</li>';
                        return;
                    }
                    
                    // Create a document fragment for better performance
                    const fragment = document.createDocumentFragment();
                    
                    snapshot.forEach(doc => {
                        const task = doc.data();
                        const taskId = doc.id;
                        
                        // Create task element
                        const taskElement = createTaskElement(taskId, task);
                        fragment.appendChild(taskElement);
                    });
                    
                    // Add all tasks to the DOM in one operation
                    taskList.appendChild(fragment);
                    console.log("Tasks rendered successfully");
                })
                .catch(err => {
                    console.error("Error loading tasks:", err);
                    taskList.innerHTML = '<li class="error-state">Error loading tasks. Please try again.</li>';
                    showNotification('Error loading tasks: ' + err.message, 'error');
                });
        } catch (error) {
            console.error("Exception in loadTasks:", error);
            taskList.innerHTML = '<li class="error-state">An unexpected error occurred. Please refresh the page.</li>';
            showNotification("An unexpected error occurred while loading tasks", "error");
        }
    };

    // Create task element function
    function createTaskElement(taskId, task) {
        // Create task element
        const li = document.createElement('li');
        li.dataset.id = taskId;
        if (task.completed) {
            li.classList.add('task-completed');
        }
        
        // Task content
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskCompletion(taskId, checkbox.checked));
        
        const taskTextSpan = document.createElement('span');
        taskTextSpan.className = 'task-text';
        taskTextSpan.textContent = task.text;
        
        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskTextSpan);
        
        // Task actions
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', () => editTask(taskId, task.text));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => deleteTask(taskId));
        
        taskActions.appendChild(editBtn);
        taskActions.appendChild(deleteBtn);
        
        // Add to list item
        li.appendChild(taskContent);
        li.appendChild(taskActions);
        
        return li;
    }

    // Toggle task completion
    function toggleTaskCompletion(taskId, completed) {
        if (!db || !auth) {
            showNotification("Database connection not ready", "error");
            return;
        }
        
        const user = auth.currentUser;
        if (!user) return;
        
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Show loading on the task
        const taskElement = document.querySelector(`li[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('task-loading');
        }
        
        try {
            // Update task completion status
            db.collection('users').doc(user.uid).collection('tasks').doc(taskId).update({
                completed: completed
            })
            .then(() => {
                // Update UI
                if (taskElement) {
                    taskElement.classList.remove('task-loading');
                    if (completed) {
                        taskElement.classList.add('task-completed');
                    } else {
                        taskElement.classList.remove('task-completed');
                    }
                }
                
                // Update daily data for task completion metrics
                updateDailyData(user.uid, dateStr, { tasksCompleted: completed ? 1 : -1 }, true);
                
                showNotification(`Task ${completed ? 'completed' : 'marked as incomplete'}`, 'success');
            })
            .catch(err => {
                console.error("Error updating task:", err);
                if (taskElement) {
                    taskElement.classList.remove('task-loading');
                    // Revert checkbox if error
                    const checkbox = taskElement.querySelector('.task-checkbox');
                    if (checkbox) {
                        checkbox.checked = !completed;
                    }
                }
                showNotification('Error updating task: ' + err.message, 'error');
            });
        } catch (error) {
            console.error("Exception in toggleTaskCompletion:", error);
            if (taskElement) {
                taskElement.classList.remove('task-loading');
                const checkbox = taskElement.querySelector('.task-checkbox');
                if (checkbox) {
                    checkbox.checked = !completed;
                }
            }
            showNotification("An error occurred while updating the task", "error");
        }
    }

    // Edit task function
    function editTask(taskId, currentText) {
        if (!db || !auth) {
            showNotification("Database connection not ready", "error");
            return;
        }
        
        const user = auth.currentUser;
        if (!user) return;
        
        // Create edit modal or prompt
        const newText = prompt("Edit task:", currentText);
        
        // If canceled or empty, return
        if (newText === null || newText.trim() === '') return;
        
        // If the text hasn't changed, return
        if (newText.trim() === currentText) return;
        
        // Show loading on the task
        const taskElement = document.querySelector(`li[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('task-loading');
        }
        
        try {
            // Update task text
            db.collection('users').doc(user.uid).collection('tasks').doc(taskId).update({
                text: newText.trim()
            })
            .then(() => {
                // Update UI
                if (taskElement) {
                    taskElement.classList.remove('task-loading');
                    const taskTextElement = taskElement.querySelector('.task-text');
                    if (taskTextElement) {
                        taskTextElement.textContent = newText.trim();
                    }
                }
                
                showNotification('Task updated successfully', 'success');
            })
            .catch(err => {
                console.error("Error updating task:", err);
                if (taskElement) {
                    taskElement.classList.remove('task-loading');
                }
                showNotification('Error updating task: ' + err.message, 'error');
            });
        } catch (error) {
            console.error("Exception in editTask:", error);
            if (taskElement) {
                taskElement.classList.remove('task-loading');
            }
            showNotification("An error occurred while updating the task", "error");
        }
    }

    // Delete task function
    function deleteTask(taskId) {
        if (!db || !auth) {
            showNotification("Database connection not ready", "error");
            return;
        }
        
        const user = auth.currentUser;
        if (!user) return;
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Show loading on the task
        const taskElement = document.querySelector(`li[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('task-loading');
        }
        
        try {
            // Get task data first (to check if it was completed)
            db.collection('users').doc(user.uid).collection('tasks').doc(taskId).get()
                .then(doc => {
                    if (doc.exists) {
                        const task = doc.data();
                        const wasCompleted = task.completed;
                        
                        // Delete the task
                        db.collection('users').doc(user.uid).collection('tasks').doc(taskId).delete()
                            .then(() => {
                                // Update UI
                                if (taskElement) {
                                    taskElement.remove();
                                }
                                
                                // If no tasks left, show empty state
                                if (taskList.children.length === 0) {
                                    taskList.innerHTML = '<li class="empty-state">No tasks for today. Add a task to get started!</li>';
                                }
                                
                                // Update daily data metrics
                                const updates = { tasksCreated: -1 };
                                if (wasCompleted) {
                                    updates.tasksCompleted = -1;
                                }
                                updateDailyData(user.uid, dateStr, updates, true);
                                
                                showNotification('Task deleted successfully', 'success');
                            })
                            .catch(err => {
                                console.error("Error deleting task:", err);
                                if (taskElement) {
                                    taskElement.classList.remove('task-loading');
                                }
                                showNotification('Error deleting task: ' + err.message, 'error');
                            });
                    }
                })
                .catch(err => {
                    console.error("Error getting task data:", err);
                    if (taskElement) {
                        taskElement.classList.remove('task-loading');
                    }
                    showNotification('Error deleting task: ' + err.message, 'error');
                });
        } catch (error) {
            console.error("Exception in deleteTask:", error);
            if (taskElement) {
                taskElement.classList.remove('task-loading');
            }
            showNotification("An error occurred while deleting the task", "error");
        }
    }

    // Helper function to update daily data
    function updateDailyData(userId, dateStr, updates, increment = false) {
        if (!db) {
            console.error("Cannot update daily data: Firestore not initialized");
            return;
        }
        
        try {
            const dailyDataRef = db.collection('users').doc(userId).collection('dailyData').doc(dateStr);
            
            dailyDataRef.get().then(doc => {
                if (doc.exists) {
                    // Document exists, update it
                    if (increment) {
                        // Using Firebase's increment functionality for atomic updates
                        let incrementUpdates = {};
                        
                        // Handle each field to update
                        Object.keys(updates).forEach(key => {
                            incrementUpdates[key] = firebase.firestore.FieldValue.increment(updates[key]);
                        });
                        
                        dailyDataRef.update(incrementUpdates)
                            .catch(err => console.error("Error incrementing daily data:", err));
                    } else {
                        // Direct update
                        dailyDataRef.update(updates)
                            .catch(err => console.error("Error updating daily data:", err));
                    }
                } else {
                    // Document doesn't exist, create it with initial values
                    let initialData = {
                        date: dateStr,
                        tasksCreated: 0,
                        tasksCompleted: 0,
                        focusTime: 0,
                        pomodoros: 0
                    };
                    
                    // Override with provided updates
                    Object.keys(updates).forEach(key => {
                        initialData[key] = increment ? Math.max(0, updates[key]) : updates[key];
                    });
                    
                    dailyDataRef.set(initialData)
                        .catch(err => console.error("Error creating daily data:", err));
                }
            }).catch(err => {
                console.error("Error getting daily data:", err);
            });
        } catch (error) {
            console.error("Exception in updateDailyData:", error);
        }
    }

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
