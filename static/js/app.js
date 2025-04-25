/**
 * PostgreSQL Natural Language Query Interface
 * Main JavaScript functionality
 */

// Global state
const state = {
    isConnected: false,
    isTraining: false,
    hasApiKey: false,
    hasDbConfig: false
};

// DOM Elements
const elements = {
    // Connection elements
    connectionStatus: document.getElementById('connectionStatus'),
    checkStatusBtn: document.getElementById('checkStatus'),
    connectBtn: document.getElementById('connect'),
    connectResult: document.getElementById('connectResult'),

    // Form inputs
    hostInput: document.getElementById('host'),
    dbnameInput: document.getElementById('dbname'),
    userInput: document.getElementById('user'),
    passwordInput: document.getElementById('password'),
    portInput: document.getElementById('port'),
    apiKeyInput: document.getElementById('api_key'),
    modelInput: document.getElementById('model'),

    // Status indicators
    apiKeyStatus: document.getElementById('api_key_status'),
    passwordStatus: document.getElementById('password_status'),

    // Training elements
    trainSchema: document.getElementById('trainSchema'),
    trainDDL: document.getElementById('trainDDL'),
    trainDocumentation: document.getElementById('trainDocumentation'),
    trainSQLOnly: document.getElementById('trainSQLOnly'),
    trainQuestionSQL: document.getElementById('trainQuestionSQL'),
    trainJsonFile: document.getElementById('trainJsonFile'),
    refreshTrainingData: document.getElementById('refreshTrainingData'),
    trainResult: document.getElementById('trainResult'),

    // JSON file training elements
    jsonFile: document.getElementById('jsonFile'),
    jsonTrainingProgress: document.getElementById('jsonTrainingProgress'),
    jsonProgressFill: document.getElementById('jsonProgressFill'),
    jsonProgressText: document.getElementById('jsonProgressText'),

    // Training inputs
    trainDDLInput: document.getElementById('trainDDL'),
    trainDocumentationInput: document.getElementById('trainDocumentation'),
    trainSQLOnlyInput: document.getElementById('trainSQLOnly'),
    trainQuestionInput: document.getElementById('trainQuestion'),
    trainSQLInput: document.getElementById('trainSQL'),

    // Query elements
    questionInput: document.getElementById('question'),
    queryBtn: document.getElementById('query'),
    sqlQuery: document.getElementById('sqlQuery'),
    queryResults: document.getElementById('queryResults'),
    explanation: document.getElementById('explanation'),

    // Training data elements
    trainingDataBody: document.getElementById('trainingDataBody'),

    // Modal elements
    modal: document.getElementById('contentModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalContent: document.getElementById('modalContent'),
    closeModalBtn: document.querySelector('.close')
};

/**
 * Initialize the application
 */
function initApp() {
    setupEventListeners();
    setupTabNavigation();
    setupModal();

    // Initial data loading
    checkConnectionStatus();
    checkApiConfig();
    checkDbConfig();
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
    // Connection
    elements.checkStatusBtn.addEventListener('click', checkConnectionStatus);
    elements.connectBtn.addEventListener('click', connectToDatabase);

    // Training
    elements.trainSchema.addEventListener('click', trainSchema);
    elements.trainDDL.addEventListener('click', trainDDL);
    elements.trainDocumentation.addEventListener('click', trainDocumentation);
    elements.trainSQLOnly.addEventListener('click', trainSQL);
    elements.trainQuestionSQL.addEventListener('click', trainQuestionSQL);
    elements.trainJsonFile.addEventListener('click', trainWithJsonFile);
    elements.refreshTrainingData.addEventListener('click', fetchTrainingData);

    // Query
    elements.queryBtn.addEventListener('click', queryDatabase);

    // Training data tab
    document.querySelector('.tab[data-tab="manage"]').addEventListener('click', fetchTrainingData);
}

/**
 * Set up tab navigation
 */
function setupTabNavigation() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });
}

/**
 * Set up modal functionality
 */
