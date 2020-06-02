import { Listener } from 'discord-akairo';
import { Guild } from 'discord.js';

export default class GuildCreateListener extends Listener {
	public constructor() {
		super('guildCreate', {
			emitter: 'client',
			event: 'guildCreate',
			category: 'client',
		});
	}

	public async exec(guild: Guild): Promise<void> {
		this.client.logger.info(`[NEW GUILD] Joined a new server! ${guild.name} | ${guild.memberCount} Member(s)`);
		const existing = this.client.settings.cache.guilds.get(guild.id);
		if (!existing) {
			await this.client.settings.new('guild', {
				id: guild.id,
			});
		}
	}
}
