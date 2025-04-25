import readline from 'readline';
import { createTypedSocketClient } from '@ts-socketio/client';
import { chatContract } from './contract';

// Create command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create our typed socket client
const serverUrl = 'http://localhost:3000'; // default server URL
const client = createTypedSocketClient(chatContract, serverUrl);

// Track typing state
let isTyping = false;
let nickname = '';
let connected = false;

// Function to clear current line and reprint prompt
const clearLine = () => {
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 0);
};

// Set up listeners using our typed client
const setupListeners = () => {
  // Listen for user notifications (joins, leaves, etc.)
  client.listeners.onUserNotification((payload) => {
    clearLine();
    console.log(`📢 ${payload.message}`);
    promptUser();
  });

  // Listen for incoming messages
  client.listeners.onSendMessage((payload) => {
    // Only show messages from others
    if (payload.senderId !== client.socket.id) {
      clearLine();
      console.log(`${payload.senderNickname}: ${payload.text}`);
      promptUser();
    }
  });

  // Listen for typing indicators
  client.listeners.onTypingStatus((payload) => {
    // Only show typing indicators from others
    if (payload.userId !== client.socket.id) {
      clearLine();
      if (payload.isTyping) {
        process.stdout.write(`${payload.nickname} is typing...`);
      } else {
        // Just clear the typing indicator
      }
      promptUser();
    }
  });

  // Set connection status
  client.socket.on('connect', () => {
    connected = true;
    console.log(`Connected to server at ${serverUrl}`);
    promptForNickname();
  });

  client.socket.on('disconnect', () => {
    connected = false;
    console.log('Disconnected from server');
  });
};

// Prompt for nickname
const promptForNickname = () => {
  rl.question('Enter your nickname: ', async (input) => {
    try {
      const response = await client.setNickname({ nickname: input });
      
      if (response.success) {
        nickname = response.assignedNickname || input;
        console.log(`Welcome, ${nickname}!`);
        console.log('Type your messages and press Enter to send.');
        console.log('Type /exit to quit.');
        promptUser();
      } else {
        console.log(`Error: ${response.message}`);
        promptForNickname();
      }
    } catch (err) {
      console.error('Failed to set nickname:', err);
      promptForNickname();
    }
  });
};

// Regular message prompt
const promptUser = () => {
  rl.prompt(true);
};

// Handle user input
const handleUserInput = (input: string) => {
  // Cancel typing status
  if (isTyping) {
    isTyping = false;
    client.typing({ isTyping });
  }

  // Handle special commands
  if (input.trim() === '/exit') {
    console.log('Goodbye!');
    client.disconnect();
    rl.close();
    process.exit(0);
    return;
  }

  // Send regular message
  if (input.trim()) {
    client.sendMessage({ text: input });
  }

  promptUser();
};

// Set up input handling with typing indicators
rl.on('line', handleUserInput);

// Detect when user starts typing
(rl as any).input.on('keypress', () => {
  if (!isTyping && connected && nickname) {
    isTyping = true;
    client.typing({ isTyping: true });
    
    // Automatically turn off typing indicator after 3 seconds of inactivity
    setTimeout(() => {
      if (isTyping) {
        isTyping = false;
        client.typing({ isTyping: false });
      }
    }, 3000);
  }
});

// Set up listeners and connect
setupListeners();

// Set the prompt
rl.setPrompt('> ');

console.log(`Connecting to chat server at ${serverUrl}...`);
console.log('Press Ctrl+C twice to exit'); 