import { html, render } from 'https://cdn.skypack.dev/lit-html';

const tokenKey = 'accessToken';
const busBaseURL = 'http://localhost:3030/jsonstore/bus/businfo';
const authBaseURL = 'http://localhost:3030'; 

const postInfoView = (busStops) => {

    return html`
        <h1>Bus Information</h1>
        <div>
            ${Object.entries(busStops).map(([stopId, stopData]) => {
                return html`
                    <div>
                        <h2>${stopData.name} (ID: ${stopId})</h2>
                        <ul>
                            ${Object.entries(stopData.buses).map(([busNumber, time]) => html`
                                <li>Bus ${busNumber} arriving in ${time} minutes</li>
                            `)}
                        </ul>
                        <button @click=${() => editBusStop(stopId, stopData.name, formatBuses(stopData.buses))}>Edit</button>
                        <button @click=${() => deleteBusStop(stopId)}>Delete</button>
                    </div>
                `;
            })}
        </div>
    `;
};

const loginView = () => html`
    <h1>Login</h1>
    <form @submit=${async (event) => {
        event.preventDefault();
        const email = event.target.querySelector('#loginEmail').value;
        const password = event.target.querySelector('#loginPassword').value;
        await loginUser(email, password);
    }}>
        <label for="loginEmail">Email:</label>
        <input type="email" id="loginEmail" required>
        <label for="loginPassword">Password:</label>
        <input type="password" id="loginPassword" required>
        <button type="submit">Login</button>
    </form>
`;

const registerView = () => html`
    <h1>Register</h1>
    <form @submit=${async (event) => {
        event.preventDefault();
        const email = event.target.querySelector('#registerEmail').value;
        const password = event.target.querySelector('#registerPassword').value;
        await registerUser(email, password);
    }}>
        <label for="registerEmail">Email:</label>
        <input type="email" id="registerEmail" required>
        <label for="registerPassword">Password:</label>
        <input type="password" id="registerPassword" required>
        <button type="submit">Register</button>
    </form>
`;

const addPostView = () => html`
    <h1>Add Bus Stop</h1>
    <form @submit=${async (event) => {
        event.preventDefault();
        const title = event.target.querySelector('#postTitle').value;
        const content = event.target.querySelector('#postContent').value;
        await addBusStop(title, content);
    }}>
        <label for="postTitle">Bus Stop Name:</label>
        <input type="text" id="postTitle" required>
        <label for="postContent">Bus Numbers and Arrival Times (e.g., "76:15, 84:10"):</label>
        <textarea id="postContent" required></textarea>
        <button type="submit">Add Bus Stop</button>
    </form>
`;

const myPostsView = (busStops) => {

    return html`
        <h1>My Bus Stops</h1>
        <div>
            ${Object.entries(busStops).map(([stopId, stopData]) => {

                return html`
                    <div>
                        <h2>${stopData.name} (ID: ${stopId})</h2>
                        <ul>
                            ${Object.entries(stopData.buses).map(([busNumber, time]) => html`
                                <li>Bus ${busNumber} arriving in ${time} minutes</li>
                            `)}
                        </ul>
                        <button @click=${() => editBusStop(stopId, stopData.name, formatBuses(stopData.buses))}>Edit</button>
                        <button @click=${() => deleteBusStop(stopId)}>Delete</button>
                    </div>
                `;
            })}
        </div>
    `;
};

const editPostView = () => html`
    <h1>Edit Bus Stop</h1>
    <form id="editPostForm" @submit=${async (event) => {
        event.preventDefault();
        const stopId = event.target.dataset.id;
        const title = event.target.querySelector('#editTitle').value;
        const content = event.target.querySelector('#editContent').value;
        await saveBusStop(stopId, title, content);
    }}>
        <label for="editTitle">Bus Stop Name:</label>
        <input type="text" id="editTitle" required>
        <label for="editContent">Bus Numbers and Arrival Times (e.g., "76:15, 84:10"):</label>
        <textarea id="editContent" required></textarea>
        <button type="submit">Save Changes</button>
    </form>
`;

const views = {
    postInfoView: postInfoView,
    loginView: loginView,
    registerView: registerView,
    addPostView: addPostView,
    myPostsView: myPostsView,
    editPostView: editPostView
};

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navBar').addEventListener('click', async (event) => {
        if (event.target.tagName === 'A' && event.target.dataset.view) {
            event.preventDefault();
            const viewName = event.target.dataset.view;
            if (viewName === 'myPostsView') {
                await loadMyBusStops();
            }
            showView(viewName);
        }
    });

    document.getElementById('logoutLink').addEventListener('click', async (event) => {
        event.preventDefault();
        await logoutUser();
    });

    updateNav();
    await loadBusStops();
    showView('postInfoView');
});

