import { Message } from 'discord.js';

export interface Command {
  name: string; // Command name, e.g., "ping"
  description?: string; // Optional description
  execute: (message: Message, args: string[]) => void; // Execution logic
}
