import { Command, CommandOptions } from 'discord-akairo';
import ImgDlClient from '../client/ImgDlClient';

export interface CommandDescriptionFlag {
	flags: string[];
	description: string;
}

export interface ImgDlCommandDescription {
	content?: string;
	usage?: string;
	examples?: string[];
	flags?: CommandDescriptionFlag[];
}

export interface ImgDlCommandOptions extends CommandOptions {
	description?: ImgDlCommandDescription;
}

export default class ImgDlCommand extends Command {
	public client!: ImgDlClient;
	public description!: ImgDlCommandDescription;
}
