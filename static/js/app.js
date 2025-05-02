const state = {
    isConnected: false,
    isTraining: false,
    hasApiKey: false,
    hasDbConfig: false,
    schemaTrained: false
};

const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    checkStatusBtn: document.getElementById('checkStatus'),
    connectBtn: document.getElementById('connect'),
    connectResult: document.getElementById('connectResult'),
    hostInput: document.getElementById('host'),
    dbnameInput: document.getElementById('dbname'),
    userInput: document.getElementById('user'),
    passwordInput: document.getElementById('password'),
    portInput: document.getElementById('port'),
    apiKeyInput: document.getElementById('api_key'),
    modelInput: document.getElementById('model'),
    apiKeyStatus: document.getElementById('api_key_status'),
    passwordStatus: document.getElementById('password_status'),
    trainSchema: document.getElementById('trainSchema'),
    trainDDL: document.getElementById('trainDDL'),
    trainDocumentation: document.getElementById('trainDocumentation'),
    trainSQLOnly: document.getElementById('trainSQLOnly'),
    trainQuestionSQL: document.getElementById('trainQuestionSQL'),
    trainJsonFile: document.getElementById('trainJsonFile'),
    refreshTrainingData: document.getElementById('refreshTrainingData'),
    deleteAllTrainingData: document.getElementById('deleteAllTrainingData'),
    trainResult: document.getElementById('trainResult'),
    jsonFile: document.getElementById('jsonFile'),
    jsonTrainType: document.getElementById('jsonTrainType'),
    jsonFormatExample: document.getElementById('jsonFormatExample'),
    jsonTrainingProgress: document.getElementById('jsonTrainingProgress'),
    jsonProgressFill: document.getElementById('jsonProgressFill'),
    jsonProgressText: document.getElementById('jsonProgressText'),
    trainDDLInput: document.getElementById('trainDDLInput'),
    trainDocumentationInput: document.getElementById('trainDocumentationInput'),
    trainSQLOnlyInput: document.getElementById('trainSQLOnlyInput'),
    trainQuestionInput: document.getElementById('trainQuestionInput'),
    trainSQLInput: document.getElementById('trainSQLInput'),
    questionInput: document.getElementById('question'),
    queryBtn: document.getElementById('query'),
    sqlQuery: document.getElementById('sqlQuery'),
    queryResults: document.getElementById('queryResults'),
    explanation: document.getElementById('explanation'),
    trainingDataBody: document.getElementById('trainingDataBody'),
    modal: document.getElementById('contentModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalContent: document.getElementById('modalContent'),
    closeModalBtn: document.querySelector('.close')
};

function initApp() {
    setupEventListeners();
    setupTabNavigation();
    setupModal();
    checkConnectionStatus();
    checkApiConfig();
    checkDbConfig();
    elements.jsonTrainType.value = 'question_sql';
    updateJsonFormatExample();
}

function setupEventListeners() {
    elements.checkStatusBtn.addEventListener('click', checkConnectionStatus);
    elements.connectBtn.addEventListener('click', connectToDatabase);
    elements.trainSchema.addEventListener('click', trainSchema);
    elements.trainDDL.addEventListener('click', trainDDL);
    elements.trainDocumentation.addEventListener('click', trainDocumentation);
    elements.trainSQLOnly.addEventListener('click', trainSQL);
    elements.trainQuestionSQL.addEventListener('click', trainQuestionSQL);
    elements.trainJsonFile.addEventListener('click', trainWithJsonFile);
    elements.refreshTrainingData.addEventListener('click', fetchTrainingData);
    elements.deleteAllTrainingData.addEventListener('click', deleteAllTrainingData);

    elements.jsonTrainType.addEventListener('change', function () {
        const newType = elements.jsonTrainType.value;
        updateJsonFormatExample();
        elements.trainResult.innerHTML = `<div class="info">Training type changed to: <strong>${newType}</strong>. Please make sure your JSON file matches the expected format shown below.</div>`;
    });

    elements.queryBtn.addEventListener('click', queryDatabase);
    document.querySelector('.tab[data-tab="manage"]').addEventListener('click', fetchTrainingData);
}

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