function setupModal() {
    // Close modal when close button is clicked
    elements.closeModalBtn.addEventListener('click', () => {
        elements.modal.style.display = 'none';
    });

    // Close modal when clicking outside the modal
    window.addEventListener('click', (event) => {
        if (event.target === elements.modal) {
            elements.modal.style.display = 'none';
        }
    });

    // Close modal when ESC key is pressed
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && elements.modal.style.display === 'block') {
            elements.modal.style.display = 'none';
        }
    });
}

/**
 * Check the current connection status
 */
async function checkConnectionStatus() {
    try {
        showLoading(elements.connectionStatus);
        const response = await fetch('/connection_status');
        const data = await response.json();

        if (data.connected) {
            elements.connectionStatus.innerHTML = `<div class="success">Connected to ${data.connection_info.dbname} on ${data.connection_info.host}</div>`;
            state.isConnected = true;

            // Enable the train schema button
            elements.trainSchema.textContent = "Train on Schema";
            elements.trainSchema.disabled = false;
            elements.trainSchema.style.backgroundColor = "#4CAF50";
        } else {
            elements.connectionStatus.innerHTML = '<div class="error">Not connected to any database</div>';
            state.isConnected = false;
            elements.trainSchema.disabled = true;
            elements.trainSchema.style.backgroundColor = "#cccccc";
        }
    } catch (error) {
        elements.connectionStatus.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        state.isConnected = false;
    }
}

/**
 * Connect to the database
 */
async function connectToDatabase() {
    const connectData = {
        host: elements.hostInput.value,
        dbname: elements.dbnameInput.value,
        user: elements.userInput.value,
        password: elements.passwordInput.value, // If empty, server will use env password
        port: elements.portInput.value,
        api_key: elements.apiKeyInput.value,
        model: elements.modelInput.value
    };

    try {
        showLoading(elements.connectResult);
        elements.connectBtn.disabled = true;

        const response = await fetch('/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectData)
        });

        const data = await response.json();

        if (data.status) {
            elements.connectResult.innerHTML = `<div class="success">${data.message}</div>`;
            state.isConnected = true;
            checkConnectionStatus();
        } else {
            elements.connectResult.innerHTML = `<div class="error">${data.message}</div>`;
        }
    } catch (error) {
        elements.connectResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        elements.connectBtn.disabled = false;
    }
}

/**
 * Check API configuration
 */
async function checkApiConfig() {
    try {
        const response = await fetch('/api_config');
        const data = await response.json();

        if (data.has_api_key) {
            elements.apiKeyStatus.innerHTML = `<span style="color: green;">✓ API Key available</span>`;
            elements.modelInput.value = data.model;
            state.hasApiKey = true;
        } else {
            elements.apiKeyStatus.innerHTML = '<span style="color: red;">✗ No API Key found in .env</span>';
            state.hasApiKey = false;
        }
    } catch (error) {
        elements.apiKeyStatus.innerHTML = `<span style="color: red;">✗ Error checking API key: ${error.message}</span>`;
        state.hasApiKey = false;
    }
}

/**
 * Check database configuration
 */
async function checkDbConfig() {
    try {
        const response = await fetch('/db_config');
        const data = await response.json();

        if (data.has_db_config) {
            // Update input fields with values from .env
            elements.hostInput.value = data.host;
            elements.hostInput.placeholder = "Example: localhost";

            elements.portInput.value = data.port;
            elements.portInput.placeholder = "Example: 5432";

            elements.dbnameInput.value = data.dbname;
            elements.dbnameInput.placeholder = "Example: postgres";

            elements.userInput.value = data.user;
            elements.userInput.placeholder = "Example: postgres";

            // Don't set password value from environment for security
            elements.passwordInput.value = "";
            elements.passwordInput.placeholder = "Enter your database password or leave empty to use .env";

            // Show password status
            if (data.password) {
                elements.passwordStatus.innerHTML = '<span style="color: green;">✓ Password available in .env</span>';
            } else {
                elements.passwordStatus.innerHTML = '<span style="color: red;">✗ No password in .env</span>';
            }

            state.hasDbConfig = true;
        } else {
            // Set placeholders with example values if no config in .env
            elements.hostInput.value = "";
            elements.hostInput.placeholder = "Example: localhost";

            elements.portInput.value = "";
            elements.portInput.placeholder = "Example: 5432";

            elements.dbnameInput.value = "";
            elements.dbnameInput.placeholder = "Example: postgres";

            elements.userInput.value = "";
            elements.userInput.placeholder = "Example: postgres";

            elements.passwordInput.value = "";
            elements.passwordInput.placeholder = "Enter your database password";

            // Show password status
            elements.passwordStatus.innerHTML = '<span style="color: red;">✗ No password in .env</span>';

            state.hasDbConfig = false;
        }
    } catch (error) {
        console.error("Error checking database config:", error);
        state.hasDbConfig = false;
    }
}

