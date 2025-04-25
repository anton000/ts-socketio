import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Use the standard Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = process.env.PORT || 3000; // Use a different port from basic-chat example
  await app.listen(port);
  console.log(`NestJS chat server running on http://localhost:${port}`);
  console.log(`
To test with basic-chat client:
1. Ensure basic-chat server is *not* running.
2. Open another terminal
3. Run: yarn workspace ts-socketio-example-basic-chat dev:client (it defaults to port 3000, update client.ts to use ${port} if needed)
`);
}
bootstrap(); 