/**
 * Todo List Application - Created by TooLoo.ai
 * Demonstrates full filesystem access and code generation
 */

class TodoApp {
    constructor() {
        this.todos = this.loadTodos();
        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
        this.render();
    }

    createUI() {
        document.body.innerHTML = `
            <div class="todo-app">
                <h1>🎯 TooLoo.ai Todo App</h1>
                <div class="input-section">
                    <input type="text" id="todoInput" placeholder="What needs to be done?">
                    <button id="addBtn">Add Task</button>
                </div>
                <ul id="todoList"></ul>
                <div class="stats" id="stats"></div>
            </div>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .todo-app { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                h1 { color: #333; text-align: center; }
                .input-section { display: flex; margin: 20px 0; }
                #todoInput { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
                #addBtn { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; margin-left: 10px; cursor: pointer; }
                .todo-item { padding: 10px; margin: 5px 0; background: white; border-radius: 5px; display: flex; justify-content: space-between; }
                .completed { opacity: 0.6; text-decoration: line-through; }
                .stats { margin-top: 20px; text-align: center; font-weight: bold; }
                button:hover { opacity: 0.8; }
            </style>
        `;
    }

    bindEvents() {
        document.getElementById('addBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
    }

    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        
        if (text) {
            this.todos.push({
                id: Date.now(),
                text: text,
                completed: false,
                created: new Date().toLocaleString()
            });
            
            input.value = '';
            this.saveTodos();
            this.render();
        }
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
    }

    render() {
        const list = document.getElementById('todoList');
        const stats = document.getElementById('stats');
        
        if (this.todos.length === 0) {
            list.innerHTML = '<li style="text-align: center; color: #666;">No tasks yet. Add one above!</li>';
        } else {
            list.innerHTML = this.todos.map(todo => `
                <li class="todo-item ${todo.completed ? 'completed' : ''}">
                    <span onclick="app.toggleTodo(${todo.id})" style="cursor: pointer;">${todo.text}</span>
                    <button onclick="app.deleteTodo(${todo.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Delete</button>
                </li>
            `).join('');
        }

        const completed = this.todos.filter(t => t.completed).length;
        stats.textContent = `${completed} of ${this.todos.length} tasks completed`;
    }

    loadTodos() {
        try {
            return JSON.parse(localStorage.getItem('tooloo-todos')) || [];
        } catch {
            return [];
        }
    }

    saveTodos() {
        localStorage.setItem('tooloo-todos', JSON.stringify(this.todos));
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});

console.log('🎯 TooLoo.ai Todo App loaded! Ready to manage your tasks.');