function setupModal() {
    elements.closeModalBtn.addEventListener('click', () => {
        elements.modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === elements.modal) {
            elements.modal.style.display = 'none';
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && elements.modal.style.display === 'block') {
            elements.modal.style.display = 'none';
        }
    });
}

async function checkConnectionStatus() {
    try {
        showLoading(elements.connectionStatus);
        const response = await fetch('/nl-postgres/connection_status');
        const data = await response.json();

        if (data.connected) {
            elements.connectionStatus.innerHTML = `<div class="success">Connected to ${data.connection_info.dbname} on ${data.connection_info.host}</div>`;
            state.isConnected = true;

            // Check schema training status
            state.schemaTrained = data.schema_trained || false;

            if (state.schemaTrained) {
                elements.trainSchema.textContent = "Train on Schema";
                elements.trainSchema.disabled = false;
                elements.trainSchema.style.backgroundColor = "#4CAF50";
            } else {
                // Schema not trained - show notification and highlight the train button
                elements.trainSchema.textContent = "Initialize Schema Training";
                elements.trainSchema.disabled = false;
                elements.trainSchema.style.backgroundColor = "#ff9800"; // Orange to highlight importance

                // Show notification in the training result area
                elements.trainResult.innerHTML = `
                    <div class="warning">
                        <strong>Schema training required!</strong><br>
                        Your database is connected but schema training has not been performed.
                        Please click the "Initialize Schema Training" button above to train the model on your database schema.
                        This is required for the natural language queries to work properly.
                    </div>`;

                // Switch to the schema tab
                document.querySelector('.tab[data-tab="schema"]').click();
            }
        } else {
            elements.connectionStatus.innerHTML = '<div class="error">Not connected to any database</div>';
            state.isConnected = false;
            state.schemaTrained = false;
            elements.trainSchema.disabled = true;
            elements.trainSchema.style.backgroundColor = "#cccccc";
        }
    } catch (error) {
        elements.connectionStatus.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        state.isConnected = false;
        state.schemaTrained = false;
    }
}