/**
 * Train the model on database schema
 */
async function trainSchema() {
    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    try {
        const trainButton = elements.trainSchema;
        trainButton.disabled = true;
        trainButton.textContent = "Training...";
        showLoading(elements.trainResult);

        const response = await fetch('/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ train_type: 'schema' })
        });

        const data = await response.json();

        // Check if training was skipped because it already exists
        if (data.message.includes("already exists")) {
            elements.trainResult.innerHTML = `<div class="success">${data.message} <br>Schema training was already performed previously.</div>`;
        } else {
            elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        }
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // Reset button state after training
        const trainButton = elements.trainSchema;
        trainButton.textContent = "Train on Schema";
        trainButton.disabled = false;
        trainButton.style.backgroundColor = "#4CAF50";
    }
}

/**
 * Train the model on DDL statements
 */
async function trainDDL() {
    const ddl = elements.trainDDLInput.value;

    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    if (!ddl) {
        elements.trainResult.innerHTML = '<div class="error">Please enter a DDL statement</div>';
        return;
    }

    try {
        const trainButton = elements.trainDDL;
        trainButton.disabled = true;
        trainButton.textContent = "Training...";
        showLoading(elements.trainResult);

        const response = await fetch('/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'ddl',
                content: ddl
            })
        });

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form field after successful training
        elements.trainDDLInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // Reset button state
        const trainButton = elements.trainDDL;
        trainButton.disabled = false;
        trainButton.textContent = "Train on DDL";
    }
}

/**
 * Train the model on documentation
 */
async function trainDocumentation() {
    const documentation = elements.trainDocumentationInput.value;

    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    if (!documentation) {
        elements.trainResult.innerHTML = '<div class="error">Please enter documentation</div>';
        return;
    }

    try {
        const trainButton = elements.trainDocumentation;
        trainButton.disabled = true;
        trainButton.textContent = "Training...";
        showLoading(elements.trainResult);

        const response = await fetch('/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'documentation',
                content: documentation
            })
        });

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form field after successful training
        elements.trainDocumentationInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // Reset button state
        const trainButton = elements.trainDocumentation;
        trainButton.disabled = false;
        trainButton.textContent = "Train on Documentation";
    }
}

/**
 * Train the model on SQL statements
 */
async function trainSQL() {
    const sql = elements.trainSQLOnlyInput.value;

    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    if (!sql) {
        elements.trainResult.innerHTML = '<div class="error">Please enter a SQL statement</div>';
        return;
    }

    try {
        const trainButton = elements.trainSQLOnly;
        trainButton.disabled = true;
        trainButton.textContent = "Training...";
        showLoading(elements.trainResult);

        const response = await fetch('/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'sql',
                content: sql
            })
        });

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form field after successful training
        elements.trainSQLOnlyInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // Reset button state
        const trainButton = elements.trainSQLOnly;
        trainButton.disabled = false;
        trainButton.textContent = "Train on SQL";
    }
}

/**
 * Train the model on question-SQL pairs
 */
async function trainQuestionSQL() {
    const question = elements.trainQuestionInput.value;
    const sql = elements.trainSQLInput.value;

    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    if (!question || !sql) {
        elements.trainResult.innerHTML = '<div class="error">Please enter both a question and SQL query</div>';
        return;
    }

    try {
        const trainButton = elements.trainQuestionSQL;
        trainButton.disabled = true;
        trainButton.textContent = "Training...";
        showLoading(elements.trainResult);

        const response = await fetch('/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'question_sql',
                question: question,
                content: sql
            })
        });

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form fields after successful training
        elements.trainQuestionInput.value = '';
        elements.trainSQLInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // Reset button state
        const trainButton = elements.trainQuestionSQL;
        trainButton.disabled = false;
        trainButton.textContent = "Train on Question-SQL Pair";
    }
}

