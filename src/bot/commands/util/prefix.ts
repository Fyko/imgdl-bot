import { Argument, PrefixSupplier } from 'discord-akairo';
import { Message } from 'discord.js';
import ImgDlCommand from '../../structures/ImgDlCommand';

export default class extends ImgDlCommand {
	public constructor() {
		super('prefix', {
			category: 'utilities',
			aliases: ['prefix'],
			args: [
				{
					id: 'prefix',
					type: Argument.validate('string', (_, p) => !/\s/.test(p) && p.length <= 10),
					prompt: {
						start: 'what do you want to set the prefix to?',
						retry: 'please provide a valid prefix without spaces and less than 10 characters',
						optional: true,
					},
				},
			],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: "Changes this server's prefix.",
				usage: '[prefix]',
				examples: ['', '?', '>'],
			},
		});
	}

	public async exec(msg: Message, { prefix }: { prefix: string | null }): Promise<Message | Message[] | void> {
		if (prefix && !msg.guild) prefix = null;
		if (!prefix) {
			const prefix = (this.handler.prefix as PrefixSupplier)(msg);
			return msg.util?.reply(`the current prefix is \`${prefix}\`.`);
		}

		await this.client.settings.set('guild', { id: msg.guild!.id }, { prefix });
		return msg.util?.reply(`successfully set the prefix to \`${prefix}\`.`);
	}
}
