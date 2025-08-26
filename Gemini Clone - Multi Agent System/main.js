// Keywords that will end the conversation
const END_CONVERSATION_KEYWORDS = [
    'bye', 'goodbye', 'exit', 'quit', 'done', 'stop', 'end', 'close', 
    'thanks', 'thank you', 'that\'s all', 'nothing else', 'see you'
];

// Flag to track if conversation has ended
let conversationEnded = false;

function checkIfConversationShouldEnd(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check if any ending keyword is present
    return END_CONVERSATION_KEYWORDS.some(keyword => 
        lowerMessage.includes(keyword) || lowerMessage === keyword
    );
}

function endConversation() {
    conversationEnded = true;
    const chat = document.querySelector(".chat");
    const textarea = document.querySelector(".chat-window textarea");
    const submitButton = document.querySelector(".input-area button[type='submit']");
    
    // Add final AI message
    const finalMessageElement = document.createElement("div");
    finalMessageElement.classList.add("message", "model");
    finalMessageElement.innerHTML = `
        <div class="avatar" aria-hidden="true"></div>
        <div class="bubble">
            <p>Goodbye! Thanks for chatting. Feel free to refresh the page if you want to start a new conversation.</p>
        </div>
    `;
    chat.appendChild(finalMessageElement);
    
    // Disable input
    textarea.disabled = true;
    textarea.placeholder = "Conversation ended. Refresh to start new chat.";
    submitButton.disabled = true;
    
    // Style disabled elements
    textarea.style.opacity = "0.5";
    submitButton.style.opacity = "0.5";
    submitButton.style.cursor = "not-allowed";
    
    chat.scrollTop = chat.scrollHeight;
}

function sendMessage(){
    const textarea = document.querySelector(".chat-window textarea");
    const usermessage = textarea.value;
    const chat = document.querySelector(".chat");

    if (usermessage.trim() === "" || conversationEnded) return;

    // Check if user wants to end conversation
    const shouldEnd = checkIfConversationShouldEnd(usermessage);

    // Create and append user message element
    const userMessageElement = document.createElement("div");
    userMessageElement.classList.add("message", "user");
    userMessageElement.innerHTML = `
        <div class="bubble">
            <p>${usermessage}</p>
        </div>
        <div class="avatar" aria-hidden="true"></div>
    `;
    chat.appendChild(userMessageElement);

    // Clear textarea and reset height
    textarea.value = "";
    textarea.style.height = "auto"; 

    // If user wants to end conversation, do it immediately
    if (shouldEnd) {
        endConversation();
        return;
    }

    // Create a placeholder for AI response
    const aiMessageElement = document.createElement("div");
    aiMessageElement.classList.add("message", "model");
    aiMessageElement.innerHTML = `
        <div class="avatar" aria-hidden="true"></div>
        <div class="bubble">
            <p class="loading-dots">...</p>
        </div>
    `;
    chat.appendChild(aiMessageElement);

    // Scroll to bottom immediately after adding messages
    chat.scrollTop = chat.scrollHeight;

    console.log('Sending message to backend:', usermessage); // Debug log

    // Send message to backend
    fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: usermessage }),
    })
    .then(response => {
        console.log('Response status:', response.status); // Debug log
        console.log('Response ok:', response.ok); // Debug log
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Received data:', data); // Debug log
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update the AI message bubble with the response
        const aiMessageBubble = aiMessageElement.querySelector('.bubble p');
        aiMessageBubble.classList.remove('loading-dots');
        aiMessageBubble.textContent = data.text;
        chat.scrollTop = chat.scrollHeight;

        // Don't auto-end based on AI response - only end when user explicitly says so
    })
    .catch(error => {
        console.error('Detailed error:', error); // Enhanced error logging
        
        // Update the AI message bubble with error
        const aiMessageBubble = aiMessageElement.querySelector('.bubble p');
        aiMessageBubble.classList.remove('loading-dots');
        aiMessageBubble.textContent = `Error: ${error.message || 'Could not get a response.'}`;
        chat.scrollTop = chat.scrollHeight;
    });
}

function autoExpand(field) {
    if (conversationEnded) return; // Don't expand if conversation ended
    
    field.style.height = 'inherit';
    var computed = window.getComputedStyle(field);
    var height = parseInt(computed.getPropertyValue('border-top-width'), 10)
                 + parseInt(computed.getPropertyValue('padding-top'), 10)
                 + field.scrollHeight
                 + parseInt(computed.getPropertyValue('padding-bottom'), 10)
                 + parseInt(computed.getPropertyValue('border-bottom-width'), 10);
    field.style.height = height + 'px';
}

// Add restart functionality to close button
document.querySelector(".close").addEventListener("click", () => {
    if (confirm("Are you sure you want to close the chat? This will end the conversation.")) {
        location.reload(); // Refresh the page to restart
    }
});

document.querySelector(".input-area").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!conversationEnded) {
        sendMessage();
    }
});

document.querySelector(".input-area textarea").addEventListener("input", (e) => {
    autoExpand(e.target);
});

document.querySelector(".input-area textarea").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !conversationEnded) {
        e.preventDefault();
        sendMessage();
    }
});