async function loginUser(email, password) {
    try {
        const response = await fetch(`${authBaseURL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }

        const user = await response.json();
        sessionStorage.setItem(tokenKey, user.accessToken);
        updateNav();
        await loadBusStops();
        showView('postInfoView');
    } catch (error) {
        console.error('Error logging in:', error);
    }
}

async function registerUser(email, password) {
    try {
        const response = await fetch(`${authBaseURL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }

        const user = await response.json();
        sessionStorage.setItem(tokenKey, user.accessToken);
        updateNav();
        await loadBusStops();
        showView('postInfoView');
    } catch (error) {
        console.error('Error registering:', error);
    }
}

async function logoutUser() {
    try {
        const token = sessionStorage.getItem(tokenKey);
        await fetch(`${authBaseURL}/users/logout`, {
            method: 'GET',
            headers: { 'X-Authorization': token }
        });

        sessionStorage.removeItem(tokenKey);
        updateNav();
        await loadBusStops();
        showView('postInfoView');
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

async function loadBusStops() {
    try {
        const response = await fetch(busBaseURL);
        if (!response.ok) {
            const error = await response.json();
            console.error('Error loading bus stops:', error);
            render(html`<p>Error loading bus stops.</p>`, document.getElementById('main-content'));
            return;
        }

        const busStops = await response.json();
        console.log('Loaded bus stops:', busStops);
        render(postInfoView(busStops), document.getElementById('main-content'));
    } catch (error) {
        console.error('Error loading bus stops:', error);
        render(html`<p>Error loading bus stops.</p>`, document.getElementById('main-content'));
    }
}

async function addBusStop(name, buses) {
    try {
        const token = sessionStorage.getItem(tokenKey);
        const busData = buses.split(',').reduce((acc, bus) => {
            const [busNumber, time] = bus.split(':').map(s => s.trim());
            acc[busNumber] = Number(time);
            return acc;
        }, {});

        const response = await fetch(busBaseURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Authorization': token
            },
            body: JSON.stringify({ name, buses: busData })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }

        await loadMyBusStops();
        showView('myPostsView');
    } catch (error) {
        console.error('Error adding bus stop:', error);
    }
}

async function saveBusStop(stopId, name, buses) {
    try {
        const token = sessionStorage.getItem(tokenKey);
        const busData = buses.split(',').reduce((acc, bus) => {
            const [busNumber, time] = bus.split(':').map(s => s.trim());
            acc[busNumber] = Number(time);
            return acc;
        }, {});

        const response = await fetch(`${busBaseURL}/${stopId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Authorization': token
            },
            body: JSON.stringify({ name, buses: busData })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.message);
            return;
        }

        await loadBusStops();
        showView('postInfoView');
    } catch (error) {
        console.error('Error saving bus stop:', error);
    }
}

async function loadMyBusStops() {
    try {
        const response = await fetch(busBaseURL);
        if (!response.ok) {
            const error = await response.json();
            console.error('Error loading my bus stops:', error);
            render(html`<p>Error loading bus stops.</p>`, document.getElementById('main-content'));
            return;
        }

        const busStops = await response.json();
        console.log('Loaded my bus stops:', busStops); 
        render(myPostsView(busStops), document.getElementById('main-content'));
    } catch (error) {
        console.error('Error loading my bus stops:', error);
        render(html`<p>Error loading bus stops.</p>`, document.getElementById('main-content'));
    }
}

async function deleteBusStop(stopId) {
    try {
        const token = sessionStorage.getItem(tokenKey);
        await fetch(`${busBaseURL}/${stopId}`, {
            method: 'DELETE',
            headers: { 'X-Authorization': token }
        });

        await loadMyBusStops();
    } catch (error) {
        console.error('Error deleting bus stop:', error);
    }
}

function updateNav() {
    const token = sessionStorage.getItem(tokenKey);
    if (token) {
        document.getElementById('loginLink').classList.add('hidden');
        document.getElementById('registerLink').classList.add('hidden');
        document.getElementById('myPostsLink').classList.remove('hidden');
        document.getElementById('addPostLink').classList.remove('hidden');
        document.getElementById('logoutLink').classList.remove('hidden');
    } else {
        document.getElementById('loginLink').classList.remove('hidden');
        document.getElementById('registerLink').classList.remove('hidden');
        document.getElementById('myPostsLink').classList.add('hidden');
        document.getElementById('addPostLink').classList.add('hidden');
        document.getElementById('logoutLink').classList.add('hidden');
    }
}

function showView(viewName) {
    render(views[viewName](), document.getElementById('main-content'));
}

function formatBuses(buses) {
    if (!buses) return '';
    return Object.entries(buses).map(([busNumber, time]) => `${busNumber}:${time}`).join(', ');
}

async function editBusStop(stopId, name, buses) {
    const editForm = editPostView();
    render(editForm, document.getElementById('main-content'));
    document.getElementById('editTitle').value = name;
    document.getElementById('editContent').value = buses;
    document.getElementById('editPostForm').dataset.id = stopId;

    showView('editPostView');
}

window.editBusStop = editBusStop;
window.deleteBusStop = deleteBusStop;
