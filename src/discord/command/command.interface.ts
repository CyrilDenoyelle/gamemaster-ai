import {
  Interaction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder; // Command name, e.g., "ping"
  execute: (interaction: Interaction) => Promise<void>; // Execution logic
}