async function connectToDatabase() {
    const connectData = {
        host: elements.hostInput.value,
        dbname: elements.dbnameInput.value,
        user: elements.userInput.value,
        password: elements.passwordInput.value,
        port: elements.portInput.value,
        api_key: elements.apiKeyInput.value,
        model: elements.modelInput.value
    };

    try {
        showLoading(elements.connectResult);
        elements.connectBtn.disabled = true;

        const response = await fetch('/nl-postgres/connect', {
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

            // Check connection and training status
            checkConnectionStatus();

            // Also check training status specifically
            checkTrainingStatus();
        } else {
            elements.connectResult.innerHTML = `<div class="error">${data.message}</div>`;
        }
    } catch (error) {
        elements.connectResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        elements.connectBtn.disabled = false;
    }
}

async function checkApiConfig() {
    try {
        const response = await fetch('/nl-postgres/api_config');
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

async function checkDbConfig() {
    try {
        const response = await fetch('/nl-postgres/db_config');
        const data = await response.json();

        if (data.has_db_config) {
            elements.hostInput.value = data.host;
            elements.hostInput.placeholder = "Example: localhost";
            elements.portInput.value = data.port;
            elements.portInput.placeholder = "Example: 5432";
            elements.dbnameInput.value = data.dbname;
            elements.dbnameInput.placeholder = "Example: postgres";
            elements.userInput.value = data.user;
            elements.userInput.placeholder = "Example: postgres";
            elements.passwordInput.value = "";
            elements.passwordInput.placeholder = "Enter your database password or leave empty to use .env";

            if (data.password) {
                elements.passwordStatus.innerHTML = '<span style="color: green;">✓ Password available in .env</span>';
            } else {
                elements.passwordStatus.innerHTML = '<span style="color: red;">✗ No password in .env</span>';
            }

            state.hasDbConfig = true;
        } else {
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
            elements.passwordStatus.innerHTML = '<span style="color: red;">✗ No password in .env</span>';
            state.hasDbConfig = false;
        }
    } catch (error) {
        state.hasDbConfig = false;
    }
}

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

        const response = await fetch('/nl-postgres/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ train_type: 'schema' })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                errorMessage += `<br>Details: ${errorText}`;
            }

            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();

        if (data.message.includes("already exists")) {
            elements.trainResult.innerHTML = `<div class="success">${data.message} <br>Schema training was already performed previously.</div>`;
        } else {
            elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        }
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        const trainButton = elements.trainSchema;
        trainButton.textContent = "Train on Schema";
        trainButton.disabled = false;
        trainButton.style.backgroundColor = "#4CAF50";
    }
}

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

        const response = await fetch('/nl-postgres/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'ddl',
                content: ddl
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                errorMessage += `<br>Details: ${errorText}`;
            }

            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        elements.trainDDLInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        const trainButton = elements.trainDDL;
        trainButton.disabled = false;
        trainButton.textContent = "Train on DDL";
    }
}

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

        const response = await fetch('/nl-postgres/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'documentation',
                content: documentation
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                errorMessage += `<br>Details: ${errorText}`;
            }

            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        elements.trainDocumentationInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        const trainButton = elements.trainDocumentation;
        trainButton.disabled = false;
        trainButton.textContent = "Train on Documentation";
    }
}

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

        const response = await fetch('/nl-postgres/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                train_type: 'sql',
                content: sql
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                errorMessage += `<br>Details: ${errorText}`;
            }

            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        elements.trainSQLOnlyInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        const trainButton = elements.trainSQLOnly;
        trainButton.disabled = false;
        trainButton.textContent = "Train on SQL";
    }
}

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

        const response = await fetch('/nl-postgres/train', {
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

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                errorMessage += `<br>Details: ${errorText}`;
            }

            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;
        elements.trainQuestionInput.value = '';
        elements.trainSQLInput.value = '';
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        const trainButton = elements.trainQuestionSQL;
        trainButton.disabled = false;
        trainButton.textContent = "Train on Question-SQL Pair";
    }
}

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
        elements.sqlQuery.textContent = 'Generating SQL...';
        elements.queryResults.textContent = 'Waiting for results...';
        elements.explanation.textContent = '';

        const response = await fetch('/nl-postgres/query', {
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

function updateJsonFormatExample() {
    const trainType = elements.jsonTrainType.value;
    let exampleHtml = '';
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

    if (file.size === 0) {
        elements.trainResult.innerHTML = '<div class="error">The selected JSON file is empty</div>';
        return;
    }

    const trainType = elements.jsonTrainType.value;
    elements.trainResult.innerHTML = '<div class="info">Validating JSON file...</div>';

    try {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const content = e.target.result;

                try {
                    const jsonData = JSON.parse(content);
                    let isValid = true;
                    let errorMessage = "";

                    if (trainType === "question_sql") {
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
                        if (!Array.isArray(jsonData) && typeof jsonData !== "string") {
                            isValid = false;
                            errorMessage = `JSON file must contain an array of strings or a single string for ${trainType} training`;
                        } else if (Array.isArray(jsonData) && jsonData.length === 0) {
                            isValid = false;
                            errorMessage = "JSON file contains an empty array";
                        }
                    }

                    if (isValid) {
                        elements.trainResult.innerHTML = '<div class="info">JSON is valid. Uploading...</div>';
                        await uploadJsonFile(file, trainType);
                    } else {
                        elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
                    }
                } catch (parseError) {
                    elements.trainResult.innerHTML = `<div class="error">Invalid JSON format: ${parseError.message}</div>`;
                }
            } catch (error) {
                elements.trainResult.innerHTML = `<div class="error">Error reading file: ${error.message}</div>`;
            }
        };
        reader.readAsText(file);
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error setting up file reader: ${error.message}</div>`;
    }
}

async function uploadJsonFile(file, trainType) {
    try {
        const trainButton = elements.trainJsonFile;
        trainButton.disabled = true;
        trainButton.textContent = "Uploading...";

        elements.jsonTrainingProgress.style.display = 'block';
        elements.jsonProgressFill.style.width = '10%';
        elements.jsonProgressText.textContent = 'Uploading file...';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('train_type', trainType);

        const response = await fetch('/nl-postgres/train/json', {
            method: 'POST',
            body: formData
        });

        elements.jsonProgressFill.style.width = '50%';
        elements.jsonProgressText.textContent = 'Processing training data...';

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) {
                    errorMessage += `<br>Details: ${errorJson.detail}`;
                } else {
                    errorMessage += `<br>Details: ${JSON.stringify(errorJson)}`;
                }
            } catch (parseError) {
                errorMessage += `<br>Details: ${errorText}`;
            }

            elements.jsonProgressText.textContent = 'Error!';
            elements.jsonProgressFill.style.width = '100%';
            elements.trainResult.innerHTML = `<div class="error">${errorMessage}</div>`;
            return;
        }

        const data = await response.json();
        elements.jsonProgressFill.style.width = '100%';
        elements.jsonProgressText.textContent = 'Training complete!';

        let resultMessage = `<div class="success">${data.message}</div>`;

        if (data.error_count > 0) {
            resultMessage += `<div class="error">Failed to train ${data.error_count} examples. See details below:</div>`;
            resultMessage += '<ul class="error-list">';
            data.errors.forEach(error => {
                let errorDetail = `<li>Error at index ${error.index}: ${error.error}</li>`;

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
        elements.jsonFile.value = '';
    } catch (error) {
        elements.jsonProgressFill.style.width = '100%';
        elements.jsonProgressText.textContent = 'Error!';
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        const trainButton = elements.trainJsonFile;
        trainButton.disabled = false;
        trainButton.textContent = "Train with JSON File";

        setTimeout(() => {
            elements.jsonTrainingProgress.style.display = 'none';
        }, 3000);
    }
}

async function fetchTrainingData() {
    if (!state.isConnected) {
        elements.trainingDataBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 10px;">Not connected to a database. Please connect first.</td></tr>';
        return;
    }

    try {
        showLoading(elements.trainingDataBody);

        const response = await fetch('/nl-postgres/training_data');
        const data = await response.json();

        elements.trainingDataBody.innerHTML = '';

        if (!data.training_data || data.training_data.length === 0) {
            elements.trainingDataBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 10px;">No training data found</td></tr>';
            return;
        }

        const sortedData = [...data.training_data].sort((a, b) => {
            if (a.id && b.id) {
                return a.id.localeCompare(b.id);
            }
            return 0;
        });

        sortedData.forEach(item => {
            const row = document.createElement('tr');

            const idCell = document.createElement('td');
            idCell.style.padding = '8px';
            idCell.style.borderBottom = '1px solid #ddd';
            idCell.textContent = item.id || 'N/A';
            row.appendChild(idCell);

            const typeCell = document.createElement('td');
            typeCell.style.padding = '8px';
            typeCell.style.borderBottom = '1px solid #ddd';
            typeCell.textContent = item.training_data_type || 'Unknown';
            row.appendChild(typeCell);

            const viewCell = document.createElement('td');
            viewCell.style.padding = '8px';
            viewCell.style.borderBottom = '1px solid #ddd';
            viewCell.style.textAlign = 'center';

            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Content';
            viewButton.style.backgroundColor = '#4CAF50';
            viewButton.style.padding = '5px 10px';
            viewButton.style.fontSize = '14px';
            viewButton.style.border = 'none';
            viewButton.style.borderRadius = '4px';
            viewButton.style.color = 'white';
            viewButton.style.cursor = 'pointer';

            viewButton.addEventListener('click', () => {
                let dataType = item.training_data_type || 'Unknown';
                const title = `${dataType} - ${item.id}`;
                showContentInModal(title, item);
            });

            viewCell.appendChild(viewButton);
            row.appendChild(viewCell);

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
                        const response = await fetch(`/nl-postgres/training_data/${item.id}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            elements.trainResult.innerHTML = `<div class="success">Successfully deleted training data with ID: ${item.id}</div>`;
                            fetchTrainingData();
                        } else {
                            const errorData = await response.json();
                            elements.trainResult.innerHTML = `<div class="error">Error: ${errorData.detail || 'Failed to delete training data'}</div>`;
                        }
                    } catch (error) {
                        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
                    }
                }
            });

            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);

            elements.trainingDataBody.appendChild(row);
        });
    } catch (error) {
        elements.trainingDataBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 10px; color: red;">Error: ${error.message}</td></tr>`;
        elements.trainResult.innerHTML = `<div class="error">Error fetching training data: ${error.message}</div>`;
    }
}

