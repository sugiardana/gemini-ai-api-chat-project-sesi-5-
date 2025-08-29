const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

/**
 * Converts Gemini's Markdown-like response to formatted HTML.
 * Handles bolding, unordered lists, and newlines.
 * @param {string} text The raw text from the Gemini API.
 * @returns {string} The formatted HTML string.
 */
function formatGeminiResponse(text) {
  // For security, it's best to escape HTML to prevent XSS attacks.
  // A more robust solution in a real production app would use a library like DOMPurify.
  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // **bold** -> <strong>bold</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // * list item -> <li>list item</li>
  // This regex handles lines that start with an asterisk and a space.
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');

  // Wrap consecutive <li>s in a <ul>.
  // The 's' flag allows '.' to match newlines, grouping all list items.
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // Replace newlines with <br> for proper paragraph breaks.
  html = html.replace(/\n/g, '<br>');

  // Clean up extra <br> tags that might appear around lists.
  html = html.replace(/<br><ul>/g, '<ul>');
  html = html.replace(/<\/ul><br>/g, '</ul>');

  return html;
}

/**
 * Appends a message to the chat box and scrolls to the bottom.
 * Uses innerHTML to support formatted content.
 * @param {string} sender - The sender of the message, either 'user' or 'bot'.
 * @param {string} htmlContent - The content of the message, can be plain text or HTML.
 * @returns {HTMLElement} The message element that was appended to the chat box.
 */
function appendMessage(sender, htmlContent) {
  const msgElement = document.createElement('div');
  msgElement.classList.add('message', sender);
  // Use innerHTML to render formatted text from the bot
  msgElement.innerHTML = htmlContent;
  chatBox.appendChild(msgElement);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msgElement;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) {
    return;
  }

  // 1. Add the user's message to the chat box.
  // For user messages, we pass it directly as it doesn't need formatting.
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Show a temporary "Berpikir..." bot message and get a reference to it.
  const thinkingMessageElement = appendMessage('bot', 'Gemini sedang berpikir...');

  try {
    // 3. Send the user's message to the backend API.
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        message: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      // Try to get a more specific error message from the server body
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `Server responded with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // 4. When the response arrives, replace the "Berpikir..." message with the formatted AI reply.
    if (data && data.result) {
      thinkingMessageElement.innerHTML = formatGeminiResponse(data.result);
    } else {
      // 5. Handle cases where the response is OK but contains no result.
      thinkingMessageElement.textContent =
        'Maaf, tidak ada respon yang diterima.';
    }
  } catch (error) {
    console.error('Error fetching chat response:', error);
    // 5. Handle fetch errors (network issues, server down, etc.).
    thinkingMessageElement.textContent = `Gagal mendapatkan respon dari server: ${error.message}`;
  } finally {
    // 6. Scroll to the bottom of the chat box to show the latest message.
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});
