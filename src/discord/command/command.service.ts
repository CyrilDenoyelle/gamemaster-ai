import { Injectable, Logger } from '@nestjs/common';
import { Interaction, MessageFlags } from 'discord.js';
import { Command } from './command.interface';

@Injectable()
export class CommandService {
  private readonly logger = new Logger(CommandService.name);
  private readonly commands = new Map<string, Command>();

  async registerCommands(commands: Command[]) {
    commands.forEach((command) => {
      this.logger.log(`Registering command: ${command.data.name}`);
      if (this.commands.has(command.data.name)) {
        throw new Error(`Command "${command}" is already registered.`);
      }

      this.commands.set(command.data.name, command);
    });
  }

  async handleCommand(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = this.commands.get(interaction.commandName);

    if (!command) {
      this.logger.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      this.logger.log(
        `/${interaction.commandName} executed by user: "${interaction.user.username}"`,
      );
      await command.execute(interaction);
    } catch (error) {
      this.logger.error('handleCommand error', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content:
            "Une erreur s'est produite lors de l'exécution de cette commande !",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content:
            "Une erreur s'est produite lors de l'exécution de cette commande !",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
}
