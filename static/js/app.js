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
    jsonTrainType: document.getElementById('jsonTrainType'),
    jsonFormatExample: document.getElementById('jsonFormatExample'),
    jsonTrainingProgress: document.getElementById('jsonTrainingProgress'),
    jsonProgressFill: document.getElementById('jsonProgressFill'),
    jsonProgressText: document.getElementById('jsonProgressText'),

    // Training inputs
    trainDDLInput: document.getElementById('trainDDLInput'),
    trainDocumentationInput: document.getElementById('trainDocumentationInput'),
    trainSQLOnlyInput: document.getElementById('trainSQLOnlyInput'),
    trainQuestionInput: document.getElementById('trainQuestionInput'),
    trainSQLInput: document.getElementById('trainSQLInput'),

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

    // Make sure the default training type is set to question_sql
    elements.jsonTrainType.value = 'question_sql';

    // Initialize JSON format example
    updateJsonFormatExample();

    // Log the initial training type
    console.log("Initial training type:", elements.jsonTrainType.value);
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

    // JSON file training
    elements.trainJsonFile.addEventListener('click', trainWithJsonFile);

    // Training data management
    elements.refreshTrainingData.addEventListener('click', fetchTrainingData);

    // JSON train type change
    elements.jsonTrainType.addEventListener('change', function () {
        const newType = elements.jsonTrainType.value;
        console.log("Training type dropdown changed to:", newType);
        updateJsonFormatExample();

        // Show a notification to the user
        elements.trainResult.innerHTML = `<div class="info">Training type changed to: <strong>${newType}</strong>. Please make sure your JSON file matches the expected format shown below.</div>`;
    });

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

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                // Try to parse as JSON
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                // If not JSON, use the raw text
                errorMessage += `<br>Details: ${errorText}`;
            }

            console.error("Training error:", errorMessage);
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();

        // Check if training was skipped because it already exists
        if (data.message.includes("already exists")) {
            elements.trainResult.innerHTML = `<div class="success">${data.message} <br>Schema training was already performed previously.</div>`;
        } else {
            elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        }
    } catch (error) {
        console.error("Exception during schema training:", error);
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

        // 요청 내용 로깅
        console.log("DDL Training Request:", JSON.stringify({
            train_type: 'ddl',
            content: ddl
        }));

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

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Full server error response:", errorText);
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                // Try to parse as JSON
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
                console.error("Parsed error JSON:", errorJson);
            } catch (parseError) {
                // If not JSON, use the raw text
                errorMessage += `<br>Details: ${errorText}`;
                console.error("Error parsing server response:", parseError);
            }

            console.error("Training error:", errorMessage);
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        console.log("DDL Training Response:", data);
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form field after successful training
        elements.trainDDLInput.value = '';
    } catch (error) {
        console.error("Exception during training:", error);
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

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                // Try to parse as JSON
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                // If not JSON, use the raw text
                errorMessage += `<br>Details: ${errorText}`;
            }

            console.error("Training error:", errorMessage);
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form field after successful training
        elements.trainDocumentationInput.value = '';
    } catch (error) {
        console.error("Exception during training:", error);
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

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                // Try to parse as JSON
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                // If not JSON, use the raw text
                errorMessage += `<br>Details: ${errorText}`;
            }

            console.error("Training error:", errorMessage);
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form field after successful training
        elements.trainSQLOnlyInput.value = '';
    } catch (error) {
        console.error("Exception during training:", error);
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

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                // Try to parse as JSON
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                // If not JSON, use the raw text
                errorMessage += `<br>Details: ${errorText}`;
            }

            console.error("Training error:", errorMessage);
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

        // Clear the form fields after successful training
        elements.trainQuestionInput.value = '';
        elements.trainSQLInput.value = '';
    } catch (error) {
        console.error("Exception during training:", error);
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
 * Update the JSON format example based on the selected training type
 */
function updateJsonFormatExample() {
    const trainType = elements.jsonTrainType.value;
    console.log("Training type changed to:", trainType);
    let exampleHtml = '';

    // Add a visual indicator of the selected type
    let typeIndicator = `<div class="selected-type-indicator">Selected Type: <strong>${trainType}</strong></div>`;

    switch (trainType) {
        case 'question_sql':
            exampleHtml = `${typeIndicator}<pre class="example-content">[
  {
    "question": "What are the top 10 companies by revenue?",
    "sql": "SELECT company_name, revenue FROM companies ORDER BY revenue DESC LIMIT 10"
  },
  {
    "question": "How many employees work in each department?",
    "sql": "SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department ORDER BY employee_count DESC"
  }
]</pre>`;
            break;
        case 'ddl':
            exampleHtml = `${typeIndicator}<pre class="example-content">[
  "CREATE TABLE my_table (id INT, name TEXT)",
  "CREATE TABLE another_table (id INT, value FLOAT)"
]</pre>`;
            break;
        case 'documentation':
            exampleHtml = `${typeIndicator}<pre class="example-content">[
  "Our business defines customer lifetime value (CLV) as the total revenue generated by a customer over their entire relationship with our company.",
  "The customers table contains information about all registered users of our platform."
]</pre>`;
            break;
        case 'sql':
            exampleHtml = `${typeIndicator}<pre class="example-content">[
  "SELECT col1, col2, col3 FROM my_table WHERE condition = 'value'",
  "SELECT COUNT(*) FROM customers GROUP BY country"
]</pre>`;
            break;
    }

    elements.jsonFormatExample.innerHTML = exampleHtml;
}

/**
 * Train the model with a JSON file from the general JSON tab
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

    // Check file size
    if (file.size === 0) {
        elements.trainResult.innerHTML = '<div class="error">The selected JSON file is empty</div>';
        return;
    }

    // Get the selected training type
    const trainType = elements.jsonTrainType.value;
    console.log("Submitting with training type:", trainType);

    // Show a message that we're validating the file
    elements.trainResult.innerHTML = '<div class="info">Validating JSON file...</div>';

    // Read file content to verify it's valid JSON before sending
    try {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                // Try to parse the JSON to validate it
                const content = e.target.result;
                console.log("File content preview:", content.substring(0, 200) + "...");

                try {
                    // Validate JSON format
                    const jsonData = JSON.parse(content);

                    // Additional validation based on training type
                    let isValid = true;
                    let errorMessage = "";

                    if (trainType === "question_sql") {
                        // For question_sql, we expect an array of objects with question and sql fields
                        if (!Array.isArray(jsonData)) {
                            isValid = false;
                            errorMessage = "JSON file must contain an array of objects for question_sql training";
                        } else if (jsonData.length === 0) {
                            isValid = false;
                            errorMessage = "JSON file contains an empty array";
                        } else if (!jsonData[0].question || (!jsonData[0].sql && !jsonData[0].answer)) {
                            isValid = false;
                            errorMessage = "JSON objects must have 'question' and 'sql' (or 'answer') fields for question_sql training";
                        }
                    } else if (["ddl", "documentation", "sql"].includes(trainType)) {
                        // For other types, we expect an array of strings
                        if (!Array.isArray(jsonData) && typeof jsonData !== "string") {
                            isValid = false;
                            errorMessage = `JSON file must contain an array of strings or a single string for ${trainType} training`;
                        } else if (Array.isArray(jsonData) && jsonData.length === 0) {
                            isValid = false;
                            errorMessage = "JSON file contains an empty array";
                        }
                    }

                    if (isValid) {
                        // If we get here, JSON is valid, proceed with upload
                        elements.trainResult.innerHTML = '<div class="info">JSON is valid. Uploading...</div>';
                        await uploadJsonFile(file, trainType);
                    } else {
                        elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
                    }
                } catch (parseError) {
                    console.error("JSON parse error:", parseError);
                    elements.trainResult.innerHTML = `<div class="error">Invalid JSON format: ${parseError.message}</div>`;
                }
            } catch (error) {
                console.error("Error reading file:", error);
                elements.trainResult.innerHTML = `<div class="error">Error reading file: ${error.message}</div>`;
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error("Error setting up file reader:", error);
        elements.trainResult.innerHTML = `<div class="error">Error setting up file reader: ${error.message}</div>`;
    }
}

/**
 * Upload and process a JSON file for training
 */
async function uploadJsonFile(file, trainType) {
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
        formData.append('train_type', trainType);

        // Log the form data being sent
        console.log("Sending form data with train_type:", trainType);
        console.log("File details:", {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified).toISOString()
        });

        // Upload the file
        const response = await fetch('/train/json', {
            method: 'POST',
            body: formData
        });

        // Update progress
        elements.jsonProgressFill.style.width = '50%';
        elements.jsonProgressText.textContent = 'Processing training data...';

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                // Try to parse as JSON
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                // If not JSON, use the raw text
                errorMessage += `<br>Details: ${errorText}`;
            }

            console.error("JSON training error:", errorMessage);
            elements.jsonProgressText.textContent = 'Error!';
            elements.jsonProgressFill.style.width = '100%';
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        // Parse the response
        const data = await response.json();
        console.log("Server response:", data);

        // Update progress to complete
        elements.jsonProgressFill.style.width = '100%';
        elements.jsonProgressText.textContent = 'Training complete!';

        // Show the result
        let resultMessage = `<div class="success">${data.message}</div>`;

        // Add details about errors if any
        if (data.error_count > 0) {
            resultMessage += `<div class="error">Failed to train ${data.error_count} examples. See details below:</div>`;
            resultMessage += '<ul class="error-list">';
            data.errors.forEach(error => {
                let errorDetail = `<li>Error at index ${error.index}: ${error.error}</li>`;

                // Add example data if available for more context
                if (error.example) {
                    if (typeof error.example === 'object') {
                        try {
                            const exampleJson = JSON.stringify(error.example, null, 2);
                            errorDetail += `<div class="error-example"><pre>${exampleJson}</pre></div>`;
                        } catch (e) {
                            errorDetail += `<div class="error-example">Unable to display example data</div>`;
                        }
                    } else {
                        errorDetail += `<div class="error-example"><pre>${error.example}</pre></div>`;
                    }
                }

                resultMessage += errorDetail;
            });
            resultMessage += '</ul>';
        }

        elements.trainResult.innerHTML = resultMessage;

        // Reset the file input
        elements.jsonFile.value = '';
    } catch (error) {
        console.error("Exception during JSON file training:", error);
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