function showContentInModal(title, content) {
    elements.modalTitle.textContent = title;
    let formattedContent = formatObjectToString(content);
    formattedContent = formattedContent.replace(/\n/g, '<br>');
    elements.modalContent.innerHTML = formattedContent;
    elements.modal.style.display = 'block';
}

function formatObjectToString(obj) {
    if (typeof obj === 'string') {
        return obj;
    }

    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        return String(obj);
    }
}

async function deleteAllTrainingData() {
    if (!state.isConnected) {
        elements.trainResult.innerHTML = '<div class="error">Not connected to a database. Please connect first.</div>';
        return;
    }

    // 확인 대화상자 표시
    const confirmDelete = confirm("정말로 모든 트레이닝 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 스키마 트레이닝 및 사용자 정의 트레이닝 데이터가 삭제됩니다.\n\n삭제 후에는 스키마 트레이닝을 다시 수행해야 합니다.");

    if (!confirmDelete) {
        return;
    }

    try {
        // 버튼 비활성화 및 로딩 표시
        elements.deleteAllTrainingData.disabled = true;
        elements.deleteAllTrainingData.textContent = "삭제 중...";
        showLoading(elements.trainResult);

        // API 호출
        const response = await fetch('/nl-postgres/training_data/all', {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            elements.trainResult.innerHTML = `<div class="error">Error: ${errorData.detail || '모든 트레이닝 데이터 삭제 실패'}</div>`;
            return;
        }

        const data = await response.json();

        // 결과 표시
        if (data.deleted_count === 0) {
            elements.trainResult.innerHTML = `<div class="info">${data.message}</div>`;
        } else {
            elements.trainResult.innerHTML = `<div class="success">${data.message}</div>`;

            // 스키마 트레이닝 상태 업데이트
            state.schemaTrained = false;
            elements.trainSchema.textContent = "Initialize Schema Training";
            elements.trainSchema.style.backgroundColor = "#ff9800";

            // 트레이닝 데이터 테이블 갱신
            fetchTrainingData();
        }

        // 오류가 있으면 표시
        if (data.errors && data.errors.length > 0) {
            const errorList = data.errors.map(err => `<li>${err}</li>`).join('');
            elements.trainResult.innerHTML += `<div class="error"><strong>일부 항목 삭제 중 오류 발생:</strong><ul>${errorList}</ul></div>`;
        }
    } catch (error) {
        elements.trainResult.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        // 버튼 상태 복원
        elements.deleteAllTrainingData.disabled = false;
        elements.deleteAllTrainingData.textContent = "Delete All Training Data";
    }
}

async function checkTrainingStatus() {
    if (!state.isConnected) {
        return;
    }

    try {
        const response = await fetch('/nl-postgres/training_status');
        const data = await response.json();

        if (data.connected) {
            state.schemaTrained = data.schema_trained;

            if (!data.schema_trained) {
                // Schema not trained - show notification and highlight the train button
                elements.trainSchema.textContent = "Initialize Schema Training";
                elements.trainSchema.disabled = false;
                elements.trainSchema.style.backgroundColor = "#ff9800"; // Orange to highlight importance

                // Show notification in the training result area
                elements.trainResult.innerHTML = `
                    <div class="warning">
                        <strong>Schema training required!</strong><br>
                        ${data.message}
                    </div>`;

                // Switch to the schema tab
                document.querySelector('.tab[data-tab="schema"]').click();
            } else {
                elements.trainSchema.textContent = "Train on Schema";
                elements.trainSchema.disabled = false;
                elements.trainSchema.style.backgroundColor = "#4CAF50";
            }
        }
    } catch (error) {
        console.error("Error checking training status:", error);
    }
}

function showLoading(element) {
    element.innerHTML = '<div class="spinner"></div> Loading...';
}

document.addEventListener('DOMContentLoaded', initApp);
