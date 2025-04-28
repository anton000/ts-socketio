import readline from 'readline';
import { createTypedSocketClient } from '@ts-socketio/client';
import { chatContract, CustomMetadata } from './contract';
import { MessageMetadata } from '@ts-socketio/core';

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

// Set up metadata provider
client.setMetadataProvider((_eventName, _payload) => {
  const authToken = nickname ? `token-for-${nickname}` : undefined;
  return { authToken };
});

// Set up listeners using our typed client
const setupListeners = () => {
  // Listeners now receive (payload, metadata)
  client.listeners.onUserNotification((payload, metadata: MessageMetadata<CustomMetadata>) => {
    clearLine();
    console.log(`📢 ${payload.message} (Msg ID: ${metadata.messageId})`);
    promptUser();
  });

  client.listeners.onSendMessage((payload, metadata: MessageMetadata<CustomMetadata>) => {
    if (payload.senderId !== client.socket.id) {
      clearLine();
      console.log(`${payload.senderNickname}: ${payload.text} (Auth: ${metadata.authToken ?? 'N/A'})`);
      promptUser();
    }
  });

  // Assuming contract still has Server -> Client typingStatus event
  client.listeners.onTypingStatus((payload, metadata: MessageMetadata<CustomMetadata>) => {
    if (payload.userId !== client.socket.id) {
      clearLine();
      if (payload.isTyping) {
        process.stdout.write(`${payload.nickname} is typing... (Msg ID: ${metadata.messageId})`);
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
      // Emitter only needs the payload
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