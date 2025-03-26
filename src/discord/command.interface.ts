import { Interaction, SlashCommandBuilder } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => void; // Execution logic
}