/**
 * Query the database using natural language
 */
async function queryDatabase() {
    const question = elements.questionInput.value;

    if (!state.isConnected) {
        elements.queryResults.textContent = 'Not connected to a database. Please connect first.';
        return;
    }

    if (!question) {
        elements.sqlQuery.textContent = '';
        elements.queryResults.textContent = '';
        elements.explanation.textContent = '';
        return;
    }

    try {
        elements.queryBtn.disabled = true;
        elements.queryBtn.textContent = "Running...";

        // Clear previous results
        elements.sqlQuery.textContent = 'Generating SQL...';
        elements.queryResults.textContent = 'Waiting for results...';
        elements.explanation.textContent = '';

        const response = await fetch('/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();

        elements.sqlQuery.textContent = data.sql || 'No SQL generated';
        elements.queryResults.textContent = JSON.stringify(data.results, null, 2);
        elements.explanation.textContent = data.explanation || 'No explanation provided';
    } catch (error) {
        elements.sqlQuery.textContent = '';
        elements.queryResults.textContent = `Error: ${error.message}`;
        elements.explanation.textContent = '';
    } finally {
        elements.queryBtn.disabled = false;
        elements.queryBtn.textContent = "Run Query";
    }
}

/**
 * Train the model with a JSON file
 */
async function trainWithJsonFile() {
    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    const fileInput = elements.jsonFile;
    if (!fileInput.files || fileInput.files.length === 0) {
        elements.trainResult.innerHTML = '<div class="error">Please select a JSON file</div>';
        return;
    }

    const file = fileInput.files[0];
    if (!file.name.endsWith('.json')) {
        elements.trainResult.innerHTML = '<div class="error">Please select a JSON file with .json extension</div>';
        return;
    }

    try {
        // Disable the button and show loading state
        const trainButton = elements.trainJsonFile;
        trainButton.disabled = true;
        trainButton.textContent = "Uploading...";

        // Show progress container
        elements.jsonTrainingProgress.style.display = 'block';
        elements.jsonProgressFill.style.width = '10%';
        elements.jsonProgressText.textContent = 'Uploading file...';

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload the file
        const response = await fetch('/train/json', {
            method: 'POST',
            body: formData
        });

        // Update progress
        elements.jsonProgressFill.style.width = '50%';
        elements.jsonProgressText.textContent = 'Processing training data...';

        // Parse the response
        const data = await response.json();

        // Update progress to complete
        elements.jsonProgressFill.style.width = '100%';
        elements.jsonProgressText.textContent = 'Training complete!';

        // Show the result
        let resultMessage = `<div class="success">${data.message}</div>`;

        // Add details about errors if any
        if (data.error_count > 0) {
            resultMessage += `<div class="error">Failed to train ${data.error_count} examples. See details below:</div>`;
            resultMessage += '<ul>';
            data.errors.forEach(error => {
                resultMessage += `<li>Error at index ${error.index}: ${error.error}</li>`;
            });
            resultMessage += '</ul>';
        }

        elements.trainResult.innerHTML = resultMessage;

        // Reset the file input
        fileInput.value = '';
    } catch (error) {
        elements.jsonProgressFill.style.width = '100%';
        elements.jsonProgressText.textContent = 'Error!';
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // Reset button state
        const trainButton = elements.trainJsonFile;
        trainButton.disabled = false;
        trainButton.textContent = "Train with JSON File";

        // Hide progress container after a delay
        setTimeout(() => {
            elements.jsonTrainingProgress.style.display = 'none';
        }, 3000);
    }
}

/**
 * Fetch and display training data
 */
async function fetchTrainingData() {
    if (!state.isConnected) {
        elements.trainingDataBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 10px;">Not connected to a database. Please connect first.</td></tr>';
        return;
    }

    try {
        showLoading(elements.trainingDataBody);

        const response = await fetch('/training_data');
        const data = await response.json();

        elements.trainingDataBody.innerHTML = '';

        if (!data.training_data || data.training_data.length === 0) {
            elements.trainingDataBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 10px;">No training data found</td></tr>';
            return;
        }

        // Sort training data by ID
        const sortedData = [...data.training_data].sort((a, b) => {
            if (a.id && b.id) {
                return a.id.localeCompare(b.id);
            }
            return 0;
        });

        sortedData.forEach(item => {
            const row = document.createElement('tr');

            // ID cell
            const idCell = document.createElement('td');
            idCell.style.padding = '8px';
            idCell.style.borderBottom = '1px solid #ddd';
            idCell.textContent = item.id || 'N/A';
            row.appendChild(idCell);

            // Data Type cell - display training_data_type
            const typeCell = document.createElement('td');
            typeCell.style.padding = '8px';
            typeCell.style.borderBottom = '1px solid #ddd';
            typeCell.textContent = item.training_data_type || 'Unknown';
            row.appendChild(typeCell);

            // View button cell
            const viewCell = document.createElement('td');
            viewCell.style.padding = '8px';
            viewCell.style.borderBottom = '1px solid #ddd';
            viewCell.style.textAlign = 'center';

            // Create button
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Content';
            viewButton.style.backgroundColor = '#4CAF50';
            viewButton.style.padding = '5px 10px';
            viewButton.style.fontSize = '14px';
            viewButton.style.border = 'none';
            viewButton.style.borderRadius = '4px';
            viewButton.style.color = 'white';
            viewButton.style.cursor = 'pointer';

            // Show modal when clicked
            viewButton.addEventListener('click', () => {
                // Determine data type
                let dataType = item.training_data_type || 'Unknown';
                const title = `${dataType} - ${item.id}`;

                // Display the entire item object in the modal
                showContentInModal(title, item);
            });

            viewCell.appendChild(viewButton);
            row.appendChild(viewCell);

            // Actions cell
            const actionsCell = document.createElement('td');
            actionsCell.style.padding = '8px';
            actionsCell.style.borderBottom = '1px solid #ddd';

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.backgroundColor = '#f44336';
            deleteButton.style.padding = '5px 10px';
            deleteButton.style.fontSize = '14px';

            deleteButton.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete training data with ID: ${item.id}?`)) {
                    try {
                        const response = await fetch(`/training_data/${item.id}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            elements.trainResult.innerHTML =
                                `<div class="success">Successfully deleted training data with ID: ${item.id}</div>`;

                            // Refresh the training data list
                            fetchTrainingData();
                        } else {
                            const errorData = await response.json();
                            elements.trainResult.innerHTML =
                                `<div class="error">Error: ${errorData.detail || 'Failed to delete training data'}</div>`;
                        }
                    } catch (error) {
                        elements.trainResult.innerHTML =
                            `<div class="error">Error: ${error.message}</div>`;
                    }
                }
            });

            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);

            elements.trainingDataBody.appendChild(row);
        });
    } catch (error) {
        elements.trainingDataBody.innerHTML =
            `<tr><td colspan="4" style="text-align: center; padding: 10px; color: red;">Error: ${error.message}</td></tr>`;
        elements.trainResult.innerHTML =
            `<div class="error">Error fetching training data: ${error.message}</div>`;
    }
}

/**
 * Display content in modal
 */
function showContentInModal(title, content) {
    elements.modalTitle.textContent = title;

    // Convert content to string if it's an object
    let formattedContent = formatObjectToString(content);

    // Preserve line breaks for table-formatted data
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    // Set modal content
    elements.modalContent.innerHTML = formattedContent;

    elements.modal.style.display = 'block';
}

/**
 * Convert object to string
 */
function formatObjectToString(obj) {
    if (typeof obj === 'string') {
        return obj;
    }

    try {
        // Format object for better readability
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        console.error('Error formatting object:', error);
        return String(obj);
    }
}

/**
 * Show loading indicator in an element
 */
function showLoading(element) {
    element.innerHTML = '<div class="spinner"></div> Loading...';
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
