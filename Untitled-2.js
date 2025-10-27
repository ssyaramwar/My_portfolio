< !DOCTYPE html >
    <html lang="en">
        <head>
            <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Academic Resource Hub (Owner/Customer)</title>
                    <!-- Load Tailwind CSS -->
                    <script src="https://cdn.tailwindcss.com"></script>
                    <!-- Load Lucide Icons -->
                    <script src="https://unpkg.com/lucide@latest"></script>
                    <!-- Load Firebase SDKs -->
                    <script type="module">
                        import {initializeApp} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
                        import {getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
                        import {getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
                        import {setLogLevel} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

                        // Set Firebase logging level for debugging
                        setLogLevel('Debug');

                        // --- GLOBAL SETUP & CONSTANTS ---
                        // IMPORTANT: To set a permanent owner, replace 'AUTO_SET_OWNER' with the full User ID
                        // displayed on the screen (e.g., 'your-unique-firebase-uid-string').
                        const MANUAL_OWNER_ID = 'AUTO_SET_OWNER';
                        let OWNER_USER_ID = MANUAL_OWNER_ID;

                        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { };
                        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                        let db;
                        let auth;
                        let userId = 'loading';
                        let userColor = '#10B981'; // Default green
                        let isFormVisible = false; // New state for form toggle

                        const PDF_COLLECTION_PATH = `artifacts/${appId}/public/data/shared_pdfs`;

                        // --- GEMINI API CONSTANTS ---
                        const API_KEY = ""; // Kept empty as per instructions
                        const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';
                        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;


                        // Utility function to generate a consistent, user-specific color
                        function stringToColor(str) {
                            let hash = 0;
                        for (let i = 0; i < str.length; i++) {
                            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
                        let color = '#';
                        for (let i = 0; i < 3; i++) {
                const value = (hash >> (i * 8)) & 0xFF;
                        color += ('00' + value.toString(16)).substr(-2);
            }
                        return color;
        }

                        // --- FIREBASE INITIALIZATION AND AUTHENTICATION ---
                        async function initializeFirebase() {
            try {
                const app = initializeApp(firebaseConfig);
                        db = getFirestore(app);
                        auth = getAuth(app);

                        // Sign in using the provided token or anonymously
                        if (initialAuthToken) {
                            await signInWithCustomToken(auth, initialAuthToken);
                } else {
                            await signInAnonymously(auth);
                }

                // Wait for auth state to settle
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                            userId = user.uid;

                        // Determine the Owner ID: Auto-set to current user if placeholder is used.
                        if (MANUAL_OWNER_ID === 'AUTO_SET_OWNER') {
                            OWNER_USER_ID = userId;
                        } else {
                            OWNER_USER_ID = MANUAL_OWNER_ID;
                        }

                        userColor = stringToColor(userId).substring(0, 7);
                        document.getElementById('user-id-display').textContent = `Your ID: ${userId}`;
                        document.getElementById('user-id-display').style.backgroundColor = userColor;
                        document.getElementById('main-content').classList.remove('hidden');
                        document.getElementById('loading-message').classList.add('hidden');

                        // Check ownership and update UI visibility
                        checkAndRenderOwnershipUI(userId);

                        startRealtimeListener();
                    } else {
                            console.error("Authentication failed or user logged out.");
                        document.getElementById('user-id-display').textContent = 'Authentication Failed';
                    }
                });

            } catch (error) {
                            console.error("Error initializing Firebase:", error);
                        document.getElementById('loading-message').textContent = 'Error loading application.';
            }
        }

                        // --- TOGGLE FUNCTION ---
                        function toggleFormVisibility() {
            const formWrapper = document.getElementById('form-fields-wrapper');
                        const toggleIcon = document.getElementById('toggle-icon');
                        const toggleButton = document.getElementById('toggle-form-button');

                        isFormVisible = !isFormVisible;

                        if (isFormVisible) {
                            formWrapper.classList.remove('hidden');
                        toggleIcon.setAttribute('data-lucide', 'x'); // Change icon to 'x' (close)
                        toggleButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                        toggleButton.classList.add('bg-red-500', 'hover:bg-red-600');
            } else {
                            formWrapper.classList.add('hidden');
                        toggleIcon.setAttribute('data-lucide', 'plus'); // Change icon to 'plus' (open)
                        toggleButton.classList.remove('bg-red-500', 'hover:bg-red-600');
                        toggleButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
            }
                        lucide.createIcons();
        }


                        // --- OWNERSHIP CHECK & UI UPDATE ---
                        function checkAndRenderOwnershipUI(currentUserId) {
            const isOwner = currentUserId === OWNER_USER_ID;
                        const linkSubmissionContainer = document.getElementById('link-submission-container');
                        const toggleButton = document.getElementById('toggle-form-button');
                        const ownerStatusDisplay = document.getElementById('owner-status');

                        ownerStatusDisplay.classList.remove('hidden', 'text-red-600', 'bg-red-100', 'text-indigo-600', 'bg-indigo-100');

                        if (isOwner) {
                            // Owner logic: Show the toggle button, form starts hidden
                            toggleButton.classList.remove('hidden');
                        document.getElementById('form-fields-wrapper').classList.add('hidden'); // Ensure form starts collapsed
                        isFormVisible = false;

                        ownerStatusDisplay.classList.add('text-indigo-600', 'bg-indigo-100');
                        ownerStatusDisplay.innerHTML = `<i data-lucide="crown" class="w-4 h-4 mr-1"></i> Role: **Owner**`;
            } else {
                            // Customer logic: Hide the entire submission container
                            linkSubmissionContainer.classList.add('hidden');
                        ownerStatusDisplay.classList.add('text-red-600', 'bg-red-100');
                        ownerStatusDisplay.innerHTML = `<i data-lucide="lock" class="w-4 h-4 mr-1"></i> Role: **Customer**`;
            }
                        lucide.createIcons();
        }


                        // --- REAL-TIME DATA LISTENER ---
                        function startRealtimeListener() {
            if (!db) return;

                        const pdfsCol = collection(db, PDF_COLLECTION_PATH);
                        const q = query(pdfsCol);

            onSnapshot(q, (snapshot) => {
                const pdfs = [];
                snapshot.forEach((doc) => {
                            pdfs.push({ id: doc.id, ...doc.data() });
                });

                // Sort client-side by timestamp (newest first)
                pdfs.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || 0;
                        const timeB = b.timestamp?.seconds || 0;
                        return timeB - timeA;
                });

                        renderPdfList(pdfs);
            }, (error) => {
                            console.error("Error listening to collection:", error);
                        document.getElementById('pdf-list').innerHTML = `<p class="text-red-500 p-4">Error fetching shared links: ${error.message}</p>`;
            });
        }

                        // --- RENDERING FUNCTIONS ---
                        function renderPdfList(pdfs) {
            const listContainer = document.getElementById('pdf-list');
                        listContainer.innerHTML = ''; // Clear existing list

                        if (pdfs.length === 0) {
                            listContainer.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i data-lucide="book-open-text" class="w-16 h-16 mx-auto mb-4 stroke-1"></i>
                        <p class="text-lg font-medium">No shared documents yet!</p>
                        <p class="text-sm">The Owner needs to add the first link.</p>
                    </div>
                `;
                        lucide.createIcons();
                        return;
            }

            pdfs.forEach(pdf => {
                const uploadedTime = pdf.timestamp ? new Date(pdf.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                        const uploaderIdShort = pdf.uploaderId ? pdf.uploaderId.substring(0, 8) : 'unknown';
                        const uploaderColor = pdf.uploaderId ? stringToColor(pdf.uploaderId) : '#9CA3AF';

                        const card = document.createElement('div');
                        // Removed dynamic border color from class name to avoid Tailwind JIT issue, using style instead.
                        card.className = `bg-white shadow-xl rounded-xl p-5 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between border-t-4 border-l-2`;
                        card.style.borderColor = uploaderColor;

                        card.innerHTML = `
                        <div>
                            <a href="${pdf.url}" target="_blank" rel="noopener noreferrer" class="text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors block mb-2 break-words">
                                <i data-lucide="file-text" class="w-5 h-5 inline mr-2 text-indigo-500"></i>
                                ${pdf.title}
                            </a>
                            <p class="text-sm text-gray-500 mb-4 break-all">
                                <span class="font-mono text-xs text-gray-700">${pdf.url}</span>
                            </p>
                        </div>
                        <div class="flex justify-between items-center text-xs text-gray-400 border-t pt-3 mt-3">
                            <div class="flex items-center">
                                <i data-lucide="user-circle" class="w-4 h-4 mr-1" style="color:${uploaderColor};"></i>
                                <span>Added by: <span class="font-semibold text-gray-600">${pdf.uploaderName || uploaderIdShort}</span></span>
                            </div>
                            <div class="flex items-center">
                                <i data-lucide="clock" class="w-3 h-3 mr-1"></i>
                                <span>${uploadedTime}</span>
                            </div>
                        </div>
                        `;
                        listContainer.appendChild(card);
            });
                        lucide.createIcons(); // Re-render icons after adding content
        }

                        // --- ADD PDF HANDLER ---
                        async function handleAddPdf(event) {
                            event.preventDefault();

                        // Authorization check: Only the owner should proceed
                        if (userId !== OWNER_USER_ID) {
                            // This shouldn't happen if the form is hidden, but acts as a final safeguard
                            alert("Only the Owner is authorized to add new links.");
                        return;
            }

                        const titleInput = document.getElementById('pdf-title');
                        const urlInput = document.getElementById('pdf-url');
                        const title = titleInput.value.trim();
                        const url = urlInput.value.trim();
                        const messageBox = document.getElementById('message-box');

                        if (!title || !url) {
                            messageBox.textContent = 'Please enter both a Title and a URL.';
                        messageBox.classList.remove('hidden', 'bg-green-100').classList.add('bg-red-100', 'text-red-800');
                        return;
            }

                        document.getElementById('add-button').textContent = 'Adding...';
                        document.getElementById('add-button').disabled = true;

                        try {
                if (!url.startsWith('http')) {
                    throw new Error("URL must start with http:// or https://");
                }

                        const pdfsCol = collection(db, PDF_COLLECTION_PATH);
                        await addDoc(pdfsCol, {
                            title: title,
                        url: url,
                        uploaderId: userId,
                        uploaderName: 'Owner', // Owner is always named 'Owner' in this system
                        timestamp: serverTimestamp()
                });

                        titleInput.value = ''; // Clear form
                        urlInput.value = '';
                        messageBox.textContent = 'Link added successfully! Closing form.';
                        messageBox.classList.remove('hidden', 'bg-red-100', 'text-red-800').classList.add('bg-green-100', 'text-green-800');

                // Collapse the form after successful submission
                setTimeout(() => toggleFormVisibility(), 1500); 

            } catch (error) {
                            console.error("Error adding document: ", error);
                        messageBox.textContent = `Error adding link: ${error.message}`;
                        messageBox.classList.remove('hidden', 'bg-green-100').classList.add('bg-red-100', 'text-red-800');
            } finally {
                const addButton = document.getElementById('add-button');
                        addButton.textContent = 'Share Link';
                        addButton.disabled = false;
                setTimeout(() => {
                    if (messageBox.textContent.startsWith('Link added successfully')) {
                            // Message box will be hidden by the form toggle, so no need to hide here
                        } else {
                            // Hide error messages
                            messageBox.classList.add('hidden');
                    }
                }, 4000);
            }
        }

                        // --- GEMINI API GENERATION LOGIC ---

                        function updateStudyAssistantUI(text, sources) {
            const resultDiv = document.getElementById('ai-result');
                        resultDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

                            const sourcesDiv = document.getElementById('ai-sources');
                            sourcesDiv.innerHTML = '';
            
            if (sources && sources.length > 0) {
                const sourceTitle = document.createElement('p');
                            sourceTitle.className = 'text-xs font-semibold text-gray-600 mt-4 mb-2';
                            sourceTitle.textContent = 'Sources:';
                            sourcesDiv.appendChild(sourceTitle);

                            const ul = document.createElement('ul');
                            ul.className = 'text-xs text-gray-500 space-y-1';
                sources.slice(0, 3).forEach((source, index) => {
                    const li = document.createElement('li');
                            li.innerHTML = `<a href="${source.uri}" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-500">${index + 1}. ${source.title || source.uri}</a>`;
                            ul.appendChild(li);
                });
                            sourcesDiv.appendChild(ul);
            }
        }

                            async function handleAIGeneration(event) {
                                event.preventDefault();

                            const promptInput = document.getElementById('ai-prompt');
                            const prompt = promptInput.value.trim();
                            const submitButton = document.getElementById('ai-submit-button');
                            const loadingIndicator = document.getElementById('ai-loading');
                            const resultBox = document.getElementById('ai-result-box');

                            if (!prompt) {
                                alert("Please enter a question for the Study Assistant.");
                            return;
            }

                            // Reset UI and show loading
                            resultBox.classList.remove('hidden');
                            document.getElementById('ai-result').textContent = '';
                            document.getElementById('ai-sources').innerHTML = '';
                            submitButton.disabled = true;
                            loadingIndicator.classList.remove('hidden');

                            const systemPrompt = "Act as an expert academic tutor. Provide a helpful, concise, and structured answer to the user's query, focusing on academic concepts and study aids. Format the response clearly using markdown for bolding and lists. Use Google Search grounding for factual information.";

                            const payload = {
                                contents: [{parts: [{text: prompt }] }],
                            tools: [{"google_search": { } }],
                            systemInstruction: {
                                parts: [{text: systemPrompt }]
                },
            };

                            let response;
                            let success = false;
                            let maxRetries = 5;
                            let delay = 1000;

                            for (let i = 0; i < maxRetries; i++) {
                try {
                                response = await fetch(API_URL, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });

                            if (response.ok) {
                                success = true;
                            break;
                    } else if (response.status === 429) {
                                // Rate limit exceeded, retry with exponential backoff
                                console.warn(`Rate limit exceeded (429). Retrying in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                            delay *= 2; // Exponential backoff
                    } else {
                        throw new Error(`API returned status code ${response.status}`);
                    }
                } catch (error) {
                    // Handle network or parsing errors
                    if (i === maxRetries - 1) {
                         throw error;
                    }
                            console.error("Fetch error, retrying:", error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                            delay *= 2; 
                }
            }

                            loadingIndicator.classList.add('hidden');
                            submitButton.disabled = false;

                            if (!success) {
                                updateStudyAssistantUI("Error: The Study Assistant could not connect or generate a response after multiple retries. Please try again.", null);
                            return;
            }

                            try {
                const result = await response.json();
                            const candidate = result.candidates?.[0];

                            if (candidate && candidate.content?.parts?.[0]?.text) {
                    const text = candidate.content.parts[0].text;

                            let sources = [];
                            const groundingMetadata = candidate.groundingMetadata;
                            if (groundingMetadata && groundingMetadata.groundingAttributions) {
                                sources = groundingMetadata.groundingAttributions
                                    .map(attribution => ({
                                        uri: attribution.web?.uri,
                                        title: attribution.web?.title,
                                    }))
                                    .filter(source => source.uri); 
                    }

                            updateStudyAssistantUI(text, sources);

                } else {
                                updateStudyAssistantUI("The Study Assistant returned an empty or unexpected response.", null);
                }
            } catch (e) {
                                console.error("Error processing API response:", e);
                            updateStudyAssistantUI("Error: Could not process the assistant's response.", null);
            }
        }


                            // Attach the submit handlers
                            window.onload = function() {
                                document.getElementById('pdf-form').addEventListener('submit', handleAddPdf);
                            document.getElementById('toggle-form-button').addEventListener('click', toggleFormVisibility);
                            document.getElementById('ai-form').addEventListener('submit', handleAIGeneration); // New AI handler
                            initializeFirebase();
        }

                    </script>
                    <style>
        /* Custom styles for better aesthetics and a nice background */
                        body {
                            font - family: 'Inter', sans-serif;
                        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }
                    </style>
                </head>
                <body class="min-h-screen">

                    <div id="loading-message" class="flex items-center justify-center h-screen flex-col">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
                        <p class="text-lg text-indigo-600 font-medium">Connecting to Shared Hub...</p>
                    </div>

                    <div id="main-content" class="container mx-auto p-4 sm:p-6 lg:p-8 hidden">

                        <!-- Header and User ID Display -->
                        <header class="mb-8 border-b-2 pb-4 flex flex-col sm:flex-row justify-between items-center">
                            <h1 class="text-3xl font-extrabold text-gray-900 flex items-center mb-3 sm:mb-0">
                                <i data-lucide="graduation-cap" class="w-8 h-8 mr-3 text-indigo-600"></i>
                                Academic Resource Hub
                            </h1>
                            <div class="flex items-center space-x-3">
                                <div id="owner-status" class="hidden text-sm font-semibold px-4 py-1 rounded-full shadow-md transition-all duration-300 flex items-center">
                                    <!-- Owner/Customer Status will be rendered here -->
                                </div>
                                <div id="user-id-display" class="text-sm font-mono text-white px-4 py-1 rounded-full shadow-md transition-all duration-300 truncate max-w-xs"
                                    style="background-color: #10B981;">
                                    Your ID: loading
                                </div>
                            </div>
                        </header>

                        <!-- Link Submission Form (Container only visible for Owner) -->
                        <div id="link-submission-container" class="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl mb-8 border border-indigo-200">

                            <!-- Toggle Header -->
                            <div class="flex justify-between items-center">
                                <div class="flex flex-col">
                                    <h2 class="text-2xl font-semibold text-indigo-700 flex items-center">
                                        <i data-lucide="link" class="w-6 h-6 mr-2"></i>
                                        Document Submission Tool
                                    </h2>
                                    <p class="text-sm text-gray-600 mt-1">
                                        Click the **`+`** to add a new link.
                                    </p>
                                </div>

                                <!-- Toggle Button (Only visible for Owner, acts as a toggle) -->
                                <button id="toggle-form-button" class="hidden p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-110 active:scale-95" aria-label="Toggle Add Link Form">
                                    <i data-lucide="plus" id="toggle-icon" class="w-6 h-6"></i>
                                </button>
                            </div>

                            <!-- The actual form content, hidden by default and toggled by the owner -->
                            <form id="pdf-form" class="mt-4 pt-4 border-t border-indigo-100 hidden" >
                                <div id="form-fields-wrapper" class="space-y-4">
                                    <div>
                                        <label for="pdf-title" class="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                                        <input type="text" id="pdf-title" required placeholder="e.g., Quantum Physics Notes - Chapter 3"
                                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition duration-150">
                                    </div>
                                    <div>
                                        <label for="pdf-url" class="block text-sm font-medium text-gray-700 mb-1">Public URL Link</label>
                                        <input type="url" id="pdf-url" required placeholder="e.g., https://drive.google.com/share/..."
                                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition duration-150">
                                    </div>

                                    <button type="submit" id="add-button"
                                        class="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]">
                                        Share Link
                                    </button>
                                </div>
                            </form>

                            <!-- Message box moved outside of form -->
                            <div id="message-box" class="hidden text-center p-3 rounded-lg bg-green-100 text-green-800 font-medium transition-opacity duration-300 mt-4">
                                <!-- Messages appear here -->
                            </div>
                        </div>

                        <!-- === AI Study Assistant === -->
                        <div id="ai-assistant-container" class="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl mb-8 border border-green-200">
                            <h2 class="text-2xl font-semibold text-green-700 mb-4 flex items-center">
                                <i data-lucide="sparkles" class="w-6 h-6 mr-2 text-green-500"></i>
                                AI Study Assistant
                            </h2>
                            <form id="ai-form" class="flex flex-col sm:flex-row gap-3">
                                <input type="text" id="ai-prompt" required placeholder="Ask a question about your documents' topics (e.g., 'What is quantum entanglement?')"
                                    class="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 transition duration-150">
                                    <button type="submit" id="ai-submit-button"
                                        class="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center">
                                        Ask AI
                                    </button>
                            </form>

                            <!-- Loading Indicator -->
                            <div id="ai-loading" class="hidden text-center mt-4 p-3 text-green-600 font-medium">
                                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 inline-block mr-2"></div>
                                Generating Study Aid...
                            </div>

                            <!-- AI Result Box -->
                            <div id="ai-result-box" class="mt-6 pt-4 border-t border-gray-100 hidden">
                                <p id="ai-result" class="text-gray-800 leading-relaxed"></p>
                                <div id="ai-sources" class="mt-4"></div>
                            </div>
                        </div>
                        <!-- === End AI Study Assistant === -->


                        <!-- Shared PDF List -->
                        <h2 class="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                            <i data-lucide="folder-open" class="w-6 h-6 mr-2"></i>
                            Shared Resources (Viewable by All)
                        </h2>
                        <div id="pdf-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <!-- PDF Cards will be rendered here by JavaScript -->
                        </div>

                        <footer class="mt-12 pt-6 border-t text-center text-sm text-gray-500">
                            Real-time collaboration powered by Firebase. Ensure your shared links are publicly accessible!
                        </footer>
                    </div>

                </body>
            </html>
